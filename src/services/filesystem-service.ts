// The only file that reads or writes project data on disk. See CLAUDE.md's
// architecture rules and docs/spec.md §Data model for the on-disk layout.
import { sep } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  remove,
  rename,
  stat,
  watch,
  writeFile,
  writeTextFile,
  type DirEntry,
} from "@tauri-apps/plugin-fs";
import { FOLDER_TEMPLATE_KEY, type Node, type Project, type TemplateLibrary } from "../constants/schema";
import { alwaysDirectory } from "./template-registry";
import {
  ASSET_FOLDERS_FILE,
  ASSET_NAMES_FILE,
  ASSET_REMOVED_FILE,
  ASSET_SOURCES_FILE,
  ASSETS_DIR,
  BACKUPS_DIR,
  FOLDER_META_FILE as FOLDER_FILE,
  MOVE_TEMP_PREFIX,
  PAGE_META_FILE,
  PROBE_TEMP_PREFIX,
  PROJECT_FILE,
  TEMPLATES_FILE,
} from "../constants/paths";
import { LONG_PATH_ADVICE_CHARS, MAX_SEGMENT_CHARS } from "../constants/limits";

// eslint-disable-next-line no-control-regex -- control chars are genuinely illegal in Windows filenames
const ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

// How many disk reads the project load keeps in flight at once. Loading is
// worth parallelising — each file is an independent round trip into the Rust
// side — but an unbounded fan-out over a large world asks the OS for a file
// handle per page simultaneously, and hitting the per-process handle limit
// fails the load rather than slowing it.
const READ_CONCURRENCY = 16;

// How long the themes/snippets watcher waits for the writing to stop before it
// reports. Saving a file is rarely one filesystem event — editors truncate and
// rewrite, or write a temp file and rename over the original — and reloading a
// stylesheet halfway through that shows her a file that never existed.
const WATCH_DELAY_MS = 300;

// `@tauri-apps/api/path`'s `join` is an async round trip into Rust *per call*,
// and the load and save paths call it several times per node. `sep` is not: it
// reads a value the Tauri runtime hands the webview at startup, synchronously.
// So pay for it once and do the string work here instead.
//
// Resolved lazily rather than at module scope because the runtime global
// doesn't exist under `pnpm dev`'s browser-only mode or in Vitest, where only
// the pure functions in this file are ever exercised.
let cachedSeparator: string | null = null;
function separator(): string {
  cachedSeparator ??= sep();
  return cachedSeparator;
}

// Safe as plain concatenation only because every segment reaching it is either
// a constant defined in constants/paths.ts or has been through
// `sanitizeSegment`, which strips both separators along with the rest of the
// illegal characters. Nothing here can contain a `/`, `\`, or `..` to escape
// the project folder with.
function joinPath(base: string, ...segments: string[]): string {
  const s = separator();
  let path = base;
  for (const segment of segments) {
    if (!segment) continue;
    path = path.endsWith(s) ? path + segment : path + s + segment;
  }
  return path;
}

// Caps how many disk reads run at once without capping the *structure* of the
// walk. The permit is held only around a single read, never across the
// recursion into a subdirectory — a parent waiting on its children while
// holding a permit is how a limiter like this deadlocks on a tree deeper than
// its own limit.
function createReadLimiter(limit: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const waiting: (() => void)[] = [];

  return async function limited<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      waiting.shift()?.();
    }
  };
}

export function sanitizeSegment(name: string): string {
  const cleaned = name.replace(ILLEGAL_CHARS, "_").trim().replace(/[. ]+$/, "");
  // Cut by code point, not by UTF-16 unit: slicing a name mid-emoji leaves a
  // lone surrogate, which is not a filename any OS will take. The trailing
  // strip runs again afterwards because the cut can land on a space or a dot,
  // and Windows won't have a name ending in either. Two names that shorten to
  // the same thing collide like any other same-name siblings and pick up the
  // usual " (2)" — see buildPathIndex.
  const capped =
    cleaned.length > MAX_SEGMENT_CHARS
      ? Array.from(cleaned).slice(0, MAX_SEGMENT_CHARS).join("").replace(/[. ]+$/, "")
      : cleaned;
  return capped.length > 0 ? capped : "Untitled";
}

/**
 * The last segment of a path, whichever slash it was built with.
 *
 * Both separators, always, and not because Windows might hand back either one:
 * a path can also arrive from a native file picker, and the app's own
 * `joinPath` uses `/` on every platform. Pure string work, here rather than in
 * a caller because path shape is this file's subject.
 */
export function fileNameFromPath(path: string): string {
  const segments = path.split(/[\\/]/);
  return segments[segments.length - 1] ?? "";
}

export async function pathExists(path: string): Promise<boolean> {
  return exists(path);
}

/**
 * Make a directory (and its parents) if it isn't there yet. Used for the
 * projects folder, which is otherwise only ever a *default path* nobody
 * creates — a native folder browser can only navigate to folders that exist,
 * so pointing one at `Documents/Anamnesis` before anything has made it drops
 * the user in `Documents` to create it by hand.
 */
export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

function isFolderNode(node: Node): boolean {
  return node.templateKey === FOLDER_TEMPLATE_KEY;
}

// Whether a node stores itself inside a directory of its own — holding its
// marker file (`ownMetaFileName`) plus its children — rather than as a flat
// sibling `.json`. Directory storage is what makes a node's identity on disk
// independent of its current name; a bare "match by filename" scheme breaks
// permanently the moment the node is renamed.
//
// Two ways to qualify, and the difference matters:
//
//   - **`alwaysDirectory` templates** (folder, character, location, faction,
//     species) are a directory even while empty. They are the ones that
//     normally acquire children, and churning their storage shape as the last
//     child comes and goes would be noise.
//   - **Everything else earns a directory by actually having a child.** A note
//     with nothing under it stays one readable `New Note.json`; put a page
//     inside it and it becomes `New Note/` with `_page.json` in it.
//
// The second rule is what lets *any* page hold pages (2026-08-10). Deciding
// from the live graph rather than from the template is deliberate: a page can
// now be created before its template is chosen, so the template cannot be what
// answers this. Note that no existing project moves — every template that was
// a directory before still is.
// `parentIds` is required, not optional, and is passed as the bare set so
// `buildPathIndex` can call this before it has a whole index to hand. An
// optional parameter here would default a converted note back to its flat
// path at any call site that forgot it, and write its page over open ground —
// the storage layer is where a silently-wrong default costs real work.
function usesDirectoryStorage(node: Node, parentIds: ReadonlySet<string>): boolean {
  return isFolderNode(node) || alwaysDirectory(node.templateKey) || parentIds.has(node.id);
}

function ownMetaFileName(node: Node): string {
  return isFolderNode(node) ? FOLDER_FILE : PAGE_META_FILE;
}

function byCreationOrder(a: Node, b: Node): number {
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
}

// A precomputed "where does each node sit on disk" lookup for one snapshot of
// the graph. Every path question — resolve one node, plan a whole relocation,
// save an imported world — reduces to walking a node's own ancestors against
// this, which costs its depth rather than a fresh scan of every other node.
//
// Treat it as immutable: it describes the graph it was built from, so rebuild
// it after any change rather than reusing a stale one.
export type PathIndex = {
  byId: Map<string, Node>;
  segmentById: Map<string, string>;
  /**
   * Ids that have at least one child in this snapshot. Storage shape depends
   * on it — see `usesDirectoryStorage` — which is why it lives in the index
   * rather than being recomputed: a scan per node would be quadratic, and the
   * whole point of the index is that path questions cost a node's depth.
   */
  parentIds: Set<string>;
};

// Siblings sharing a sanitized name would collide on disk, so later ones (by
// creation order) get a " (2)", " (3)"... suffix on the filename only — the
// node's `name` field in the JSON is never touched. A directory-storage node
// (folder or nestable page) and a flat-file node never collide even with the
// same name, since one's a directory and the other's a plain .json file —
// but two directory-storage nodes with the same name do, regardless of
// whether either is a folder or a nestable page. That rule is exactly what
// the grouping key below encodes: parent + storage kind + sanitized name.
// It's JSON rather than a joined string so no separator character can appear
// inside a name and make two different groups look like the same key.
/**
 * Root-level names the app has already taken, as collision-group keys in the
 * exact shape `buildPathIndex` builds below.
 *
 * Root only, and deliberately not the whole story: `_folder.json` and
 * `_page.json` are reserved inside *every* directory, so a page named "_folder"
 * is a collision this doesn't catch. That one predates this and is left alone
 * rather than half-fixed here — it needs the key to be built per parent, which
 * is a different change.
 */
