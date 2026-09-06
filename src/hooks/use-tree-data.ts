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
  hasChildren,
  isHiddenByAncestor,
  moveDestinations,
  selectedUniverse,
  sharedUniverse,
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
  /**
   * What the tree is actually rooted at — the focused node, else the selected
   * universe, else the project (Phase 22).
   *
   * Exposed because "the top of the tree" is no longer the same thing as "the
   * project root", and anything that acts on the top of the tree has to mean
   * this one. A drop at the root of a tree showing one universe belongs *in*
   * that universe; without this it flew out to the project root, which is the
   * one place the person doing it cannot currently see.
   */
  treeRootId: string | null;
  /**
   * What to call the top of the tree — the selected universe's name, or the
   * world's. The path bar's first crumb, and the thing the way-out button
   * offers to show all of.
   */
  treeRootName: string;
  /**
   * The top of the tree → focused node, for the path bar. Empty when not
   * focused.
   *
   * Trimmed at the universe when there is one, rather than running all the way
   * up to the project: leaving the focus lands you back in the universe, so a
   * first crumb naming the *project* would be a button that says one place and
   * goes to another.
   */
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

  // Focus wins over the universe: focusing a branch is a deliberate, temporary
  // "show me only this", and it is always a branch *inside* whatever is
  // showing. The universe is the standing choice underneath it, which is why
  // leaving the focus lands you back in the universe rather than at the
  // project root.
  const universeNode = selectedUniverse(nodes, project?.selectedUniverseId);
  const treeRootId = focusedId ?? universeNode?.id ?? null;

  // Only while a universe is showing, and never while focused inside one: the
  // shared section belongs to "which universe am I in", and a focused branch is
  // a deliberate "show me only this".
  const sharedId = focusedId ? null : (sharedUniverse(nodes, project?.sharedUniverseId)?.id ?? null);

  const treeData = useMemo(
    () => buildTreeData(nodes, project?.rootOrder ?? [], project?.childOrder ?? {}, treeRootId, sharedId),
    [nodes, project?.rootOrder, project?.childOrder, treeRootId, sharedId],
  );

  const focusPath = useMemo(() => {
    if (!focusedNode) return [];
    const chain = [...getAncestorChain(focusedNode.id, nodes), focusedNode];
    if (!universeNode) return chain;
    // -1 would mean the focus is outside the selected universe, which the
    // store's own focus handling should have already dropped. Showing the
    // whole chain is the safe answer if it ever happens: too much path is
    // legible, a path with its top silently cut off is not.
    const at = chain.findIndex((node) => node.id === universeNode.id);
    return at === -1 ? chain : chain.slice(at + 1);
  }, [focusedNode, nodes, universeNode]);

  return {
    treeData,
    focusedNode,
    treeRootId,
    treeRootName: universeNode?.name ?? project?.name ?? "Project",
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

/**
 * Whether this node has anything inside it. Also a plain boolean, so the folder
 * view only re-renders when the folder goes from empty to not — not on every
 * page added to one that already had some.
 */
export function useHasChildren(nodeId: string): boolean {
  return useProjectStore((state) => hasChildren(nodeId, state.nodes));
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
