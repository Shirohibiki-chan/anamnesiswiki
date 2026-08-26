import { describe, expect, it } from "vitest";
import {
  buildTreeData,
  collapseBreadcrumb,
  createSearchMatcher,
  getAncestorChain,
  getEffectiveColor,
  hasChildren,
  isDescendantOf,
  isHiddenByAncestor,
  moveDestinations,
  selectionRoots,
  sortSiblingIds,
} from "./tree-service";
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

  it("gives every template an array for children, so anything can be dropped onto", () => {
    // The inverse of what this asserted until 2026-08-10. react-arborist reads
    // null children as "leaf, not a drop target", and a note is one now.
    const note = node({ id: "note", name: "Note", parentId: null, templateKey: "note" });
    const tree = buildTreeData(byId([note]), ["note"]);
    expect(tree[0].children).toEqual([]);
  });

  it("nests under a leaf template", () => {
    const note = node({ id: "note", name: "Note", parentId: null, templateKey: "note" });
    const child = node({ id: "child", name: "Under it", parentId: "note", templateKey: "note" });
    const tree = buildTreeData(byId([note, child]), ["note"]);
    expect(tree[0].children?.map((n) => n.id)).toEqual(["child"]);
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

describe("isHiddenByAncestor", () => {
  it("is false for a node with no ancestors at all", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, hidden: true });
    expect(isHiddenByAncestor("canon", byId([canon]))).toBe(false);
  });

  it("excludes the node's own flag — that is the caller's to read", () => {
    // The menu offers to un-hide a page it hid; a page hidden by its folder
    // has nothing of its own to undo, and the two have to stay tellable apart.
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const page = node({ id: "page", name: "Page", parentId: "canon", templateKey: "note", hidden: true });
    expect(isHiddenByAncestor("page", byId([canon, page]))).toBe(false);
  });

  it("is true when the parent is hidden", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, hidden: true });
    const page = node({ id: "page", name: "Page", parentId: "canon", templateKey: "note" });
    expect(isHiddenByAncestor("page", byId([canon, page]))).toBe(true);
  });

  it("is true through visible ancestors in between", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, hidden: true });
    const sub = node({ id: "sub", name: "Sub", parentId: "canon", templateKey: FOLDER_TEMPLATE_KEY });
    const page = node({ id: "page", name: "Page", parentId: "sub", templateKey: "note" });
    expect(isHiddenByAncestor("page", byId([canon, sub, page]))).toBe(true);
  });

  it("cannot be overridden from below, unlike the colour cascade", () => {
    // A visible page inside a hidden folder is still unreachable to a reader,
    // so there is nothing for a child to override. This is the one place the
    // two cascades in this file deliberately disagree.
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, hidden: true });
    const page = node({ id: "page", name: "Page", parentId: "canon", templateKey: "note", hidden: false });
    expect(isHiddenByAncestor("page", byId([canon, page]))).toBe(true);
  });

  it("is false when nothing in the chain is hidden", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const page = node({ id: "page", name: "Page", parentId: "canon", templateKey: "note" });
    expect(isHiddenByAncestor("page", byId([canon, page]))).toBe(false);
  });
});

