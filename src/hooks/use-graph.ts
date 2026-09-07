// The only import path components have into graph-service.ts and
// graph-layout.ts. See CLAUDE.md's layer order — components never import
// services directly.
import { useMemo } from "react";
import { settleGraph } from "../services/graph-layout";
import { graphAround, type GraphModel } from "../services/graph-service";
import { linkIndex } from "../services/link-index";
import { buildNodePreview, type NodePreview } from "../services/preview-service";
import { useProject } from "./use-project";

const EMPTY: GraphModel = { nodes: [], edges: [] };

/**
 * The settled graph around one page.
 *
 * **Building and settling happen together, in one memo**, because a model that
 * has not been through the simulation is not something worth rendering — every
 * node would be sitting on its seeded ring. Keying the memo on the store's
 * `nodes` record means the graph is recomputed when a page changes and not on
 * every render; `linkIndex` is itself cached against that same record, so the
 * expensive half is shared with Backlinks and the index blocks rather than
 * being walked again here.
 */
export function usePageGraph(focusId: string | null, depth: number): GraphModel {
  const { nodes } = useProject();
  return useMemo(() => {
    if (!focusId) return EMPTY;
    return settleGraph(graphAround(focusId, nodes, linkIndex(nodes), depth));
  }, [nodes, focusId, depth]);
}

/**
 * What the card beside the graph says about the node that was clicked.
 *
 * The same preview a hover over a link already gives — deliberately, since a
 * page should not describe itself two different ways depending on which surface
 * asked. Null when nothing is selected, which is also the closed state of the
 * panel that draws it.
 */
export function useGraphPreview(nodeId: string | null): NodePreview | null {
  const { nodes } = useProject();
  return useMemo(() => {
    const node = nodeId ? nodes[nodeId] : undefined;
    return node ? buildNodePreview(node) : null;
  }, [nodes, nodeId]);
}
