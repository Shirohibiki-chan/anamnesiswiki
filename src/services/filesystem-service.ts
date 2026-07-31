// The only file that reads or writes project data on disk. See CLAUDE.md's
// architecture rules and docs/spec.md §Data model for the on-disk layout.
import { join } from "@tauri-apps/api/path";
import { exists, mkdir, readDir, readFile, readTextFile, remove, rename, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { FOLDER_TEMPLATE_KEY, type Node, type Project } from "../constants/schema";
import { canHaveChildren } from "./template-registry";
import { ASSETS_DIR, FOLDER_META_FILE as FOLDER_FILE, PAGE_META_FILE, PROJECT_FILE } from "../constants/paths";

// eslint-disable-next-line no-control-regex -- control chars are genuinely illegal in Windows filenames
const ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

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

function getAncestors(node: Node, byId: Map<string, Node>): Node[] {
  const chain: Node[] = [];
  let current = node.parentId ? byId.get(node.parentId) : undefined;
  while (current) {
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

// Siblings sharing a sanitized name would collide on disk, so later ones (by
// creation order) get a " (2)", " (3)"... suffix on the filename only — the
// node's `name` field in the JSON is never touched. A directory-storage node
// (folder or nestable page) and a flat-file node never collide even with the
// same name, since one's a directory and the other's a plain .json file —
// but two directory-storage nodes with the same name do, regardless of
// whether either is a folder or a nestable page.
function ownSegment(node: Node, allNodes: Node[]): string {
  const baseName = sanitizeSegment(node.name);
  const usesDir = usesDirectoryStorage(node);
  const colliding = allNodes
    .filter((n) => n.parentId === node.parentId && usesDirectoryStorage(n) === usesDir && sanitizeSegment(n.name) === baseName)
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const index = colliding.findIndex((n) => n.id === node.id);
  return index <= 0 ? baseName : `${baseName} (${index + 1})`;
}

export type ResolvedNodePath = {
  dirSegments: string[];
  fileName: string;
};

// Pure and deterministic: a node's on-disk location is always recomputed from
// its position in the in-memory graph rather than stored, so a rename/reparent
// is just "resolve before, resolve after, move if they differ."
export function resolveNodePath(node: Node, allNodes: Node[]): ResolvedNodePath {
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const ancestorSegments = getAncestors(node, byId).map((a) => ownSegment(a, allNodes));
  if (usesDirectoryStorage(node)) {
    return { dirSegments: [...ancestorSegments, ownSegment(node, allNodes)], fileName: ownMetaFileName(node) };
  }
  return { dirSegments: ancestorSegments, fileName: `${ownSegment(node, allNodes)}.json` };
}

export async function loadProject(rootPath: string): Promise<{ project: Project; nodes: Node[] } | null> {
  const projectPath = await join(rootPath, PROJECT_FILE);
  if (!(await exists(projectPath))) return null;
  const project = JSON.parse(await readTextFile(projectPath)) as Project;
  const nodes: Node[] = [];
  await walkDirectory(rootPath, null, nodes);
  return { project, nodes };
}

// A directory is node-owned only if it contains one of the two reserved
// marker files — presence of the marker is what identifies ownership, never
// the directory's current name, so renaming a node can never orphan its
// children on the next load.
async function walkDirectory(dirPath: string, parentId: string | null, out: Node[]): Promise<void> {
  const entries = await readDir(dirPath);
  for (const entry of entries) {
    if (entry.isDirectory) {
      const childDirPath = await join(dirPath, entry.name);
      const folderJsonPath = await join(childDirPath, FOLDER_FILE);
      const pageJsonPath = await join(childDirPath, PAGE_META_FILE);
      if (await exists(folderJsonPath)) {
        const folderNode = JSON.parse(await readTextFile(folderJsonPath)) as Node;
        folderNode.parentId = parentId;
        out.push(folderNode);
        await walkDirectory(childDirPath, folderNode.id, out);
      } else if (await exists(pageJsonPath)) {
        const pageNode = JSON.parse(await readTextFile(pageJsonPath)) as Node;
        pageNode.parentId = parentId;
        out.push(pageNode);
        await walkDirectory(childDirPath, pageNode.id, out);
      }
      // else: not a node-owned directory at all (e.g. assets/) — skip.
    } else {
      if (entry.name === FOLDER_FILE || entry.name === PAGE_META_FILE || entry.name === PROJECT_FILE || !entry.name.endsWith(".json")) continue;
      const pagePath = await join(dirPath, entry.name);
      const pageNode = JSON.parse(await readTextFile(pagePath)) as Node;
      pageNode.parentId = parentId;
      out.push(pageNode);
    }
  }
}

export async function saveProject(rootPath: string, project: Project): Promise<void> {
  await mkdir(rootPath, { recursive: true });
  const projectPath = await join(rootPath, PROJECT_FILE);
  await writeTextFile(projectPath, JSON.stringify(project, null, 2));
}

export async function saveNode(rootPath: string, node: Node, allNodes: Node[]): Promise<void> {
  const { dirSegments, fileName } = resolveNodePath(node, allNodes);
  const dirPath = await join(rootPath, ...dirSegments);
  await mkdir(dirPath, { recursive: true });
  const filePath = await join(dirPath, fileName);
  await writeTextFile(filePath, JSON.stringify(node, null, 2));
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
  const { dirSegments, fileName } = resolveNodePath(node, allNodesBefore);
  const dirPath = await join(rootPath, ...dirSegments);
  if (usesDirectoryStorage(node)) {
    await remove(dirPath, { recursive: true });
  } else {
    await remove(await join(dirPath, fileName));
  }

  await applyRelocations(rootPath, planRelocations(allNodesBefore, allNodesAfter));
}

// The single unit that actually gets moved on disk for a node: its whole own
// directory (directory-storage nodes — children ride along for free), or its
// single JSON file (leaf templates). `rename` handles either kind, so the
// caller never needs to know which one it got.
function storageUnit(node: Node, allNodes: Node[]): string[] {
  const { dirSegments, fileName } = resolveNodePath(node, allNodes);
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
// two directories holding the same node id, and `walkDirectory` loads both.
// So the plan is computed across the whole graph, not just the acted-on node.
export function planRelocations(allNodesBefore: Node[], allNodesAfter: Node[]): Relocation[] {
  const afterById = new Map(allNodesAfter.map((n) => [n.id, n]));
  const plan: Relocation[] = [];

  for (const before of allNodesBefore) {
    const after = afterById.get(before.id);
    if (!after) continue; // deleted — its own removal is handled by deleteNode

    // A node's full path also changes when an *ancestor* moves, but a
    // directory rename carries its whole subtree along with it — so those
    // descendants must not be moved a second time. Only a node whose own
    // segment or own parent changed needs a filesystem operation of its own.
    const ownSegmentChanged = ownSegment(before, allNodesBefore) !== ownSegment(after, allNodesAfter);
    if (!ownSegmentChanged && before.parentId === after.parentId) continue;

    plan.push({
      oldSegments: storageUnit(before, allNodesBefore),
      newSegments: storageUnit(after, allNodesAfter),
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
    await mkdir(await join(rootPath, ...only.newSegments.slice(0, -1)), { recursive: true });
    await rename(await join(rootPath, ...only.oldSegments), await join(rootPath, ...only.newSegments));
    return;
  }

  const staged: { tempPath: string; newSegments: string[] }[] = [];
  for (const item of plan) {
    const tempPath = await join(rootPath, ...item.oldSegments.slice(0, -1), `.anamnesis-move-${crypto.randomUUID()}`);
    await rename(await join(rootPath, ...item.oldSegments), tempPath);
    staged.push({ tempPath, newSegments: item.newSegments });
  }
  for (const item of staged) {
    await mkdir(await join(rootPath, ...item.newSegments.slice(0, -1)), { recursive: true });
    await rename(item.tempPath, await join(rootPath, ...item.newSegments));
  }
}

async function relocateNode(rootPath: string, allNodesBefore: Node[], allNodesAfter: Node[], nodeId: string): Promise<void> {
  const before = allNodesBefore.find((n) => n.id === nodeId);
  const after = allNodesAfter.find((n) => n.id === nodeId);
  if (!before || !after) throw new Error(`relocateNode: node ${nodeId} not found in before/after graph`);

  await applyRelocations(rootPath, planRelocations(allNodesBefore, allNodesAfter));

  // A plain filesystem rename only relocates the path — it never touches the
  // file's own contents, which still reflect the node as it was *before*
  // this rename/reparent (the rename/reparent itself is a real field change:
  // a new `name`, a new `parentId`). Always rewrite the node's own file at
  // its resolved new location so disk exactly matches the in-memory node.
  await saveNode(rootPath, after, allNodesAfter);
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
  const assetsDir = await join(rootPath, ASSETS_DIR);
  await mkdir(assetsDir, { recursive: true });
  await writeFile(await join(assetsDir, fileName), data);
}

export async function readAssetImage(rootPath: string, fileName: string): Promise<Uint8Array> {
  return readFile(await join(rootPath, ASSETS_DIR, fileName));
}

export async function deleteAssetImage(rootPath: string, fileName: string): Promise<void> {
  const path = await join(rootPath, ASSETS_DIR, fileName);
  if (await exists(path)) await remove(path);
}

// Phase 8 LK import — the user points a native file picker at a `.lk` export
// living anywhere on disk, outside any project folder. Reading its raw bytes
// is still a disk touch, so it goes through here rather than lk-import.ts
// reaching for the fs plugin directly.
export async function readRawFile(path: string): Promise<Uint8Array> {
  return readFile(path);
}
