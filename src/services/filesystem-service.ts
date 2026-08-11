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
  watch,
  writeFile,
  writeTextFile,
  type DirEntry,
} from "@tauri-apps/plugin-fs";
import { FOLDER_TEMPLATE_KEY, type Node, type Project } from "../constants/schema";
import { alwaysDirectory } from "./template-registry";
import {
  ASSETS_DIR,
  BACKUPS_DIR,
  FOLDER_META_FILE as FOLDER_FILE,
  MOVE_TEMP_PREFIX,
  PAGE_META_FILE,
  PROJECT_FILE,
} from "../constants/paths";
import { MAX_PATH_CHARS, MAX_SEGMENT_CHARS } from "../constants/limits";

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
  for (const group of collisionGroups.values()) {
    if (group.length === 1) {
      segmentById.set(group[0].id, sanitizedById.get(group[0].id)!);
      continue;
    }
    group.sort(byCreationOrder);
    group.forEach((node, index) => {
      const baseName = sanitizedById.get(node.id)!;
      segmentById.set(node.id, index === 0 ? baseName : `${baseName} (${index + 1})`);
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

  const skipped: string[] = [];
  const recovered: StrandedNode[] = [];
  const reunited: string[] = [];
  const limited = createReadLimiter(READ_CONCURRENCY);
  const rootEntries = await limited(() => readDir(rootPath));
  const nodes = await walkEntries(rootPath, rootEntries, null, skipped, recovered, reunited, limited);
  // Directories are read in parallel, so the order files finish in is down to
  // timing. Sorting keeps the lists the user sees stable between two loads of
  // the same damaged project.
  skipped.sort();
  reunited.sort();

  const recoveredCount = await repairStrandedNodes(rootPath, nodes, recovered);
  return { project, nodes, skipped, recoveredCount, reunited };
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
async function readNodeFile(path: string, skipped: string[], limited: ReadLimiter): Promise<Node | null> {
  try {
    const parsed = JSON.parse(await limited(() => readTextFile(path))) as Node;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.name !== "string") {
      skipped.push(path);
      return null;
    }
    return parsed;
  } catch {
    skipped.push(path);
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
  skipped: string[],
  recovered: StrandedNode[],
  reunited: string[],
  limited: ReadLimiter,
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
      listings.set(entry.name, await limited(() => readDir(joinPath(dirPath, entry.name))));
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
          const hoisted = await walkEntries(entryPath, childEntries, parentId, skipped, recovered, reunited, limited);
          const ownerFileName = `${entry.name}.json`;
          if (!ownerFileNames.has(ownerFileName)) return hoisted;

          const owner = await readNodeFile(joinPath(dirPath, ownerFileName), skipped, limited);
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
            reunited.push(owner.name);
          }
          return [owner, ...hoisted];
        }

        const node = await readNodeFile(joinPath(entryPath, markerFile), skipped, limited);
        // An unreadable marker still leaves a real directory that may hold
        // perfectly good children. Keep walking into it, reparented to this
        // level, so a single bad `_folder.json` costs one node and not the
        // whole branch underneath it.
        if (node) node.parentId = parentId;
        // A directory parked under a temp name keeps its marker, so it loads
        // fine — but it's still sitting at the wrong path, and its odd name
        // would survive every future save. Reported for the same repair as a
        // stranded file.
        if (node && entry.name.startsWith(MOVE_TEMP_PREFIX)) recovered.push({ tempPath: entryPath, nodeId: node.id });
        const children = await walkEntries(
          entryPath,
          childEntries,
          node?.id ?? parentId,
          skipped,
          recovered,
          reunited,
          limited,
        );
        return node ? [node, ...children] : children;
      }

      if (entry.name === FOLDER_FILE || entry.name === PAGE_META_FILE || entry.name === PROJECT_FILE) return [];
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

      const node = await readNodeFile(entryPath, skipped, limited);
      if (!node) return [];
      node.parentId = parentId;
      if (isStrandedMove) recovered.push({ tempPath: entryPath, nodeId: node.id });
      return [node];
    }),
  );

  return perEntry.flat();
}

export async function saveProject(rootPath: string, project: Project): Promise<void> {
  await mkdir(rootPath, { recursive: true });
  await writeTextFile(joinPath(rootPath, PROJECT_FILE), JSON.stringify(project, null, 2));
}

// Thrown rather than returned so it travels the same route as a real fs
// failure — every write path already has to cope with one of those, and this
// is the same thing from the user's point of view: their page did not get
// written. Carries the node's name because the path alone is unreadable at the
// length that triggers this.
export class PathTooLongError extends Error {
  constructor(
    readonly nodeName: string,
    readonly path: string,
  ) {
    // Deliberately doesn't say "shorten the page name" any more: names are
    // capped on disk now (see sanitizeSegment), so the only things that still
    // add up are how deep the page sits and how long a path the project folder
    // itself starts from — and the second one is the bigger lever by far.
    super(
      `"${nodeName}" is nested too deeply to save — its file path is ${path.length} characters, ` +
        `over the ${MAX_PATH_CHARS} Windows will open. Move it further up the tree, ` +
        `or keep your project folder closer to the top of the drive.`,
    );
    this.name = "PathTooLongError";
  }
}

export async function saveNode(rootPath: string, node: Node, graph: Node[] | PathIndex): Promise<void> {
  const { dirSegments, fileName } = resolveNodePath(node, graph);
  const dirPath = joinPath(rootPath, ...dirSegments);
  const filePath = joinPath(dirPath, fileName);

  // Checked before `mkdir`, so a path we're going to refuse doesn't leave an
  // empty directory tree behind as a souvenir.
  if (filePath.length > MAX_PATH_CHARS) throw new PathTooLongError(node.name, filePath);

  await mkdir(dirPath, { recursive: true });
  await writeTextFile(filePath, JSON.stringify(node, null, 2));
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