const RESERVED_ROOT_KEYS = new Set(
  [
    { name: ASSETS_DIR, isDirectory: true },
    { name: PROJECT_FILE, isDirectory: false },
    { name: TEMPLATES_FILE, isDirectory: false },
  ].map(({ name, isDirectory }) =>
    JSON.stringify([null, isDirectory, name.replace(/\.json$/i, "").toLowerCase()]),
  ),
);

export function buildPathIndex(allNodes: Node[]): PathIndex {
  const byId = new Map<string, Node>();
  const sanitizedById = new Map<string, string>();
  const collisionGroups = new Map<string, Node[]>();

  // First pass and separate on purpose: the collision key below asks whether
  // each node is directory-stored, and for a leaf template that answer depends
  // on whether anything is parented to it — which isn't known until every node
  // has been seen.
  const parentIds = new Set<string>();
  for (const node of allNodes) {
    if (node.parentId) parentIds.add(node.parentId);
  }

  for (const node of allNodes) {
    byId.set(node.id, node);
    const baseName = sanitizeSegment(node.name);
    sanitizedById.set(node.id, baseName);
    // Case-folded, because Windows and macOS both default to case-insensitive
    // filesystems: "Ruins" and "ruins" as siblings are two names to us and one
    // file to the OS, so without folding neither gets a suffix and the second
    // write silently lands on top of the first. The *displayed* segment keeps
    // its original case — only the collision test ignores it.
    const groupKey = JSON.stringify([node.parentId, usesDirectoryStorage(node, parentIds), baseName.toLowerCase()]);
    const group = collisionGroups.get(groupKey);
    if (group) group.push(node);
    else collisionGroups.set(groupKey, [node]);
  }

  const segmentById = new Map<string, string>();
  for (const [groupKey, group] of collisionGroups) {
    // A name the app has already taken at the project root counts as an
    // occupant nobody can see, so the first page wanting it starts at " (2)".
    //
    // Without this a root page called "assets" is written to `assets/` and then
    // skipped by the load walk — it exists on disk and is gone from the tree.
    // One called "templates" is worse: `Templates.json` and `templates.json`
    // are two names and one file on Windows and macOS both, so it lands on the
    // template library. That case-folding is why the group key folds case too.
    const offset = RESERVED_ROOT_KEYS.has(groupKey) ? 1 : 0;
    if (group.length === 1 && offset === 0) {
      segmentById.set(group[0].id, sanitizedById.get(group[0].id)!);
      continue;
    }
    group.sort(byCreationOrder);
    group.forEach((node, index) => {
      const baseName = sanitizedById.get(node.id)!;
      const position = index + offset;
      segmentById.set(node.id, position === 0 ? baseName : `${baseName} (${position + 1})`);
    });
  }

  return { byId, segmentById, parentIds };
}

// A node not present in the index it's resolved against still has to produce
// *some* path — falling back to its plain sanitized name keeps that case a
// missing collision suffix rather than a crash.
function ownSegment(node: Node, index: PathIndex): string {
  return index.segmentById.get(node.id) ?? sanitizeSegment(node.name);
}

function toPathIndex(graph: Node[] | PathIndex): PathIndex {
  return Array.isArray(graph) ? buildPathIndex(graph) : graph;
}

export type ResolvedNodePath = {
  dirSegments: string[];
  fileName: string;
};

// Pure and deterministic: a node's on-disk location is always recomputed from
// its position in the in-memory graph rather than stored, so a rename/reparent
// is just "resolve before, resolve after, move if they differ."
//
// Takes either a raw node array (convenient — builds a throwaway index) or a
// prebuilt PathIndex. Anything resolving more than one node should build the
// index once and pass that, or the cost of building it is paid per node
// instead of per batch.
export function resolveNodePath(node: Node, graph: Node[] | PathIndex): ResolvedNodePath {
  const index = toPathIndex(graph);

  const ancestorSegments: string[] = [];
  let current = node.parentId ? index.byId.get(node.parentId) : undefined;
  while (current) {
    ancestorSegments.unshift(ownSegment(current, index));
    current = current.parentId ? index.byId.get(current.parentId) : undefined;
  }

  if (usesDirectoryStorage(node, index.parentIds)) {
    return { dirSegments: [...ancestorSegments, ownSegment(node, index)], fileName: ownMetaFileName(node) };
  }
  return { dirSegments: ancestorSegments, fileName: `${ownSegment(node, index)}.json` };
}

export type LoadedProject = {
  project: Project;
  nodes: Node[];
  skipped: string[];
  /** Pages found parked under a move's temp name and put back. */
  recoveredCount: number;
  /**
   * Names of pages whose own file had been left outside the directory holding
   * their children, and which the load put back inside it. Names rather than a
   * count because the tree these pages come back into is one the user last saw
   * differently, and "your work is under *this*" is the useful half.
   */
  reunited: string[];
  /**
   * Names of pages that had a second, older copy of themselves on disk. The
   * older file has been renamed `.old-copy` and the newer one kept. Names
   * again, not a count: the page is open in her tree and she can check it.
   */
  supersededNames: string[];
};

// A project folder is plain JSON on the user's own disk, synced by whatever
// they like and editable by hand — so a malformed file is a question of when,
// not if (a Dropbox conflict copy, a crash mid-write, a stray edit). One bad
// file must never cost the user the other 74 pages, so unreadable nodes are
// skipped and reported rather than thrown. `project.json` itself is the one
// exception: without it there's no project to open at all.
export async function loadProject(rootPath: string): Promise<LoadedProject | null> {
  const projectPath = joinPath(rootPath, PROJECT_FILE);
  if (!(await exists(projectPath))) return null;

  let project: Project;
  try {
    project = JSON.parse(await readTextFile(projectPath)) as Project;
  } catch {
    return null;
  }

  // Every world saved before ids existed arrives here without one. Mint it and
  // write it straight back, so the id a pin or a group is keyed on is the same
  // id next time — a value invented fresh on each load would be no identity at
  // all. Writing only when it's missing keeps this a one-time event per world
  // rather than a write on every open.
  //
  // A failed write is not fatal: the world still opens, carrying the id it was
  // just given for this session. A read-only folder — a world on a memory
  // stick, or one inside a zip she opened in place — must not be unopenable
  // because of bookkeeping. It simply gets a new id next time, which costs
  // exactly the pins on a world she can't write to anyway.
  if (!project.id) {
    project = { ...project, id: crypto.randomUUID() };
    try {
      await saveProject(rootPath, project);
    } catch {
      // Keep going with the in-memory id.
    }
  }

  const ctx: WalkContext = {
    skipped: [],
    recovered: [],
    reunited: [],
    sources: new Map(),
    limited: createReadLimiter(READ_CONCURRENCY),
  };
  const rootEntries = await ctx.limited(() => readDir(rootPath));
  const walked = await walkEntries(rootPath, rootEntries, null, ctx);

  // Before anything else looks at the graph: two files claiming one id have to
  // become one node, or every count taken off the graph is taken off a
  // coin toss.
  const { nodes, supersededNames } = await setAsideSupersededCopies(walked, ctx.sources);

  // Directories are read in parallel, so the order files finish in is down to
  // timing. Sorting keeps the lists the user sees stable between two loads of
  // the same damaged project.
  ctx.skipped.sort();
  ctx.reunited.sort();
  supersededNames.sort();

  const recoveredCount = await repairStrandedNodes(rootPath, nodes, ctx.recovered);
  return { project, nodes, skipped: ctx.skipped, recoveredCount, reunited: ctx.reunited, supersededNames };
}

