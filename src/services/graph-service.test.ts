import { describe, expect, it } from "vitest";
import { createNode, createTab, type Node } from "../constants/schema";
import { linkIndex } from "./link-index";
import type { GraphModel } from "./graph-service";
import {
  graphAround,
  graphOfPages,
  graphOperatorsFor,
  graphPinKey,
  pagesInUniverse,
  seedPosition,
  seedScatter,
  seededRandom,
  GRAPH_FILTER_FIELDS,
} from "./graph-service";

function page(name: string, patch: Partial<Node> = {}): Node {
  return { ...createNode({ parentId: null, templateKey: "character", name }), ...patch };
}

function tabWith(content: unknown[]) {
  return [createTab({ id: "overview", label: "Overview", content })];
}

function mention(nodeId: string) {
  return { type: "paragraph", content: [{ type: "mention", props: { nodeId, label: "x" } }] };
}

function graph(nodes: Node[], focusId: string, depth = 1, keep?: (node: Node) => boolean) {
  const record = Object.fromEntries(nodes.map((node) => [node.id, node]));
  return graphAround(focusId, record, linkIndex(record), depth, keep);
}

function names(model: ReturnType<typeof graph>) {
  return model.nodes.map((node) => node.name);
}

function edgeBetween(model: ReturnType<typeof graph>, a: Node, b: Node) {
  return model.edges.find(
    (edge) =>
      (edge.sourceId === a.id && edge.targetId === b.id) || (edge.sourceId === b.id && edge.targetId === a.id),
  );
}

describe("graphAround", () => {
  it("puts the focused page first, at depth 0", () => {
    const valera = page("Valera");
    const model = graph([valera], valera.id);
    expect(model.nodes).toHaveLength(1);
    expect(model.nodes[0]).toMatchObject({ name: "Valera", depth: 0 });
  });

  it("returns nothing for a page that is not there", () => {
    expect(graph([page("Valera")], "missing")).toEqual({ nodes: [], edges: [] });
  });

  it("reaches a page the focus mentions and a page that mentions the focus", () => {
    const valera = page("Valera");
    const sword = page("Her Sword");
    const sampo = page("Sampo", { tabs: tabWith([mention(valera.id)]) });
    const withSword = { ...valera, tabs: tabWith([mention(sword.id)]) };

    const model = graph([withSword, sword, sampo], valera.id);
    expect(names(model).sort()).toEqual(["Her Sword", "Sampo", "Valera"]);
  });

  // The tree is a real relationship — her call 2026-09-07 — so a page nested
  // under another is on the graph even with nothing written between them.
  it("counts a parent and a child as connections", () => {
    const valera = page("Valera");
    const sword = page("Her Sword", { parentId: valera.id });
    const model = graph([valera, sword], valera.id);
    expect(names(model)).toContain("Her Sword");
    expect(edgeBetween(model, valera, sword)?.kind).toBe("tree");
  });

  it("stops at the depth it is given", () => {
    const valera = page("Valera");
    const sampo = page("Sampo");
    const stranger = page("Stranger");
    const nodes = [
      { ...valera, tabs: tabWith([mention(sampo.id)]) },
      { ...sampo, tabs: tabWith([mention(stranger.id)]) },
      stranger,
    ];

    expect(names(graph(nodes, valera.id, 1)).sort()).toEqual(["Sampo", "Valera"]);
    expect(names(graph(nodes, valera.id, 2)).sort()).toEqual(["Sampo", "Stranger", "Valera"]);
  });

  // Gathering edges during the walk would draw the outer ring as spokes with
  // no rim: two neighbours connected to each other but not to the focus would
  // have no line between them.
  it("draws the line between two pages that both sit on the outer ring", () => {
    const valera = page("Valera");
    const sampo = page("Sampo");
    const kafka = page("Kafka");
    const nodes = [
      { ...valera, tabs: tabWith([mention(sampo.id), mention(kafka.id)]) },
      { ...sampo, tabs: tabWith([mention(kafka.id)]) },
      kafka,
    ];

    expect(edgeBetween(graph(nodes, valera.id, 1), sampo, kafka)).toBeDefined();
  });

  it("draws one line for a pair, not one per direction", () => {
    const valera = page("Valera");
    const sampo = page("Sampo");
    const nodes = [
      { ...valera, tabs: tabWith([mention(sampo.id)]) },
      { ...sampo, tabs: tabWith([mention(valera.id)]) },
    ];

    expect(graph(nodes, valera.id).edges).toHaveLength(1);
  });

  // Something she wrote is a more specific claim than where she filed the
  // page, so a pair connected both ways is drawn as the written one.
  it("prefers a written connection over the tree for the same pair", () => {
    const valera = page("Valera");
    const sword = page("Her Sword", { parentId: valera.id });
    const nodes = [{ ...valera, tabs: tabWith([mention(sword.id)]) }, sword];
    expect(edgeBetween(graph(nodes, valera.id), valera, sword)?.kind).toBe("prose");
  });

  it("keeps the field's name on a line that came from a reference property", () => {
    const valera = page("Valera");
    const sampo = page("Sampo", { properties: { friends: [valera.id] } });
    const edge = edgeBetween(graph([valera, sampo], valera.id), valera, sampo);
    expect(edge).toMatchObject({ kind: "property", label: "Friends" });
  });

  it("carries the colour cascade, and says who owns it", () => {
    const folder = page("Canon", { templateKey: "folder", color: "rose" });
    const valera = page("Valera", { parentId: folder.id });
    const model = graph([folder, valera], valera.id);
    const drawn = model.nodes.find((node) => node.name === "Valera");
    expect(drawn).toMatchObject({ color: "rose", ownsColor: false });
  });

  it("ignores a pointer at a page that has been deleted", () => {
    const valera = page("Valera", { tabs: tabWith([mention("gone")]) });
    const model = graph([valera], valera.id);
    expect(model.nodes).toHaveLength(1);
    expect(model.edges).toHaveLength(0);
  });

  // Two runs over the same world have to agree, or there is no building a
  // memory of where anything is — see docs/shipped.md Phase 24.
  it("comes out identical when asked twice", () => {
    const valera = page("Valera");
    const sampo = page("Sampo");
    const nodes = [{ ...valera, tabs: tabWith([mention(sampo.id)]) }, sampo];
    expect(graph(nodes, valera.id)).toEqual(graph(nodes, valera.id));
  });
});

