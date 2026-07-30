// In-memory node graph. Never imported directly by components — access is
// always through src/hooks/use-project.ts. See CLAUDE.md's layer order.
import { create } from "zustand";
import { createNode, createProject, type Node, type Project } from "../constants/schema";
import * as fsService from "../services/filesystem-service";
import { scheduleSave } from "../services/autosave";

type ProjectStoreState = {
  rootPath: string | null;
  project: Project | null;
  nodes: Record<string, Node>;
  isLoaded: boolean;
  loadProject: (rootPath: string) => Promise<boolean>;
  initializeProject: (rootPath: string, name: string) => Promise<void>;
  addNode: (input: { parentId: string | null; templateKey: string; name: string }) => Node;
  updateNode: (id: string, patch: Partial<Omit<Node, "id">>) => void;
  renameNode: (id: string, name: string) => void;
  moveNode: (id: string, newParentId: string | null) => void;
  deleteNode: (id: string) => void;
};

function descendantIds(id: string, nodes: Record<string, Node>): string[] {
  const children = Object.values(nodes).filter((n) => n.parentId === id);
  return children.flatMap((child) => [child.id, ...descendantIds(child.id, nodes)]);
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  rootPath: null,
  project: null,
  nodes: {},
  isLoaded: false,

  async loadProject(rootPath) {
    const result = await fsService.loadProject(rootPath);
    if (!result) return false;
    const nodes = Object.fromEntries(result.nodes.map((n) => [n.id, n]));
    set({ rootPath, project: result.project, nodes, isLoaded: true });
    return true;
  },

  async initializeProject(rootPath, name) {
    const project = createProject({ name });
    await fsService.saveProject(rootPath, project);
    set({ rootPath, project, nodes: {}, isLoaded: true });
  },

  addNode(input) {
    const { rootPath, project, nodes } = get();
    if (!rootPath || !project) throw new Error("addNode: no project loaded");

    const node = createNode(input);
    const nextNodes = { ...nodes, [node.id]: node };
    const nextProject: Project =
      input.parentId === null ? { ...project, rootOrder: [...project.rootOrder, node.id] } : project;

    set({ nodes: nextNodes, project: nextProject });
    void fsService.saveNode(rootPath, node, Object.values(nextNodes));
    if (nextProject !== project) void fsService.saveProject(rootPath, nextProject);
    return node;
  },

  updateNode(id, patch) {
    const { rootPath, nodes } = get();
    const existing = nodes[id];
    if (!rootPath || !existing) return;

    const updated: Node = { ...existing, ...patch, updatedAt: Date.now() };
    const nextNodes = { ...nodes, [id]: updated };
    set({ nodes: nextNodes });
    scheduleSave(id, () => fsService.saveNode(rootPath, updated, Object.values(nextNodes)));
  },

  renameNode(id, name) {
    const { rootPath, nodes } = get();
    const existing = nodes[id];
    if (!rootPath || !existing) return;

    const allNodesBefore = Object.values(nodes);
    const updated: Node = { ...existing, name, updatedAt: Date.now() };
    const nextNodes = { ...nodes, [id]: updated };
    set({ nodes: nextNodes });
    void fsService.renameNode(rootPath, allNodesBefore, Object.values(nextNodes), id);
  },

  moveNode(id, newParentId) {
    const { rootPath, project, nodes } = get();
    const existing = nodes[id];
    if (!rootPath || !project || !existing) return;

    const allNodesBefore = Object.values(nodes);
    const updated: Node = { ...existing, parentId: newParentId, updatedAt: Date.now() };
    const nextNodes = { ...nodes, [id]: updated };

    let nextProject = project;
    if (existing.parentId === null && newParentId !== null) {
      nextProject = { ...project, rootOrder: project.rootOrder.filter((n) => n !== id) };
    } else if (existing.parentId !== null && newParentId === null) {
      nextProject = { ...project, rootOrder: [...project.rootOrder, id] };
    }

    set({ nodes: nextNodes, project: nextProject });
    void fsService.moveNode(rootPath, allNodesBefore, Object.values(nextNodes), id);
    if (nextProject !== project) void fsService.saveProject(rootPath, nextProject);
  },

  deleteNode(id) {
    const { rootPath, project, nodes } = get();
    const existing = nodes[id];
    if (!rootPath || !project || !existing) return;

    const allNodesBefore = Object.values(nodes);
    const toRemove = new Set([id, ...descendantIds(id, nodes)]);
    const nextNodes = Object.fromEntries(Object.entries(nodes).filter(([nodeId]) => !toRemove.has(nodeId)));
    const nextProject: Project = { ...project, rootOrder: project.rootOrder.filter((n) => n !== id) };

    set({ nodes: nextNodes, project: nextProject });
    void fsService.deleteNode(rootPath, existing, allNodesBefore);
    void fsService.saveProject(rootPath, nextProject);
  },
}));