// Two files on disk, one node id. The graph is a `Record<string, Node>` keyed
// by id, so without this one of them simply wins on load order and the other's
// portraits, covers and writing are invisible — while still sitting on disk
// under a delete button, since nothing in the app can see they're in use.
// That's how the user's Assets tab called five pictures unused on 2026-08-12
// when only two of them were.
//
// It happens when a page changes storage shape — gaining its first child, or
// taking a template that's a directory even when empty — and the rename that
// should have carried its file into the new directory didn't land. The write
// path is where that's prevented (see `clearSupersededCopy`); this is for the
// projects already holding one, and for the next time a rename loses a fight
// with a sync client.
//
// **The newest write wins**, on `updatedAt` rather than the file's own
// timestamp: it's the node's own record of when its content last changed, it
// survives a copy or a sync, and a leftover is by definition the copy that
// stopped being written to. Ties go to the marker file, which is the shape the
// app converts *towards*.
//
// Only a flat `Name.json` is moved out of the way on disk. A losing marker
// file is dropped from the graph and left where it is: its directory may hold
// children, and taking the marker would have the next load hoist them up a
// level — trading a wrong picture count for a rearranged tree.
async function setAsideSupersededCopies(
  walked: Node[],
  sources: Map<Node, string>,
): Promise<{ nodes: Node[]; supersededNames: string[] }> {
  const byId = new Map<string, Node[]>();
  for (const node of walked) byId.set(node.id, [...(byId.get(node.id) ?? []), node]);
  if (byId.size === walked.length) return { nodes: walked, supersededNames: [] };

  const isMarker = (node: Node): boolean => {
    const path = sources.get(node) ?? "";
    return path.endsWith(PAGE_META_FILE) || path.endsWith(FOLDER_FILE);
  };

  const kept: Node[] = [];
  const supersededNames: string[] = [];
  for (const copies of byId.values()) {
    if (copies.length === 1) {
      kept.push(copies[0]);
      continue;
    }
    const ranked = [...copies].sort(
      (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || Number(isMarker(b)) - Number(isMarker(a)),
    );
    kept.push(ranked[0]);
    for (const loser of ranked.slice(1)) {
      const path = sources.get(loser);
      // Nothing was moved, so nothing is reported: the graph is right either
      // way, and a notice that reappears on every load with no action behind
      // it teaches the user to dismiss notices.
      if (!path || isMarker(loser)) continue;
      // Renamed rather than deleted, and to something the walk won't read
      // again: this is the user's own writing, however stale, and a load
      // shouldn't be the thing that throws any of it away. `.old-copy` doesn't
      // end in `.json`, so it's inert on the next load and still openable by
      // hand if the app picked wrong.
      try {
        await rename(path, `${path}.old-copy`);
        supersededNames.push(ranked[0].name);
      } catch {
        // Already set aside by an earlier load, or locked. It's out of the
        // graph either way, which is the half that matters.
      }
    }
  }
  return { nodes: kept, supersededNames };
}

// Puts anything left parked under a move's temp name back at its real path.
// A plain rename does it for both kinds: a stranded file becomes its proper
// `Name.json`, and a stranded directory moves wholesale, children included —
// which is why this can't be a save-then-delete, since that would write the
// node's own marker at the new path and then delete its children with the old
// directory.
//
// The temp name always sits in the directory the node came from, so the walk
// has already given it the right parent and its resolved path is a sibling of
// where it's parked. A failure here is left alone rather than reported: the
// node is loaded and visible either way, and the next load tries again.
async function repairStrandedNodes(rootPath: string, nodes: Node[], stranded: StrandedNode[]): Promise<number> {
  if (stranded.length === 0) return 0;

  const index = buildPathIndex(nodes);
  let repaired = 0;
  for (const { tempPath, nodeId } of stranded) {
    const node = index.byId.get(nodeId);
    if (!node) continue;
    const segments = storageUnit(node, index);
    try {
      await mkdir(joinPath(rootPath, ...segments.slice(0, -1)), { recursive: true });
      await rename(tempPath, joinPath(rootPath, ...segments));
      repaired++;
    } catch {
      // Left where it is; it still loads, and the next load retries.
    }
  }
  return repaired;
}

type ReadLimiter = <T>(task: () => Promise<T>) => Promise<T>;

// A node file is only usable if it parsed *and* carries the two fields the
// rest of the app indexes it by. A file that parses into something shapeless
// would otherwise land in the graph as an `undefined` id and break the tree
// far away from the actual cause.
async function readNodeFile(path: string, ctx: WalkContext): Promise<Node | null> {
  try {
    const parsed = JSON.parse(await ctx.limited(() => readTextFile(path))) as Node;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.name !== "string") {
      ctx.skipped.push(path);
      return null;
    }
    ctx.sources.set(parsed, path);
    return parsed;
  } catch {
    ctx.skipped.push(path);
    return null;
  }
}

// A directory is node-owned only if it contains one of the two reserved
// marker files — presence of the marker is what identifies ownership, never
// the directory's current name, so renaming a node can never orphan its
// children on the next load.
//
// Takes the directory's already-read entries rather than listing it itself, so
// each directory is listed exactly once for the whole load: the listing that
// identifies a directory as node-owned is the same listing used to recurse
// into it. That replaces the pair of `exists` probes that used to ask the disk
// separately about each marker file — three round trips per folder become one.
//
// Sibling entries are read in parallel (they're independent files) with the
// shared limiter capping how many are actually in flight.
type StrandedNode = { tempPath: string; nodeId: string };

// The walk's four accumulators and its read limiter, passed as one value.
// They were five separate parameters threaded through three recursive call
// sites, which is how `sources` — the fifth — would have gone in unnoticed at
// two of them and silently held half the project.
type WalkContext = {
  skipped: string[];
  recovered: StrandedNode[];
  reunited: string[];
  /**
   * Where each node was read from, keyed by the node object rather than its
   * id — the whole point is the case where one id arrives twice, and a map
   * keyed by id would drop exactly the half that matters. Object identity is
   * safe here because `readNodeFile` parses a fresh object per file.
   */
  sources: Map<Node, string>;
  limited: ReadLimiter;
};

function markerFileOf(entries: DirEntry[]): string | null {
  if (entries.some((child) => !child.isDirectory && child.name === FOLDER_FILE)) return FOLDER_FILE;
  if (entries.some((child) => !child.isDirectory && child.name === PAGE_META_FILE)) return PAGE_META_FILE;
  return null;
}

// Moves a flat `Name.json` into the marker-less `Name/` sitting beside it, so
// the node and the children it's holding are one storage unit again — the
// shape `usesDirectoryStorage` says a node with children has.
//
// Reaching this means a node gained its first child without its own file
// following it into the new directory, which is what shipped broken on
// 2026-08-10 and was fixed in the writing layer the same day. Repairing it on
// load as well is what gets the *already damaged* projects back, since nothing
// in the write path ever revisits a node it isn't currently saving.
//
// A failure is reported by returning false rather than thrown, and the caller
// then leaves the tree in the hoisted shape it would have had before. That
// pairing is the whole point: adopting the children in memory while the file
// stayed put would have the next save write a second copy of the node inside
// the directory, and the load after that would find the same id twice.
async function reuniteOwnerFile(ownerPath: string, dirPath: string, owner: Node): Promise<boolean> {
  try {
    await rename(ownerPath, joinPath(dirPath, ownMetaFileName(owner)));
    return true;
  } catch {
    return false;
  }
}

