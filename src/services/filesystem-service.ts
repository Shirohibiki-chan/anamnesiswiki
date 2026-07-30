// The only file that reads or writes project data on disk. See CLAUDE.md's
// architecture rules and docs/spec.md §Data model for the on-disk layout.
import { join } from "@tauri-apps/api/path";
import { exists, mkdir, readDir, readTextFile, remove, rename, writeTextFile } from "@tauri-apps/plugin-fs";
import { FOLDER_TEMPLATE_KEY, type Node, type Project } from "../constants/schema";
import { FOLDER_META_FILE as FOLDER_FILE, PROJECT_FILE } from "../constants/paths";

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
// node's `name` field in the JSON is never touched.
function ownSegment(node: Node, allNodes: Node[]): string {
  const baseName = sanitizeSegment(node.name);
  const folder = isFolderNode(node);
  const colliding = allNodes
    .filter((n) => n.parentId === node.parentId && isFolderNode(n) === folder && sanitizeSegment(n.name) === baseName)
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
  if (isFolderNode(node)) {
    return { dirSegments: [...ancestorSegments, ownSegment(node, allNodes)], fileName: FOLDER_FILE };
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

async function walkDirectory(dirPath: string, parentId: string | null, out: Node[]): Promise<void> {
  const entries = await readDir(dirPath);
  for (const entry of entries) {
    if (entry.isDirectory) {
      const childDirPath = await join(dirPath, entry.name);
      const folderJsonPath = await join(childDirPath, FOLDER_FILE);
      if (!(await exists(folderJsonPath))) continue; // not a node-owned folder (e.g. assets/)
      const folderNode = JSON.parse(await readTextFile(folderJsonPath)) as Node;
      folderNode.parentId = parentId;
      out.push(folderNode);
      await walkDirectory(childDirPath, folderNode.id, out);
    } else {
      if (entry.name === FOLDER_FILE || entry.name === PROJECT_FILE || !entry.name.endsWith(".json")) continue;
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

export async function deleteNode(rootPath: string, node: Node, allNodes: Node[]): Promise<void> {
  const { dirSegments, fileName } = resolveNodePath(node, allNodes);
  const dirPath = await join(rootPath, ...dirSegments);
  if (isFolderNode(node)) {
    await remove(dirPath, { recursive: true });
  } else {
    await remove(await join(dirPath, fileName));
  }
}

// Renaming and reparenting both boil down to "this node's resolved path
// changed" — a folder's relocatable unit is its whole directory (so children
// move for free), a page's is just its single JSON file.
async function relocateNode(rootPath: string, allNodesBefore: Node[], allNodesAfter: Node[], nodeId: string): Promise<void> {
  const before = allNodesBefore.find((n) => n.id === nodeId);
  const after = allNodesAfter.find((n) => n.id === nodeId);
  if (!before || !after) throw new Error(`relocateNode: node ${nodeId} not found in before/after graph`);

  const oldResolved = resolveNodePath(before, allNodesBefore);
  const newResolved = resolveNodePath(after, allNodesAfter);

  if (isFolderNode(after)) {
    const oldDir = await join(rootPath, ...oldResolved.dirSegments);
    const newDir = await join(rootPath, ...newResolved.dirSegments);
    if (oldDir === newDir) return;
    await mkdir(await join(rootPath, ...newResolved.dirSegments.slice(0, -1)), { recursive: true });
    await rename(oldDir, newDir);
  } else {
    const oldFile = await join(rootPath, ...oldResolved.dirSegments, oldResolved.fileName);
    const newFile = await join(rootPath, ...newResolved.dirSegments, newResolved.fileName);
    if (oldFile === newFile) return;
    await mkdir(await join(rootPath, ...newResolved.dirSegments), { recursive: true });
    await rename(oldFile, newFile);
  }
}

export async function renameNode(rootPath: string, allNodesBefore: Node[], allNodesAfter: Node[], nodeId: string): Promise<void> {
  await relocateNode(rootPath, allNodesBefore, allNodesAfter, nodeId);
}

export async function moveNode(rootPath: string, allNodesBefore: Node[], allNodesAfter: Node[], nodeId: string): Promise<void> {
  await relocateNode(rootPath, allNodesBefore, allNodesAfter, nodeId);
}
