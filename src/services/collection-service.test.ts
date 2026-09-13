import { describe, expect, it } from "vitest";
import { createNode, RECENT_DEFAULT_LIMIT, UNIVERSE_TEMPLATE_KEY, type Block, type Node } from "../constants/schema";
import { collectionRows, recentLimit } from "./collection-service";
import { linkIndex } from "./link-index";

function page(name: string, patch: Partial<Node> = {}): Node {
  return { ...createNode({ parentId: null, templateKey: "note", name }), ...patch };
}

function graph(...list: Node[]): Record<string, Node> {
  return Object.fromEntries(list.map((node) => [node.id, node]));
}

function block(patch: Partial<Block>): Block {
  return { id: "b", kind: "collection", ...patch };
}

function rowsOf(nodes: Record<string, Node>, node: Node, b: Block, pinnedIds: string[] = []): string[] {
  return collectionRows({ nodes, node, block: b, index: linkIndex(nodes, {}), pinnedIds }).map((row) => row.node.name);
}

describe("collectionRows — recent", () => {
  it("lists the pages touched last, newest first, without the page the block is on", () => {
    const home = page("Home", { updatedAt: 100 });
    const a = page("A", { updatedAt: 3 });
    const b = page("B", { updatedAt: 9 });
    const c = page("C", { updatedAt: 5 });
    expect(rowsOf(graph(home, a, b, c), home, block({ source: "recent" }))).toEqual(["B", "C", "A"]);
  });

  it("leaves universes out", () => {
    const home = page("Home");
    const universe = page("Canon", { templateKey: UNIVERSE_TEMPLATE_KEY, updatedAt: 99 });
    const a = page("A", { updatedAt: 1 });
    expect(rowsOf(graph(home, universe, a), home, block({ source: "recent" }))).toEqual(["A"]);
  });

  it("stops at the block's count, or the default when it has none", () => {
    const home = page("Home");
    const many = Array.from({ length: 30 }, (_, i) => page(`P${i}`, { updatedAt: i }));
    const nodes = graph(home, ...many);
    expect(rowsOf(nodes, home, block({ source: "recent" }))).toHaveLength(RECENT_DEFAULT_LIMIT);
    expect(rowsOf(nodes, home, block({ source: "recent", limit: 3 }))).toEqual(["P29", "P28", "P27"]);
  });
});

describe("collectionRows — pinned", () => {
  it("is the rail's list in the rail's order, skipping anything deleted", () => {
    const home = page("Home");
    const a = page("A");
    const b = page("B");
    expect(rowsOf(graph(home, a, b), home, block({ source: "pinned" }), [b.id, "gone", a.id])).toEqual(["B", "A"]);
  });

  it("is empty with nothing pinned", () => {
    const home = page("Home");
    expect(rowsOf(graph(home), home, block({ source: "pinned" }))).toEqual([]);
  });
});

describe("collectionRows — the four older sources still resolve here", () => {
  it("manual keeps her order and drops the deleted", () => {
    const home = page("Home");
    const a = page("A");
    const b = page("B");
    expect(rowsOf(graph(home, a, b), home, block({ source: "manual", targetIds: [b.id, "gone", a.id] }))).toEqual(["B", "A"]);
  });

  it("subpages lists the children", () => {
    const home = page("Home");
    const child = page("Child", { parentId: home.id });
    expect(rowsOf(graph(home, child), home, block({ source: "subpages" }))).toEqual(["Child"]);
  });
});

describe("recentLimit", () => {
  it("falls back to the default for nothing, zero or nonsense", () => {
    expect(recentLimit(block({ source: "recent" }))).toBe(RECENT_DEFAULT_LIMIT);
    expect(recentLimit(block({ source: "recent", limit: 0 }))).toBe(RECENT_DEFAULT_LIMIT);
    expect(recentLimit(block({ source: "recent", limit: 12.7 }))).toBe(12);
  });
});
