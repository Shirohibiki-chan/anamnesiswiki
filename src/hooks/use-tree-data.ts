// The only import path components have into tree-service.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { useMemo } from "react";
import { useProject } from "./use-project";
import { buildTreeData, getEffectiveColor, type EffectiveColor, type TreeNodeData } from "../services/tree-service";

export function useTreeData(): { treeData: TreeNodeData[]; getEffectiveColor: (nodeId: string) => EffectiveColor } {
  const { project, nodes } = useProject();

  const treeData = useMemo(() => buildTreeData(nodes, project?.rootOrder ?? []), [nodes, project?.rootOrder]);

  return {
    treeData,
    getEffectiveColor: (nodeId: string) => getEffectiveColor(nodeId, nodes),
  };
}
