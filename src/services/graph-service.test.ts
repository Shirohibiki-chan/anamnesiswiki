import { describe, expect, it } from "vitest";
import { createNode, createTab, type Node } from "../constants/schema";
import { linkIndex } from "./link-index";
import { graphAround, seedPosition, seededRandom } from "./graph-service";

function page(name: string, patch: Partial<Node> = {}): Node {
  return { ...createNode({ parentId: null, templateKey: "character", name }), ...patch };
}

function tabWith(content: unknown[]) {
  return [createTab({ id: "overview", label: "Overview", content })];
}

function mention(nodeId: string) {
  return { type: "paragraph", content: [{ type: "mention", props: { nodeId, label: "x" } }] };
}

function graph(nodes: Node[], focusId: string, depth = 1) {
  const record = Object.fromEntries(nodes.map((node) => [node.id, node]));
  return graphAround(focusId, record, linkIndex(record), depth);
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
  // memory of where anything is — see docs/plan.md Phase 24.
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
