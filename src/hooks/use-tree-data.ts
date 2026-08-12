// The only import path components have into tree-service.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useProjectStore } from "../state/project-store";
import { useProject } from "./use-project";
import { useCallback } from "react";
import { BREADCRUMB_MAX_ANCESTORS } from "../constants/limits";
import {
  buildTreeData,
  collapseBreadcrumb,
  createSearchMatcher,
  getAncestorChain,
  getEffectiveColor,
  isHiddenByAncestor,
  moveDestinations,
  type BreadcrumbTrail,
  type EffectiveColor,
  type MoveDestination,
  type TreeNodeData,
  type TreeSearchMode,
} from "../services/tree-service";
import type { Node } from "../constants/schema";

// Re-exported because the search field needs both, and a component may not
// reach into services for them. See CLAUDE.md's layer order.
export { TREE_SEARCH_MODES } from "../services/tree-service";
export type { TreeSearchMode } from "../services/tree-service";
export type { MoveDestination } from "../services/tree-service";
export type { BreadcrumbTrail } from "../services/tree-service";

export function useTreeData(): {
  treeData: TreeNodeData[];
  /** The node whose inside the tree is showing, or null for the whole project. */
  focusedNode: Node | null;
  /** Project root → focused node, for the path bar. Empty when not focused. */
  focusPath: Node[];
  getEffectiveColor: (nodeId: string) => EffectiveColor;
  getAncestorChain: (nodeId: string) => Node[];
} {
  const { project, nodes, focusedId } = useProject();

  // Read through `nodes` rather than trusted: the focused page can be deleted
  // while it's focused, and a path bar naming a page that no longer exists is
  // worse than no path bar. `buildTreeData` falls back to the whole tree on
  // the same condition, so the two can't disagree about what's showing.
  const focusedNode = focusedId ? (nodes[focusedId] ?? null) : null;

  const treeData = useMemo(
    () => buildTreeData(nodes, project?.rootOrder ?? [], project?.childOrder ?? {}, focusedId),
    [nodes, project?.rootOrder, project?.childOrder, focusedId],
  );

  const focusPath = useMemo(
    () => (focusedNode ? [...getAncestorChain(focusedNode.id, nodes), focusedNode] : []),
    [focusedNode, nodes],
  );

  return {
    treeData,
    focusedNode,
    focusPath,
    getEffectiveColor: (nodeId: string) => getEffectiveColor(nodeId, nodes),
    getAncestorChain: (nodeId: string) => getAncestorChain(nodeId, nodes),
  };
}

// Per-node versions of the two helpers above, for components that render once
// per row (TreeItem) or per page (PageTitle, FolderView). Both derive from the
// whole `nodes` map — walking up the parent chain — but shallow-comparing the
// result means a re-render only happens when this node's own answer actually
// changed, not every time any node anywhere is edited.
export function useEffectiveColor(nodeId: string): EffectiveColor {
  return useProjectStore(useShallow((state) => getEffectiveColor(nodeId, state.nodes)));
}

export function useAncestorChain(nodeId: string): Node[] {
  return useProjectStore(useShallow((state) => getAncestorChain(nodeId, state.nodes)));
}

/**
 * The same chain, with its middle folded away once it's longer than the bar
 * can show. Memoised off the shallow-compared chain above, so the trail keeps
 * its identity between renders and the breadcrumb doesn't rebuild whenever
 * anything anywhere in the project is edited.
 */
export function useBreadcrumbTrail(nodeId: string): BreadcrumbTrail {
  const ancestors = useAncestorChain(nodeId);
  return useMemo(() => collapseBreadcrumb(ancestors, BREADCRUMB_MAX_ANCESTORS), [ancestors]);
}

// A plain boolean, so no shallow compare needed — this only re-renders the row
// when the answer itself flips.
export function useHiddenByAncestor(nodeId: string): boolean {
  return useProjectStore((state) => isHiddenByAncestor(nodeId, state.nodes));
}

/**
 * Where a selection could be moved to, answered on demand rather than watched.
 *
 * `getState()` rather than a subscription, the same call useRevealNode makes
 * and for the same reason: the only caller is TreeItem, which renders once per
 * visible row, and reading `nodes` here would re-run every row on every
 * keystroke typed into the editor. The list is a snapshot taken when the menu
 * opens, which is all a menu ever shows.
 *
 * The returned callback keeps its identity forever, so it can't be what makes
 * a row re-render either.
 */
export function useMoveDestinations(): (ids: string[]) => MoveDestination[] {
  return useCallback((ids: string[]) => {
    const { project, nodes } = useProjectStore.getState();
    if (!project) return [];
    // The project's own name labels the top-level row, because that's what
    // it's called everywhere else she looks — the breadcrumb, the window.
    return moveDestinations(ids, nodes, project.rootOrder, project.childOrder, project.name);
  }, []);
}

// The tree's name-and-tag filter. Lives here rather than in TreePanel so the
// component doesn't import tree-service directly (CLAUDE.md's layer order),
// and so the Fuse index is only rebuilt when the nodes, the query or the mode
// actually change rather than on every render.
export function useSearchMatcher(query: string, mode: TreeSearchMode = "all"): ((nodeId: string) => boolean) | null {
  const { nodes } = useProject();
  return useMemo(() => createSearchMatcher(nodes, query, mode), [nodes, query, mode]);
}