async function walkEntries(
  dirPath: string,
  entries: DirEntry[],
  parentId: string | null,
  ctx: WalkContext,
): Promise<Node[]> {
  // Every subdirectory at this level is listed before anything here is read.
  // Pairing a flat `Name.json` with a `Name/` beside it needs to know whether
  // that directory carries a marker of its own, and only its listing says so.
  // The listings are kept and handed to the recursive calls below, so this is
  // the same one-listing-per-directory the walk has always made, just ordered.
  const listings = new Map<string, DirEntry[]>();
  await Promise.all(
    entries.map(async (entry) => {
      // Ours, flat, and never node-owned — skipped by name so it isn't even
      // listed. Every other marker-less directory *is* walked (see below), and
      // a world's worth of images is the one place where that would cost
      // something for nothing.
      if (!entry.isDirectory || (parentId === null && entry.name === ASSETS_DIR)) return;
      listings.set(entry.name, await ctx.limited(() => readDir(joinPath(dirPath, entry.name))));
    }),
  );

  // Files that belong to a marker-less directory rather than to this level.
  // The directory branch reads them, so the file branch has to stand back or
  // the same file is read twice and lands in the graph as two nodes. Both
  // conditions matter: a directory *with* a marker next to a same-named file
  // is two unrelated nodes, which is legal — a directory-storage node and a
  // leaf page never collide, so neither gets a numbered suffix.
  const ownerFileNames = new Set<string>();
  for (const [name, childEntries] of listings) {
    const ownerFileName = `${name}.json`;
    if (!markerFileOf(childEntries) && entries.some((e) => !e.isDirectory && e.name === ownerFileName)) {
      ownerFileNames.add(ownerFileName);
    }
  }

  const perEntry = await Promise.all(
    entries.map(async (entry): Promise<Node[]> => {
      const entryPath = joinPath(dirPath, entry.name);

      if (entry.isDirectory) {
        const childEntries = listings.get(entry.name);
        if (!childEntries) return []; // assets/, skipped above without listing.

        const markerFile = markerFileOf(childEntries);
        // No marker file means this isn't a node-owned directory (assets/, or
        // a directory left behind by something going wrong). It contributes no
        // node of its own — but it is still **walked**, and anything inside it
        // is reparented to this level rather than abandoned.
        //
        // Returning early here instead is how the user lost a page: a page had
        // been dropped onto a leaf-template page, which has no directory of
        // its own, so the child was written into a plain `Name/` directory
        // with no marker in it. The whole subtree then vanished from the tree
        // on the next load while sitting perfectly intact on disk.
        if (!markerFile) {
          const hoisted = await walkEntries(entryPath, childEntries, parentId, ctx);
          const ownerFileName = `${entry.name}.json`;
          if (!ownerFileNames.has(ownerFileName)) return hoisted;

          const owner = await readNodeFile(joinPath(dirPath, ownerFileName), ctx);
          if (!owner) return hoisted;
          owner.parentId = parentId;

          // Only what the walk pushed *up* to this level — anything deeper
          // already found its own parent inside. A marker-less directory
          // nested in another hoists through both, so this correctly claims
          // those too: as far as disk can say, they're this node's.
          const adoptees = hoisted.filter((child) => child.parentId === parentId);
          // An empty directory next to a page proves nothing and is left
          // alone. Someone can make one by hand in Explorer, and swallowing
          // the page into it would move a file for no reason.
          if (adoptees.length > 0 && (await reuniteOwnerFile(joinPath(dirPath, ownerFileName), entryPath, owner))) {
            for (const child of adoptees) child.parentId = owner.id;
            ctx.reunited.push(owner.name);
            // It lives inside the directory now. Left pointing at the flat
            // path it came from, the duplicate pass below would set aside a
            // file that is no longer there — or worse, one a later save had
            // recreated.
            ctx.sources.set(owner, joinPath(entryPath, ownMetaFileName(owner)));
          }
          return [owner, ...hoisted];
        }

        const node = await readNodeFile(joinPath(entryPath, markerFile), ctx);
        // An unreadable marker still leaves a real directory that may hold
        // perfectly good children. Keep walking into it, reparented to this
        // level, so a single bad `_folder.json` costs one node and not the
        // whole branch underneath it.
        if (node) node.parentId = parentId;
        // A directory parked under a temp name keeps its marker, so it loads
        // fine — but it's still sitting at the wrong path, and its odd name
        // would survive every future save. Reported for the same repair as a
        // stranded file.
        if (node && entry.name.startsWith(MOVE_TEMP_PREFIX)) ctx.recovered.push({ tempPath: entryPath, nodeId: node.id });
        const children = await walkEntries(entryPath, childEntries, node?.id ?? parentId, ctx);
        return node ? [node, ...children] : children;
      }

      // The app's own files, not pages. TEMPLATES_FILE is skipped at every
      // level rather than only at the root, like the two markers and
      // project.json beside it: the check costs nothing, and a copy of it
      // turning up one folder down (a Dropbox conflict copy, a hand-move) would
      // otherwise be read as a page whose "tabs" are a library of templates.
      if (
        entry.name === FOLDER_FILE ||
        entry.name === PAGE_META_FILE ||
        entry.name === PROJECT_FILE ||
        entry.name === TEMPLATES_FILE
      ) {
        return [];
      }
      if (ownerFileNames.has(entry.name)) return [];

      // A file left under a move's temp name is a real page that a relocation
      // didn't finish putting away. It has no `.json` suffix, so the extension
      // check below used to skip it and the page was simply gone from the tree
      // — that is exactly how the user lost two pages on 2026-07-31. It's read
      // like any other node file and reported for repair; a temp name always
      // sits in the directory the node came *from*, so this level is its right
      // parent.
      const isStrandedMove = entry.name.startsWith(MOVE_TEMP_PREFIX);
      if (!isStrandedMove && !entry.name.endsWith(".json")) return [];

      const node = await readNodeFile(entryPath, ctx);
      if (!node) return [];
      node.parentId = parentId;
      if (isStrandedMove) ctx.recovered.push({ tempPath: entryPath, nodeId: node.id });
      return [node];
    }),
  );

  return perEntry.flat();
}

export async function saveProject(rootPath: string, project: Project): Promise<void> {
  await mkdir(rootPath, { recursive: true });
  await writeTextFile(joinPath(rootPath, PROJECT_FILE), JSON.stringify(project, null, 2));
}

/**
 * The world's templates. Absent or unreadable both read as "no templates yet",
 * which is the same forgiveness `loadProject` extends to a broken node file and
 * for the same reason: this sits in a folder she can open, and a bad edit to it
 * must not be the thing that stops a project opening. `parseTemplateLibrary`
 * takes it from there and drops individual entries that don't hold up.
 */
export async function loadTemplateLibrary(rootPath: string): Promise<unknown> {
  const path = joinPath(rootPath, TEMPLATES_FILE);
  if (!(await exists(path))) return null;
  try {
    return JSON.parse(await readTextFile(path));
  } catch {
    return null;
  }
}

export async function saveTemplateLibrary(rootPath: string, library: TemplateLibrary): Promise<void> {
  await mkdir(rootPath, { recursive: true });
  await writeTextFile(joinPath(rootPath, TEMPLATES_FILE), JSON.stringify(library, null, 2));
}

// Not a refusal — a translation. The write has already been attempted and the
// OS has already said no; this only adds the explanation the raw error can't,
// because at this length the path itself is unreadable and "os error 3" tells
// the user nothing they can act on. The original message is kept inside it, so
// nothing is hidden if the real cause turns out to be something else.
export class PathTooLongError extends Error {
  constructor(
    readonly nodeName: string,
    readonly path: string,
    readonly cause: string,
    readonly longPathsSupported: boolean,
  ) {
    // Neither message says "shorten the page name": names are capped on disk
    // (see sanitizeSegment), so the only things that still add up are how deep
    // the page sits and how long a path the project folder starts from.
    //
    // The two are genuinely different problems and shouldn't read alike. A
    // machine that stops at 260 has a setting behind it, and saying so is the
    // difference between "this app is broken" and "this is fixable". A machine
    // that takes long paths and still refused this one has something else
    // wrong, and sending that user after the length would waste their time —
    // which is why the OS's own words are in both.
    super(
      longPathsSupported
        ? `"${nodeName}" couldn't be saved. Its file path is unusually long (${path.length} characters), ` +
            `though this computer does handle long paths, so that may not be the reason. (${cause})`
        : `"${nodeName}" couldn't be saved: its file path is ${path.length} characters, and this computer ` +
            `is set to stop at ${LONG_PATH_ADVICE_CHARS}. Move the page further up the tree, or keep your ` +
            `project folder closer to the top of the drive — Windows can also be set to allow longer paths, ` +
            `but that's a system-wide change. (${cause})`,
    );
    this.name = "PathTooLongError";
  }
}

// Whether this machine will actually take a path past the old 260-character
// MAX_PATH. Answered by trying one, never by reading a setting: it depends on
// the Windows build, a machine-wide policy flag, *and* the filesystem the
// project happens to sit on, and only the drive itself can speak for all
// three at once. A guess here is what the old hardcoded limit was.
//
// Lazy and memoised per project root — it only runs once a write has already
// failed on a long path, so the ordinary case never pays for it and nothing
// runs at launch.
//
// Two nested padded names rather than one, so the probe path clears 260 by a
// wide margin whatever the project folder's own length is; a single name can't
// be relied on for that, since no filesystem allows one past 255. Cleanup is
// three plain removes with no recursive flag anywhere near them, and a failure
// to clean up leaves something the loader ignores.
const longPathSupport = new Map<string, Promise<boolean>>();

