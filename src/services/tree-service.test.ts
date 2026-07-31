import { describe, expect, it } from "vitest";
import { buildTreeData, createSearchMatcher, getAncestorChain, getEffectiveColor } from "./tree-service";
import { FOLDER_TEMPLATE_KEY, type Node } from "../constants/schema";

function node(overrides: Partial<Node> & Pick<Node, "id" | "name" | "parentId" | "templateKey">): Node {
  return {
    tabs: [],
    properties: {},
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function byId(nodes: Node[]): Record<string, Node> {
  return Object.fromEntries(nodes.map((n) => [n.id, n]));
}

describe("buildTreeData", () => {
  it("returns an empty array for an empty project", () => {
    expect(buildTreeData({}, [])).toEqual([]);
  });

  it("orders root nodes by rootOrder, not creation time", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 2 });
    const aus = node({ id: "aus", name: "AUs", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 1 });
    const tree = buildTreeData(byId([canon, aus]), ["canon", "aus"]);
    expect(tree.map((n) => n.id)).toEqual(["canon", "aus"]);
  });

  it("appends root nodes missing from rootOrder after the ordered ones, by creation time", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 2 });
    const stray = node({ id: "stray", name: "Stray", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 1 });
    const tree = buildTreeData(byId([canon, stray]), ["canon"]);
    expect(tree.map((n) => n.id)).toEqual(["canon", "stray"]);
  });

  it("nests children under a folder, ordered by creation time", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const second = node({ id: "second", name: "Second", parentId: "canon", templateKey: "note", createdAt: 2 });
    const first = node({ id: "first", name: "First", parentId: "canon", templateKey: "note", createdAt: 1 });
    const tree = buildTreeData(byId([canon, second, first]), ["canon"]);
    expect(tree[0].children?.map((n) => n.id)).toEqual(["first", "second"]);
  });

  it("gives an empty folder an empty children array, not null", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const tree = buildTreeData(byId([canon]), ["canon"]);
    expect(tree[0].children).toEqual([]);
  });

  it("gives a leaf template (note/item/event) null children, never an array", () => {
    const note = node({ id: "note", name: "Note", parentId: null, templateKey: "note" });
    const tree = buildTreeData(byId([note]), ["note"]);
    expect(tree[0].children).toBeNull();
  });

  it("allows nesting under non-folder nestable templates (character/location/faction/species)", () => {
    const character = node({ id: "char", name: "Valera", parentId: null, templateKey: "character" });
    const item = node({ id: "item", name: "Sword", parentId: "char", templateKey: "item" });
    const tree = buildTreeData(byId([character, item]), ["char"]);
    expect(tree[0].children?.map((n) => n.id)).toEqual(["item"]);
  });
});

describe("getEffectiveColor", () => {
  it("returns the node's own color as owner", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, color: "sky" });
    expect(getEffectiveColor("canon", byId([canon]))).toEqual({ color: "sky", isOwner: true });
  });

  it("inherits the parent's color when the node has none of its own", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, color: "sky" });
    const page = node({ id: "page", name: "Page", parentId: "canon", templateKey: "note" });
    expect(getEffectiveColor("page", byId([canon, page]))).toEqual({ color: "sky", isOwner: false });
  });

  it("inherits through multiple uncolored ancestors from the nearest colored one", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, color: "sky" });
    const sub = node({ id: "sub", name: "Sub", parentId: "canon", templateKey: FOLDER_TEMPLATE_KEY });
    const page = node({ id: "page", name: "Page", parentId: "sub", templateKey: "note" });
    expect(getEffectiveColor("page", byId([canon, sub, page]))).toEqual({ color: "sky", isOwner: false });
  });

  it("lets a child's own color override and break the cascade", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, color: "sky" });
    const page = node({ id: "page", name: "Page", parentId: "canon", templateKey: "note", color: "rose" });
    expect(getEffectiveColor("page", byId([canon, page]))).toEqual({ color: "rose", isOwner: true });
  });

  it("returns null uncolored when no node in the chain has a color", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const page = node({ id: "page", name: "Page", parentId: "canon", templateKey: "note" });
    expect(getEffectiveColor("page", byId([canon, page]))).toEqual({ color: null, isOwner: false });
  });
});

describe("getAncestorChain", () => {
  it("returns an empty array for a root-level node", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    expect(getAncestorChain("canon", byId([canon]))).toEqual([]);
  });

  it("returns ancestors from root to immediate parent, excluding the node itself", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const sub = node({ id: "sub", name: "Sub", parentId: "canon", templateKey: FOLDER_TEMPLATE_KEY });
    const page = node({ id: "page", name: "Page", parentId: "sub", templateKey: "note" });
    const chain = getAncestorChain("page", byId([canon, sub, page]));
    expect(chain.map((n) => n.id)).toEqual(["canon", "sub"]);
  });

  it("returns an empty array for an unknown node id", () => {
    expect(getAncestorChain("missing", {})).toEqual([]);
  });
});