describe("hasChildren", () => {
  it("is false for a folder with nothing in it", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    expect(hasChildren("canon", byId([canon]))).toBe(false);
  });

  it("is true when a page is parented to it", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const page = node({ id: "page", name: "Page", parentId: "canon", templateKey: "note" });
    expect(hasChildren("canon", byId([canon, page]))).toBe(true);
  });

  it("counts only its own children, not a grandchild", () => {
    // The empty-folder hint asks about this folder. A folder whose only
    // descendant sits two levels down is still one you can't see anything in.
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const sub = node({ id: "sub", name: "Sub", parentId: "canon", templateKey: FOLDER_TEMPLATE_KEY });
    const page = node({ id: "page", name: "Page", parentId: "sub", templateKey: "note" });
    expect(hasChildren("sub", byId([canon, sub, page]))).toBe(true);
    expect(hasChildren("page", byId([canon, sub, page]))).toBe(false);
  });

  it("is false for a node that isn't in the map", () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    expect(hasChildren("gone", byId([canon]))).toBe(false);
  });

  it("does not mistake root-level nodes for children of anything", () => {
    // `parentId: null` must not match a lookup for a node whose id is missing.
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const aus = node({ id: "aus", name: "AUs", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    expect(hasChildren("canon", byId([canon, aus]))).toBe(false);
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

describe("collapseBreadcrumb", () => {
  const chain = (count: number): Node[] =>
    Array.from({ length: count }, (_, index) =>
      node({ id: `n${index}`, name: `N${index}`, parentId: null, templateKey: FOLDER_TEMPLATE_KEY }),
    );

  const names = (nodes: Node[]) => nodes.map((n) => n.name);

  it("leaves a trail alone when it already fits", () => {
    const trail = collapseBreadcrumb(chain(4), 4);
    expect(names(trail.leading)).toEqual(["N0", "N1", "N2", "N3"]);
    expect(trail.hidden).toEqual([]);
    expect(trail.trailing).toEqual([]);
  });

  it("handles a page with no ancestors at all", () => {
    expect(collapseBreadcrumb([], 4)).toEqual({ leading: [], hidden: [], trailing: [] });
  });

  it("keeps the topmost ancestor and the ones nearest the page", () => {
    const trail = collapseBreadcrumb(chain(6), 4);
    expect(names(trail.leading)).toEqual(["N0"]);
    expect(names(trail.hidden)).toEqual(["N1", "N2"]);
    expect(names(trail.trailing)).toEqual(["N3", "N4", "N5"]);
  });

  it("shows exactly maxVisible crumbs however deep the page is", () => {
    for (const depth of [5, 9, 40]) {
      const trail = collapseBreadcrumb(chain(depth), 4);
      expect(trail.leading.length + trail.trailing.length).toBe(4);
      expect(trail.hidden.length).toBe(depth - 4);
    }
  });

  it("loses nothing — the three parts put the original chain back in order", () => {
    const original = chain(9);
    const trail = collapseBreadcrumb(original, 4);
    expect([...trail.leading, ...trail.hidden, ...trail.trailing]).toEqual(original);
  });

  it("folds nothing when there's no room for both an ellipsis and a crumb", () => {
    const trail = collapseBreadcrumb(chain(6), 1);
    expect(names(trail.leading)).toEqual(["N0", "N1", "N2", "N3", "N4", "N5"]);
    expect(trail.hidden).toEqual([]);
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

  // The case that produced the mode control, and it cuts both ways: a project
  // with a `character` tag *and* folders called Characters can't isolate
  // either one with a plain query. Tag mode answered half of it from the
  // start; `name` is the half that was missing.
  const folder = node({ id: "1", name: "Characters", parentId: null, templateKey: "folder", tags: [] });
  const tagged = node({ id: "2", name: "Valera Jiang", parentId: null, templateKey: "character", tags: ["character"] });

  it("searches both fields by default", () => {
    const matcher = createSearchMatcher(byId([folder, tagged]), "character");
    expect(matcher?.("1")).toBe(true);
    expect(matcher?.("2")).toBe(true);
  });

  it("in name mode, ignores a tag that would otherwise match", () => {
    const matcher = createSearchMatcher(byId([folder, tagged]), "character", "name");
    expect(matcher?.("1")).toBe(true);
    expect(matcher?.("2")).toBe(false);
  });

  it("in tag mode, ignores a name that would otherwise match", () => {
    const matcher = createSearchMatcher(byId([folder, tagged]), "character", "tag");
    expect(matcher?.("1")).toBe(false);
    expect(matcher?.("2")).toBe(true);
  });

  // `#` predates the control and survives it, for pasted queries. It may only
  // ever narrow to tags — never widen a mode the control has set.
  it("lets a leading # force tag mode over whatever the control says", () => {
    const matcher = createSearchMatcher(byId([folder, tagged]), "#character", "name");
    expect(matcher?.("1")).toBe(false);
    expect(matcher?.("2")).toBe(true);
  });

  it("keeps each mode's index apart when the same nodes are searched three ways", () => {
    const nodes = byId([folder, tagged]);
    expect(createSearchMatcher(nodes, "character", "all")?.("1")).toBe(true);
    expect(createSearchMatcher(nodes, "character", "tag")?.("1")).toBe(false);
    expect(createSearchMatcher(nodes, "character", "name")?.("2")).toBe(false);
    expect(createSearchMatcher(nodes, "character", "all")?.("2")).toBe(true);
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

describe("buildTreeData focus", () => {
  // Canon > AUs > Demonic > Valera. Deep enough to be the case focus exists
  // for, which is the tree the user hit at nine levels.
  const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 0 });
  const aus = node({ id: "aus", name: "AUs", parentId: "canon", templateKey: FOLDER_TEMPLATE_KEY, createdAt: 1 });
  const demonic = node({ id: "demonic", name: "Demonic", parentId: "aus", templateKey: FOLDER_TEMPLATE_KEY, createdAt: 2 });
  const valera = node({ id: "valera", name: "Valera", parentId: "demonic", templateKey: "character", createdAt: 3 });
  const stray = node({ id: "stray", name: "Stray", parentId: null, templateKey: "note", createdAt: 4 });
  const nodes = byId([canon, aus, demonic, valera, stray]);

  it("starts at the whole project when nothing is focused", () => {
    expect(buildTreeData(nodes, ["canon", "stray"]).map((n) => n.name)).toEqual(["Canon", "Stray"]);
  });

  // The focused node's *children* are the roots. The node itself is named in
  // the path bar instead — it's the boundary of the view, not part of it.
  it("starts at the focused node's children, not the node itself", () => {
    const tree = buildTreeData(nodes, ["canon", "stray"], {}, "aus");
    expect(tree.map((n) => n.name)).toEqual(["Demonic"]);
    expect(tree[0].children!.map((n) => n.name)).toEqual(["Valera"]);
  });

  it("leaves everything outside the focus out entirely", () => {
    const names = buildTreeData(nodes, ["canon", "stray"], {}, "demonic").map((n) => n.name);
    expect(names).toEqual(["Valera"]);
  });

  // The focused page can be deleted while it's focused. Falling back to the
  // whole tree is the one behaviour that can't look like the project vanished.
  it("falls back to the whole project when the focused node is gone", () => {
    expect(buildTreeData(nodes, ["canon", "stray"], {}, "deleted-id").map((n) => n.name)).toEqual(["Canon", "Stray"]);
  });

  it("shows an empty tree for a focused node with nothing in it", () => {
    expect(buildTreeData(nodes, ["canon", "stray"], {}, "valera")).toEqual([]);
  });
});

describe("isDescendantOf", () => {
  const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
  const aus = node({ id: "aus", name: "AUs", parentId: "canon", templateKey: FOLDER_TEMPLATE_KEY });
  const valera = node({ id: "valera", name: "Valera", parentId: "aus", templateKey: "character" });
  const stray = node({ id: "stray", name: "Stray", parentId: null, templateKey: "note" });
  const nodes = byId([canon, aus, valera, stray]);

  it("finds a direct child", () => {
    expect(isDescendantOf("aus", "canon", nodes)).toBe(true);
  });

  it("finds a grandchild", () => {
    expect(isDescendantOf("valera", "canon", nodes)).toBe(true);
  });

  it("says no for a page in another branch", () => {
    expect(isDescendantOf("stray", "canon", nodes)).toBe(false);
  });

  // A node isn't inside itself: focusing something and then selecting *it*
  // means leaving the focus, since its own row isn't in the focused tree.
  it("says no for the ancestor itself", () => {
    expect(isDescendantOf("canon", "canon", nodes)).toBe(false);
  });

  it("says no rather than looping when a parent id points at nothing", () => {
    const orphan = node({ id: "orphan", name: "Orphan", parentId: "missing", templateKey: "note" });
    expect(isDescendantOf("orphan", "canon", byId([orphan]))).toBe(false);
  });
});

describe("sortSiblingIds", () => {
  const nodes = byId([
    node({ id: "b", name: "Chapter 2", parentId: "canon", templateKey: "note", createdAt: 300 }),
    node({ id: "a", name: "chapter 10", parentId: "canon", templateKey: "note", createdAt: 100 }),
    node({ id: "c", name: "Aria", parentId: "canon", templateKey: "note", createdAt: 200 }),
  ]);
  const ids = ["b", "a", "c"];

  // Numeric collation, not plain string order — worldbuilding pages get
  // numbered constantly, and "Chapter 10" sorting between 1 and 2 is the
  // failure everyone recognises. Case is ignored for the same reason: a
  // lowercase title is a typo, not a sort key.
  it("sorts by name with numbers in numeric order, ignoring case", () => {
    expect(sortSiblingIds(ids, nodes, "name-asc")).toEqual(["c", "b", "a"]);
  });

  it("reverses for Z to A", () => {
    expect(sortSiblingIds(ids, nodes, "name-desc")).toEqual(["a", "b", "c"]);
  });

  it("sorts newest first by creation time", () => {
    expect(sortSiblingIds(ids, nodes, "newest")).toEqual(["b", "c", "a"]);
  });

  it("sorts oldest first by creation time", () => {
    expect(sortSiblingIds(ids, nodes, "oldest")).toEqual(["a", "c", "b"]);
  });

  // Two pages made in the same millisecond — bulk import does this for a whole
  // project at once. Ties break on id so the answer doesn't depend on the order
  // they happened to arrive in, which would make the sort look non-repeatable.
  it("breaks ties on identical names and timestamps stably", () => {
    const same = byId([
      node({ id: "z", name: "Same", parentId: null, templateKey: "note", createdAt: 5 }),
      node({ id: "y", name: "Same", parentId: null, templateKey: "note", createdAt: 5 }),
    ]);
    expect(sortSiblingIds(["z", "y"], same, "name-asc")).toEqual(["y", "z"]);
    expect(sortSiblingIds(["y", "z"], same, "name-asc")).toEqual(["y", "z"]);
  });

  it("drops ids that no longer name a page rather than sorting around holes", () => {
    expect(sortSiblingIds(["b", "gone", "c"], nodes, "name-asc")).toEqual(["c", "b"]);
  });

  it("leaves the caller's array alone", () => {
    const original = [...ids];
    sortSiblingIds(ids, nodes, "name-asc");
    expect(ids).toEqual(original);
  });
});

describe("selectionRoots", () => {
  // canon > sub > page, plus an unrelated root.
  const nodes = byId([
    node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY }),
    node({ id: "sub", name: "Sub", parentId: "canon", templateKey: FOLDER_TEMPLATE_KEY }),
    node({ id: "page", name: "Page", parentId: "sub", templateKey: "note" }),
    node({ id: "other", name: "Other", parentId: null, templateKey: "note" }),
  ]);

  it("keeps everything when nothing contains anything else", () => {
    expect(selectionRoots(["canon", "other"], nodes)).toEqual(["canon", "other"]);
  });

  it("drops a child whose parent is also selected", () => {
    expect(selectionRoots(["canon", "sub"], nodes)).toEqual(["canon"]);
  });

  // The reason the walk goes all the way up instead of checking one level:
  // "page" is two levels under "canon", and a parent-only check would keep it
  // and copy it a second time inside the copy of Canon.
  it("drops a grandchild whose ancestor is selected further up", () => {
    expect(selectionRoots(["canon", "page"], nodes)).toEqual(["canon"]);
  });

  it("keeps a page whose selected relative is in another branch", () => {
    expect(selectionRoots(["other", "page"], nodes)).toEqual(["other", "page"]);
  });

  it("ignores ids that no longer name a page", () => {
    expect(selectionRoots(["canon", "gone"], nodes)).toEqual(["canon"]);
  });

  it("de-duplicates a repeated id", () => {
    expect(selectionRoots(["other", "other"], nodes)).toEqual(["other"]);
  });

  it("says nothing is a root of an empty selection", () => {
    expect(selectionRoots([], nodes)).toEqual([]);
  });

  it("stops rather than looping when a parent id points at nothing", () => {
    const orphan = byId([node({ id: "orphan", name: "Orphan", parentId: "missing", templateKey: "note" })]);
    expect(selectionRoots(["orphan"], orphan)).toEqual(["orphan"]);
  });
});

describe("moveDestinations", () => {
  // Canon/ holds Characters/ (holding Valera) and Places/; AUs/ sits beside it
  // and holds a second page also called Valera, which is what the path on each
  // destination exists to tell apart.
  const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
  const characters = node({ id: "characters", name: "Characters", parentId: "canon", templateKey: FOLDER_TEMPLATE_KEY });
  const valera = node({ id: "valera", name: "Valera", parentId: "characters", templateKey: "character" });
  const places = node({ id: "places", name: "Places", parentId: "canon", templateKey: FOLDER_TEMPLATE_KEY });
  const aus = node({ id: "aus", name: "AUs", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
  const auValera = node({ id: "au-valera", name: "Valera", parentId: "aus", templateKey: "character" });
  const nodes = byId([canon, characters, valera, places, aus, auValera]);
  const rootOrder = ["canon", "aus"];
  const childOrder = { canon: ["characters", "places"] };

  function ids(movingIds: string[]): (string | null)[] {
    return moveDestinations(movingIds, nodes, rootOrder, childOrder, "Valeraverse").map((d) => d.id);
  }

  it("lists everywhere else, in the order the sidebar draws it", () => {
    expect(ids(["valera"])).toEqual([null, "canon", "places", "aus", "au-valera"]);
  });

  it("leaves out the page being moved", () => {
    expect(ids(["characters"])).not.toContain("characters");
  });

  it("leaves out everything inside the page being moved", () => {
    // Canon is missing too, but as the parent it's already in — see below.
    expect(ids(["characters"])).toEqual([null, "places", "aus", "au-valera"]);
  });

  it("leaves out the parent the page is already in", () => {
    expect(ids(["valera"])).not.toContain("characters");
  });

  it("leaves out the project root when the page is already at the top level", () => {
    expect(ids(["aus"])).not.toContain(null);
  });

  it("keeps every parent when the selection is spread across several", () => {
    // Neither "characters" nor "aus" is a shared parent, so both stay: three
    // pages in three folders can genuinely be gathered into any one of them.
    expect(ids(["valera", "au-valera"])).toEqual([null, "canon", "characters", "places", "aus"]);
  });

  it("leaves out the one parent a whole selection shares", () => {
    expect(ids(["characters", "places"])).toEqual([null, "aus", "au-valera"]);
  });

  it("names the project root with the label it was given", () => {
    const [first] = moveDestinations(["valera"], nodes, rootOrder, childOrder, "Valeraverse");
    expect(first).toEqual({ id: null, name: "Valeraverse", path: [] });
  });

  it("carries each destination's ancestors, so two pages of one name read apart", () => {
    const found = moveDestinations(["places"], nodes, rootOrder, childOrder, "Valeraverse");
    expect(found.find((d) => d.id === "valera")?.path).toEqual(["Canon", "Characters"]);
    expect(found.find((d) => d.id === "au-valera")?.path).toEqual(["AUs"]);
  });

  it("returns nothing when no id names a page", () => {
    expect(moveDestinations(["gone"], nodes, rootOrder, childOrder, "Valeraverse")).toEqual([]);
  });

  it("ignores an id that no longer names a page alongside one that does", () => {
    expect(ids(["valera", "gone"])).toEqual([null, "canon", "places", "aus", "au-valera"]);
  });

  it("falls back to creation order where no manual order was recorded", () => {
    // AUs has no childOrder entry, so its two children sort by creation time —
    // the same fallback the sidebar itself uses for a folder nobody has
    // dragged anything around in.
    const later = node({ id: "au-later", name: "Later", parentId: "aus", templateKey: "note", createdAt: 5 });
    const earlier = node({ id: "au-earlier", name: "Earlier", parentId: "aus", templateKey: "note", createdAt: 1 });
    const withBoth = byId([canon, characters, valera, places, aus, later, earlier]);
    const found = moveDestinations(["valera"], withBoth, rootOrder, childOrder, "Valeraverse");
    expect(found.map((d) => d.id)).toEqual([null, "canon", "places", "aus", "au-earlier", "au-later"]);
  });

  it("stops rather than looping when a parent id points at nothing", () => {
    const orphan = node({ id: "orphan", name: "Orphan", parentId: "missing", templateKey: "note" });
    const withOrphan = byId([canon, orphan]);
    expect(moveDestinations(["orphan"], withOrphan, ["canon"], {}, "Valeraverse").map((d) => d.id)).toEqual([
      null,
      "canon",
    ]);
  });
});
