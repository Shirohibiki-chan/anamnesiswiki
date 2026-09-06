// The only import path components have into project-store.ts. See CLAUDE.md's
// layer order — components never import stores directly.
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useProjectStore } from "../state/project-store";
import { buildTemplateTree, listTemplates, type TemplateTreeItem } from "../services/template-library";
import { convertibleToUniverse, listUniverses, selectedUniverse, sharedUniverse } from "../services/tree-service";
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
      acknowledgeSkippedFiles: state.acknowledgeSkippedFiles,
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
      setNodeIcon: state.setNodeIcon,
      setNodeHidden: state.setNodeHidden,
      selectNode: state.selectNode,
      openBlockLink: state.openBlockLink,
      clearPendingAnchor: state.clearPendingAnchor,
      setProjectHome: state.setProjectHome,
      togglePinned: state.togglePinned,
      setFocus: state.setFocus,
      setSelectedUniverse: state.setSelectedUniverse,
      setSharedUniverse: state.setSharedUniverse,
      setExpanded: state.setExpanded,
    })),
  );
}

/**
 * The world's universes, and which one the tree is showing (Phase 22).
 *
 * Derived rather than stored, and shallow-compared, so the header only
 * re-renders when the list or the choice actually changes — not on every
 * keystroke typed into a page, which replaces the `nodes` map every time.
 *
 * `current` is null both for "all universes" and for a stored id that no
 * longer names one; the switcher shows the same thing either way, and
 * `selectedUniverse` is where that equivalence is decided.
 *
 * `convertible` is what the add menu offers as "use a page you already have",
 * and `shared` is the one whose pages ride along under whichever is selected.
 */
export function useUniverses(): {
  universes: Node[];
  current: Node | null;
  convertible: Node[];
  shared: Node | null;
} {
  const universes = useProjectStore(
    useShallow((state) => listUniverses(state.nodes, state.project?.rootOrder ?? [])),
  );
  const convertible = useProjectStore(
    useShallow((state) => convertibleToUniverse(state.nodes, state.project?.rootOrder ?? [])),
  );
  const current = useProjectStore((state) => selectedUniverse(state.nodes, state.project?.selectedUniverseId));
  const shared = useProjectStore((state) => sharedUniverse(state.nodes, state.project?.sharedUniverseId));
  return { universes, current, convertible, shared };
}

/**
 * Just the shared universe's id, for the places that only need to compare
 * against it. A plain string, so a subscriber re-renders only when the answer
 * itself changes rather than on every keystroke typed into a page.
 */
export function useSharedUniverseId(): string | null {
  return useProjectStore((state) => sharedUniverse(state.nodes, state.project?.sharedUniverseId)?.id ?? null);
}

/**
 * Whether this row is the shared universe being drawn as the section that
 * rides along under the selected one — rather than as an ordinary universe row
 * in the all-universes view, which is the same node and must not be styled as
 * a section.
 *
 * **This must stay the same condition `buildTreeData` appends on.** The two
 * answer one question from opposite ends: that one decides whether to draw the
 * extra row at all, this one decides whether the row it drew is that one. If
 * they drift, either a section appears with no styling or an ordinary universe
 * row is dressed up as a band across the tree.
 */
export function useIsSharedSection(nodeId: string): boolean {
  return useProjectStore((state) => {
    const shared = sharedUniverse(state.nodes, state.project?.sharedUniverseId);
    if (!shared || shared.id !== nodeId) return false;
    const selected = selectedUniverse(state.nodes, state.project?.selectedUniverseId);
    return Boolean(selected) && selected!.id !== shared.id;
  });
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