describe("createSearchMatcher", () => {
  it("returns null for an empty or blank query, meaning don't filter", () => {
    expect(createSearchMatcher({}, "")).toBeNull();
    expect(createSearchMatcher({}, "   ")).toBeNull();
  });

  it("matches by name", () => {
    const valera = node({ id: "1", name: "Valera Jiang", parentId: null, templateKey: "character" });
    const matcher = createSearchMatcher(byId([valera]), "Valera");
    expect(matcher?.("1")).toBe(true);
  });

  it("does not match unrelated names", () => {
    const valera = node({ id: "1", name: "Valera Jiang", parentId: null, templateKey: "character" });
    const matcher = createSearchMatcher(byId([valera]), "Sampo");
    expect(matcher?.("1")).toBe(false);
  });

  it("with a leading #, matches only against tags, not names", () => {
    const tagged = node({ id: "1", name: "Antagonist Page", parentId: null, templateKey: "note", tags: ["antagonist"] });
    const untagged = node({ id: "2", name: "Antagonist", parentId: null, templateKey: "note", tags: [] });
    const matcher = createSearchMatcher(byId([tagged, untagged]), "#antagonist");
    expect(matcher?.("1")).toBe(true);
    expect(matcher?.("2")).toBe(false);
  });
});

// The fuzzy index is cached against the node record's identity so it isn't
// rebuilt on every keystroke. These cover the risk that introduces: a cache
// that outlives the data it was built from would leave the search box matching
// against a world the user has already changed.
describe("createSearchMatcher index caching", () => {
  const valera = node({ id: "1", name: "Valera Jiang", parentId: null, templateKey: "character", tags: ["hero"] });
  const sampo = node({ id: "2", name: "Sampo Koski", parentId: null, templateKey: "character", tags: ["rival"] });

  it("gives the same answers on repeated queries against the same record", () => {
    const nodes = byId([valera, sampo]);
    for (const query of ["Valera", "Sampo", "Valera"]) {
      const matcher = createSearchMatcher(nodes, query);
      expect(matcher?.("1")).toBe(query === "Valera");
    }
  });

  it("sees a node added since the last search", () => {
    const before = byId([valera]);
    expect(createSearchMatcher(before, "Sampo")?.("2")).toBe(false);

    // The store replaces the record rather than mutating it, which is exactly
    // what makes the cache safe to key on identity.
    const after = byId([valera, sampo]);
    expect(createSearchMatcher(after, "Sampo")?.("2")).toBe(true);
  });

  it("sees a rename since the last search", () => {
    const before = byId([valera]);
    expect(createSearchMatcher(before, "Renamed")?.("1")).toBe(false);

    const after = byId([{ ...valera, name: "Renamed Entirely" }]);
    expect(createSearchMatcher(after, "Renamed")?.("1")).toBe(true);
  });

  it("keeps name and tag queries on separate indexes", () => {
    const nodes = byId([valera, sampo]);
    // Priming the name index first must not make the tag query search names.
    expect(createSearchMatcher(nodes, "Valera")?.("1")).toBe(true);
    expect(createSearchMatcher(nodes, "#hero")?.("1")).toBe(true);
    expect(createSearchMatcher(nodes, "#hero")?.("2")).toBe(false);
    expect(createSearchMatcher(nodes, "#Valera")?.("1")).toBe(false);
  });
});

// Regression: only root-level order was ever persisted, so dragging a page
// around inside a folder appeared to work and then snapped back to creation
// order on the next render.
describe("buildTreeData childOrder", () => {
  const folder = node({ id: "f", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 0 });
  const a = node({ id: "a", name: "A", parentId: "f", templateKey: "note", createdAt: 1 });
  const b = node({ id: "b", name: "B", parentId: "f", templateKey: "note", createdAt: 2 });
  const c = node({ id: "c", name: "C", parentId: "f", templateKey: "note", createdAt: 3 });

  function childNames(childOrder: Record<string, string[]>) {
    const tree = buildTreeData(byId([folder, a, b, c]), ["f"], childOrder);
    return tree[0].children!.map((n) => n.name);
  }

  it("falls back to creation order when a folder has no stored order", () => {
    expect(childNames({})).toEqual(["A", "B", "C"]);
  });

  it("honours a stored order inside a folder", () => {
    expect(childNames({ f: ["c", "a", "b"] })).toEqual(["C", "A", "B"]);
  });

  it("puts nodes missing from a stored order after the listed ones, by creation time", () => {
    // "c" was created after the last reorder — it belongs at the end, not the front.
    expect(childNames({ f: ["b", "a"] })).toEqual(["B", "A", "C"]);
  });

  it("ignores ids in a stored order that no longer exist", () => {
    expect(childNames({ f: ["ghost", "c", "b", "a"] })).toEqual(["C", "B", "A"]);
  });

  it("leaves other folders on creation order", () => {
    const other = node({ id: "g", name: "AUs", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 4 });
    const x = node({ id: "x", name: "X", parentId: "g", templateKey: "note", createdAt: 5 });
    const y = node({ id: "y", name: "Y", parentId: "g", templateKey: "note", createdAt: 6 });
    const tree = buildTreeData(byId([folder, a, b, c, other, x, y]), ["f", "g"], { f: ["c", "b", "a"] });
    expect(tree[1].children!.map((n) => n.name)).toEqual(["X", "Y"]);
  });
});
