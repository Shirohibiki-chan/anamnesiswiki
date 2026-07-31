// The only import path components have into tree-service.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useProjectStore } from "../state/project-store";
import { useProject } from "./use-project";
import {
  buildTreeData,
  createSearchMatcher,
  getAncestorChain,
  getEffectiveColor,
  type EffectiveColor,
  type TreeNodeData,
} from "../services/tree-service";
import type { Node } from "../constants/schema";

export function useTreeData(): {
  treeData: TreeNodeData[];
  getEffectiveColor: (nodeId: string) => EffectiveColor;
  getAncestorChain: (nodeId: string) => Node[];
} {
  const { project, nodes } = useProject();

  const treeData = useMemo(
    () => buildTreeData(nodes, project?.rootOrder ?? [], project?.childOrder ?? {}),
    [nodes, project?.rootOrder, project?.childOrder],
  );

  return {
    treeData,
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

// The tree's name-and-#tag filter. Lives here rather than in TreePanel so the
// component doesn't import tree-service directly (CLAUDE.md's layer order),
// and so the Fuse index is only rebuilt when the nodes or the query actually
// change rather than on every render.
export function useSearchMatcher(query: string): ((nodeId: string) => boolean) | null {
  const { nodes } = useProject();
  return useMemo(() => createSearchMatcher(nodes, query), [nodes, query]);
}
