// The only import path components have into graph-service.ts and
// graph-layout.ts. See CLAUDE.md's layer order — components never import
// services directly.
import { useMemo, useState } from "react";
import { GRAPH_REACH_EVERYTHING, GRAPH_WORLD_PIN_PREFIX, type GraphReach } from "../constants/graph";
import type { DatabaseField, DatabaseFilter, Node } from "../constants/schema";
import { fieldChoices, matchesFilter } from "../services/database-service";
import { settleGraph, type GraphPins } from "../services/graph-layout";
import { graphAround, graphOfPages, graphPinKey, pagesInUniverse, type GraphModel } from "../services/graph-service";
import { linkIndex } from "../services/link-index";
import { buildNodePreview, type NodePreview } from "../services/preview-service";
import { selectedUniverse, universeOf } from "../services/tree-service";
import { useProject } from "./use-project";
import { useStorylines } from "./use-storyline";
import { useTemplates } from "./use-templates";

// Re-exported so components reach the graph's services through this one door,
// the way DatabaseFilterMenu reaches Phase 23's through use-database.
export { GRAPH_FILTER_FIELDS, graphOperatorsFor } from "../services/graph-service";
export { fieldId, fieldLabel, takesValue, OPERATOR_LABELS } from "../services/database-service";
export type { GraphPins } from "../services/graph-layout";

const EMPTY: GraphModel = { nodes: [], edges: [] };

export type PageGraphOptions = {
  /** The page the graph is centred on, or null for a graph of the whole thing. */
  focusId: string | null;
  /** How far out to reach, or everything in the universe at once. */
  reach: GraphReach;
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
  /** Every page in range with no filters applied. */
  reached: Node[];
  /** The values a field actually takes across `reached`, for the value picker. */
  choicesFor: (field: DatabaseField) => string[];
  /**
   * Changes when the question does — a different page, reach, filter, or a
   * request to lay it out again. What the view resets itself on, so a page
   * edited elsewhere in the world does not throw away her panning.
   */
  key: string;
};

/**
 * Which universe a graph is of, and what it is called.
 *
 * **Read from the focused page rather than from the switcher when there is
 * one.** A page's graph is a picture of that page's surroundings, and reaching
 * "everything" from a page in the Demonic AU means everything in the Demonic AU
 * — even if the tree happens to be showing Canon, which it can be after a link
 * has been followed across. With no focused page there is nothing to read it
 * from, so the switcher is the answer, and "All universes" means the world.
 */
export function useGraphScope(focusId: string | null): { universeId: string | null; universeName: string | null } {
  const { nodes, project } = useProject();
  return useMemo(() => {
    const universe = focusId
      ? universeOf(focusId, nodes)
      : selectedUniverse(nodes, project?.selectedUniverseId);
    return { universeId: universe?.id ?? null, universeName: universe?.name ?? null };
  }, [focusId, nodes, project?.selectedUniverseId]);
}

/**
 * The settled graph, around one page or over a whole universe.
 *
 * **Two passes, and the unfiltered one earns its keep.** It is what the bar
 * counts against ("6 of 14 pages") and what the filter menu offers as choices,
 * and both have to describe the pages that are *there* rather than the ones a
 * filter has already left standing — a value picker listing only what survives
 * the current filter could never be used to widen it. `linkIndex` is cached
 * against the store's record, so the expensive half is done once.
 */
export function usePageGraph({ focusId, reach, filters, pins, generation }: PageGraphOptions): PageGraph {
  const { nodes } = useProject();
  const { getLabel } = useTemplates();
  const { universeId } = useGraphScope(focusId);

  const everything = reach === GRAPH_REACH_EVERYTHING;

  // The shape of the question, as one value a memo can be keyed on. Pins are
  // deliberately absent: they change on every drop, and re-running the
  // simulation then would jump every other node the instant one was let go of.
  const structure = `${focusId ?? ""}|${reach}|${universeId ?? ""}|${generation}|${JSON.stringify(filters)}`;

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

  // The canvases are part of what "connected" means since Phase 25 step 3, so
  // a graph draws a line from a storyline to every scene on it.
  const storylines = useStorylines();
  const index = useMemo(() => linkIndex(nodes, storylines), [nodes, storylines]);

  /**
   * The pages a whole-universe graph is over, before any filter.
   *
   * Held apart from the model so the count and the value picker do not pay for
   * a second gathering pass — and so the walk below is skipped entirely when
   * the answer is "all of them", which for a world of any size is the
   * difference between a walk and a filter.
   */
  const scopedIds = useMemo(
    () => (everything ? pagesInUniverse(nodes, universeId).map((node) => node.id) : null),
    [everything, nodes, universeId],
  );

  const reached = useMemo(() => {
    if (scopedIds) {
      const focus = focusId ? nodes[focusId] : undefined;
      const pages = scopedIds.map((id) => nodes[id]).filter((node): node is Node => Boolean(node));
      // A page opened from outside the universe it is scoped to is still on its
      // own graph — it is where she is.
      return focus && !scopedIds.includes(focus.id) ? [focus, ...pages] : pages;
    }
    if (!focusId) return [];
    return graphAround(focusId, nodes, index, reach as number)
      .nodes.map((drawn) => nodes[drawn.id])
      .filter((node): node is Node => Boolean(node));
  }, [scopedIds, focusId, nodes, index, reach]);

  /**
   * What the layout's noise is drawn from, and it is the *graph* rather than the
   * page it was opened from.
   *
   * This is what makes widening a page's graph to everything and opening the
   * world's from the rail come out identical rather than merely equivalent. Both
   * are a picture of the same universe, so both settle from the same seed with
   * nothing pinned at the origin.
   */
  const seed = everything ? `${GRAPH_WORLD_PIN_PREFIX}${universeId ?? "all"}` : (focusId ?? "");

  const model = useMemo(() => {
    const keep = (node: Node) => filters.every((filter) => matchesFilter(node, filter, [], nodes, getLabel));
    if (scopedIds) {
      // No centre: a universe has no one page that belongs in the middle, and
      // pinning one of seventy there would bend the shape around that choice.
      return settleGraph(graphOfPages(scopedIds, focusId, nodes, index, keep), frozen.pins, { seed });
    }
    if (!focusId) return EMPTY;
    return settleGraph(graphAround(focusId, nodes, index, reach as number, keep), frozen.pins, {
      centreId: focusId,
      seed,
    });
    // `structure` stands in for focusId, reach, generation, the filters and the
    // seed, so an identical filter list rebuilt by a re-render does not
    // re-settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure, scopedIds, nodes, index, frozen, getLabel]);

  // Columns are empty on purpose: a graph filters on what a page *is* rather
  // than on a table's columns, and `template` and `tag` are answered from the
  // page itself. See DatabaseField, which carries both as first-class kinds.
  const choicesFor = useMemo(
    () => (field: DatabaseField) => fieldChoices(reached, field, [], nodes, getLabel),
    [reached, nodes, getLabel],
  );

  return { model, reached, choicesFor, key: structure };
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

/** Where she has dragged nodes on this graph, or nothing yet. */
export function useGraphPins(focusId: string | null, universeId: string | null): GraphPins {
  const { project } = useProject();
  const stored = project?.graphPins;
  return useMemo(() => stored?.[graphPinKey(focusId, universeId)] ?? {}, [stored, focusId, universeId]);
}
