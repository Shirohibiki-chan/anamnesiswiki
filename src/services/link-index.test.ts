import { describe, expect, it } from "vitest";
import { createNode, createTab, type Node, type Storyline } from "../constants/schema";
import { linkIndex, outgoingEdges, pagesWithAnyTag } from "./link-index";

function page(name: string, patch: Partial<Node> = {}): Node {
  return { ...createNode({ parentId: null, templateKey: "character", name }), ...patch };
}

function tabWith(content: unknown[]) {
  return [createTab({ id: "overview", label: "Overview", content })];
}

function mention(nodeId: string, label = "x") {
  return { type: "paragraph", content: [{ type: "mention", props: { nodeId, label } }] };
}

function indexOf(nodes: Node[], storylines: Record<string, Storyline> = {}) {
  return linkIndex(Object.fromEntries(nodes.map((n) => [n.id, n])), storylines);
}

describe("outgoingEdges", () => {
  it("finds a mention written in prose", () => {
    const target = page("Valera");
    const from = page("Sampo", { tabs: tabWith([mention(target.id)]) });
    expect(outgoingEdges(from).get(target.id)).toEqual({ kind: "prose" });
  });

  it("finds a mention nested inside a list item's children", () => {
    const target = page("Valera");
    const from = page("Sampo", {
      tabs: tabWith([{ type: "bulletListItem", content: [], children: [mention(target.id)] }]),
    });
    expect(outgoingEdges(from).has(target.id)).toBe(true);
  });

  it("counts a reference property, and remembers which field it was", () => {
    const target = page("Valera");
    const from = page("Sampo", { properties: { friends: [target.id] } });
    expect(outgoingEdges(from).get(target.id)).toEqual({ kind: "property", label: "Friends" });
  });

  // A multi-select stores option ids, which are UUIDs exactly like node ids.
  // Reading "any array of strings" as references is how a chip would
  // eventually turn into a phantom backlink.
  it("ignores a chip property whose option id happens to match a page", () => {
    const target = page("Valera");
    const from = page("Sampo", {
      customProperties: [{ key: "mood", label: "Mood", type: "multiselect", options: [] }],
      properties: { mood: [target.id] },
    });
    expect(outgoingEdges(from).has(target.id)).toBe(false);
  });

  it("counts a manual collection's list", () => {
    const target = page("Valera");
    const from = page("Sampo", {
      blocks: [{ id: "b1", kind: "collection", source: "manual", targetIds: [target.id] }],
    });
    expect(outgoingEdges(from).get(target.id)).toEqual({ kind: "manual" });
  });

  it("does not count a page pointing at itself", () => {
    const self = page("Sampo");
    self.tabs = tabWith([mention(self.id)]);
    expect(outgoingEdges(self).size).toBe(0);
  });

  // She wrote @ragatha twice on one page. That is one row, not two.
  it("counts one page pointing at another once, however many times it does it", () => {
    const target = page("Valera");
    const from = page("Sampo", { tabs: tabWith([mention(target.id), mention(target.id)]) });
    expect(outgoingEdges(from).size).toBe(1);
  });

  it("prefers prose over a property when a page does both", () => {
    const target = page("Valera");
    const from = page("Sampo", { tabs: tabWith([mention(target.id)]), properties: { friends: [target.id] } });
    expect(outgoingEdges(from).get(target.id)?.kind).toBe("prose");
  });
});

