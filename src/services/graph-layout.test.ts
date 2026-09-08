import { describe, expect, it } from "vitest";
import { GRAPH_NODE_RADIUS } from "../constants/graph";
import { graphBounds, settleGraph } from "./graph-layout";
import type { GraphModel, GraphNode } from "./graph-service";
import { seedPosition } from "./graph-service";

function node(id: string, depth: number): GraphNode {
  return {
    id,
    name: id,
    templateKey: "character",
    color: null,
    ownsColor: false,
    depth,
    ...seedPosition(id, depth),
  };
}

function star(count: number): GraphModel {
  const focus = node("focus", 0);
  const others = Array.from({ length: count }, (_, i) => node(`page-${i}`, 1));
  return {
    nodes: [focus, ...others],
    edges: others.map((other) => ({
      id: `focus|${other.id}`,
      sourceId: focus.id,
      targetId: other.id,
      kind: "prose" as const,
    })),
  };
}

describe("settleGraph", () => {
  it("leaves an empty graph alone", () => {
    expect(settleGraph({ nodes: [], edges: [] })).toEqual({ nodes: [], edges: [] });
  });

  // The whole reason the simulation is seeded and ticked to a stop rather than
  // animated — see docs/plan.md Phase 24.
  it("puts every node in the same place on a second run", () => {
    const model = star(8);
    expect(settleGraph(model)).toEqual(settleGraph(model));
  });

  it("keeps the focused page at the centre", () => {
    const settled = settleGraph(star(8));
    expect(settled.nodes[0]).toMatchObject({ id: "focus", x: 0, y: 0 });
  });

  it("does not stack two pages on top of each other", () => {
    const settled = settleGraph(star(10));
    for (let i = 0; i < settled.nodes.length; i += 1) {
      for (let j = i + 1; j < settled.nodes.length; j += 1) {
        const a = settled.nodes[i];
        const b = settled.nodes[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(GRAPH_NODE_RADIUS * 2);
      }
    }
  });

  it("hands back whole numbers", () => {
    for (const placed of settleGraph(star(6)).nodes) {
      expect(Number.isInteger(placed.x)).toBe(true);
      expect(Number.isInteger(placed.y)).toBe(true);
    }
  });

  it("keeps the edges it was given", () => {
    const model = star(4);
    expect(settleGraph(model).edges).toEqual(model.edges);
  });

  // A page with nothing pointing at it still has to land somewhere readable
  // rather than being flung off by the repulsion with nothing to hold it.
  it("keeps an unconnected page within reach of the middle", () => {
    const model: GraphModel = { nodes: [node("focus", 0), node("loner", 1)], edges: [] };
    const loner = settleGraph(model).nodes[1];
    expect(Math.hypot(loner.x, loner.y)).toBeLessThan(2000);
  });
});

describe("graphBounds", () => {
  it("returns nothing for no nodes", () => {
    expect(graphBounds([], 40)).toEqual({ minX: 0, minY: 0, width: 0, height: 0 });
  });

  it("wraps the nodes with the padding on every side", () => {
    const nodes = [
      { ...node("a", 1), x: 0, y: 0 },
      { ...node("b", 1), x: 100, y: 50 },
    ];
    expect(graphBounds(nodes, 10)).toEqual({ minX: -10, minY: -10, width: 120, height: 70 });
  });

  it("gives a single node a box of its padding", () => {
    expect(graphBounds([{ ...node("a", 0), x: 5, y: 5 }], 20)).toEqual({
      minX: -15,
      minY: -15,
      width: 40,
      height: 40,
    });
  });
});

describe("settleGraph with an arrangement", () => {
  // Phase 24 step 2. A pin is a fixed point in the simulation rather than a
  // position applied afterwards — everything else has to settle *around* what
  // she moved, or the first thing she arranged is the thing everything overlaps.
  it("leaves a pinned node exactly where it was put", () => {
    const settled = settleGraph(star(6), { "page-2": { x: 400, y: -250 } });
    expect(settled.nodes.find((node) => node.id === "page-2")).toMatchObject({ x: 400, y: -250 });
  });

  it("moves the others out of the way of it", () => {
    const pins = { "page-2": { x: 400, y: -250 } };
    const settled = settleGraph(star(6), pins);
    for (const node of settled.nodes) {
      if (node.id === "page-2") continue;
      expect(Math.hypot(node.x - 400, node.y + 250)).toBeGreaterThan(GRAPH_NODE_RADIUS * 2);
    }
  });

  it("lets a pin on the focused page beat the centre", () => {
    const settled = settleGraph(star(4), { focus: { x: 120, y: 90 } });
    expect(settled.nodes[0]).toMatchObject({ id: "focus", x: 120, y: 90 });
  });

  it("ignores a pin naming a page that is not on this graph", () => {
    const model = star(4);
    expect(settleGraph(model, { "not-here": { x: 10, y: 10 } })).toEqual(settleGraph(model));
  });

  it("still comes out the same twice", () => {
    const pins = { "page-1": { x: -300, y: 120 } };
    expect(settleGraph(star(7), pins)).toEqual(settleGraph(star(7), pins));
  });
});
