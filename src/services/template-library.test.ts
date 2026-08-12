import { describe, expect, it } from "vitest";
import {
  addOverride,
  addTemplate,
  buildOverrideNode,
  buildTemplateTree,
  cloneSubtree,
  collectSubtree,
  isOverrideModified,
  listTemplates,
  overrideFor,
  parseTemplateLibrary,
  removeOverride,
  removeTemplate,
} from "./template-library";
import { createTemplateLibrary, FOLDER_TEMPLATE_KEY, type Node } from "../constants/schema";

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

// valera > sword, and valera > satchel > coin.
const graph = byId([
  node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY }),
  node({ id: "valera", name: "Valera", parentId: "canon", templateKey: "character" }),
  node({ id: "sword", name: "Her Sword", parentId: "valera", templateKey: "item" }),
  node({ id: "satchel", name: "Satchel", parentId: "valera", templateKey: "item" }),
  node({ id: "coin", name: "A Coin", parentId: "satchel", templateKey: "item" }),
]);

// Ids come out of crypto.randomUUID() in the app; a counter here keeps the
// assertions readable and proves nothing depends on the shape of an id.
function counter() {
  let next = 0;
  return () => `new-${(next += 1)}`;
}

describe("collectSubtree", () => {
  it("takes just the page when sub-pages are declined", () => {
    expect(collectSubtree("valera", graph, false).map((n) => n.id)).toEqual(["valera"]);
  });

  it("takes the page and everything under it, however deep", () => {
    const ids = collectSubtree("valera", graph, true).map((n) => n.id);
    expect(ids[0]).toBe("valera");
    expect([...ids].sort()).toEqual(["coin", "satchel", "sword", "valera"]);
  });

  it("is empty for a page that isn't there", () => {
    expect(collectSubtree("gone", graph, true)).toEqual([]);
  });

  it("takes a leaf page with nothing under it", () => {
    expect(collectSubtree("sword", graph, true).map((n) => n.id)).toEqual(["sword"]);
  });
});

describe("cloneSubtree", () => {
  it("gives every copy a new id and leaves the originals alone", () => {
    const sources = collectSubtree("valera", graph, true);
    const { clones } = cloneSubtree(sources, null, counter());
    expect(clones.map((c) => c.id)).toEqual(["new-1", "new-2", "new-3", "new-4"]);
    expect(graph.valera.id).toBe("valera");
  });

  // The point of the re-parenting rule: "valera" had a parent that isn't being
  // copied, so the copy becomes a root of the template rather than pointing at
  // a folder in the project that the library knows nothing about.
  it("roots a copy whose parent isn't in the set", () => {
    const { clones } = cloneSubtree(collectSubtree("valera", graph, true), null, counter());
    expect(clones[0].parentId).toBeNull();
  });

  it("gives the roots the parent they were asked for", () => {
    const { clones } = cloneSubtree(collectSubtree("valera", graph, true), "somewhere", counter());
    expect(clones[0].parentId).toBe("somewhere");
  });

  it("rewires inner parents to the copies, not the originals", () => {
    const { clones, idMap } = cloneSubtree(collectSubtree("valera", graph, true), null, counter());
    const coin = clones.find((c) => c.name === "A Coin")!;
    expect(coin.parentId).toBe(idMap.get("satchel"));
    expect(coin.parentId).not.toBe("satchel");
  });

  it("keeps the writing, properties and picture references", () => {
    const rich = byId([
      node({
        id: "rich",
        name: "Rich",
        parentId: null,
        templateKey: "character",
        tabs: [{ id: "t1", label: "Overview", hidden: false, content: [{ type: "paragraph" }] }],
        properties: { poggers: "sdfgdfhfghdftgh" },
        tags: ["canon"],
        color: "sky",
        image: "abc.png",
      }),
    ]);
    const { clones } = cloneSubtree(collectSubtree("rich", rich, true), null, counter());
    expect(clones[0]).toMatchObject({
      name: "Rich",
      templateKey: "character",
      properties: { poggers: "sdfgdfhfghdftgh" },
      tags: ["canon"],
      color: "sky",
      // Carried over untouched — the store copies the file and rewrites this.
      image: "abc.png",
    });
    expect(clones[0].tabs[0].label).toBe("Overview");
  });
});