async function probeLongPaths(rootPath: string): Promise<boolean> {
  const outer = joinPath(rootPath, `${PROBE_TEMP_PREFIX}${crypto.randomUUID()}`);
  const inner = joinPath(outer, "p".repeat(200));
  const file = joinPath(inner, `${"p".repeat(200)}.tmp`);
  try {
    await mkdir(inner, { recursive: true });
    await writeTextFile(file, "");
    return true;
  } catch {
    return false;
  } finally {
    for (const path of [file, inner, outer]) {
      try {
        await remove(path);
      } catch {
        // Never made, or already gone. Nothing depends on it.
      }
    }
  }
}

export async function supportsLongPaths(rootPath: string): Promise<boolean> {
  const answered = longPathSupport.get(rootPath);
  if (answered) return answered;
  const asking = probeLongPaths(rootPath);
  longPathSupport.set(rootPath, asking);
  return asking;
}

export async function saveNode(rootPath: string, node: Node, graph: Node[] | PathIndex): Promise<void> {
  const { dirSegments, fileName } = resolveNodePath(node, graph);
  const dirPath = joinPath(rootPath, ...dirSegments);
  const filePath = joinPath(dirPath, fileName);

  try {
    await mkdir(dirPath, { recursive: true });
    await writeTextFile(filePath, JSON.stringify(node, null, 2));
  } catch (error) {
    if (filePath.length <= LONG_PATH_ADVICE_CHARS) throw error;
    // Only now, after a failure that a long path could plausibly explain, is it
    // worth asking the disk what it allows. Which of the two messages the user
    // gets is the whole reason the question is asked: "your Windows is set to
    // stop here" is something they can act on, and saying it to someone whose
    // machine takes long paths fine would send them after the wrong thing.
    throw new PathTooLongError(
      node.name,
      filePath,
      error instanceof Error ? error.message : String(error),
      await supportsLongPaths(rootPath),
    );
  }

  // Only reached on a successful write — the catch above always rethrows.
  await clearSupersededCopy(rootPath, node, dirSegments, fileName);
}

// A node that has just been written into its own directory must not still have
// its old flat file sitting beside that directory.
//
// Storage shape changes under a page — it gains its first child, or takes a
// template that's a directory even when empty — and `planRelocations` moves
// its file into the new directory to match. When that rename doesn't land (the
// OS refused, or a sync client had the file open and `exists` then said it was
// gone), the relocation is skipped but the *save* still goes ahead at the new
// path. Two files, one node id, and the load after that can only keep one of
// them. This is the moment where the leftover is provably stale, because the
// current content was just written elsewhere — so it's also the cheapest place
// to be sure of it. `setAsideSupersededCopies` is the load-side counterpart,
// for the copies already made.
//
// The id is checked before anything is touched: a directory-storage node and a
// same-named leaf page are two legitimate nodes that never collide on disk
// (see the sibling-collision rules in CLAUDE.md), and this must not be what
// deletes one of them. Failures are silent — the load pass catches what's
// left, and a save must never fail over tidying.
async function clearSupersededCopy(
  rootPath: string,
  node: Node,
  dirSegments: string[],
  fileName: string,
): Promise<void> {
  // Only the directory form has a flat twin to worry about. The other
  // direction — a page going back to flat, leaving its old `_page.json`
  // behind — is left to `pruneEmptyDir`, because that directory can still
  // hold children and its marker is what keeps them attached.
  if (fileName !== PAGE_META_FILE && fileName !== FOLDER_FILE) return;

  const flatPath = joinPath(rootPath, ...dirSegments.slice(0, -1), `${dirSegments[dirSegments.length - 1]}.json`);
  try {
    if (!(await exists(flatPath))) return;
    const stale = JSON.parse(await readTextFile(flatPath)) as Node;
    if (!stale || stale.id !== node.id) return;
    await rename(flatPath, `${flatPath}.old-copy`);
  } catch {
    // Unreadable, locked, or already set aside. The load pass reports what's
    // still there, and this one is not worth failing a save over.
  }
}

// Batch counterpart to saveNode for the write-many paths (an LK import, a
// subtree duplicate). Resolving every node against one shared index instead of
// rebuilding it per node is the difference between linear and quadratic work
// on a large world.
//
// **Only for nodes written into a graph that already accounts for them** — an
// import, where every path is resolved against the finished world. Adding to a
// world that's already on disk goes through `addNodes` below, which is this
// plus the relocation pass that arrival makes necessary.
export async function saveNodes(rootPath: string, nodesToSave: Node[], allNodes: Node[]): Promise<void> {
  const index = buildPathIndex(allNodes);
  for (const node of nodesToSave) {
    await saveNode(rootPath, node, index);
  }
}

// The add counterpart to `deleteNodes`, and it exists for the same reason:
// arriving changes where *other* nodes live, so writing the new files is only
// half the job.
//
// A page that gains its first child stops being `Name.json` and becomes
// `Name/_page.json` (see `usesDirectoryStorage`), and creating that child is
// the commonest way it happens. Without the plan below, the child was written
// into a `Name/` directory while the parent's own file stayed flat beside it —
// one node claiming two places, and every later path resolution computing the
// directory form of a file that was never moved there. That's an `os error 2`
// on the next rename, and on the next load a `Name/` with no marker file in
// it, whose contents `walkEntries` reparents up a level.
//
// Shipped broken 2026-08-10 with the change that made storage shape depend on
// having children, and reached within the day.
//
// Relocations run **first**: the new nodes are resolved against the finished
// layout, so the parent has to already be in the directory they're written
// into.
export async function addNodes(
  rootPath: string,
  newNodes: Node[],
  allNodesBefore: Node[],
  allNodesAfter: Node[],
): Promise<void> {
  await applyRelocations(rootPath, planRelocations(allNodesBefore, allNodesAfter, buildPathIndex(allNodesBefore)));
  await saveNodes(rootPath, newNodes, allNodesAfter);
}

// `allNodesAfter` is the graph with this node (and its descendants) already
// dropped — removing a node can free up a name its same-name siblings were
// suffixed around, so they need relocating too. See planRelocations.
// Deleting several nodes at once is not the same as calling this once per
// node. Every removal ends by renumbering colliding siblings on disk (see
// planRelocations), so the second single-node call would resolve its target
// against an index built before the first call had already moved things —
// and delete, or fail to find, the wrong path. Here every path is resolved
// against the one pre-delete index, and relocations run once at the end
// against the final state.
//
// `nodes` should hold only the *roots* of the removal: a directory-storage
// node takes its whole subtree with it, so passing a child as well would try
// to remove a path its parent already took.
export async function deleteNodes(
  rootPath: string,
  nodes: Node[],
  allNodesBefore: Node[],
  allNodesAfter: Node[],
): Promise<void> {
  const indexBefore = buildPathIndex(allNodesBefore);

  for (const node of nodes) {
    const { dirSegments, fileName } = resolveNodePath(node, indexBefore);
    const dirPath = joinPath(rootPath, ...dirSegments);
    if (usesDirectoryStorage(node, indexBefore.parentIds)) {
      await remove(dirPath, { recursive: true });
    } else {
      await remove(joinPath(dirPath, fileName));
    }
  }

  await applyRelocations(rootPath, planRelocations(allNodesBefore, allNodesAfter, indexBefore));
}

export async function deleteNode(
  rootPath: string,
  node: Node,
  allNodesBefore: Node[],
  allNodesAfter: Node[],
): Promise<void> {
  await deleteNodes(rootPath, [node], allNodesBefore, allNodesAfter);
}

// The single unit that actually gets moved on disk for a node: its whole own
// directory (directory-storage nodes — children ride along for free), or its
// single JSON file (leaf templates). `rename` handles either kind, so the
// caller never needs to know which one it got.
function storageUnit(node: Node, index: PathIndex): string[] {
  const { dirSegments, fileName } = resolveNodePath(node, index);
  return usesDirectoryStorage(node, index.parentIds) ? dirSegments : [...dirSegments, fileName];
}

// The node's *own* file, never the directory around it. Used only for the two
// sides of a storage conversion, where the thing that moves is the page file
// itself rather than the whole unit: `New Note.json` becomes
// `New Note/_page.json` when the note's first child arrives, and back again
// when its last one leaves. `storageUnit` can't express that — it answers with
// the directory the moment the node is directory-stored, and renaming a file
// *to* a directory path is not the same operation.
function ownFileUnit(node: Node, index: PathIndex): string[] {
  const { dirSegments, fileName } = resolveNodePath(node, index);
  return [...dirSegments, fileName];
}