describe("seedPosition", () => {
  it("centres the focused page", () => {
    expect(seedPosition("anything", 0)).toEqual({ x: 0, y: 0 });
  });

  it("gives one page the same starting point every time", () => {
    expect(seedPosition("valera", 1)).toEqual(seedPosition("valera", 1));
  });

  it("puts a page further out the more hops away it is", () => {
    const near = seedPosition("valera", 1);
    const far = seedPosition("valera", 2);
    expect(Math.hypot(far.x, far.y)).toBeGreaterThan(Math.hypot(near.x, near.y));
  });
});

describe("seededRandom", () => {
  it("gives the same sequence for the same seed", () => {
    const a = seededRandom("valera");
    const b = seededRandom("valera");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("gives a different sequence for a different seed", () => {
    expect(seededRandom("valera")()).not.toEqual(seededRandom("sampo")());
  });

  it("stays inside the range d3 expects of a random source", () => {
    const next = seededRandom("valera");
    for (let i = 0; i < 200; i += 1) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("graphAround with a filter", () => {
  // Phase 24 step 2. The filter model is Phase 23's; what this checks is that
  // it is applied *during* the walk, which is the part a graph needs and a
  // table does not.
  function chain() {
    const valera = page("Valera");
    const sampo = page("Sampo", { templateKey: "location" });
    const kafka = page("Kafka");
    return [
      { ...valera, tabs: tabWith([mention(sampo.id)]) },
      { ...sampo, tabs: tabWith([mention(kafka.id)]) },
      kafka,
    ];
  }

  it("leaves out a page the filter rejects", () => {
    const nodes = chain();
    const kept = graph(nodes, nodes[0].id, 1, (node) => node.templateKey === "character");
    expect(names(kept)).toEqual(["Valera"]);
  });

  // The whole reason it filters during the walk: Kafka passes the filter, but
  // the only way to it was through a page that did not, so drawing it would put
  // a circle on the picture with no line to anything.
  it("does not reach a page whose only route runs through a rejected one", () => {
    const nodes = chain();
    const kept = graph(nodes, nodes[0].id, 2, (node) => node.templateKey === "character");
    expect(names(kept)).toEqual(["Valera"]);
    expect(names(graph(nodes, nodes[0].id, 2))).toContain("Kafka");
  });

  it("keeps the focused page even when it fails the filter itself", () => {
    const nodes = chain();
    const kept = graph(nodes, nodes[0].id, 1, () => false);
    expect(names(kept)).toEqual(["Valera"]);
  });
});

describe("graphOperatorsFor", () => {
  // A page always has exactly one template, so "is empty" on it can never be
  // true and would sit in the list hiding everything when picked.
  it("offers a template only the two that can be true", () => {
    expect(graphOperatorsFor({ kind: "template" })).toEqual(["is", "is-not"]);
  });

  it("offers tags the many-valued set, including the empty pair", () => {
    expect(graphOperatorsFor({ kind: "tag" })).toEqual(["has", "does-not-have", "is-empty", "is-not-empty"]);
  });

  it("offers something for every field a graph can filter on", () => {
    for (const field of GRAPH_FILTER_FIELDS) {
      expect(graphOperatorsFor(field).length).toBeGreaterThan(0);
    }
  });
});

describe("pagesInUniverse", () => {
  function world() {
    const canon = page("Canon", { templateKey: "universe" });
    const demonic = page("Demonic AU", { templateKey: "universe" });
    const valera = page("Valera", { parentId: canon.id });
    const characters = page("Characters", { templateKey: "folder", parentId: canon.id });
    const sword = page("Her Sword", { parentId: characters.id });
    const dark = page("Dark Valera", { parentId: demonic.id });
    const loose = page("Loose Note");
    return { canon, demonic, valera, characters, sword, dark, loose };
  }

  function inUniverse(all: Node[], universeId: string | null) {
    return pagesInUniverse(Object.fromEntries(all.map((n) => [n.id, n])), universeId).map((n) => n.name);
  }

  it("takes everything beneath the universe, however deep", () => {
    const w = world();
    expect(inUniverse(Object.values(w), w.canon.id)).toEqual(["Characters", "Her Sword", "Valera"]);
  });

  // A universe is a container for a version of the world, not a page in it, so
  // one circle joined to seventy others hides the shape underneath.
  it("never draws a universe itself", () => {
    const w = world();
    expect(inUniverse(Object.values(w), null)).not.toContain("Canon");
    expect(inUniverse(Object.values(w), null)).not.toContain("Demonic AU");
  });

  it("takes the whole world when no universe is chosen", () => {
    const w = world();
    expect(inUniverse(Object.values(w), null)).toEqual([
      "Characters",
      "Dark Valera",
      "Her Sword",
      "Loose Note",
      "Valera",
    ]);
  });

  it("leaves out another universe's pages", () => {
    const w = world();
    expect(inUniverse(Object.values(w), w.canon.id)).not.toContain("Dark Valera");
  });

  it("comes out in the same order every time", () => {
    const w = world();
    expect(inUniverse(Object.values(w), null)).toEqual(inUniverse(Object.values(w), null));
  });
});

describe("graphOfPages", () => {
  function build(all: Node[], ids: string[], focusId: string | null = null, keep?: (node: Node) => boolean) {
    const record = Object.fromEntries(all.map((n) => [n.id, n]));
    return graphOfPages(ids, focusId, record, linkIndex(record), keep);
  }

  // The whole reason the world graph is not a walk: a page nobody has linked is
  // the most useful thing a picture of a world can point at.
  it("draws a page that is joined to nothing", () => {
    const valera = page("Valera");
    const loner = page("Loose Note");
    const model = build([valera, loner], [valera.id, loner.id]);
    expect(model.nodes.map((n) => n.name).sort()).toEqual(["Loose Note", "Valera"]);
    expect(model.edges).toHaveLength(0);
  });

  it("still draws the lines between the pages it was given", () => {
    const valera = page("Valera");
    const sampo = page("Sampo");
    const nodes = [{ ...valera, tabs: tabWith([mention(sampo.id)]) }, sampo];
    expect(build(nodes, [valera.id, sampo.id]).edges).toHaveLength(1);
  });

  it("has no centre when it is given no focus", () => {
    const valera = page("Valera");
    const sampo = page("Sampo");
    const model = build([valera, sampo], [valera.id, sampo.id]);
    expect(model.nodes.every((node) => node.depth === 1)).toBe(true);
  });

  // **Marked, not moved.** Widening a page's graph to everything and opening
  // the world's from the rail are the same picture, so a focus may not shift
  // anything — it is drawn larger and filled, and that is all.
  it("marks the focused page without moving it", () => {
    const valera = page("Valera");
    const sampo = page("Sampo");
    const withFocus = build([valera, sampo], [valera.id, sampo.id], valera.id);
    const without = build([valera, sampo], [valera.id, sampo.id]);

    expect(withFocus.nodes[0]).toMatchObject({ name: "Valera", depth: 0 });
    expect(without.nodes[0]).toMatchObject({ name: "Valera", depth: 1 });
    // Same page, same seeded position, focus or no focus.
    expect(withFocus.nodes[0].x).toBe(without.nodes[0].x);
    expect(withFocus.nodes[0].y).toBe(without.nodes[0].y);
  });

  // The promise the whole of step 3 rests on, asserted rather than described.
  it("draws the same pages in the same places whichever door asked", () => {
    const valera = page("Valera");
    const sampo = page("Sampo");
    const kafka = page("Kafka");
    const nodes = [{ ...valera, tabs: tabWith([mention(sampo.id)]) }, sampo, kafka];
    const ids = [valera.id, sampo.id, kafka.id];

    const fromRail = build(nodes, ids);
    const fromPage = build(nodes, ids, valera.id);

    // Depth is the one field that may differ: it is what marks the focus.
    const place = (model: GraphModel) => model.nodes.map((node) => [node.id, node.x, node.y]);
    expect(place(fromPage)).toEqual(place(fromRail));
    expect(fromPage.edges).toEqual(fromRail.edges);
  });

  // Opened from a page reached across a universe boundary, that page is still
  // where she is.
  // Appended rather than inserted, so its presence cannot shift the rest of
  // the set along and change where everything settles.
  it("draws a focused page that is not in the set, without reordering it", () => {
    const valera = page("Valera");
    const stranger = page("Stranger");
    const model = build([valera, stranger], [stranger.id], valera.id);
    expect(model.nodes.map((n) => n.name)).toEqual(["Stranger", "Valera"]);
    expect(model.nodes[1]).toMatchObject({ name: "Valera", depth: 0 });
  });

  it("leaves out a page a filter rejects, but never the focus", () => {
    const valera = page("Valera");
    const sampo = page("Sampo");
    const model = build([valera, sampo], [valera.id, sampo.id], valera.id, (node) => node.name !== "Valera" && node.name !== "Sampo");
    expect(model.nodes.map((n) => n.name)).toEqual(["Valera"]);
  });

  it("comes out identical when asked twice", () => {
    const valera = page("Valera");
    const sampo = page("Sampo");
    const ids = [valera.id, sampo.id];
    expect(build([valera, sampo], ids)).toEqual(build([valera, sampo], ids));
  });
});

describe("graphPinKey", () => {
  it("keys a page's graph by that page, so widening the reach keeps the tidying", () => {
    expect(graphPinKey("valera", "canon")).toBe("valera");
  });

  it("keys a graph with no centre by its universe", () => {
    expect(graphPinKey(null, "canon")).toBe("universe:canon");
  });

  it("has a key for the whole world too", () => {
    expect(graphPinKey(null, null)).toBe("universe:all");
  });

  // Page ids are UUIDs, so nothing that is one can contain a colon.
  it("cannot collide with a page's own key", () => {
    expect(graphPinKey(null, "canon")).not.toBe(graphPinKey("canon", null));
  });
});

describe("seedScatter", () => {
  it("gives one page the same starting point every time", () => {
    expect(seedScatter("valera", 50)).toEqual(seedScatter("valera", 50));
  });

  it("spreads further as there are more pages to place", () => {
    const small = seedScatter("valera", 10);
    const large = seedScatter("valera", 400);
    expect(Math.hypot(large.x, large.y)).toBeGreaterThan(Math.hypot(small.x, small.y));
  });

  it("puts two pages in different places", () => {
    expect(seedScatter("valera", 50)).not.toEqual(seedScatter("sampo", 50));
  });
});