describe("linkIndex", () => {
  it("reports the pages that mention one, not the ones it mentions", () => {
    const valera = page("Valera");
    const sampo = page("Sampo", { tabs: tabWith([mention(valera.id)]) });
    const index = indexOf([valera, sampo]);
    expect(index.mentionsOf.get(valera.id)?.map((m) => m.fromId)).toEqual([sampo.id]);
    expect(index.mentionsOf.get(sampo.id)).toBeUndefined();
  });

  it("drops an edge pointing at a page that has been deleted", () => {
    const sampo = page("Sampo", { tabs: tabWith([mention("gone")]) });
    expect(indexOf([sampo]).mentionsOf.size).toBe(0);
  });

  it("lists direct children only", () => {
    const parent = page("Characters");
    const child = page("Valera", { parentId: parent.id });
    const grandchild = page("Her Sword", { parentId: child.id });
    const index = indexOf([parent, child, grandchild]);
    expect(index.childrenOf.get(parent.id)).toEqual([child.id]);
  });

  it("indexes tags case-insensitively", () => {
    const a = page("A", { tags: ["Seafaring"] });
    const b = page("B", { tags: ["seafaring"] });
    expect(indexOf([a, b]).taggedWith.get("seafaring")).toEqual([a.id, b.id]);
  });

  it("returns the same index object for the same pages and the same canvases", () => {
    const nodes = { a: page("A") };
    // Both arguments have to be the same *object*, not merely equal — the
    // cache is identity-keyed, which is what makes the store's next immutable
    // update evict it.
    const storylines = {};
    expect(linkIndex(nodes, storylines)).toBe(linkIndex(nodes, storylines));
  });

  it("builds again when a canvas changes but no page did", () => {
    const scene = page("A Scene");
    const storyline = page("The Storyline");
    const nodes = { [scene.id]: scene, [storyline.id]: storyline };

    const before = linkIndex(nodes, {});
    expect(before.mentionsOf.get(scene.id) ?? []).toHaveLength(0);

    // Dragging a scene onto a canvas changes what is connected to what without
    // touching a single page. An index keyed on the pages alone would keep
    // handing back the answer from before it.
    const after = linkIndex(nodes, {
      [storyline.id]: {
        version: 1,
        nodes: [{ id: "n1", pageId: scene.id, x: 0, y: 0 }],
        edges: [],
        notes: [],
        bands: [],
      },
    });
    expect(after).not.toBe(before);
    expect(after.mentionsOf.get(scene.id)).toEqual([{ fromId: storyline.id, kind: "storyline" }]);
  });

  it("counts a page twice on one canvas as one connection", () => {
    const scene = page("A Scene");
    const storyline = page("The Storyline");
    const nodes = { [scene.id]: scene, [storyline.id]: storyline };
    const index = linkIndex(nodes, {
      [storyline.id]: {
        version: 1,
        // The same page, revisited from another thread — one relationship.
        nodes: [
          { id: "n1", pageId: scene.id, x: 0, y: 0 },
          { id: "n2", pageId: scene.id, x: 300, y: 0 },
        ],
        edges: [],
        notes: [],
        bands: [],
      },
    });
    expect(index.mentionsOf.get(scene.id)).toHaveLength(1);
  });

  it("ignores a canvas whose storyline page has been deleted", () => {
    const scene = page("A Scene");
    const nodes = { [scene.id]: scene };
    const index = linkIndex(nodes, {
      gone: { version: 1, nodes: [{ id: "n1", pageId: scene.id, x: 0, y: 0 }], edges: [], notes: [], bands: [] },
    });
    expect(index.mentionsOf.get(scene.id) ?? []).toHaveLength(0);
  });
});

describe("pagesWithAnyTag", () => {
  it("collects several tags without repeating a page carrying both", () => {
    const a = page("A", { tags: ["canon", "swordfighter"] });
    const b = page("B", { tags: ["canon"] });
    expect(pagesWithAnyTag(indexOf([a, b]), ["canon", "swordfighter"])).toEqual([a.id, b.id]);
  });

  it("matches whatever case the block stored", () => {
    const a = page("A", { tags: ["Canon"] });
    expect(pagesWithAnyTag(indexOf([a]), ["CANON"])).toEqual([a.id]);
  });

  it("returns nothing for a block with no tags chosen, rather than everything", () => {
    const a = page("A", { tags: ["canon"] });
    expect(pagesWithAnyTag(indexOf([a]), [])).toEqual([]);
  });
});
