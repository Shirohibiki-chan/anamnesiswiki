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
import { cancelSave, flushAllSaves, flushSave, scheduleSave, setSaveErrorHandler } from "../services/autosave";
import { canHaveChildren, getDefaultTabs } from "../services/template-registry";
import { orderSiblings } from "../services/tree-service";
import * as lkImportService from "../services/lk-import";
import type { ImportPendingImage } from "../services/lk-import";
import { countLabel } from "../services/history-service";
import { useHistoryStore } from "./history-store";

// Starter top-level folders for a brand-new project, matching the user's
// actual LK structure (see docs/plan.md Phase 2).
const STARTER_FOLDERS = ["Canon", "AUs", "Characters", "Locations", "Factions", "Worldbuilding"];

export type CreateProjectResult = { ok: true; rootPath: string } | { ok: false; error: string };

// ─── Undo support ───────────────────────────────────────────────────────────

// Enough of Project to put the tree back the way it was, and deliberately not
// the whole object. Selection and expanded folders are where the user is
// looking *now* — undoing a delete from ten minutes ago shouldn't also collapse
// the folders they've opened since.
type OrderingSnapshot = Pick<Project, "rootOrder" | "childOrder" | "homeNodeId">;

// A deleted page's picture, held in memory so undo can put it back. Nothing
// else in the app keeps a copy: images live in the flat assets/ dir and the
// delete removes the file, so the bytes have to be read before it happens.
type CapturedAsset = { fileName: string; bytes: Uint8Array };

/**
 * The image and banner files belonging to `nodes`, read off disk now. One that
 * won't read is skipped rather than failing the caller — losing the ability to
 * restore a picture is not a reason to refuse a delete the user asked for.
 */
async function captureAssets(rootPath: string, nodes: Node[]): Promise<CapturedAsset[]> {
  const captured: CapturedAsset[] = [];
  for (const node of nodes) {
    for (const fileName of [node.image, node.banner]) {
      if (!fileName) continue;
      try {
        captured.push({ fileName, bytes: await fsService.readAssetImage(rootPath, fileName) });
      } catch {
        // See above.
      }
    }
  }
  return captured;
}

