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
  writeFile,
  writeTextFile,
  type DirEntry,
} from "@tauri-apps/plugin-fs";
import { FOLDER_TEMPLATE_KEY, type Node, type Project } from "../constants/schema";
import { canHaveChildren } from "./template-registry";
import { ASSETS_DIR, FOLDER_META_FILE as FOLDER_FILE, PAGE_META_FILE, PROJECT_FILE } from "../constants/paths";

// eslint-disable-next-line no-control-regex -- control chars are genuinely illegal in Windows filenames
const ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

// How many disk reads the project load keeps in flight at once. Loading is
// worth parallelising — each file is an independent round trip into the Rust
// side — but an unbounded fan-out over a large world asks the OS for a file
// handle per page simultaneously, and hitting the per-process handle limit
// fails the load rather than slowing it.
const READ_CONCURRENCY = 16;

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
  return cleaned.length > 0 ? cleaned : "Untitled";
}

export async function pathExists(path: string): Promise<boolean> {
  return exists(path);
}

function isFolderNode(node: Node): boolean {
  return node.templateKey === FOLDER_TEMPLATE_KEY;
}

// Folders and any nestable non-folder template (character/location/faction/
// species) both store themselves inside their own directory rather than as
// a flat sibling file — the directory holds their own marker file (which
// one depends on ownMetaFileName) plus their children. This makes a node's
// directory identity independent of its current name, unlike a bare
// "match by filename" scheme, which breaks permanently the moment the node
// is renamed.
function usesDirectoryStorage(node: Node): boolean {
  return isFolderNode(node) || canHaveChildren(node.templateKey);
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

  for (const node of allNodes) {
    byId.set(node.id, node);
    const baseName = sanitizeSegment(node.name);
    sanitizedById.set(node.id, baseName);
    const groupKey = JSON.stringify([node.parentId, usesDirectoryStorage(node), baseName]);
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

  return { byId, segmentById };
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

  if (usesDirectoryStorage(node)) {
    return { dirSegments: [...ancestorSegments, ownSegment(node, index)], fileName: ownMetaFileName(node) };
  }
  return { dirSegments: ancestorSegments, fileName: `${ownSegment(node, index)}.json` };
}

export type LoadedProject = { project: Project; nodes: Node[]; skipped: string[] };

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
  const limited = createReadLimiter(READ_CONCURRENCY);
  const nodes = await walkEntries(rootPath, await limited(() => readDir(rootPath)), null, skipped, limited);
  // Directories are read in parallel, so the order files finish in is down to
  // timing. Sorting keeps the "couldn't read these" list the user sees stable
  // between two loads of the same damaged project.
  skipped.sort();
  return { project, nodes, skipped };
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
async function walkEntries(
  dirPath: string,
  entries: DirEntry[],
  parentId: string | null,
  skipped: string[],
  limited: ReadLimiter,
): Promise<Node[]> {
  const perEntry = await Promise.all(
    entries.map(async (entry): Promise<Node[]> => {
      const entryPath = joinPath(dirPath, entry.name);

      if (entry.isDirectory) {
        const childEntries = await limited(() => readDir(entryPath));
        const markerFile = childEntries.some((child) => !child.isDirectory && child.name === FOLDER_FILE)
          ? FOLDER_FILE
          : childEntries.some((child) => !child.isDirectory && child.name === PAGE_META_FILE)
            ? PAGE_META_FILE
            : null;
        // No marker file means this isn't a node-owned directory at all (e.g.
        // assets/) — skip it silently rather than reporting it as damaged.
        if (!markerFile) return [];

        const node = await readNodeFile(joinPath(entryPath, markerFile), skipped, limited);
        // An unreadable marker still leaves a real directory that may hold
        // perfectly good children. Keep walking into it, reparented to this
        // level, so a single bad `_folder.json` costs one node and not the
        // whole branch underneath it.
        if (node) node.parentId = parentId;
        const children = await walkEntries(entryPath, childEntries, node?.id ?? parentId, skipped, limited);
        return node ? [node, ...children] : children;
      }

      if (entry.name === FOLDER_FILE || entry.name === PAGE_META_FILE || entry.name === PROJECT_FILE) return [];
      if (!entry.name.endsWith(".json")) return [];

      const node = await readNodeFile(entryPath, skipped, limited);
      if (!node) return [];
      node.parentId = parentId;
      return [node];
    }),
  );

  return perEntry.flat();
}

export async function saveProject(rootPath: string, project: Project): Promise<void> {
  await mkdir(rootPath, { recursive: true });
  await writeTextFile(joinPath(rootPath, PROJECT_FILE), JSON.stringify(project, null, 2));
}

export async function saveNode(rootPath: string, node: Node, graph: Node[] | PathIndex): Promise<void> {
  const { dirSegments, fileName } = resolveNodePath(node, graph);
  const dirPath = joinPath(rootPath, ...dirSegments);
  await mkdir(dirPath, { recursive: true });
  await writeTextFile(joinPath(dirPath, fileName), JSON.stringify(node, null, 2));
}

// Batch counterpart to saveNode for the write-many paths (an LK import, a
// subtree duplicate). Resolving every node against one shared index instead of
// rebuilding it per node is the difference between linear and quadratic work
// on a large world.
export async function saveNodes(rootPath: string, nodesToSave: Node[], allNodes: Node[]): Promise<void> {
  const index = buildPathIndex(allNodes);
  for (const node of nodesToSave) {
    await saveNode(rootPath, node, index);
  }
}

// `allNodesAfter` is the graph with this node (and its descendants) already
// dropped — removing a node can free up a name its same-name siblings were
// suffixed around, so they need relocating too. See planRelocations.
export async function deleteNode(
  rootPath: string,
  node: Node,
  allNodesBefore: Node[],
  allNodesAfter: Node[],
): Promise<void> {
  const indexBefore = buildPathIndex(allNodesBefore);
  const { dirSegments, fileName } = resolveNodePath(node, indexBefore);
  const dirPath = joinPath(rootPath, ...dirSegments);
  if (usesDirectoryStorage(node)) {
    await remove(dirPath, { recursive: true });
  } else {
    await remove(joinPath(dirPath, fileName));
  }

  await applyRelocations(rootPath, planRelocations(allNodesBefore, allNodesAfter, indexBefore));
}

// The single unit that actually gets moved on disk for a node: its whole own
// directory (directory-storage nodes — children ride along for free), or its
// single JSON file (leaf templates). `rename` handles either kind, so the
// caller never needs to know which one it got.
function storageUnit(node: Node, index: PathIndex): string[] {
  const { dirSegments, fileName } = resolveNodePath(node, index);
  return usesDirectoryStorage(node) ? dirSegments : [...dirSegments, fileName];
}

export type Relocation = { oldSegments: string[]; newSegments: string[] };

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
    if (!ownSegmentChanged && before.parentId === after.parentId) continue;

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
async function applyRelocations(rootPath: string, plan: Relocation[]): Promise<void> {
  if (plan.length === 0) return;

  if (plan.length === 1) {
    const [only] = plan;
    await mkdir(joinPath(rootPath, ...only.newSegments.slice(0, -1)), { recursive: true });
    await rename(joinPath(rootPath, ...only.oldSegments), joinPath(rootPath, ...only.newSegments));
    return;
  }

  const staged: { tempPath: string; newSegments: string[] }[] = [];
  for (const item of plan) {
    const tempPath = joinPath(rootPath, ...item.oldSegments.slice(0, -1), `.anamnesis-move-${crypto.randomUUID()}`);
    await rename(joinPath(rootPath, ...item.oldSegments), tempPath);
    staged.push({ tempPath, newSegments: item.newSegments });
  }
  for (const item of staged) {
    await mkdir(joinPath(rootPath, ...item.newSegments.slice(0, -1)), { recursive: true });
    await rename(item.tempPath, joinPath(rootPath, ...item.newSegments));
  }
}

async function relocateNode(rootPath: string, allNodesBefore: Node[], allNodesAfter: Node[], nodeId: string): Promise<void> {
  const indexBefore = buildPathIndex(allNodesBefore);
  const indexAfter = buildPathIndex(allNodesAfter);
  const before = indexBefore.byId.get(nodeId);
  const after = indexAfter.byId.get(nodeId);
  if (!before || !after) throw new Error(`relocateNode: node ${nodeId} not found in before/after graph`);

  await applyRelocations(rootPath, planRelocations(allNodesBefore, allNodesAfter, indexBefore));

  // A plain filesystem rename only relocates the path — it never touches the
  // file's own contents, which still reflect the node as it was *before*
  // this rename/reparent (the rename/reparent itself is a real field change:
  // a new `name`, a new `parentId`). Always rewrite the node's own file at
  // its resolved new location so disk exactly matches the in-memory node.
  await saveNode(rootPath, after, indexAfter);
}

export async function renameNode(rootPath: string, allNodesBefore: Node[], allNodesAfter: Node[], nodeId: string): Promise<void> {
  await relocateNode(rootPath, allNodesBefore, allNodesAfter, nodeId);
}

export async function moveNode(rootPath: string, allNodesBefore: Node[], allNodesAfter: Node[], nodeId: string): Promise<void> {
  await relocateNode(rootPath, allNodesBefore, allNodesAfter, nodeId);
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
