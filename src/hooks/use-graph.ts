// The only import path components have into graph-service.ts and
// graph-layout.ts. See CLAUDE.md's layer order — components never import
// services directly.
import { useMemo, useState } from "react";
import type { DatabaseField, DatabaseFilter, Node } from "../constants/schema";
import { fieldChoices, matchesFilter } from "../services/database-service";
import { settleGraph, type GraphPins } from "../services/graph-layout";
import { graphAround, type GraphModel } from "../services/graph-service";
import { linkIndex } from "../services/link-index";
import { buildNodePreview, type NodePreview } from "../services/preview-service";
import { useProject } from "./use-project";
import { useTemplates } from "./use-templates";

// Re-exported so components reach the graph's services through this one door,
// the way DatabaseFilterMenu reaches Phase 23's through use-database.
export { GRAPH_FILTER_FIELDS, graphOperatorsFor } from "../services/graph-service";
export { fieldId, fieldLabel, takesValue, OPERATOR_LABELS } from "../services/database-service";
export type { GraphPins } from "../services/graph-layout";

const EMPTY: GraphModel = { nodes: [], edges: [] };

export type PageGraphOptions = {
  focusId: string | null;
  /** How many connections out to reach. */
  depth: number;
  /** Conditions a page has to meet to be walked through and drawn. */
  filters: DatabaseFilter[];
  /** Where she has already dragged nodes on this graph. */
  pins: GraphPins;
  /**
   * Bumped to ask for the layout to be worked out again from nothing.
   *
   * The one thing that wants this is putting an arrangement back: clearing the
   * pins on their own would move nothing, because the settled layout is
   * deliberately not recomputed when pins change — see `frozen` below.
   */
  generation: number;
};

export type PageGraph = {
  /** What to draw: filtered, and settled with her arrangement as fixed points. */
  model: GraphModel;
  /** Every page the walk reaches with no filters applied. */
  reach: Node[];
  /** The values a field actually takes across `reach`, for the value picker. */
  choicesFor: (field: DatabaseField) => string[];
  /**
   * Changes when the question does — a different page, reach, filter, or a
   * request to lay it out again. What the view resets itself on, so a page
   * edited elsewhere in the world does not throw away her panning.
   */
  key: string;
};

/**
 * The settled graph around one page.
 *
 * **Two walks, and the unfiltered one earns its keep.** It is what the bar
 * counts against ("6 of 14 pages") and what the filter menu offers as choices,
 * and both have to describe the pages that are *there* rather than the ones a
 * filter has already left standing — a value picker listing only what survives
 * the current filter could never be used to widen it. `linkIndex` is cached
 * against the store's record, so the expensive half is done once.
 */
export function usePageGraph({ focusId, depth, filters, pins, generation }: PageGraphOptions): PageGraph {
  const { nodes } = useProject();
  const { getLabel } = useTemplates();

  // The shape of the question, as one value a memo can be keyed on. Pins are
  // deliberately absent: they change on every drop, and re-running the
  // simulation then would jump every other node the instant one was let go of.
  const structure = `${focusId ?? ""}|${depth}|${generation}|${JSON.stringify(filters)}`;

  /**
   * The arrangement as it stood when this graph was last worked out.
   *
   * React's documented alternative to an effect that syncs state — adjust
   * during render, keyed on the value that changed. Freezing the pins here is
   * what lets them be *fixed points* in the simulation, so everything else
   * settles around what she has arranged, while a new drop still moves only the
   * node under the hand.
   */
  const [frozen, setFrozen] = useState({ structure, pins });
  if (frozen.structure !== structure) setFrozen({ structure, pins });

  const index = useMemo(() => linkIndex(nodes), [nodes]);

  const reach = useMemo(() => {
    if (!focusId) return [];
    return graphAround(focusId, nodes, index, depth)
      .nodes.map((drawn) => nodes[drawn.id])
      .filter((node): node is Node => Boolean(node));
  }, [focusId, nodes, index, depth]);

  const model = useMemo(() => {
    if (!focusId) return EMPTY;
    const keep = (node: Node) => filters.every((filter) => matchesFilter(node, filter, [], nodes, getLabel));
    return settleGraph(graphAround(focusId, nodes, index, depth, keep), frozen.pins);
    // `structure` stands in for focusId, depth, generation and the filters, so
    // an identical filter list rebuilt by a re-render does not re-settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure, nodes, index, frozen, getLabel]);

  // Columns are empty on purpose: a graph filters on what a page *is* rather
  // than on a table's columns, and `template` and `tag` are answered from the
  // page itself. See DatabaseField, which carries both as first-class kinds.
  const choicesFor = useMemo(
    () => (field: DatabaseField) => fieldChoices(reach, field, [], nodes, getLabel),
    [reach, nodes, getLabel],
  );

  return { model, reach, choicesFor, key: structure };
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

/** Where she has dragged nodes on this page's graph, or nothing yet. */
export function useGraphPins(focusId: string | null): GraphPins {
  const { project } = useProject();
  const stored = project?.graphPins;
  return useMemo(() => (focusId ? (stored?.[focusId] ?? {}) : {}), [stored, focusId]);
}
