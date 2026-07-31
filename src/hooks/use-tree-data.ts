// The only import path components have into tree-service.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { useMemo } from "react";
import { useProject } from "./use-project";
import {
  buildTreeData,
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
