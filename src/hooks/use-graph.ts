// The only import path components have into graph-service.ts and
// graph-layout.ts. See CLAUDE.md's layer order — components never import
// services directly.
import { useEffect, useMemo, useRef, useState } from "react";
import { GRAPH_REACH_EVERYTHING, GRAPH_WORLD_PIN_PREFIX, type GraphReach } from "../constants/graph";
import type { DatabaseField, DatabaseFilter, Node } from "../constants/schema";
import { fieldChoices, matchesFilter } from "../services/database-service";
import type { GraphPins } from "../services/graph-layout";
import { settleGraphInWorker } from "../services/graph-layout-worker";
import {
  edgeLabels,
  edgeRule,
  graphAround,
  graphOfPages,
  graphPinKey,
  pagesInUniverse,
  restrict,
  withoutLone,
  GRAPH_EDGE_KINDS,
  type GraphEdgeKind,
  type GraphModel,
} from "../services/graph-service";
import { linkIndex } from "../services/link-index";
import { buildNodePreview, type NodePreview } from "../services/preview-service";
import { selectedUniverse, universeOf } from "../services/tree-service";
import { useProject } from "./use-project";
import { useStorylines } from "./use-storyline";
import { useBoards } from "./use-board";
import { useTemplates } from "./use-templates";

// Re-exported so components reach the graph's services through this one door,
// the way DatabaseFilterMenu reaches Phase 23's through use-database.
export { GRAPH_FILTER_FIELDS, graphOperatorsFor } from "../services/graph-service";
export { fieldId, fieldLabel, takesValue, OPERATOR_LABELS } from "../services/database-service";
export type { GraphPins } from "../services/graph-layout";

const EMPTY: GraphModel = { nodes: [], edges: [] };
const ALL_KINDS: ReadonlySet<GraphEdgeKind> = new Set(GRAPH_EDGE_KINDS);
const NO_LABELS: ReadonlySet<string> = new Set();

