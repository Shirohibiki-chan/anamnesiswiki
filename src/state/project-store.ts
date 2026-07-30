// In-memory node graph. Never imported directly by components — access is
// always through src/hooks/use-project.ts. See CLAUDE.md's layer order.
import { create } from "zustand";
import { join } from "@tauri-apps/api/path";
import { createNode, createProject, FOLDER_TEMPLATE_KEY, type Node, type Project } from "../constants/schema";
import * as fsService from "../services/filesystem-service";
import { scheduleSave } from "../services/autosave";

// Starter top-level folders for a brand-new project, matching the user's
// actual LK structure (see docs/plan.md Phase 2).
const STARTER_FOLDERS = ["Canon", "AUs", "Characters", "Locations", "Factions", "Worldbuilding"];

export type CreateProjectResult = { ok: true; rootPath: string } | { ok: false; error: string };

type ProjectStoreState = {
  rootPath: string | null;
  project: Project | null;
  nodes: Record<string, Node>;
  isLoaded: boolean;
  lastSavedAt: number | null;
  loadProject: (rootPath: string) => Promise<{ name: string } | null>;
  initializeProject: (rootPath: string, name: string) => Promise<void>;
  createProjectAt: (parentDir: string, name: string) => Promise<CreateProjectResult>;
  closeProject: () => void;
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

export const useProjectStore = create<ProjectStoreState>((set, get) => {
  const markSaved = () => set({ lastSavedAt: Date.now() });

  return {
    rootPath: null,
    project: null,
    nodes: {},
    isLoaded: false,
    lastSavedAt: null,

    async loadProject(rootPath) {
      const result = await fsService.loadProject(rootPath);
      if (!result) return null;
      const nodes = Object.fromEntries(result.nodes.map((n) => [n.id, n]));
      set({ rootPath, project: result.project, nodes, isLoaded: true });
      return { name: result.project.name };
    },

    async initializeProject(rootPath, name) {
      const project = createProject({ name });
      await fsService.saveProject(rootPath, project);
      set({ rootPath, project, nodes: {}, isLoaded: true });
      markSaved();
    },

    async createProjectAt(parentDir, name) {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "Give your project a name." };

      const folderName = fsService.sanitizeSegment(trimmed);
      const rootPath = await join(parentDir, folderName);
      if (await fsService.pathExists(rootPath)) {
        return { ok: false, error: "A folder with that name already exists there." };
      }

      await get().initializeProject(rootPath, trimmed);
      for (const folder of STARTER_FOLDERS) {
        get().addNode({ parentId: null, templateKey: FOLDER_TEMPLATE_KEY, name: folder });
      }
      return { ok: true, rootPath };
    },

    closeProject() {
      set({ rootPath: null, project: null, nodes: {}, isLoaded: false, lastSavedAt: null });
    },

    addNode(input) {
      const { rootPath, project, nodes } = get();
      if (!rootPath || !project) throw new Error("addNode: no project loaded");

      const node = createNode(input);
      const nextNodes = { ...nodes, [node.id]: node };
      const nextProject: Project =
        input.parentId === null ? { ...project, rootOrder: [...project.rootOrder, node.id] } : project;

      set({ nodes: nextNodes, project: nextProject });
      void fsService.saveNode(rootPath, node, Object.values(nextNodes)).then(markSaved);
      if (nextProject !== project) void fsService.saveProject(rootPath, nextProject).then(markSaved);
      return node;
    },

    updateNode(id, patch) {
      const { rootPath, nodes } = get();
      const existing = nodes[id];
      if (!rootPath || !existing) return;

      const updated: Node = { ...existing, ...patch, updatedAt: Date.now() };
      const nextNodes = { ...nodes, [id]: updated };
      set({ nodes: nextNodes });
      scheduleSave(id, () => fsService.saveNode(rootPath, updated, Object.values(nextNodes)).then(markSaved));
    },

    renameNode(id, name) {
      const { rootPath, nodes } = get();
      const existing = nodes[id];
      if (!rootPath || !existing) return;

      const allNodesBefore = Object.values(nodes);
      const updated: Node = { ...existing, name, updatedAt: Date.now() };
      const nextNodes = { ...nodes, [id]: updated };
      set({ nodes: nextNodes });
      void fsService.renameNode(rootPath, allNodesBefore, Object.values(nextNodes), id).then(markSaved);
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
      void fsService.moveNode(rootPath, allNodesBefore, Object.values(nextNodes), id).then(markSaved);
      if (nextProject !== project) void fsService.saveProject(rootPath, nextProject).then(markSaved);
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
      void fsService.deleteNode(rootPath, existing, allNodesBefore).then(markSaved);
      void fsService.saveProject(rootPath, nextProject).then(markSaved);
    },
  };
});