/**
 * Where a node actually lives on disk, absolute — deliberately the same unit
 * `moveNode` renames, so what a file manager gets pointed at is the thing that
 * would move if the row were dragged: its own directory for a folder or a
 * nestable page, its single JSON file for a leaf.
 *
 * Null means nothing is there yet, which is a real state rather than a
 * failure. Nodes save on a debounce, so a page made a second ago is in the
 * tree with no file behind it — and every project predates the folder it now
 * sits in getting moved or renamed out from under it. Both want telling
 * apart from "the file manager refused," which is why the check happens here
 * instead of letting the reveal miss silently.
 */
export async function findNodeOnDisk(rootPath: string, node: Node, graph: Node[] | PathIndex): Promise<string | null> {
  const path = joinPath(rootPath, ...storageUnit(node, toPathIndex(graph)));
  return (await exists(path)) ? path : null;
}

export type Relocation = {
  oldSegments: string[];
  newSegments: string[];
  /**
   * A directory to try removing once the move lands — set only when a node
   * converts back from directory storage to a flat file, where the directory
   * it just moved out of is left behind empty.
   *
   * Best-effort and deliberately non-recursive: if anything is still in there
   * the removal fails and the folder stays, which is the behaviour to want.
   * Nothing depends on it succeeding — a stray empty directory is untidy in
   * her project folder and otherwise inert, and if the node ever gains a child
   * again the conversion simply reuses it.
   */
  pruneDir?: string[];
};

// Renaming and reparenting both boil down to "this node's resolved path
// changed" — but the node the user acted on is not always the only one that
// moved. `ownSegment` ranks colliding same-name siblings by creation order,
// so renaming, moving, or deleting one of them *renumbers the rest*: delete
// "Ruins" and "Ruins (2)" now resolves to "Ruins", even though nothing about
// that node changed. Left unhandled, the sibling's next write lands at its
// newly-computed path while its real directory still sits at the old one —
// two directories holding the same node id, and the load walk finds both.
// So the plan is computed across the whole graph, not just the acted-on node.
//
// Both snapshots are indexed once up front — the whole point of the scan is to
// compare every node's before-path against its after-path, and re-deriving the
// collision suffixes per node would make that quadratic. `indexBefore` is
// accepted as a parameter only so deleteNode, which already built one to find
// the file it's removing, doesn't build a second identical one.
export function planRelocations(
  allNodesBefore: Node[],
  allNodesAfter: Node[],
  indexBefore: PathIndex = buildPathIndex(allNodesBefore),
): Relocation[] {
  const indexAfter = buildPathIndex(allNodesAfter);
  const plan: Relocation[] = [];

  for (const before of allNodesBefore) {
    const after = indexAfter.byId.get(before.id);
    if (!after) continue; // deleted — its own removal is handled by deleteNode

    // A node's full path also changes when an *ancestor* moves, but a
    // directory rename carries its whole subtree along with it — so those
    // descendants must not be moved a second time. Only a node whose own
    // segment or own parent changed needs a filesystem operation of its own.
    const ownSegmentChanged = ownSegment(before, indexBefore) !== ownSegment(after, indexAfter);
    // A leaf-template node changes storage shape when it gains its first child
    // or loses its last — its name and its parent are both untouched, so
    // without this test the conversion plans nothing and the next save writes
    // the page to a path that no longer describes where it lives.
    const wasDirectory = usesDirectoryStorage(before, indexBefore.parentIds);
    const isDirectory = usesDirectoryStorage(after, indexAfter.parentIds);
    const storageShapeChanged = wasDirectory !== isDirectory;
    if (!ownSegmentChanged && !storageShapeChanged && before.parentId === after.parentId) continue;

    // A conversion moves the page file into (or out of) a directory of its own,
    // so both sides are file paths. `applyRelocations` makes the parent
    // directory before every rename, which is what creates `New Note/` here.
    if (storageShapeChanged) {
      const oldSegments = ownFileUnit(before, indexBefore);
      plan.push({
        oldSegments,
        newSegments: ownFileUnit(after, indexAfter),
        // Going back to flat empties the directory the page file just left.
        ...(wasDirectory ? { pruneDir: oldSegments.slice(0, -1) } : {}),
      });
      continue;
    }

    plan.push({
      oldSegments: storageUnit(before, indexBefore),
      newSegments: storageUnit(after, indexAfter),
    });
  }

  return plan;
}

// A lone move can be done directly. Several at once can collide — renaming
// "Ruins" out of the way is what frees the name "Ruins (2)" is moving into,
// and doing those in the wrong order hits an already-occupied target. Staging
// every move through a temp name first makes the ordering irrelevant. A temp
// directory still carries its own `_page.json`, so even a crash mid-shuffle
// leaves the node loadable (under an odd directory name that the next save
// corrects) rather than lost.
// Best-effort, and every failure is deliberately silent: a directory that
// still has something in it *should* refuse to go, and a stray empty one is
// inert. Never recursive — that flag is what would turn this from tidying up
// into deleting a subtree.
async function pruneEmptyDir(rootPath: string, item: Relocation): Promise<void> {
  if (!item.pruneDir || item.pruneDir.length === 0) return;
  try {
    await remove(joinPath(rootPath, ...item.pruneDir));
  } catch {
    // Not empty, or gone already. Either way there's nothing to do and
    // nothing that depends on it.
  }
}

// A rename can fail for two quite different reasons, and treating them the
// same is what turns one bad write into a folder that can never save again.
// If the OS refused — a file a sync client has locked, a full disk — that is a
// real failure and the caller has to hear about it. If the source simply isn't
// there, there is nothing to move: the node is still in memory, and every
// caller of applyRelocations rewrites the nodes it acted on at their new paths
// immediately afterwards (see relocateNodes and addNodes). Throwing in that
// case aborts the write that would have put things right, so the gap survives
// — and since paths are recomputed from the graph every time, the *next*
// operation plans the same impossible rename and fails identically, forever.
// That is exactly how one folder stopped saving anything on 2026-08-11.
//
// Confirmed after the fact rather than checked before: `exists` deciding on
// its own would let a moment's wrong answer skip a move whose file really is
// there, leaving the old copy on disk beside the new one — one node id in two
// places, which is the failure this whole module is shaped around avoiding.
// Attempting the rename first means the only way to reach the skip is for the
// rename to have genuinely failed *and* the source to genuinely be gone.
async function renameOrConfirmMissing(oldPath: string, newPath: string): Promise<boolean> {
  try {
    await rename(oldPath, newPath);
    return true;
  } catch (error) {
    if (await exists(oldPath)) throw error;
    return false;
  }
}

async function applyRelocations(rootPath: string, plan: Relocation[]): Promise<void> {
  if (plan.length === 0) return;

  if (plan.length === 1) {
    const [only] = plan;
    await mkdir(joinPath(rootPath, ...only.newSegments.slice(0, -1)), { recursive: true });
    await renameOrConfirmMissing(joinPath(rootPath, ...only.oldSegments), joinPath(rootPath, ...only.newSegments));
    await pruneEmptyDir(rootPath, only);
    return;
  }

  const staged: { tempPath: string; oldPath: string; newSegments: string[] }[] = [];

  // If any single rename fails — and on Windows they do, transiently, when a
  // sync client like OneDrive has a directory open — everything still sitting
  // under a temp name has to go back where it came from. Without this the
  // shuffle simply stops, and every file it had already staged is left under
  // a name nothing recognises. That cost the user four pages on 2026-07-31.
  //
  // Items that already reached their destination are deliberately *not*
  // reversed: each of those is at a real, valid path, and undoing them risks
  // failing again and leaving a third state. The invariant worth protecting
  // isn't "all or nothing", it's "no file is left under a temp name".
  try {
    for (const item of plan) {
      const oldPath = joinPath(rootPath, ...item.oldSegments);
      const tempPath = joinPath(rootPath, ...item.oldSegments.slice(0, -1), `.anamnesis-move-${crypto.randomUUID()}`);
      // Nothing there to stage means nothing to put back either, so it never
      // joins `staged` and the rollback below can't try to un-move it.
      if (!(await renameOrConfirmMissing(oldPath, tempPath))) continue;
      staged.push({ tempPath, oldPath, newSegments: item.newSegments });
    }
    while (staged.length > 0) {
      const item = staged[0];
      await mkdir(joinPath(rootPath, ...item.newSegments.slice(0, -1)), { recursive: true });
      await rename(item.tempPath, joinPath(rootPath, ...item.newSegments));
      staged.shift();
    }
    // After every move, never between them: a directory being emptied by one
    // conversion can be the same directory another item is still staged out
    // of, and removing it early would fail that move instead of this prune.
    for (const item of plan) await pruneEmptyDir(rootPath, item);
  } catch (error) {
    for (const item of staged) {
      // A failed rollback leaves that one under its temp name, which the load
      // walk now recognises and repairs (see walkEntries) — so even the
      // worst case is recoverable rather than invisible.
      try {
        await rename(item.tempPath, item.oldPath);
      } catch {
        // Nothing useful to do here; the original error is the one to report.
      }
    }
    throw error;
  }
}

