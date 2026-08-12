// The only import path components have into project-store.ts. See CLAUDE.md's
// layer order — components never import stores directly.
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useProjectStore } from "../state/project-store";
import { buildTemplateTree, listTemplates, type TemplateTreeItem } from "../services/template-library";
import type { Node } from "../constants/schema";

// Subscribes to the *whole* store: any change anywhere re-renders the caller.
// Fine for the handful of components that genuinely track broad state (the
// tree panel, the properties panel, the page view). Anything that renders
// once per node, or once per mention inside a document, should use one of the
// narrow hooks below instead — every keystroke replaces the `nodes` map, so a
// full subscription in a per-row component re-renders every row on every
// character typed.
export function useProject() {
  return useProjectStore();
}

// Store actions are created once and never replaced, so selecting them yields
// permanently stable references — a component that only dispatches never
// re-renders from a store update at all.
export function useProjectActions() {
  return useProjectStore(
    useShallow((state) => ({
      dismissSkippedFiles: state.dismissSkippedFiles,
      dismissSaveErrors: state.dismissSaveErrors,
      addNode: state.addNode,
      updateNode: state.updateNode,
      applyTemplate: state.applyTemplate,
      addTab: state.addTab,
      renameNode: state.renameNode,
      moveNode: state.moveNode,
      moveNodes: state.moveNodes,
      deleteNode: state.deleteNode,
      deleteNodes: state.deleteNodes,
      duplicateNodes: state.duplicateNodes,
      sortChildren: state.sortChildren,
      saveAsTemplate: state.saveAsTemplate,
      deleteTemplate: state.deleteTemplate,
      applyCustomTemplate: state.applyCustomTemplate,
      setNodeColor: state.setNodeColor,
      setNodeHidden: state.setNodeHidden,
      selectNode: state.selectNode,
      setProjectHome: state.setProjectHome,
      togglePinned: state.togglePinned,
      setFocus: state.setFocus,
      setExpanded: state.setExpanded,
    })),
  );
}

// One node, by id. Re-renders only when *that* node's object changes — so
// editing one page leaves every other page's tree row alone.
export function useNode(nodeId: string | null | undefined): Node | undefined {
  return useProjectStore((state) => (nodeId ? state.nodes[nodeId] : undefined));
}

export function useProjectName(): string | undefined {
  return useProjectStore((state) => state.project?.name);
}

// The page designated as this world's home, if any. Narrow on purpose: every
// tree row asks whether it's the home page, and a full-store subscription in a
// per-row component re-renders the whole tree on every keystroke.
export function useProjectHomeId(): string | null {
  return useProjectStore((state) => state.project?.homeNodeId ?? null);
}

export function useProjectRootPath(): string | null {
  return useProjectStore((state) => state.rootPath);
}

export function useLastSavedAt(): number | null {
  return useProjectStore((state) => state.lastSavedAt);
}

// Cmd+S. A store action, so the reference is stable and the shortcut listener
// isn't rebuilt on every keystroke — see hooks/use-global-shortcuts.ts.
export function useSaveNow(): () => Promise<void> {
  return useProjectStore((state) => state.saveNow);
}

// Writes that failed. Separate from skippedFiles: one is "we couldn't read
// this when opening", the other is "we couldn't write this just now."
export function useSaveErrors(): string[] {
  return useProjectStore(useShallow((state) => state.saveErrors));
}

// The pinned pages, in the order they were pinned. Narrow on purpose: every
// tree row asks whether it's pinned, and a full-store subscription in a
// per-row component re-renders the whole tree on every keystroke.
export function usePinnedIds(): string[] {
  return useProjectStore(useShallow((state) => state.project?.pinnedIds ?? []));
}

export function useIsPinned(nodeId: string): boolean {
  return useProjectStore((state) => (state.project?.pinnedIds ?? []).includes(nodeId));
}

/**
 * This world's own templates, in the order they should be offered.
 *
 * Returns the roots only — a template's sub-pages are its business, not
 * something to list beside it. Recomputed from the library rather than stored
 * sorted, the same way the tree derives its order (see tree-service).
 */
export function useCustomTemplates(): Node[] {
  const templates = useProjectStore((state) => state.templates);
  return useMemo(() => listTemplates(templates), [templates]);
}

/**
 * The same templates nested, for the Templates tab.
 *
 * Separate from `useCustomTemplates` rather than replacing it: the new-page
 * screen genuinely only wants the roots, and handing it a tree it has to
 * flatten again would make every page-creation render pay for a shape only one
 * view uses.
 */
export function useCustomTemplateTree(): TemplateTreeItem[] {
  const templates = useProjectStore((state) => state.templates);
  return useMemo(() => buildTemplateTree(templates), [templates]);
}
