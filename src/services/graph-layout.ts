// Where each node ends up. Phase 24, step 1.
//
// **Split from graph-service.ts because the two answer different questions** —
// that file says which pages and lines are on the graph, this one says where
// they sit. It is also the half that has to be provably repeatable, and a file
// whose whole job is "same input, same output" is one a test can hold to that.
//
// **The simulation runs to a stop and is never animated.** d3-force is built to
// be ticked from a timer, easing into place over a couple of seconds; that is
// rejected here for two reasons, and the second decided it. A layout still
// moving can be caught half-settled, so "the same project looks the same every
// time you open it" would hold only for people who waited. And an idle
// animation loop is a core spinning on her machine to redraw a picture that has
// stopped changing. Ticking it synchronously costs a few milliseconds once.
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import {
  GRAPH_CHARGE,
  GRAPH_COLLIDE_RADIUS,
  GRAPH_LINK_DISTANCE,
  GRAPH_RING_GAP,
  GRAPH_TICKS,
} from "../constants/graph";
import type { GraphModel, GraphNode } from "./graph-service";
import { seededRandom } from "./graph-service";

type SimNode = SimulationNodeDatum & { id: string };

/** Where nodes have been dragged to on this graph, by page id. */
export type GraphPins = Record<string, { x: number; y: number }>;

/**
 * How strongly everything is pulled back toward the middle.
 *
 * Weak on purpose: this is the force that stops a page with one lonely
 * neighbour drifting off into nothing, not a force meant to shape the picture.
 * Anything stronger and the repulsion between nodes is fighting it, which is
 * how a graph ends up as a tight ball.
 */
const CENTERING_STRENGTH = 0.045;

/**
 * The same model, with every node moved to where the forces put it.
 *
 * **`centreId` is pinned to the origin**, and is given only by a graph that has
 * a centre — one page's neighbourhood, where that page belongs in the middle
 * whatever the shape around it, and where pinning one node is also what stops
 * the picture sliding a little further each time a neighbour is added. A graph
 * of a whole universe gives none: it has no such page, and pinning one of
 * seventy at the origin would bend the shape around an arbitrary choice.
 *
 * **`seed` is what the noise is drawn from, and it is not the first node.** It
 * used to be, which quietly meant the two doors into a whole-universe graph
 * disagreed — the same pages, in the same order, jiggled differently because
 * one of them had a focus sitting at the front of the list. It is given by the
 * caller now, and both doors give the same one.
 *
 * **A node she has moved is pinned too, not merely placed there afterwards**
 * (Phase 24, step 2). Fixing it before the run is what lets everything else
 * settle *around* it; dropping the positions in after the fact would leave the
 * rest arranged as though the node were still where the simulation put it, so
 * the first thing she arranged would be the thing everything overlapped. A pin
 * on the focus wins over the origin — if she has dragged the page itself, that
 * is where she wants it.
 */
export function settleGraph(
  model: GraphModel,
  pins: GraphPins = {},
  options: { centreId?: string | null; seed?: string } = {},
): GraphModel {
  if (model.nodes.length === 0) return model;

  const { centreId = null, seed } = options;

  /**
   * **A page with no written lines is not simulated; it is placed on a ring
   * outside everything that has them.** Run through the forces it drifts to
   * wherever the repulsion leaves it, mixed in with the connected pages and
   * saying nothing about itself. On the ring it says the one thing worth
   * knowing — nothing she wrote points at this and it points at nothing —
   * and the core is left to the pages that are actually joined. **The tree
   * does not count here**, on purpose: every page has a tree line to what
   * it is filed under, so if it counted nothing would ever be lone, and where
   * a page is filed is the quieter claim (her call 2026-09-07). The centre
   * and anything she has pinned stay where they are whatever their lines.
   */
  const joined = new Set<string>();
  for (const edge of model.edges) {
    if (edge.kind === "tree") continue;
    joined.add(edge.sourceId);
    joined.add(edge.targetId);
  }
  const isLone = (node: GraphNode) => !joined.has(node.id) && node.id !== centreId && !pins[node.id];
  const lone = model.nodes.filter(isLone);
  const core = model.nodes.filter((node) => !isLone(node));

  const settledCore = core.length > 0 ? simulate({ nodes: core, edges: model.edges }, pins, centreId, seed) : [];
  const ringed = ringAround(settledCore, lone);
  const placed = new Map([...settledCore, ...ringed].map((node) => [node.id, node]));
  return { edges: model.edges, nodes: model.nodes.map((node) => placed.get(node.id) ?? node) };
}