// Relocating several nodes is one operation, not a loop. `planRelocations`
// plans across the *whole* graph, so the first call already moves everything
// the before/after pair implies — a second call would then compute the same
// plan from a snapshot disk no longer matches and rename paths that aren't
// there. Multi-drag in the tree is what makes this reachable.
async function relocateNodes(rootPath: string, allNodesBefore: Node[], allNodesAfter: Node[], nodeIds: string[]): Promise<void> {
  const indexBefore = buildPathIndex(allNodesBefore);
  const indexAfter = buildPathIndex(allNodesAfter);
  const moved: Node[] = [];
  for (const nodeId of nodeIds) {
    const before = indexBefore.byId.get(nodeId);
    const after = indexAfter.byId.get(nodeId);
    if (!before || !after) throw new Error(`relocateNodes: node ${nodeId} not found in before/after graph`);
    moved.push(after);
  }

  await applyRelocations(rootPath, planRelocations(allNodesBefore, allNodesAfter, indexBefore));

  // A plain filesystem rename only relocates the path — it never touches the
  // file's own contents, which still reflect the node as it was *before*
  // this rename/reparent (the rename/reparent itself is a real field change:
  // a new `name`, a new `parentId`). Always rewrite each node's own file at
  // its resolved new location so disk exactly matches the in-memory node.
  for (const after of moved) await saveNode(rootPath, after, indexAfter);
}

export async function renameNode(rootPath: string, allNodesBefore: Node[], allNodesAfter: Node[], nodeId: string): Promise<void> {
  await relocateNodes(rootPath, allNodesBefore, allNodesAfter, [nodeId]);
}

export async function moveNode(rootPath: string, allNodesBefore: Node[], allNodesAfter: Node[], nodeId: string): Promise<void> {
  await relocateNodes(rootPath, allNodesBefore, allNodesAfter, [nodeId]);
}

export async function moveNodes(rootPath: string, allNodesBefore: Node[], allNodesAfter: Node[], nodeIds: string[]): Promise<void> {
  await relocateNodes(rootPath, allNodesBefore, allNodesAfter, nodeIds);
}

// Same disk work as a rename, reached from somewhere that isn't one: giving a
// page a template can flip it between a flat file and its own directory (see
// `usesDirectoryStorage`), which moves the node's file even though its name
// and parent are untouched. Without this the store's plain save would simply
// write at the newly-resolved path and leave the old file sitting there — one
// node, two files on disk, and the next load reads both.
export async function relocateNode(rootPath: string, allNodesBefore: Node[], allNodesAfter: Node[], nodeId: string): Promise<void> {
  await relocateNodes(rootPath, allNodesBefore, allNodesAfter, [nodeId]);
}

// Phase 6 image slot — assets live in a flat assets/ dir (not tree-mirrored,
// since a node's uploaded image outlives any single rename/move) addressed by
// the filename stored on Node.image. Never derived from the node's name, so
// renaming a page can't orphan its own image the way an early filesystem-path
// scheme once orphaned children (see relocateNode's comments above).
export async function saveAssetImage(rootPath: string, fileName: string, data: Uint8Array): Promise<void> {
  const assetsDir = joinPath(rootPath, ASSETS_DIR);
  await mkdir(assetsDir, { recursive: true });
  await writeFile(joinPath(assetsDir, fileName), data);
}

export async function readAssetImage(rootPath: string, fileName: string): Promise<Uint8Array> {
  return readFile(joinPath(rootPath, ASSETS_DIR, fileName));
}

/**
 * Every file in `assets/`, with its size. Phase 17's Assets tab.
 *
 * A project with no `assets/` yet has no pictures, which is an empty list
 * rather than an error — the directory is made on the first upload, so its
 * absence is the ordinary state of a world nobody has put a picture in.
 *
 * Directories are skipped: nothing writes one there, but the tab draws every
 * entry as a picture and a stray folder would be listed as a broken one. A file
 * whose size won't read is listed at 0 rather than dropped, on the same
 * reasoning `captureAssets` skips an unreadable picture — a number missing off
 * a row is better than a picture missing off the screen.
 */
export async function listAssetImages(rootPath: string): Promise<{ fileName: string; size: number }[]> {
  const assetsDir = joinPath(rootPath, ASSETS_DIR);
  if (!(await exists(assetsDir))) return [];

  const entries = await readDir(assetsDir);
  const files: { fileName: string; size: number }[] = [];
  for (const entry of entries) {
    if (!entry.isFile) continue;
    // Ours, not pictures. They're the only non-images this directory is
    // allowed to hold, and listing one would put a broken thumbnail in the grid
    // with a delete button on it — nothing points at it, so it would read as
    // unused. Anything added beside them has to be added here too.
    if (entry.name === ASSET_FOLDERS_FILE || entry.name === ASSET_NAMES_FILE || entry.name === ASSET_SOURCES_FILE || entry.name === ASSET_REMOVED_FILE)
      continue;
    try {
      const info = await stat(joinPath(assetsDir, entry.name));
      files.push({ fileName: entry.name, size: info.size });
    } catch {
      files.push({ fileName: entry.name, size: 0 });
    }
  }
  return files;
}

/**
 * The picture library's folders. Absent or unreadable both read as "no folders
 * yet" — same forgiveness `loadTemplateLibrary` extends, and for the same
 * reason: this file sits where she can open it, and a bad edit to it must
 * never be what stops her seeing her pictures. `parseAssetFolders` takes it
 * from there and drops individual entries that don't hold up.
 */
export async function loadAssetFolders(rootPath: string): Promise<unknown> {
  const path = joinPath(rootPath, ASSETS_DIR, ASSET_FOLDERS_FILE);
  if (!(await exists(path))) return null;
  try {
    return JSON.parse(await readTextFile(path));
  } catch {
    return null;
  }
}

export async function saveAssetFolders(rootPath: string, folders: unknown): Promise<void> {
  await mkdir(joinPath(rootPath, ASSETS_DIR), { recursive: true });
  await writeTextFile(joinPath(rootPath, ASSETS_DIR, ASSET_FOLDERS_FILE), JSON.stringify(folders, null, 2));
}

/**
 * What each picture is called. Its own file rather than another key in the
 * folders one, so a name and a filing are never lost together — and so either
 * file can be opened, read and understood on its own.
 *
 * Missing is the normal state for a project that predates names, and reads as
 * "nothing is named yet" rather than as an error.
 */
export async function loadAssetNames(rootPath: string): Promise<unknown> {
  const path = joinPath(rootPath, ASSETS_DIR, ASSET_NAMES_FILE);
  if (!(await exists(path))) return null;
  try {
    return JSON.parse(await readTextFile(path));
  } catch {
    return null;
  }
}

export async function saveAssetNames(rootPath: string, names: unknown): Promise<void> {
  await mkdir(joinPath(rootPath, ASSETS_DIR), { recursive: true });
  await writeTextFile(joinPath(rootPath, ASSETS_DIR, ASSET_NAMES_FILE), JSON.stringify(names, null, 2));
}

/**
 * Where each picture came from — a third file beside the names and the folders,
 * on the same reasoning: three small files that can each be read on their own,
 * rather than one that loses everything when it goes.
 *
 * Missing is the normal state. Every project that predates this has no such
 * file, and so does every project that has never imported from LegendKeeper.
 */