export type PageGraphOptions = {
  /** The page the graph is centred on, or null for a graph of the whole thing. */
  focusId: string | null;
  /** How far out to reach, or everything in the universe at once. */
  reach: GraphReach;
  /** Conditions a page has to meet to be walked through and drawn. */
  filters: DatabaseFilter[];
  /** Whether pages with no written line to anything are left off. */
  hideLone?: boolean;
  /** Which kinds of line are drawn; every kind when absent. */
  kinds?: ReadonlySet<GraphEdgeKind>;
  /** Relationship names — "Enemies" — whose reference-field lines are not drawn. */
  hiddenLabels?: ReadonlySet<string>;
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
  /** Whether the picture on screen is the last one while the next is worked out. */
  working: boolean;
  /** What the reference-field lines are called — "Friends", "Enemies" — for the filter menu. */
  labels: string[];
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
export function usePageGraph({
  focusId,
  reach,
  filters,
  hideLone = false,
  kinds = ALL_KINDS,
  hiddenLabels = NO_LABELS,
  pins,
  generation,
}: PageGraphOptions): PageGraph {
  const { nodes } = useProject();
  const { getLabel } = useTemplates();
  const { universeId } = useGraphScope(focusId);

  const everything = reach === GRAPH_REACH_EVERYTHING;

  // The shape of the question, as one value a memo can be keyed on. Pins are
  // deliberately absent: they change on every drop, and re-running the
  // simulation then would jump every other node the instant one was let go of.
  const asked = `${hideLone ? "lone" : ""}|${[...kinds].sort().join(",")}|${[...hiddenLabels].sort().join(",")}|${JSON.stringify(filters)}`;
  const structure = `${focusId ?? ""}|${reach}|${universeId ?? ""}|${generation}|${asked}`;
  /**
   * What the *layout* is keyed on, which on a whole-world graph leaves the
   * conditions out. Her call 2026-09-13: a filter on the whole world hides
   * in place rather than laying the world out again — see `restrict` — so
   * the world is settled once for its pages and the conditions are applied
   * to the settled picture. A page's own graph is a walk, and there the
   * conditions decide what is walked to, so they stay in its key.
   */
  const layoutKey = everything ? `${focusId ?? ""}|${reach}|${universeId ?? ""}|${generation}` : structure;

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
  const boards = useBoards();
  const index = useMemo(() => linkIndex(nodes, storylines, boards), [nodes, storylines, boards]);

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

  /**
   * The pages and lines, before the layout — cheap, and worked out here.
   *
   * The layout itself is not: 300 ticks of d3-force over 831 pages is about
   * 800ms, and done in this memo it froze the window every time the reach or
   * a filter changed (her report 2026-09-13). It is sent to a worker below,
   * and the picture on screen is the last one that came back until the next
   * does. `structure` stands in for focusId, reach, generation, the filters
   * and the seed, so an identical filter list rebuilt by a re-render does not
   * build again.
   */
  const built = useMemo(() => {
    if (scopedIds) {
      // No centre: a universe has no one page that belongs in the middle, and
      // pinning one of seventy there would bend the shape around that choice.
      // Unfiltered — the conditions are applied to the settled picture below.
      return { model: graphOfPages(scopedIds, focusId, nodes, index), centreId: null as string | null };
    }
    if (!focusId) return { model: EMPTY, centreId: null as string | null };
    const keep = (node: Node) => filters.every((filter) => matchesFilter(node, filter, [], nodes, getLabel));
    // Off after the walk rather than during it: a lone page is one the
    // finished picture has no written line to, which the walk cannot know
    // about a page until it has been through everything.
    const walked = graphAround(focusId, nodes, index, reach as number, keep, edgeRule(kinds, hiddenLabels));
    return { model: hideLone ? withoutLone(walked, focusId) : walked, centreId: focusId };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey, scopedIds, nodes, index, getLabel]);

  /**
   * The settled picture, and which request it answers.
   *
   * A request is numbered when it is sent, and a reply is kept only if it is
   * the latest — the reach changed twice before the first picture arrived,
   * and drawing the first would be drawing a question she has stopped
   * asking. `working` is true from the send until the matching reply, which
   * is what the overlay shows a note for.
   */
  const [settled, setSettled] = useState<{ request: number; model: GraphModel }>({ request: 0, model: EMPTY });
  const requestRef = useRef(0);
  // Starts one ahead of what has been answered, so the very first render is
  // already "working" rather than a settled picture of nothing.
  const [latest, setLatest] = useState(1);
  useEffect(() => {
    const request = ++requestRef.current;
    setLatest(request);
    if (built.model.nodes.length === 0) {
      setSettled({ request, model: EMPTY });
      return;
    }
    let live = true;
    void settleGraphInWorker(built.model, frozen.pins, { centreId: built.centreId, seed }).then((model) => {
      if (live) setSettled({ request, model });
    });
    return () => {
      live = false;
    };
  }, [built, frozen, seed]);

  const working = settled.request !== latest;
  const model = useMemo(() => {
    if (!scopedIds) return settled.model;
    const keep = (id: string) => {
      const node = nodes[id];
      return Boolean(node) && filters.every((filter) => matchesFilter(node, filter, [], nodes, getLabel));
    };
    return restrict(settled.model, focusId, keep, edgeRule(kinds, hiddenLabels), hideLone);
    // `asked` stands in for the filters, the kinds and hideLone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, scopedIds, nodes, focusId, asked, getLabel]);

  /**
   * What the relationships on this graph are called, before any of them is
   * switched off — so a name she has hidden stays in the list to be brought
   * back. A whole world reads them off the settled picture; a page's graph
   * walks again with every line allowed, which is cheap at that size.
   */
  const filterKey = JSON.stringify(filters);
  const labels = useMemo(() => {
    if (scopedIds) return edgeLabels(settled.model);
    if (!focusId) return [];
    const keep = (node: Node) => filters.every((filter) => matchesFilter(node, filter, [], nodes, getLabel));
    return edgeLabels(graphAround(focusId, nodes, index, reach as number, keep));
    // `filterKey` stands in for the filters, so a list rebuilt by a re-render
    // does not walk again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedIds, settled, focusId, nodes, index, reach, filterKey, getLabel]);

  // Columns are empty on purpose: a graph filters on what a page *is* rather
  // than on a table's columns, and `template` and `tag` are answered from the
  // page itself. See DatabaseField, which carries both as first-class kinds.
  const choicesFor = useMemo(
    () => (field: DatabaseField) => fieldChoices(reached, field, [], nodes, getLabel),
    [reached, nodes, getLabel],
  );

  return { model, reached, choicesFor, labels, key: structure, working };
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
