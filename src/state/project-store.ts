// In-memory node graph. Never imported directly by components — access is
// always through src/hooks/use-project.ts. See CLAUDE.md's layer order.
import { create } from "zustand";
import { join } from "@tauri-apps/api/path";
import {
  createNode,
  createProject,
  createTab,
  FOLDER_TEMPLATE_KEY,
  type CustomPropertySpec,
  type Node,
  type Project,
  type Tab,
} from "../constants/schema";
import * as fsService from "../services/filesystem-service";
import { cancelSave, flushSave, scheduleSave } from "../services/autosave";
import { getDefaultTabs } from "../services/template-registry";
import * as lkImportService from "../services/lk-import";
import type { ImportPendingImage } from "../services/lk-import";

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
  importLkProject: (
    parentDir: string,
    name: string,
    nodes: Node[],
    rootOrder: string[],
    pendingImages: ImportPendingImage[],
  ) => Promise<CreateProjectResult>;
  closeProject: () => void;
  addNode: (input: { parentId: string | null; templateKey: string; name: string }) => Node;
  updateNode: (id: string, patch: Partial<Omit<Node, "id">>) => void;
  updateTabContent: (nodeId: string, tabId: string, content: Tab["content"]) => void;
  toggleTabHidden: (nodeId: string, tabId: string) => void;
  addTab: (nodeId: string, label: string) => Tab;
  renameTab: (nodeId: string, tabId: string, label: string) => void;
  deleteTab: (nodeId: string, tabId: string) => void;
  reorderTabs: (nodeId: string, orderedTabIds: string[]) => void;
  applyTemplate: (nodeId: string, templateKey: string) => void;
  updateNodeProperty: (nodeId: string, key: string, value: unknown) => void;
  updateNodeTags: (nodeId: string, tags: string[]) => void;
  addCustomProperty: (nodeId: string, label: string, type: CustomPropertySpec["type"]) => void;
  removeCustomProperty: (nodeId: string, key: string) => void;
  setNodeImage: (nodeId: string, data: Uint8Array, extension: string) => Promise<void>;
  clearNodeImage: (nodeId: string) => Promise<void>;
  setNodeBanner: (nodeId: string, data: Uint8Array, extension: string) => Promise<void>;
  setBannerFocus: (nodeId: string, focusY: number) => void;
  clearNodeBanner: (nodeId: string) => Promise<void>;
  renameNode: (id: string, name: string) => void;
  moveNode: (id: string, newParentId: string | null, rootIndex?: number) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => Promise<void>;
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

    // The Phase 8 LK-import path: unlike createProjectAt (a handful of stub
    // folders), this writes a whole already-built node graph converted by
    // src/services/lk-import.ts. Images live on LegendKeeper's own CDN, so
    // each pending one is fetched here (the single network call this app
    // ever makes, and only for this explicit, user-confirmed action — see
    // docs/handoff.md) before anything hits disk. A failed download just
    // leaves that one page without a picture rather than failing the import.
    async importLkProject(parentDir, name, nodes, rootOrder, pendingImages) {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "Give your project a name." };

      const folderName = fsService.sanitizeSegment(trimmed);
      const rootPath = await join(parentDir, folderName);
      if (await fsService.pathExists(rootPath)) {
        return { ok: false, error: "A folder with that name already exists there." };
      }

      for (const pending of pendingImages) {
        try {
          const bytes = await lkImportService.fetchLkImage(pending.url);
          const fileName = `${crypto.randomUUID()}.${lkImportService.extensionFromUrl(pending.url)}`;
          await fsService.saveAssetImage(rootPath, fileName, bytes);
          const node = nodes.find((n) => n.id === pending.nodeId);
          if (node) node[pending.field] = fileName;
        } catch {
          // Ignore — see comment above.
        }
      }

      const project = createProject({ name: trimmed, rootOrder });
      const nodesRecord = Object.fromEntries(nodes.map((n) => [n.id, n]));
      set({ rootPath, project, nodes: nodesRecord, isLoaded: true });

      await fsService.saveProject(rootPath, project);
      await Promise.all(nodes.map((node) => fsService.saveNode(rootPath, node, nodes)));
      markSaved();

      return { ok: true, rootPath };
    },

    closeProject() {
      set({ rootPath: null, project: null, nodes: {}, isLoaded: false, lastSavedAt: null });
    },

    addNode(input) {
      const { rootPath, project, nodes } = get();
      if (!rootPath || !project) throw new Error("addNode: no project loaded");

      const tabs = getDefaultTabs(input.templateKey);
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

    addTab(nodeId, label) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) throw new Error("addTab: node not found");
      const tab = createTab({ id: crypto.randomUUID(), label });
      get().updateNode(nodeId, { tabs: [...existing.tabs, tab] });
      return tab;
    },

    renameTab(nodeId, tabId, label) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      const tabs = existing.tabs.map((tab) => (tab.id === tabId ? { ...tab, label } : tab));
      get().updateNode(nodeId, { tabs });
    },

    deleteTab(nodeId, tabId) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      const tabs = existing.tabs.filter((tab) => tab.id !== tabId);
      get().updateNode(nodeId, { tabs });
    },

    // Takes the full post-drag tab id order (dnd-kit's arrayMove already
    // computed it in PageTabs.tsx) rather than a from/to pair — simpler and
    // unambiguous versus re-deriving insert-before-or-after from two ids.
    reorderTabs(nodeId, orderedTabIds) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      const byId = new Map(existing.tabs.map((tab) => [tab.id, tab]));
      const tabs = orderedTabIds.map((id) => byId.get(id)).filter((tab): tab is Tab => Boolean(tab));
      if (tabs.length !== existing.tabs.length) return;
      get().updateNode(nodeId, { tabs });
    },

    // Sets a page's template and adds that template's default tabs — but
    // only the ones this page doesn't already have (by id), so applying a
    // template to a blank page that's already been written in never
    // clobbers the user's own tabs/content. Used by Phase 7's "Apply a
    // template" prompt on blank pages (see PropertiesPanel.tsx).
    applyTemplate(nodeId, templateKey) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      const existingTabIds = new Set(existing.tabs.map((tab) => tab.id));
      const newTabs = getDefaultTabs(templateKey).filter((tab) => !existingTabIds.has(tab.id));
      get().updateNode(nodeId, { templateKey, tabs: [...existing.tabs, ...newTabs] });
    },

    updateNodeProperty(nodeId, key, value) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      get().updateNode(nodeId, { properties: { ...existing.properties, [key]: value } });
    },

    updateNodeTags(nodeId, tags) {
      get().updateNode(nodeId, { tags });
    },

    addCustomProperty(nodeId, label, type) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      const spec: CustomPropertySpec = { key: crypto.randomUUID(), label, type };
      get().updateNode(nodeId, { customProperties: [...(existing.customProperties ?? []), spec] });
    },

    removeCustomProperty(nodeId, key) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      const customProperties = (existing.customProperties ?? []).filter((spec) => spec.key !== key);
      const properties = { ...existing.properties };
      delete properties[key];
      get().updateNode(nodeId, { customProperties, properties });
    },

    async setNodeImage(nodeId, data, extension) {
      const { rootPath, nodes } = get();
      const existing = nodes[nodeId];
      if (!rootPath || !existing) return;

      const fileName = `${crypto.randomUUID()}.${extension}`;
      await fsService.saveAssetImage(rootPath, fileName, data);
      // Drop the old file only after the new one is safely written, and only
      // if this node still exists (it could have been deleted mid-upload).
      const previousImage = get().nodes[nodeId]?.image;
      get().updateNode(nodeId, { image: fileName });
      if (previousImage) void fsService.deleteAssetImage(rootPath, previousImage);
    },

    async clearNodeImage(nodeId) {
      const { rootPath, nodes } = get();
      const existing = nodes[nodeId];
      if (!rootPath || !existing?.image) return;
      const previousImage = existing.image;
      get().updateNode(nodeId, { image: undefined });
      await fsService.deleteAssetImage(rootPath, previousImage);
    },

    // The page-header cover image (Phase 8's PageBanner) — a separate slot
    // from setNodeImage's sidebar portrait above, matching LegendKeeper's own
    // banner-vs-sidebar-image distinction.
    async setNodeBanner(nodeId, data, extension) {
      const { rootPath, nodes } = get();
      const existing = nodes[nodeId];
      if (!rootPath || !existing) return;

      const fileName = `${crypto.randomUUID()}.${extension}`;
      await fsService.saveAssetImage(rootPath, fileName, data);
      const previousBanner = get().nodes[nodeId]?.banner;
      get().updateNode(nodeId, { banner: fileName, bannerFocusY: 50 });
      if (previousBanner) void fsService.deleteAssetImage(rootPath, previousBanner);
    },

    setBannerFocus(nodeId, focusY) {
      get().updateNode(nodeId, { bannerFocusY: Math.min(100, Math.max(0, focusY)) });
    },

    async clearNodeBanner(nodeId) {
      const { rootPath, nodes } = get();
      const existing = nodes[nodeId];
      if (!rootPath || !existing?.banner) return;
      const previousBanner = existing.banner;
      get().updateNode(nodeId, { banner: undefined, bannerFocusY: undefined });
      await fsService.deleteAssetImage(rootPath, previousBanner);
    },

    async renameNode(id, name) {
      const { rootPath, nodes } = get();
      const existing = nodes[id];
      if (!rootPath || !existing) return;

      // A rename/move changes where this node resolves on disk. If a
      // debounced content edit for this same node is still pending, flush it
      // first so it lands at the *old* path before that path stops existing
      // — otherwise it fires later with a stale pre-rename path snapshot and
      // either silently fails or resurrects a duplicate directory (this
      // orphaned a page mid-testing during Phase 5; see docs/handoff.md).
      await flushSave(id);

      const { rootPath: rootPathAfter, nodes: nodesAfter } = get();
      const existingAfter = nodesAfter[id];
      if (!rootPathAfter || !existingAfter) return;

      const allNodesBefore = Object.values(nodesAfter);
      const updated: Node = { ...existingAfter, name, updatedAt: Date.now() };
      const nextNodes = { ...nodesAfter, [id]: updated };
      set({ nodes: nextNodes });
      void fsService.renameNode(rootPathAfter, allNodesBefore, Object.values(nextNodes), id).then(markSaved);
    },

    async moveNode(id, newParentId, rootIndex) {
      const { rootPath, project, nodes } = get();
      const existing = nodes[id];
      if (!rootPath || !project || !existing) return;

      // Same stale-path race as renameNode above.
      await flushSave(id);

      const { rootPath: rootPathAfter, project: projectAfter, nodes: nodesAfter } = get();
      const existingAfter = nodesAfter[id];
      if (!rootPathAfter || !projectAfter || !existingAfter) return;

      const allNodesBefore = Object.values(nodesAfter);
      const updated: Node = { ...existingAfter, parentId: newParentId, updatedAt: Date.now() };
      const nextNodes = { ...nodesAfter, [id]: updated };

      let nextProject = projectAfter;
      if (newParentId === null) {
        // Leaving root, entering root, or just reordering within root — in
        // every case the node's final position in rootOrder is what matters.
        const withoutId = projectAfter.rootOrder.filter((n) => n !== id);
        const insertAt = rootIndex === undefined ? withoutId.length : Math.min(rootIndex, withoutId.length);
        const nextRootOrder = [...withoutId.slice(0, insertAt), id, ...withoutId.slice(insertAt)];
        nextProject = { ...projectAfter, rootOrder: nextRootOrder };
      } else if (existingAfter.parentId === null) {
        nextProject = { ...projectAfter, rootOrder: projectAfter.rootOrder.filter((n) => n !== id) };
      }

      set({ nodes: nextNodes, project: nextProject });
      void fsService.moveNode(rootPathAfter, allNodesBefore, Object.values(nextNodes), id).then(markSaved);
      if (nextProject !== projectAfter) void fsService.saveProject(rootPathAfter, nextProject).then(markSaved);
    },

    deleteNode(id) {
      const { rootPath, project, nodes } = get();
      const existing = nodes[id];
      if (!rootPath || !project || !existing) return;

      const allNodesBefore = Object.values(nodes);
      const toRemove = new Set([id, ...descendantIds(id, nodes)]);
      // Cancel (not flush) any pending debounced writes for everything being
      // deleted — a stale write firing after deletion would silently
      // resurrect the file/directory that was just removed.
      for (const removedId of toRemove) cancelSave(removedId);
      const nextNodes = Object.fromEntries(Object.entries(nodes).filter(([nodeId]) => !toRemove.has(nodeId)));
      const nextProject: Project = { ...project, rootOrder: project.rootOrder.filter((n) => n !== id) };

      set({ nodes: nextNodes, project: nextProject });
      void fsService.deleteNode(rootPath, existing, allNodesBefore).then(markSaved);
      void fsService.saveProject(rootPath, nextProject).then(markSaved);
      // A deleted node's own uploaded image/banner (see ImageSlot Phase 6,
      // PageBanner Phase 8) lives in the flat assets/ dir, not inside the
      // node's own file/directory, so fsService.deleteNode above never
      // touches either — clean them up here or they orphan forever.
      for (const removedId of toRemove) {
        const removed = nodes[removedId];
        if (removed?.image) void fsService.deleteAssetImage(rootPath, removed.image);
        if (removed?.banner) void fsService.deleteAssetImage(rootPath, removed.banner);
      }
    },

    async duplicateNode(id) {
      const { rootPath, project, nodes } = get();
      const original = nodes[id];
      if (!rootPath || !project || !original) return;

      const subtreeIds = [id, ...descendantIds(id, nodes)];
      const idMap = new Map(subtreeIds.map((subId) => [subId, crypto.randomUUID()]));
      const now = Date.now();

      const clones: Node[] = await Promise.all(
        subtreeIds.map(async (subId) => {
          const source = nodes[subId];
          const isRootOfDuplicate = subId === id;
          // A clone must get its own copy of the image/banner file — sharing
          // the original's filename would mean deleting/replacing it on
          // either the original or the copy later deletes it out from under
          // the other (fsService has no dedicated "copy" — read + rewrite
          // under a fresh name does the same thing).
          const projectRootPath: string = rootPath;
          async function cloneAsset(fileName: string | undefined): Promise<string | undefined> {
            if (!fileName) return fileName;
            const extension = fileName.slice(fileName.lastIndexOf(".") + 1);
            const clonedFileName = `${crypto.randomUUID()}.${extension}`;
            const bytes = await fsService.readAssetImage(projectRootPath, fileName);
            await fsService.saveAssetImage(projectRootPath, clonedFileName, bytes);
            return clonedFileName;
          }
          const [image, banner] = await Promise.all([cloneAsset(source.image), cloneAsset(source.banner)]);
          return {
            ...source,
            id: idMap.get(subId)!,
            parentId: isRootOfDuplicate ? source.parentId : (idMap.get(source.parentId!) ?? null),
            name: isRootOfDuplicate ? `${source.name} (Copy)` : source.name,
            image,
            banner,
            createdAt: now,
            updatedAt: now,
          };
        }),
      );

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