describe("addTemplate / removeTemplate / listTemplates", () => {
  function libraryWith(names: string[]) {
    let library = createTemplateLibrary();
    for (const name of names) {
      const root = node({ id: name, name, parentId: null, templateKey: "character" });
      library = addTemplate(library, [root], name);
    }
    return library;
  }

  it("offers templates in the order they were added, newest last", () => {
    expect(listTemplates(libraryWith(["a", "b", "c"])).map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("takes a template's sub-pages out with it", () => {
    let library = createTemplateLibrary();
    library = addTemplate(
      library,
      [
        node({ id: "root", name: "Root", parentId: null, templateKey: "character" }),
        node({ id: "child", name: "Child", parentId: "root", templateKey: "item" }),
      ],
      "root",
    );
    const after = removeTemplate(library, "root");
    expect(after.nodes).toEqual({});
    expect(after.rootOrder).toEqual([]);
  });

  it("leaves the other templates alone", () => {
    const after = removeTemplate(libraryWith(["a", "b", "c"]), "b");
    expect(listTemplates(after).map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("returns the library untouched when asked to remove something absent", () => {
    const library = libraryWith(["a"]);
    expect(removeTemplate(library, "gone")).toBe(library);
  });

  it("does not mutate the library it was given", () => {
    const library = libraryWith(["a", "b"]);
    removeTemplate(library, "a");
    expect(library.rootOrder).toEqual(["a", "b"]);
  });

  // A template written by hand into the file, or saved while an older order
  // list was in memory. Last is right; missing would not be.
  it("puts a template the order list forgot at the end", () => {
    const library = libraryWith(["a", "b"]);
    const orphaned = { ...library, rootOrder: ["b"] };
    expect(listTemplates(orphaned).map((t) => t.id)).toEqual(["b", "a"]);
  });
});

describe("buildTemplateTree", () => {
  function library(nodes: Node[], rootOrder: string[]) {
    return { version: 1 as const, nodes: byId(nodes), rootOrder, overrides: {} };
  }

  it("nests a template's sub-pages under it", () => {
    const tree = buildTemplateTree(
      library(
        [
          node({ id: "valera", name: "Valera", parentId: null, templateKey: "character" }),
          node({ id: "sword", name: "Her Sword", parentId: "valera", templateKey: "item" }),
          node({ id: "coin", name: "A Coin", parentId: "sword", templateKey: "item" }),
        ],
        ["valera"],
      ),
    );

    expect(tree.map((item) => item.node.id)).toEqual(["valera"]);
    expect(tree[0].children.map((item) => item.node.id)).toEqual(["sword"]);
    expect(tree[0].children[0].children.map((item) => item.node.id)).toEqual(["coin"]);
  });

  // The roots are the tab's list, and it must read the same as the one the
  // new-page screen offers — both go through listTemplates.
  it("draws the roots in the library's own order", () => {
    const tree = buildTemplateTree(
      library(
        [
          node({ id: "a", name: "A", parentId: null, templateKey: "character" }),
          node({ id: "b", name: "B", parentId: null, templateKey: "location" }),
        ],
        ["b", "a"],
      ),
    );
    expect(tree.map((item) => item.node.id)).toEqual(["b", "a"]);
  });

  it("puts sub-pages in creation order", () => {
    const tree = buildTemplateTree(
      library(
        [
          node({ id: "root", name: "Root", parentId: null, templateKey: "character" }),
          node({ id: "later", name: "Later", parentId: "root", templateKey: "item", createdAt: 2 }),
          node({ id: "earlier", name: "Earlier", parentId: "root", templateKey: "item", createdAt: 1 }),
        ],
        ["root"],
      ),
    );
    expect(tree[0].children.map((item) => item.node.id)).toEqual(["earlier", "later"]);
  });

  it("is empty for an empty library", () => {
    expect(buildTemplateTree(createTemplateLibrary())).toEqual([]);
  });

  // The file is hand-editable by design, and parseTemplateLibrary repairs a
  // parent that's missing but can't see one pointing back down at its own
  // descendant. Unguarded this recurses until the stack goes.
  it("does not hang on a template that is its own ancestor", () => {
    const tree = buildTemplateTree(
      library(
        [
          node({ id: "root", name: "Root", parentId: null, templateKey: "character" }),
          node({ id: "a", name: "A", parentId: "root", templateKey: "item" }),
          node({ id: "b", name: "B", parentId: "a", templateKey: "item" }),
        ],
        ["root"],
      ),
    );
    // Sanity: the same shape with `root.parentId = "b"` would be the cycle.
    expect(tree[0].children[0].children.map((item) => item.node.id)).toEqual(["b"]);

    const cyclic = library(
      [
        node({ id: "root", name: "Root", parentId: "b", templateKey: "character" }),
        node({ id: "a", name: "A", parentId: "root", templateKey: "item" }),
        node({ id: "b", name: "B", parentId: "a", templateKey: "item" }),
      ],
      ["root"],
    );
    // `root` isn't a root here, so nothing is drawn at all — but it returns.
    expect(buildTemplateTree(cyclic)).toEqual([]);

    // And with the cycle reachable from a real root, each node is drawn once.
    const reachable = library(
      [
        node({ id: "root", name: "Root", parentId: null, templateKey: "character" }),
        node({ id: "a", name: "A", parentId: "root", templateKey: "item" }),
        node({ id: "b", name: "B", parentId: "a", templateKey: "item" }),
        node({ id: "loop", name: "Loop", parentId: "b", templateKey: "item" }),
      ],
      ["root"],
    );
    reachable.nodes.a.parentId = "loop";
    expect(buildTemplateTree(reachable)).toEqual([{ node: reachable.nodes.root, children: [] }]);
  });
});

describe("parseTemplateLibrary", () => {
  it("reads an empty library out of nothing at all", () => {
    expect(parseTemplateLibrary(null)).toEqual(createTemplateLibrary());
    expect(parseTemplateLibrary("not a library")).toEqual(createTemplateLibrary());
    expect(parseTemplateLibrary({})).toEqual(createTemplateLibrary());
  });

  it("keeps entries that hold up", () => {
    const raw = {
      version: 1,
      nodes: { a: node({ id: "a", name: "A", parentId: null, templateKey: "character" }) },
      rootOrder: ["a"],
    };
    expect(Object.keys(parseTemplateLibrary(raw).nodes)).toEqual(["a"]);
  });

  // Hand-editing the file is expected — it sits in her project folder. One
  // broken entry costs that entry, never the rest.
  it("drops a malformed entry and keeps its neighbours", () => {
    const raw = {
      version: 1,
      nodes: {
        good: node({ id: "good", name: "Good", parentId: null, templateKey: "character" }),
        bad: { id: "bad" },
        alsoBad: null,
      },
      rootOrder: ["good", "bad"],
    };
    const library = parseTemplateLibrary(raw);
    expect(Object.keys(library.nodes)).toEqual(["good"]);
    expect(library.rootOrder).toEqual(["good"]);
  });

  // Otherwise the child is in the file, absent from every root list, and
  // unreachable — a template that exists and can't be seen.
  it("promotes a child whose parent didn't survive to a root", () => {
    const raw = {
      version: 1,
      nodes: {
        orphan: node({ id: "orphan", name: "Orphan", parentId: "missing", templateKey: "item" }),
      },
      rootOrder: [],
    };
    const library = parseTemplateLibrary(raw);
    expect(library.nodes.orphan.parentId).toBeNull();
    expect(listTemplates(library).map((t) => t.id)).toEqual(["orphan"]);
  });

  it("drops order entries naming templates that aren't there", () => {
    const raw = {
      version: 1,
      nodes: { a: node({ id: "a", name: "A", parentId: null, templateKey: "character" }) },
      rootOrder: ["a", "ghost"],
    };
    expect(parseTemplateLibrary(raw).rootOrder).toEqual(["a"]);
  });
});

describe("built-in template overrides", () => {
  const seedTabs = [
    { id: "overview", label: "Overview", hidden: false, content: [{ type: "paragraph", content: [] }] },
    { id: "story", label: "Story", hidden: false, content: [] },
  ];

  function override(patch: Partial<Node> = {}): Node {
    const built = buildOverrideNode("character", "ovr", "Character", structuredClone(seedTabs) as Node["tabs"]);
    return { ...built, ...patch };
  }

  function libraryWithOverride(patch: Partial<Node> = {}) {
    return addOverride(createTemplateLibrary(), "character", override(patch));
  }

  it("builds a root node of the right kind, named after the built-in it replaces", () => {
    const built = buildOverrideNode("character", "ovr", "Character", structuredClone(seedTabs) as Node["tabs"]);
    expect(built.templateKey).toBe("character");
    expect(built.parentId).toBeNull();
    expect(built.name).toBe("Character");
    expect(built.tabs.map((tab) => tab.id)).toEqual(["overview", "story"]);
  });

  it("finds this world's version of a built-in by key, and nothing for one it doesn't have", () => {
    const library = libraryWithOverride();
    expect(overrideFor(library, "character")?.id).toBe("ovr");
    expect(overrideFor(library, "location")).toBeUndefined();
  });

  it("keeps an override out of the templates she saved herself", () => {
    const library = libraryWithOverride();
    expect(listTemplates(library)).toEqual([]);
    expect(buildTemplateTree(library)).toEqual([]);
  });

  it("still lists her own templates alongside an override", () => {
    const hers = node({ id: "hers", name: "Valera sheet", parentId: null, templateKey: "character" });
    const library = addTemplate(libraryWithOverride(), [hers], "hers");
    expect(listTemplates(library).map((n) => n.id)).toEqual(["hers"]);
  });

  it("removing an override takes its node and its key together", () => {
    const library = libraryWithOverride();
    const after = removeOverride(library, "character");
    expect(after.overrides).toEqual({});
    expect(after.nodes.ovr).toBeUndefined();
  });

  it("removing an override takes the sub-pages someone added inside it", () => {
    const library = libraryWithOverride();
    const child = node({ id: "child", name: "Inside", parentId: "ovr", templateKey: "note" });
    const withChild = { ...library, nodes: { ...library.nodes, child } };
    const after = removeOverride(withChild, "character");
    // Left behind, they'd become roots and surface as templates she never made.
    expect(after.nodes.child).toBeUndefined();
  });

  it("leaves a library alone when asked to remove an override it doesn't have", () => {
    const library = createTemplateLibrary();
    expect(removeOverride(library, "character")).toBe(library);
  });

  it("counts an untouched copy as unmodified, so looking at one doesn't mark it edited", () => {
    const untouched = override();
    expect(isOverrideModified(untouched, "Character", structuredClone(seedTabs) as Node["tabs"])).toBe(false);
  });

  it("notices a renamed template, a renamed tab, a hidden tab and edited writing", () => {
    const original = () => structuredClone(seedTabs) as Node["tabs"];
    expect(isOverrideModified(override({ name: "Person" }), "Character", original())).toBe(true);

    const renamedTab = override();
    renamedTab.tabs[0] = { ...renamedTab.tabs[0], label: "Summary" };
    expect(isOverrideModified(renamedTab, "Character", original())).toBe(true);

    const hiddenTab = override();
    hiddenTab.tabs[1] = { ...hiddenTab.tabs[1], hidden: true };
    expect(isOverrideModified(hiddenTab, "Character", original())).toBe(true);

    const rewritten = override();
    rewritten.tabs[0] = { ...rewritten.tabs[0], content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }] };
    expect(isOverrideModified(rewritten, "Character", original())).toBe(true);
  });

  it("notices tabs added, removed and reordered", () => {
    const original = () => structuredClone(seedTabs) as Node["tabs"];

    const added = override();
    added.tabs = [...added.tabs, { id: "extra", label: "Extra", hidden: false, content: [] }];
    expect(isOverrideModified(added, "Character", original())).toBe(true);

    const removed = override();
    removed.tabs = removed.tabs.slice(0, 1);
    expect(isOverrideModified(removed, "Character", original())).toBe(true);

    const reordered = override();
    reordered.tabs = [reordered.tabs[1], reordered.tabs[0]];
    expect(isOverrideModified(reordered, "Character", original())).toBe(true);
  });

  it("reads overrides back off disk, and drops one pointing at a node that didn't survive", () => {
    const raw = {
      version: 1,
      nodes: { real: { id: "real", name: "Character", templateKey: "character", tabs: [], parentId: null } },
      rootOrder: ["real"],
      overrides: { character: "real", location: "ghost", item: 7 },
    };
    const parsed = parseTemplateLibrary(raw);
    expect(parsed.overrides).toEqual({ character: "real" });
    // An override is never also one of her own templates, however the file on
    // disk got that way.
    expect(parsed.rootOrder).toEqual([]);
  });

  it("reads a file written before overrides existed as a world that changes nothing", () => {
    const raw = { version: 1, nodes: {}, rootOrder: [] };
    expect(parseTemplateLibrary(raw).overrides).toEqual({});
  });
});