export async function loadAssetSources(rootPath: string): Promise<unknown> {
  const path = joinPath(rootPath, ASSETS_DIR, ASSET_SOURCES_FILE);
  if (!(await exists(path))) return null;
  try {
    return JSON.parse(await readTextFile(path));
  } catch {
    return null;
  }
}

export async function saveAssetSources(rootPath: string, sources: unknown): Promise<void> {
  await mkdir(joinPath(rootPath, ASSETS_DIR), { recursive: true });
  await writeTextFile(joinPath(rootPath, ASSETS_DIR, ASSET_SOURCES_FILE), JSON.stringify(sources, null, 2));
}

/**
 * The fourth and smallest of the library's side files: pictures taken out of
 * the library that a page still needs. Absent for nearly every project, since
 * removing a picture nothing uses deletes the file instead of listing it.
 */
export async function loadRemovedAssets(rootPath: string): Promise<unknown> {
  const path = joinPath(rootPath, ASSETS_DIR, ASSET_REMOVED_FILE);
  if (!(await exists(path))) return null;
  try {
    return JSON.parse(await readTextFile(path));
  } catch {
    return null;
  }
}

export async function saveRemovedAssets(rootPath: string, removed: unknown): Promise<void> {
  await mkdir(joinPath(rootPath, ASSETS_DIR), { recursive: true });
  await writeTextFile(joinPath(rootPath, ASSETS_DIR, ASSET_REMOVED_FILE), JSON.stringify(removed, null, 2));
}

export async function deleteAssetImage(rootPath: string, fileName: string): Promise<void> {
  const path = joinPath(rootPath, ASSETS_DIR, fileName);
  if (await exists(path)) await remove(path);
}

// Phase 8 LK import — the user points a native file picker at a `.lk` export
// living anywhere on disk, outside any project folder. Reading its raw bytes
// is still a disk touch, so it goes through here rather than lk-import.ts
// reaching for the fs plugin directly.
export async function readRawFile(path: string): Promise<Uint8Array> {
  return readFile(path);
}

// Phase 9 LK export — the mirror of the above. The user picks where the `.lk`
// lands via a native save dialog, so this writes outside any project folder by
// design; it's still a disk touch, so it goes through here rather than
// lk-export.ts reaching for the fs plugin itself.
export async function writeRawFile(path: string, data: Uint8Array): Promise<void> {
  await writeFile(path, data);
}

// --- Phase 12: themes and snippets ----------------------------------------
// A theme is a `.css` file in a folder, so reading them is a directory listing
// and some text reads. That is all this section is. Deciding what a stylesheet
// is allowed to contain is theme-service's job, not this file's — it lives
// here only because it touches disk, and rule 5 says that happens in one file.

export type CssFile = { name: string; path: string; css: string };

/**
 * Every `.css` file directly inside `dir`, read. Sorted by name so the list in
 * Settings doesn't reshuffle between scans.
 *
 * A missing folder returns nothing rather than throwing: neither folder exists
 * until someone puts something in it, and "you haven't made any themes yet" is
 * a normal state, not an error to report. A file that fails to read *is*
 * skipped silently too, for the version of that same reason that matters — a
 * theme half-written by an editor at the moment of the scan shouldn't take out
 * the whole list.
 */
export async function readCssDir(dir: string): Promise<CssFile[]> {
  if (!(await exists(dir))) return [];

  const entries = await readDir(dir);
  const files: CssFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile || !entry.name.toLowerCase().endsWith(".css")) continue;
    const path = joinPath(dir, entry.name);
    try {
      files.push({ name: entry.name, path, css: await readTextFile(path) });
    } catch {
      // Unreadable right now; the next scan picks it up.
    }
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * One text file, from anywhere on disk.
 *
 * For the theme importer, which points a native file picker at a `.css` or a
 * `.json` sitting wherever she keeps it — a downloads folder, another project.
 * Outside any folder the app owns, which is the point of it and the reason it
 * can't reuse `readCssDir`. Throws if the file can't be read; the caller has
 * something to say about that.
 */
export async function readTextFileAt(path: string): Promise<string> {
  return readTextFile(path);
}

/** Ends a watch started by `watchCssDirs`. Safe to call more than once. */
export type StopWatching = () => void;

/**
 * Calls back whenever a `.css` file in one of these folders appears, changes or
 * goes away. Resolves to a function that stops watching.
 *
 * These two folders are hers, and a text editor is a supported way to work in
 * them — the whole design of a theme is "a CSS file you can open in Notepad".
 * Without this the app only looked when it was asked to, so hand-editing meant
 * save, alt-tab, find the button, press it. The file reads as the live source;
 * this makes it behave like one.
 *
 * Deliberately *not* recursive. `backups` sits inside the themes folder and the
 * app writes to it, so a recursive watch would report the app's own safety copy
 * as a change to her theme and reload on its own tail.
 *
 * Rejects when there's no Tauri side to ask — `pnpm dev` in a browser — which
 * the caller should read as "no live reload here", not as a failure.
 */
export async function watchCssDirs(dirs: readonly string[], onChange: () => void): Promise<StopWatching> {
  // notify errors on a path that isn't there, and one missing folder shouldn't
  // cost the other its watch.
  const present: string[] = [];
  for (const dir of dirs) {
    if (await exists(dir)) present.push(dir);
  }
  if (present.length === 0) throw new Error("nothing to watch");

  return watch(
    present,
    (event) => {
      // A folder is also where editors leave swap files, `.tmp` renames and
      // lock files, and none of those are a theme.
      const paths: string[] = Array.isArray(event.paths) ? event.paths : [];
      if (paths.some((path) => path.toLowerCase().endsWith(".css"))) onChange();
    },
    { delayMs: WATCH_DELAY_MS, recursive: false },
  );
}

/** Creates the folder if it isn't there yet, and hands back its path. */
export async function ensureCssDir(parent: string, dirName: string): Promise<string> {
  const dir = joinPath(parent, dirName);
  await ensureDir(dir);
  return dir;
}

/**
 * Writes a theme or snippet file.
 *
 * Whole-file, not a patch, because a theme file is small and generated — the
 * editor holds the complete set of values and rewriting is simpler than
 * reconciling. Callers debounce: a colour picker fires continuously while
 * you're dragging it, and that is not a rate to write a file at.
 */
export async function writeCssFile(dir: string, fileName: string, css: string): Promise<void> {
  await writeTextFile(joinPath(dir, fileName), css);
}

/**
 * Deletes a theme or snippet file.
 *
 * Straight to `remove`, with no trash and no undo, which is the one thing here
 * that deserves an argument. Everything else the app deletes is *hers* — a page
 * she wrote, an image she chose — and those go through the undo stack. A theme
 * file is a stylesheet: rebuildable from the pickers, re-exportable from the
 * sandbox, and worth nothing if she's decided she doesn't like it. What it
 * needs is a confirm before the call, which is where the caller comes in.
 *
 * A file that isn't there resolves quietly. Two windows open on the same
 * folder, or a delete raced with a rescan, shouldn't surface an error about a
 * file that is already in the state the caller wanted.
 */
export async function deleteCssFile(dir: string, fileName: string): Promise<void> {
  const path = joinPath(dir, fileName);
  if (!(await exists(path))) return;
  await remove(path);
}

/**
 * Puts a copy of a file in a `backups` subfolder beside it, and says where.
 *
 * The safety net under the colour pickers. They edit her file in place and are
 * careful about it, but careful is not the same as recoverable — there is no
 * undo on a stylesheet and no version history in a plain folder, so the first
 * time the app is about to change a file, what was there is kept.
 *
 * One copy per file, overwritten by the next session's first edit rather than
 * accumulating: a folder filling with timestamped near-duplicates is its own
 * kind of mess, and the copy worth having is the one from before today's
 * changes. `backups` is a subfolder, and `readCssDir` only looks at files
 * directly inside a folder, so these never appear in the themes list.
 *
 * Returns null if the copy couldn't be made — nothing here may stop an edit she
 * asked for, so the caller's job is to note it, not to abort.
 */
export async function backupCssFile(dir: string, fileName: string): Promise<string | null> {
  try {
    const source = joinPath(dir, fileName);
    if (!(await exists(source))) return null;
    const folder = joinPath(dir, BACKUPS_DIR);
    await ensureDir(folder);
    await writeTextFile(joinPath(folder, fileName), await readTextFile(source));
    return folder;
  } catch {
    return null;
  }
}
