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