export type ProjectStoreState = {
  rootPath: string | null;
  project: Project | null;
  nodes: Record<string, Node>;
  isLoaded: boolean;
  lastSavedAt: number | null;
  // Node files that couldn't be read on the last load (corrupt JSON, wrong
  // shape). Surfaced once by the shell, then dismissed — see LoadWarning.tsx.
  skippedFiles: string[];
  // Writes that didn't happen. Debounced saves run with no caller left to
  // catch anything, so without this a failed write is invisible and the app
  // goes on claiming "Saved" from the last one that worked — see SaveWarning.
  saveErrors: string[];
  // Pages that were found parked under a move's temp name on the last load and
  // put back. Worth telling the user about: it means an earlier move was
  // interrupted, and silence is what made that dangerous in the first place.
  recoveredCount: number;
  dismissRecovered: () => void;
  // Which tab to open on, when a page is being reached from somewhere that
  // knows the answer — a search result naming the tab its match came from.
  // Deliberately not part of Project: it's a single navigation, not state
  // worth writing to disk. Carries the node id as well so PageView can ignore
  // a leftover from an earlier jump instead of applying it to the wrong page.
  pendingFocus: { nodeId: string; tabId: string } | null;
  loadProject: (rootPath: string) => Promise<{ name: string } | null>;
  dismissSkippedFiles: () => void;
  dismissSaveErrors: () => void;
  initializeProject: (rootPath: string, name: string) => Promise<void>;
  createProjectAt: (parentDir: string, name: string) => Promise<CreateProjectResult>;
  importLkProject: (
    parentDir: string,
    name: string,
    plan: { nodes: Node[]; rootOrder: string[]; pendingImages: ImportPendingImage[]; homeNodeId: string | null },
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
  moveNode: (id: string, newParentId: string | null, index?: number) => void;
  moveNodes: (ids: string[], newParentId: string | null, index?: number) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  deleteNodes: (ids: string[]) => Promise<void>;
  duplicateNode: (id: string) => Promise<void>;
  // Colour has its own action rather than going through updateNode, so it can
  // be recorded as one undoable step across a whole multi-selection.
  setNodeColor: (ids: string[], color: string | undefined) => void;
  selectNode: (id: string | null, tabId?: string) => void;
  // Cmd+S. Runs every outstanding debounced write now, then shows "Saved" —
  // including when there was nothing pending, because "Saved" is a statement
  // about the state of the disk, not about a write having just happened. The
  // one case it stays quiet is a flush that failed; SaveWarning has that.
  saveNow: () => Promise<void>;
  setProjectHome: (id: string | null) => void;
  setExpanded: (id: string, isOpen: boolean) => void;
};

// Debounce key for project.json metadata writes (selection, expanded state)
// that aren't node edits but shouldn't hammer disk on every click either.
const PROJECT_META_SAVE_KEY = "__project_meta__";

// The sibling order as the tree is actually showing it right now — the stored
// manual order where there is one, creation order for everything else. Used as
// the base list a drop inserts into, so a never-reordered folder doesn't have
// to be seeded separately. Exported for LK export, which needs the same "order
// as shown" answer to write sibling positions the user will recognise.
export function orderedSiblingIds(
  nodes: Record<string, Node>,
  project: Project,
  parentId: string | null,
): string[] {
  const siblings = Object.values(nodes).filter((n) => n.parentId === parentId);
  const stored = parentId === null ? project.rootOrder : project.childOrder?.[parentId];
  return orderSiblings(siblings, stored).map((n) => n.id);
}

// Every descendant of `id`, breadth-first. Groups children by parent in one
// pass and then walks that grouping, rather than re-scanning the whole node
// record once per level — the recursive-filter shape this replaces re-read
// every node in the project for every node in the subtree.
function descendantIds(id: string, nodes: Record<string, Node>): string[] {
  const childIdsByParent = new Map<string | null, string[]>();
  for (const node of Object.values(nodes)) {
    const siblings = childIdsByParent.get(node.parentId);
    if (siblings) siblings.push(node.id);
    else childIdsByParent.set(node.parentId, [node.id]);
  }

  const collected: string[] = [];
  const queue: string[] = [id];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const childId of childIdsByParent.get(queue[cursor]) ?? []) {
      collected.push(childId);
      queue.push(childId);
    }
  }
  return collected;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => {
  const markSaved = () => set({ lastSavedAt: Date.now() });

  // Records a write that didn't happen so the shell can say so. Deduped:
  // a debounced save retries on every subsequent keystroke, and a page nested
  // too deep fails identically every time — one banner, not eighty. Capped
  // for the same reason, since a whole failing project would otherwise fill
  // the list with the same handful of causes.
  const recordSaveError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const { saveErrors } = get();
    if (saveErrors.includes(message) || saveErrors.length >= 10) return;
    set({ saveErrors: [...saveErrors, message] });
  };

  setSaveErrorHandler((_key, error) => recordSaveError(error));

  // Every direct disk write in this store goes through here. These calls are
  // deliberately not awaited — the UI updates from memory and shouldn't block
  // on the filesystem — but `void promise.then(markSaved)` leaves a rejection
  // with nowhere to go, so a failed write became an unhandled promise
  // rejection in a console nobody was reading while the app went on showing
  // "Saved". That is exactly the failure `setSaveErrorHandler` was built to
  // prevent, and it was only ever wired to autosave's debounced writes; every
  // other path — adding a page, moving one, deleting one — was silent.
  //
  // This has already cost the user real pages (2026-07-31: a half-completed
  // move left files stranded under temp names and said nothing). Don't
  // reintroduce a bare `void fsService.…` here.
  const track = (work: Promise<unknown>): void => {
    void work.then(markSaved).catch(recordSaveError);
  };

  const captureOrdering = (project: Project): OrderingSnapshot => ({
    rootOrder: project.rootOrder,
    childOrder: project.childOrder,
    homeNodeId: project.homeNodeId,
  });

  // Hands an undoable operation to the history stack. A no-op while an undo or
  // redo is running, so reversing something doesn't get recorded as a new
  // thing to reverse — history-store owns that guard.
  const record = (label: string, undo: () => Promise<void> | void, redo: () => Promise<void> | void): void => {
    useHistoryStore.getState().record({ label, undo, redo });
  };

  /**
   * Puts pages back: their files, their pictures, and the sibling order they
   * sat in. Also the primitive behind redoing anything that created pages.
   *
   * Disk first, memory second — the opposite of every other action in this
   * store, which updates memory immediately and lets the write catch up. That
   * asymmetry is deliberate. An optimistic undo that then fails to write
   * leaves the tree showing pages that aren't on disk, which is precisely the
   * shape of the bug that cost real pages on 2026-07-31. Throwing instead
   * lets history-store keep the entry and say it couldn't undo, so the next
   * press retries the whole thing.
   */
  const restoreNodes = async (restored: Node[], assets: CapturedAsset[], ordering: OrderingSnapshot): Promise<void> => {
    const { rootPath, project } = get();
    if (!rootPath || !project) return;

    // Pictures before the pages that point at them, so there is never a
    // moment where a restored page references a file that isn't there yet.
    for (const asset of assets) await fsService.saveAssetImage(rootPath, asset.fileName, asset.bytes);

    const nextNodes = { ...get().nodes };
    for (const node of restored) nextNodes[node.id] = node;
    const nextProject: Project = { ...project, ...ordering };

    if (restored.length > 0) await fsService.saveNodes(rootPath, restored, Object.values(nextNodes));
    await fsService.saveProject(rootPath, nextProject);

    set({ nodes: nextNodes, project: nextProject });
    markSaved();
  };

  // Sibling order and nothing else — the tail end of undoing a move, where the
  // pages are already back under the right parents but not in the right places.
  const restoreOrdering = (ordering: OrderingSnapshot): Promise<void> => restoreNodes([], [], ordering);

  // The write half of setProjectHome, split out so undo and redo can set an
  // exact value instead of going back through the action's toggle.
  const applyHome = (homeNodeId: string | null): void => {
    const { rootPath, project } = get();
    if (!rootPath || !project) return;
    const nextProject: Project = { ...project, homeNodeId };
    set({ project: nextProject });
    track(fsService.saveProject(rootPath, nextProject));
  };

  return {
    rootPath: null,
    project: null,
    nodes: {},
    isLoaded: false,
    lastSavedAt: null,
    skippedFiles: [],
    saveErrors: [],
    recoveredCount: 0,
    pendingFocus: null,

    // Resolves null for anything that means "this isn't an openable project"
    // — missing or unreadable project.json, an unreadable folder — so callers
    // have exactly one failure case to handle instead of a mix of nulls and
    // thrown errors. Individually damaged node files don't fail the load; they
    // come back in `skippedFiles` for the UI to report.
    async loadProject(rootPath) {
      let result: Awaited<ReturnType<typeof fsService.loadProject>>;
      try {
        result = await fsService.loadProject(rootPath);
      } catch {
        return null;
      }
      if (!result) return null;

      // Any entry still on the stack closes over the project being replaced,
      // and running one would write pages from the old world into the new one.
      useHistoryStore.getState().clear();

      const nodes = Object.fromEntries(result.nodes.map((n) => [n.id, n]));
      set({
        rootPath,
        project: result.project,
        nodes,
        isLoaded: true,
        skippedFiles: result.skipped,
        recoveredCount: result.recoveredCount,
      });
      return { name: result.project.name };
    },

    dismissSkippedFiles() {
      set({ skippedFiles: [] });
    },

    dismissRecovered() {
      set({ recoveredCount: 0 });
    },

    dismissSaveErrors() {
      set({ saveErrors: [] });
    },

    async initializeProject(rootPath, name) {
      useHistoryStore.getState().clear();
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
      // The starter folders are part of making the project, not six things the
      // user did — leaving them on the stack means the first Ctrl+Z in a brand
      // new world deletes "Worldbuilding".
      useHistoryStore.getState().clear();
      return { ok: true, rootPath };
    },

    // The Phase 8 LK-import path: unlike createProjectAt (a handful of stub
    // folders), this writes a whole already-built node graph converted by
    // src/services/lk-import.ts. Images live on LegendKeeper's own CDN, so
    // each pending one is fetched here (the single network call this app
    // ever makes, and only for this explicit, user-confirmed action — see
    // docs/handoff.md) before anything hits disk. A failed download just
    // leaves that one page without a picture rather than failing the import.
    async importLkProject(parentDir, name, plan) {
      const { nodes, rootOrder, pendingImages, homeNodeId } = plan;
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

      useHistoryStore.getState().clear();
      const project = { ...createProject({ name: trimmed, rootOrder }), homeNodeId };
      const nodesRecord = Object.fromEntries(nodes.map((n) => [n.id, n]));
      set({ rootPath, project, nodes: nodesRecord, isLoaded: true });

      await fsService.saveProject(rootPath, project);
      // One shared path index for the whole import rather than one per node —
      // an LK world is the largest single write this app ever does.
      await fsService.saveNodes(rootPath, nodes, nodes);
      markSaved();

      return { ok: true, rootPath };
    },

    closeProject() {
      useHistoryStore.getState().clear();
      set({
        rootPath: null,
        project: null,
        nodes: {},
        isLoaded: false,
        lastSavedAt: null,
        skippedFiles: [],
        saveErrors: [],
        recoveredCount: 0,
        pendingFocus: null,
      });
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
      track(fsService.saveNode(rootPath, node, Object.values(nextNodes)));
      if (nextProject !== project) track(fsService.saveProject(rootPath, nextProject));

      const orderingAfter = captureOrdering(nextProject);
      record(
        `adding "${node.name}"`,
        () => get().deleteNodes([node.id]),
        // The same node object, id included — creating a fresh one would leave
        // the undo half above pointing at a page that no longer exists.
        () => restoreNodes([node], [], orderingAfter),
      );
      return node;
    },

    updateNode(id, patch) {
      const { rootPath, nodes } = get();
      const existing = nodes[id];
      if (!rootPath || !existing) return;

      const updated: Node = { ...existing, ...patch, updatedAt: Date.now() };
      set({ nodes: { ...nodes, [id]: updated } });

      // Snapshot the graph when the debounce actually fires, not when it's
      // scheduled. Two reasons. This runs on every keystroke via
      // updateTabContent, so materializing the whole node array here would
      // allocate an n-element array per character typed. And a node's path
      // depends on its siblings, so a snapshot captured 300ms ago can resolve
      // against a graph that no longer exists — a sibling renamed inside the
      // debounce window shifts the collision suffixes, and the write lands at
      // a filename that's no longer the node's own.
      scheduleSave(id, () => {
        const { rootPath: currentRootPath, nodes: currentNodes } = get();
        const current = currentNodes[id];
        if (!currentRootPath || !current) return;
        return fsService.saveNode(currentRootPath, current, Object.values(currentNodes)).then(markSaved);
      });
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
      if (previousImage) track(fsService.deleteAssetImage(rootPath, previousImage));
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
      if (previousBanner) track(fsService.deleteAssetImage(rootPath, previousBanner));
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
      const previousName = existingAfter.name;
      const updated: Node = { ...existingAfter, name, updatedAt: Date.now() };
      const nextNodes = { ...nodesAfter, [id]: updated };
      set({ nodes: nextNodes });
      track(fsService.renameNode(rootPathAfter, allNodesBefore, Object.values(nextNodes), id));

      // A rename is its own inverse, so both halves are the ordinary action —
      // no new filesystem path is involved in undoing one.
      record(
        `renaming "${previousName}"`,
        () => get().renameNode(id, previousName),
        () => get().renameNode(id, name),
      );
    },

    async moveNode(id, newParentId, index) {
      await get().moveNodes([id], newParentId, index);
    },

    // A multi-selection drops as one operation. Looping moveNode instead
    // would fire several un-awaited filesystem relocations that each plan
    // across the whole graph — they'd interleave, and the later ones would
    // rename paths the earlier ones had already moved.
    async moveNodes(ids, newParentId, index) {
      const { rootPath, project, nodes } = get();
      if (!rootPath || !project) return;
      const moving = ids.filter((id) => nodes[id]);
      if (moving.length === 0) return;

      // A leaf template has no directory of its own, so a child filed under it
      // is written into a plain directory with no marker in it and vanishes
      // from the tree on the next load. The tree already refuses this drop
      // (TreePanel's disableDrop); this is the backstop, because losing a
      // subtree is too expensive to guard in one place only.
      if (newParentId) {
        const newParent = nodes[newParentId];
        if (!newParent || !canHaveChildren(newParent.templateKey)) return;
      }

      // Same stale-path race as renameNode above.
      await Promise.all(moving.map((id) => flushSave(id)));

      const { rootPath: rootPathAfter, project: projectAfter, nodes: nodesAfter } = get();
      if (!rootPathAfter || !projectAfter) return;
      const present = moving.filter((id) => nodesAfter[id]);
      if (present.length === 0) return;

      const allNodesBefore = Object.values(nodesAfter);
      const movingSet = new Set(present);
      const now = Date.now();
      const nextNodes = { ...nodesAfter };
      for (const id of present) nextNodes[id] = { ...nodesAfter[id], parentId: newParentId, updatedAt: now };

      // Every drop is "put these nodes at this position under this parent",
      // whether that's the root or a folder, whether the parent changed or
      // not. The destination list is rebuilt from the sibling order actually
      // on screen (not from whatever partial list is stored) so a folder that
      // has never been reordered still gets a complete, correct list the
      // first time something is dropped into it. Dragged nodes keep their own
      // relative order, which is the order react-arborist hands them over in.
      const destinationIds = orderedSiblingIds(nextNodes, projectAfter, newParentId).filter((n) => !movingSet.has(n));
      const insertAt = index === undefined ? destinationIds.length : Math.min(Math.max(index, 0), destinationIds.length);
      const destinationOrder = [...destinationIds.slice(0, insertAt), ...present, ...destinationIds.slice(insertAt)];

      let nextProject: Project =
        newParentId === null
          ? { ...projectAfter, rootOrder: destinationOrder }
          : { ...projectAfter, childOrder: { ...projectAfter.childOrder, [newParentId]: destinationOrder } };

      // Drop them out of wherever they used to live, so a stale entry can't
      // pull one back to an old position if it's ever moved home again. A
      // multi-selection can span several old parents.
      const oldParentIds = new Set(present.map((id) => nodesAfter[id].parentId).filter((p) => p !== newParentId));
      for (const oldParentId of oldParentIds) {
        if (oldParentId === null) {
          nextProject = { ...nextProject, rootOrder: nextProject.rootOrder.filter((n) => !movingSet.has(n)) };
        } else if (nextProject.childOrder?.[oldParentId]) {
          nextProject = {
            ...nextProject,
            childOrder: {
              ...nextProject.childOrder,
              [oldParentId]: nextProject.childOrder[oldParentId].filter((n) => !movingSet.has(n)),
            },
          };
        }
      }

      set({ nodes: nextNodes, project: nextProject });
      track(fsService.moveNodes(rootPathAfter, allNodesBefore, Object.values(nextNodes), present));
      if (nextProject !== projectAfter) track(fsService.saveProject(rootPathAfter, nextProject));

      // Where each one came from. A multi-selection can be dragged out of
      // several different folders at once, so putting them back is one move
      // per old parent, not one move.
      const previousParents = new Map(present.map((id) => [id, nodesAfter[id].parentId]));
      const orderingBefore = captureOrdering(projectAfter);
      const orderingAfter = captureOrdering(nextProject);
      const groupsByOldParent = new Map<string | null, string[]>();
      for (const [id, parentId] of previousParents) {
        const group = groupsByOldParent.get(parentId);
        if (group) group.push(id);
        else groupsByOldParent.set(parentId, [id]);
      }

      record(
        `moving ${countLabel(present.length, "page")}`,
        async () => {
          for (const [parentId, groupIds] of groupsByOldParent) await get().moveNodes(groupIds, parentId);
          // moveNodes appends when it isn't told an index, which is rarely
          // where they were. The recorded order is the exact answer.
          await restoreOrdering(orderingBefore);
        },
        async () => {
          await get().moveNodes(present, newParentId, index);
          await restoreOrdering(orderingAfter);
        },
      );
    },

    deleteNode(id) {
      return get().deleteNodes([id]);
    },

    // The tree can hand up a whole multi-selection, and that has to be one
    // operation rather than a loop over deleteNode: each delete renumbers
    // colliding siblings on disk, so a second call would resolve its target
    // against a layout the first had already changed underneath it.
    async deleteNodes(ids) {
      // A first pass purely to know which pictures to read, because after the
      // delete there is nothing left to read them from. State is re-read below
      // rather than reused, since this awaits. If something changed underneath
      // in that window the worst case is a picture captured that didn't need
      // to be, or one missed — not a wrong delete.
      const planning = get();
      if (!planning.rootPath || !planning.project) return;
      const plannedIds = new Set(
        ids.filter((id) => planning.nodes[id]).flatMap((id) => [id, ...descendantIds(id, planning.nodes)]),
      );
      const capturedAssets = await captureAssets(
        planning.rootPath,
        [...plannedIds].map((id) => planning.nodes[id]).filter(Boolean),
      );

      const { rootPath, project, nodes } = get();
      if (!rootPath || !project) return;

      const existing = ids.filter((id) => nodes[id]);
      if (existing.length === 0) return;

      const allNodesBefore = Object.values(nodes);
      const toRemove = new Set(existing.flatMap((id) => [id, ...descendantIds(id, nodes)]));
      // Only the roots of the removal go to disk. A selection can easily hold
      // both a folder and something inside it, and a directory-storage node
      // takes its whole subtree with it — asking for the child as well would
      // try to remove a path its parent already took.
      const removalRoots = existing.filter((id) => {
        const parentId = nodes[id].parentId;
        return !parentId || !toRemove.has(parentId);
      });
      // Cancel (not flush) any pending debounced writes for everything being
      // deleted — a stale write firing after deletion would silently
      // resurrect the file/directory that was just removed.
      for (const removedId of toRemove) cancelSave(removedId);
      const nextNodes = Object.fromEntries(Object.entries(nodes).filter(([nodeId]) => !toRemove.has(nodeId)));
      // Prune the manual sibling order too — both the entries *for* deleted
      // parents and any mention *of* a deleted node inside a surviving
      // parent's list. Stale ids sort harmlessly, but left alone they'd
      // accumulate in project.json forever.
      const nextChildOrder: Record<string, string[]> = {};
      for (const [parentId, order] of Object.entries(project.childOrder ?? {})) {
        if (toRemove.has(parentId)) continue;
        nextChildOrder[parentId] = order.filter((nodeId) => !toRemove.has(nodeId));
      }
      const nextProject: Project = {
        ...project,
        rootOrder: project.rootOrder.filter((n) => !toRemove.has(n)),
        childOrder: nextChildOrder,
        // Home is an ordinary page, so it can be deleted like any other — but
        // a dangling homeNodeId would leave the house button pointing at
        // nothing. Cleared here, including when home was merely *inside* the
        // subtree being deleted rather than its root.
        homeNodeId: project.homeNodeId && toRemove.has(project.homeNodeId) ? null : project.homeNodeId,
        // Selection survives a delete only if what was selected is still
        // there — a stale selectedId leaves the page view rendering nothing
        // with no way back to a real page.
        selectedId: project.selectedId && toRemove.has(project.selectedId) ? null : project.selectedId,
      };

      set({ nodes: nextNodes, project: nextProject });
      track(
        fsService.deleteNodes(rootPath, removalRoots.map((id) => nodes[id]), allNodesBefore, Object.values(nextNodes)),
      );
      track(fsService.saveProject(rootPath, nextProject));
      // A deleted node's own uploaded image/banner (see ImageSlot Phase 6,
      // PageBanner Phase 8) lives in the flat assets/ dir, not inside the
      // node's own file/directory, so fsService.deleteNodes above never
      // touches either — clean them up here or they orphan forever.
      for (const removedId of toRemove) {
        const removed = nodes[removedId];
        if (removed?.image) track(fsService.deleteAssetImage(rootPath, removed.image));
        if (removed?.banner) track(fsService.deleteAssetImage(rootPath, removed.banner));
      }

      // Descendants as well as what was selected — undoing a folder delete has
      // to bring back everything that was inside it.
      const removedNodes = [...toRemove].map((id) => nodes[id]).filter(Boolean);
      const orderingBefore = captureOrdering(project);
      record(
        `deleting ${countLabel(existing.length, "page")}`,
        () => restoreNodes(removedNodes, capturedAssets, orderingBefore),
        // Redoing re-reads the pictures it's about to delete, which is wasted
        // work — the bytes captured above are still good, since restoreNodes
        // wrote them back under the same names. Not worth a second code path.
        () => get().deleteNodes(existing),
      );
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

      // A copy belongs directly after what it was copied from, wherever that
      // is — at the root or inside a folder. Without the folder half, a
      // duplicate made inside a folder jumped to the bottom of the list.
      const cloneRootId = idMap.get(id)!;
      const siblingIds = orderedSiblingIds(nextNodes, project, original.parentId).filter((n) => n !== cloneRootId);
      const originalIndex = siblingIds.indexOf(id);
      const withClone = [...siblingIds];
      withClone.splice(originalIndex === -1 ? withClone.length : originalIndex + 1, 0, cloneRootId);

      const nextProject: Project =
        original.parentId === null
          ? { ...project, rootOrder: withClone }
          : { ...project, childOrder: { ...project.childOrder, [original.parentId]: withClone } };

      set({ nodes: nextNodes, project: nextProject });
      // Duplicating a folder writes its whole subtree, so the clones share one
      // path index rather than each rebuilding it from the full graph.
      track(fsService.saveNodes(rootPath, clones, Object.values(nextNodes)));
      if (nextProject !== project) track(fsService.saveProject(rootPath, nextProject));

      // The clones' own copies of the pictures, read only if the user actually
      // undoes — the undo is about to delete those files, and redo needs them
      // back. Capturing eagerly would mean re-reading every image in a
      // duplicated folder on the chance that it's wanted.
      let clonedAssets: CapturedAsset[] = [];
      const orderingBefore = captureOrdering(project);
      const orderingAfter = captureOrdering(nextProject);
      record(
        `duplicating "${original.name}"`,
        async () => {
          const currentRootPath = get().rootPath;
          if (currentRootPath) clonedAssets = await captureAssets(currentRootPath, clones);
          await get().deleteNodes([cloneRootId]);
          await restoreOrdering(orderingBefore);
        },
        () => restoreNodes(clones, clonedAssets, orderingAfter),
      );
    },

    // One step for the whole selection, and its own action rather than a loop
    // over updateNode at the call site, because a loop is several undo entries
    // for what the user did once.
    setNodeColor(ids, color) {
      const { nodes } = get();
      const targets = ids.filter((id) => nodes[id]);
      if (targets.length === 0) return;

      const previousColors = new Map(targets.map((id) => [id, nodes[id].color]));
      const apply = (next: (id: string) => string | undefined) => {
        for (const id of targets) get().updateNode(id, { color: next(id) });
      };

      apply(() => color);
      record(
        `recolouring ${countLabel(targets.length, "page")}`,
        () => apply((id) => previousColors.get(id)),
        () => apply(() => color),
      );
    },

    // `tabId` is for callers that know which tab they mean — a search result
    // naming the tab its match was found in. Everything else omits it, and
    // clearing it here is what stops one jump's tab leaking into the next.
    // Expanding the target's ancestors is deliberately *not* done here:
    // TreePanel already does it for every selection however it was made.
    selectNode(id, tabId) {
      const { rootPath, project } = get();
      if (!rootPath || !project) return;
      const nextProject: Project = { ...project, selectedId: id };
      set({ project: nextProject, pendingFocus: id && tabId ? { nodeId: id, tabId } : null });
      scheduleSave(PROJECT_META_SAVE_KEY, () => fsService.saveProject(rootPath, nextProject).then(markSaved));
    },

    async saveNow() {
      const failedCount = await flushAllSaves();
      if (failedCount === 0) markSaved();
    },

    // Designating a page as this world's home. Written immediately rather than
    // through the debounced metadata path selection/expansion use — this is a
    // deliberate act the user just performed, not incidental UI state, and it
    // should survive a crash in the next 300ms.
    setProjectHome(id) {
      const { rootPath, project, nodes } = get();
      if (!rootPath || !project) return;
      if (id !== null && !nodes[id]) return;
      const previousHomeNodeId = project.homeNodeId ?? null;
      const homeNodeId = project.homeNodeId === id ? null : id;
      applyHome(homeNodeId);
      record(
        "the home page change",
        () => applyHome(previousHomeNodeId),
        () => applyHome(homeNodeId),
      );
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