/**
 * The lone pages spaced evenly on rings around the box the core settled in.
 *
 * One ring while the pages fit on it at GRAPH_COLLIDE_RADIUS apart, then
 * another outside it, and so on — a world of many lone pages is several
 * bands rather than one ring of pages drawn on top of each other. In the
 * order they were given, so the same world rings the same way every time.
 */
function ringAround(core: GraphNode[], lone: GraphNode[]): GraphNode[] {
  if (lone.length === 0) return [];
  const box = graphBounds(core, 0);
  const centreX = box.minX + box.width / 2;
  const centreY = box.minY + box.height / 2;
  let radius = Math.hypot(box.width / 2, box.height / 2) + GRAPH_RING_GAP;
  const out: GraphNode[] = [];
  let index = 0;
  while (index < lone.length) {
    const fit = Math.max(1, Math.floor((2 * Math.PI * radius) / GRAPH_COLLIDE_RADIUS));
    const band = lone.slice(index, index + fit);
    band.forEach((node, i) => {
      const angle = (i / band.length) * 2 * Math.PI;
      out.push({
        ...node,
        x: Math.round(centreX + radius * Math.cos(angle)),
        y: Math.round(centreY + radius * Math.sin(angle)),
      });
    });
    index += band.length;
    radius += GRAPH_COLLIDE_RADIUS;
  }
  return out;
}

/** The simulation proper, over the pages that have written lines. */
function simulate(model: GraphModel, pins: GraphPins, centreId: string | null, seed: string | undefined): GraphNode[] {
  // A line to a page on the ring has no second end in here; d3 throws on one.
  const inside = new Set(model.nodes.map((node) => node.id));
  const edges = model.edges.filter((edge) => inside.has(edge.sourceId) && inside.has(edge.targetId));
  const simNodes: SimNode[] = model.nodes.map((node) => {
    const pin = pins[node.id];
    if (pin) return { id: node.id, x: pin.x, y: pin.y, fx: pin.x, fy: pin.y };
    return {
      id: node.id,
      x: node.x,
      y: node.y,
      // d3 keeps a position it is given and only invents one for a node whose x
      // is missing, so the seeded ring in graph-service survives into the run.
      ...(node.id === centreId ? { fx: 0, fy: 0 } : {}),
    };
  });

  const simLinks: SimulationLinkDatum<SimNode>[] = edges.map((edge) => ({
    source: edge.sourceId,
    target: edge.targetId,
  }));

  const simulation = forceSimulation<SimNode>(simNodes)
    .randomSource(seededRandom(seed ?? centreId ?? model.nodes[0].id))
    .force(
      "link",
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
        .id((node) => node.id)
        .distance(GRAPH_LINK_DISTANCE),
    )
    .force("charge", forceManyBody().strength(GRAPH_CHARGE))
    .force("collide", forceCollide(GRAPH_COLLIDE_RADIUS))
    .force("x", forceX(0).strength(CENTERING_STRENGTH))
    .force("y", forceY(0).strength(CENTERING_STRENGTH))
    .stop();

  simulation.tick(GRAPH_TICKS);

  const settled = new Map(simNodes.map((node) => [node.id, node]));
  return model.nodes.map((node) => {
    const placed = settled.get(node.id);
    // Rounded because nothing downstream can use a fraction of a pixel, and
    // an integer is a thing a test can compare without a tolerance.
    return {
      ...node,
      x: Math.round(placed?.x ?? node.x),
      y: Math.round(placed?.y ?? node.y),
    };
  });
}

export type GraphBounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

/**
 * The box the settled graph occupies, grown by `padding` on every side.
 *
 * Used to size the drawing surface and to work out the zoom that fits it in the
 * window. An empty graph returns a box of nothing rather than an infinite one,
 * which is what `Math.min` over no numbers would otherwise hand back.
 */
export function graphBounds(nodes: GraphNode[], padding: number): GraphBounds {
  if (nodes.length === 0) return { minX: 0, minY: 0, width: 0, height: 0 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x > maxX) maxX = node.x;
    if (node.y > maxY) maxY = node.y;
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}
