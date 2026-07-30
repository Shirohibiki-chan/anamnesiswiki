// In-memory node graph. Never imported directly by components — access is
// always through src/hooks/use-project.ts. See CLAUDE.md's layer order.
import { create } from "zustand";
import { join } from "@tauri-apps/api/path";
import {
  createNode,
  createProject,
  createTab,
  FOLDER_TEMPLATE_KEY,
  type Node,
  type Project,
  type Tab,
} from "../constants/schema";
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
  updateTabContent: (nodeId: string, tabId: string, content: Tab["content"]) => void;
  toggleTabHidden: (nodeId: string, tabId: string) => void;
  renameNode: (id: string, name: string) => void;
  moveNode: (id: string, newParentId: string | null, rootIndex?: number) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  setExpanded: (id: string, isOpen: boolean) => void;
};

// Debounce key for project.json metadata writes (selection, expanded state)
// that aren't node edits but shouldn't hammer disk on every click either.
const PROJECT_META_SAVE_KEY = "__project_meta__";

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

      // Every non-folder page starts with a single "Main" tab so the page
      // view has something to show before Phase 7's template registry can
      // supply a real default tab set per template.
      const tabs = input.templateKey === FOLDER_TEMPLATE_KEY ? [] : [createTab({ id: "main", label: "Main" })];
      const node = createNode({ ...input, tabs });
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

    updateTabContent(nodeId, tabId, content) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      const tabs = existing.tabs.map((tab) => (tab.id === tabId ? { ...tab, content } : tab));
      get().updateNode(nodeId, { tabs });
    },

    toggleTabHidden(nodeId, tabId) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      const tabs = existing.tabs.map((tab) => (tab.id === tabId ? { ...tab, hidden: !tab.hidden } : tab));
      get().updateNode(nodeId, { tabs });
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

    moveNode(id, newParentId, rootIndex) {
      const { rootPath, project, nodes } = get();
      const existing = nodes[id];
      if (!rootPath || !project || !existing) return;

      const allNodesBefore = Object.values(nodes);
      const updated: Node = { ...existing, parentId: newParentId, updatedAt: Date.now() };
      const nextNodes = { ...nodes, [id]: updated };

      let nextProject = project;
      if (newParentId === null) {
        // Leaving root, entering root, or just reordering within root — in
        // every case the node's final position in rootOrder is what matters.
        const withoutId = project.rootOrder.filter((n) => n !== id);
        const insertAt = rootIndex === undefined ? withoutId.length : Math.min(rootIndex, withoutId.length);
        const nextRootOrder = [...withoutId.slice(0, insertAt), id, ...withoutId.slice(insertAt)];
        nextProject = { ...project, rootOrder: nextRootOrder };
      } else if (existing.parentId === null) {
        nextProject = { ...project, rootOrder: project.rootOrder.filter((n) => n !== id) };
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

    duplicateNode(id) {
      const { rootPath, project, nodes } = get();
      const original = nodes[id];
      if (!rootPath || !project || !original) return;

      const subtreeIds = [id, ...descendantIds(id, nodes)];
      const idMap = new Map(subtreeIds.map((subId) => [subId, crypto.randomUUID()]));
      const now = Date.now();

      const clones: Node[] = subtreeIds.map((subId) => {
        const source = nodes[subId];
        const isRootOfDuplicate = subId === id;
        return {
          ...source,
          id: idMap.get(subId)!,
          parentId: isRootOfDuplicate ? source.parentId : (idMap.get(source.parentId!) ?? null),
          name: isRootOfDuplicate ? `${source.name} (Copy)` : source.name,
          createdAt: now,
          updatedAt: now,
        };
      });

      const nextNodes = { ...nodes };
      for (const clone of clones) nextNodes[clone.id] = clone;

      const cloneRootId = idMap.get(id)!;
      let nextProject = project;
      if (original.parentId === null) {
        const originalIndex = project.rootOrder.indexOf(id);
        const nextRootOrder = [...project.rootOrder];
        nextRootOrder.splice(originalIndex + 1, 0, cloneRootId);
        nextProject = { ...project, rootOrder: nextRootOrder };
      }

      set({ nodes: nextNodes, project: nextProject });
      for (const clone of clones) {
        void fsService.saveNode(rootPath, clone, Object.values(nextNodes)).then(markSaved);
      }
      if (nextProject !== project) void fsService.saveProject(rootPath, nextProject).then(markSaved);
    },

    selectNode(id) {
      const { rootPath, project } = get();
      if (!rootPath || !project) return;
      const nextProject: Project = { ...project, selectedId: id };
      set({ project: nextProject });
      scheduleSave(PROJECT_META_SAVE_KEY, () => fsService.saveProject(rootPath, nextProject).then(markSaved));
    },

    setExpanded(id, isOpen) {
      const { rootPath, project } = get();
      if (!rootPath || !project) return;
      const alreadyExpanded = project.expandedIds.includes(id);
      if (isOpen === alreadyExpanded) return;
      const expandedIds = isOpen
        ? [...project.expandedIds, id]
        : project.expandedIds.filter((expandedId) => expandedId !== id);
      const nextProject: Project = { ...project, expandedIds };
      set({ project: nextProject });
      scheduleSave(PROJECT_META_SAVE_KEY, () => fsService.saveProject(rootPath, nextProject).then(markSaved));
    },
  };
});
