import { beforeEach, describe, expect, it } from "vitest";
import { createNode, type Block, type BlockKind, type Node } from "../constants/schema";
import {
  BLOCK_WIDTH_MIN,
  parseColumnWidths,
  serialiseColumnWidths,
  snapBlockWidth,
  storedBlockWidth,
  blockIdsInPage,
  findRepeatedClaims,
  blockImage,
  blockImageFiles,
  blockKindLabel,
  blocksFor,
  parseBlockIds,
  serialiseBlockIds,
  sidebarBlocks,
  withoutDanglingBlockRefs,
  deriveBlocks,
  duplicateBlock,
  duplicateBlocks,
  migrateBlocks,
  moveBlock,
  newBlock,
  pageImageBlockId,
  planBlockRemoval,
  planPageImageBlock,
  planTemplateSwap,
  seedBlocks,
  unshownPropertyKeys,
  withCopiedBlockImages,
  withField,
} from "./block-service";
import type { RenderableProperty } from "./property-service";

const schema: RenderableProperty[] = [
  { key: "age", label: "Age", type: "text" },
  { key: "friends", label: "Friends", type: "refs" },
  { key: "summary", label: "Summary", type: "longtext" },
];

function page(patch: Partial<Node> = {}): Node {
  return { ...createNode({ parentId: null, templateKey: "character", name: "Valera" }), ...patch };
}

// A page from before Phase 18a has no `blocks` field. What it gets back has to
// be the panel it already had, or opening an old world rearranges every
// sidebar in it.
describe("deriveBlocks", () => {
  it("puts the picture first, the properties next and tags last", () => {
    const derived = deriveBlocks(page({ blocks: undefined }), schema);
    expect(derived.map((block) => block.kind)).toEqual(["image", "property", "property", "property", "tags"]);
  });

  it("keeps refs behind the other template fields, the way the old panel grouped them", () => {
    const derived = deriveBlocks(page({ blocks: undefined }), schema);
    expect(derived.filter((b) => b.kind === "property").map((b) => b.propertyKey)).toEqual([
      "age",
      "summary",
      "friends",
    ]);
  });

  it("honours a page's own manual order over that grouping", () => {
    const derived = deriveBlocks(page({ blocks: undefined, propertyOrder: ["friends", "summary", "age"] }), schema);
    expect(derived.filter((b) => b.kind === "property").map((b) => b.propertyKey)).toEqual([
      "friends",
      "summary",
      "age",
    ]);
  });

  // Both were unconditional in the old panel: an empty slot said "Add an
  // image" and an empty tag row said where to type one.
  it("gives a page with no picture and no tags those blocks anyway", () => {
    const derived = deriveBlocks(page({ blocks: undefined, image: undefined, tags: [] }), schema);
    expect(derived.some((block) => block.kind === "image")).toBe(true);
    expect(derived.some((block) => block.kind === "tags")).toBe(true);
  });

  // The bug this exists to stop: a page with no block list is derived twice
  // for every edit — once by the panel that drew the block, once by the store
  // re-deriving to apply the change. Random ids meant those two lists agreed
  // about nothing, the clicked id matched nothing, and every edit to a pre-18a
  // page silently did nothing. Found in a probe, 2026-08-21, after the rest of
  // these tests were already passing.
  it("derives the same ids every time for the same page", () => {
    const node = page({ blocks: undefined });
    expect(deriveBlocks(node, schema).map((b) => b.id)).toEqual(deriveBlocks(node, schema).map((b) => b.id));
  });

  it("gives every derived block on a page a distinct id", () => {
    const ids = deriveBlocks(page({ blocks: undefined }), schema).map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives a folder nothing, since folders never had properties", () => {
    expect(deriveBlocks(page({ templateKey: "folder", blocks: undefined }), schema)).toEqual([]);
  });
});

// The distinction the whole migration rests on.
describe("blocksFor", () => {
  it("derives for a page that has no list", () => {
    expect(blocksFor(page({ blocks: undefined }), schema).length).toBeGreaterThan(0);
  });

  it("returns an authored empty list as empty, rather than deriving over it", () => {
    expect(blocksFor(page({ blocks: [] }), schema)).toEqual([]);
  });

  it("returns an authored list untouched", () => {
    const blocks = [newBlock("text", { text: "hello" })];
    expect(blocksFor(page({ blocks }), schema)).toBe(blocks);
  });
});

describe("seedBlocks", () => {
  it("starts a character with a picture", () => {
    expect(seedBlocks("character", schema)[0].kind).toBe("image");
  });

  it("does not start a note with one", () => {
    expect(seedBlocks("note", schema).some((block) => block.kind === "image")).toBe(false);
  });

  it("gives a template with no fields nothing but its picture", () => {
    expect(seedBlocks("character", []).map((block) => block.kind)).toEqual(["image"]);
  });

  it("gives a blank page nothing at all", () => {
    expect(seedBlocks("blank", [])).toEqual([]);
  });

  it("closes a template that has fields with tags", () => {
    const seeded = seedBlocks("note", schema);
    expect(seeded[seeded.length - 1].kind).toBe("tags");
  });
});

describe("moveBlock", () => {
  const blocks: Block[] = [newBlock("image"), newBlock("tags"), newBlock("text")];

  it("moves one block and leaves the rest in order", () => {
    expect(moveBlock(blocks, 2, 0).map((b) => b.kind)).toEqual(["text", "image", "tags"]);
  });

  it("returns the same list for a move that goes nowhere", () => {
    expect(moveBlock(blocks, 1, 1)).toBe(blocks);
  });

  // The menu's Move up on the first block and Move down on the last are
  // disabled, but a keyboard or a stale render can still ask.
  it("refuses an index off either end", () => {
    expect(moveBlock(blocks, 0, -1)).toBe(blocks);
    expect(moveBlock(blocks, 0, 3)).toBe(blocks);
  });
});

describe("duplicateBlock", () => {
  it("inserts the copy directly under the original", () => {
    const blocks = [newBlock("image"), newBlock("text", { text: "note" }), newBlock("tags")];
    const next = duplicateBlock(blocks, blocks[1].id);
    expect(next.map((b) => b.kind)).toEqual(["image", "text", "text", "tags"]);
  });

  it("gives the copy a fresh id and keeps everything else, writing included", () => {
    const blocks = [newBlock("text", { text: "note", title: "Aside", color: "teal" })];
    const [original, copy] = duplicateBlock(blocks, blocks[0].id);
    expect(copy.id).not.toBe(original.id);
    expect({ ...copy, id: "" }).toEqual({ ...original, id: "" });
  });

  it("leaves the list alone when the block is gone", () => {
    const blocks = [newBlock("image")];
    expect(duplicateBlock(blocks, "missing")).toBe(blocks);
  });
});

// Removing a property block keeps the value on purpose, so there has to be a
// way back to a field that was hidden.
describe("unshownPropertyKeys", () => {
  it("offers the fields no block is showing", () => {
    const blocks = [newBlock("property", { propertyKey: "age" })];
    expect(unshownPropertyKeys(blocks, schema).map((prop) => prop.key)).toEqual(["friends", "summary"]);
  });

  it("offers nothing when every field is already on the panel", () => {
    const blocks = schema.map((prop) => newBlock("property", { propertyKey: prop.key }));
    expect(unshownPropertyKeys(blocks, schema)).toEqual([]);
  });
});

// These end up as JSON on disk, so a cleared field has to leave rather than
// linger as an explicit undefined.
describe("withField", () => {
  it("sets a value", () => {
    expect(withField(newBlock("text"), "title", "Aside").title).toBe("Aside");
  });

  it("removes the key entirely when clearing", () => {
    const block = newBlock("text", { color: "teal" });
    expect("color" in withField(block, "color", undefined)).toBe(false);
  });

  it("does not mutate the block it was given", () => {
    const block = newBlock("text", { color: "teal" });
    withField(block, "color", undefined);
    expect(block.color).toBe("teal");
  });
});

describe("migrateBlocks and meters", () => {
  // A meter used to hold one reading directly on the block. It becomes a list
  // of one, keeping what was set — a meter she had already filled in must not
  // come back empty because the block learned to hold four.
  it("lifts a block's own reading into the list", () => {
    const [migrated] = migrateBlocks([{ id: "m", kind: "meter", meter: "bar", value: 75, max: 200 }]);
    expect(migrated.meters).toEqual([{ id: "m-1", value: 75, max: 200 }]);
    expect(migrated.value).toBeUndefined();
    expect(migrated.max).toBeUndefined();
  });

  it("gives an untouched one an empty reading rather than no list", () => {
    const [migrated] = migrateBlocks([{ id: "m", kind: "meter", meter: "rating" }]);
    expect(migrated.meters).toEqual([{ id: "m-1" }]);
  });

  it("leaves a block that already has a list alone", () => {
    const blocks = [{ id: "m", kind: "meter" as const, meters: [{ id: "one", value: 3 }] }];
    expect(migrateBlocks(blocks)).toBe(blocks);
  });
});

// Phase 19-adjacent, 2026-08-27: what a page keeps when its template is
// swapped underneath it. The bug this fixes was silent — a value dropped out
// of the file and its block turned into "Missing property", which is the only
// thing anybody saw.
describe("planTemplateSwap", () => {
  const locationSchema: RenderableProperty[] = [
    { key: "region", label: "Region", type: "text" },
    { key: "ruler", label: "Ruler", type: "text" },
  ];

  // The sidebar written out rather than derived, so what the page had is what
  // the test says it had — `createNode` seeds a real template's blocks, which
  // are not the three fields this file's `schema` describes.
  const arranged: Block[] = [
    { id: "b-image", kind: "image" },
    { id: "b-age", kind: "property", propertyKey: "age" },
    { id: "b-friends", kind: "property", propertyKey: "friends" },
    { id: "b-summary", kind: "property", propertyKey: "summary" },
    { id: "b-tags", kind: "tags" },
  ];

  function swapped(patch: Partial<Node> = {}) {
    const node = page({
      properties: { age: "41", summary: "A long story.", friends: [] },
      blocks: arranged,
      ...patch,
    });
    return { node, plan: planTemplateSwap(node, schema, locationSchema) };
  }

  it("keeps a field the new template has no home for, with what was in it", () => {
    const { plan } = swapped();
    expect(plan.carried.map((spec) => spec.key).sort()).toEqual(["age", "summary"]);
    expect(plan.properties.age).toBe("41");
    expect(plan.properties.summary).toBe("A long story.");
  });

  it("keeps it as a real field, labelled and typed the way it was", () => {
    const { plan } = swapped();
    const carriedSummary = plan.customProperties?.find((spec) => spec.key === "summary");
    expect(carriedSummary).toEqual({ key: "summary", label: "Summary", type: "longtext" });
  });

  // Otherwise every page accumulates the blank fields of every template it has
  // ever been, which is its own kind of mess. Safe precisely because anything
  // with something in it was carried instead.
  it("drops an empty field rather than carrying it", () => {
    const { plan } = swapped();
    expect(plan.carried.some((spec) => spec.key === "friends")).toBe(false);
    expect("friends" in plan.properties).toBe(false);
  });

  it("never drops a value, whatever the templates say", () => {
    const node = page({ properties: { age: "41", summary: "A long story.", friends: ["someone"] } });
    const plan = planTemplateSwap(node, schema, locationSchema, { properties: {}, customProperties: [] });
    expect(plan.properties).toEqual({ age: "41", summary: "A long story.", friends: ["someone"] });
    expect(plan.carried.map((spec) => spec.key).sort()).toEqual(["age", "friends", "summary"]);
  });

  it("leaves the blocks that still point at something, and only those", () => {
    const { plan } = swapped();
    const keys = plan.blocks.filter((block) => block.kind === "property").map((block) => block.propertyKey);
    expect(keys).toContain("age");
    expect(keys).toContain("summary");
    // Its field was empty, so nothing was carried and nothing can draw it.
    expect(keys).not.toContain("friends");
    // The blocks that are not properties are untouched.
    expect(plan.blocks.some((block) => block.kind === "image")).toBe(true);
    expect(plan.blocks.some((block) => block.kind === "tags")).toBe(true);
  });

  it("puts the incoming template's own fields first and the rescued ones after", () => {
    const node = page({ properties: { age: "41" } });
    const plan = planTemplateSwap(node, schema, locationSchema, {
      properties: { region: "The North" },
      customProperties: [{ key: "notes", label: "Notes", type: "text" }],
    });
    expect(plan.customProperties?.map((spec) => spec.key)).toEqual(["notes", "age"]);
    expect(plan.properties.region).toBe("The North");
    expect(plan.properties.age).toBe("41");
  });

  it("carries a custom property the incoming template does not have", () => {
    const node = page({
      customProperties: [{ key: "sword", label: "Sword", type: "text" }],
      properties: { sword: "Her mother's" },
    });
    const plan = planTemplateSwap(node, schema, locationSchema, { properties: {}, customProperties: [] });
    expect(plan.carried).toEqual([{ key: "sword", label: "Sword", type: "text" }]);
    expect(plan.properties.sword).toBe("Her mother's");
  });

  it("changes nothing when the new template has the same fields", () => {
    const node = page({ properties: { age: "41" } });
    const plan = planTemplateSwap(node, schema, schema);
    expect(plan.carried).toEqual([]);
    expect(plan.customProperties).toBeUndefined();
    expect(plan.properties.age).toBe("41");
  });
});


describe("blockKindLabel", () => {
  it("gives every kind a name a person would use", () => {
    const kinds: BlockKind[] = ["property", "image", "tags", "text", "link", "collection", "alias", "meter"];
    for (const kind of kinds) {
      const label = blockKindLabel(kind);
      expect(label).not.toBe("");
      expect(label).not.toBe(kind);
    }
  });
});

// Phase 19.5: where a block lives is read off the page's writing, never stored.
// These cover the reading, which is the half that can silently lose a block —
// a pointer that goes unseen shows the same block in the sidebar and the page
// at once, and one seen where there is none hides a block from both.
describe("blockIdsInPage", () => {
  /** A tab holding whatever document blocks it is given. */
  function tab(content: unknown[]) {
    return { id: "t1", label: "Overview", hidden: false, content };
  }

  function pointerTo(blockId: string, children?: unknown[]) {
    return { type: "blockRef", props: { blockId }, children };
  }

  it("finds a pointer at the top level", () => {
    expect([...blockIdsInPage([tab([{ type: "paragraph" }, pointerTo("b1")])])]).toEqual(["b1"]);
  });

  it("finds one nested inside another block", () => {
    // BlockNote nests: a toggle heading or a list item holds children. A
    // pointer in there is as real as one at the root, and missing it would
    // draw the block in the sidebar as well.
    const doc = [{ type: "heading", children: [{ type: "bulletListItem", children: [pointerTo("deep")] }] }];
    expect([...blockIdsInPage([tab(doc)])]).toEqual(["deep"]);
  });

  it("reads every tab, hidden ones included", () => {
    // Hiding a tab hides what is written in it. A block in that writing is part
    // of it — the alternative has hiding a tab quietly refill the sidebar.
    const tabs = [
      { id: "t1", label: "Overview", hidden: false, content: [pointerTo("shown")] },
      { id: "t2", label: "Secrets", hidden: true, content: [pointerTo("hidden")] },
    ];
    expect([...blockIdsInPage(tabs)].sort()).toEqual(["hidden", "shown"]);
  });

  it("ignores anything that is not a pointer with a real id", () => {
    // Documents are `unknown[]` because they are BlockNote's shape and they come
    // off a disk that can hold anything. Every one of these has been a plausible
    // way for a file to arrive.
    const doc = [
      null,
      "a string",
      { type: "blockRef" },
      { type: "blockRef", props: null },
      { type: "blockRef", props: { blockId: "" } },
      { type: "blockRef", props: { blockId: 7 } },
      { type: "paragraph", props: { blockId: "not-a-pointer" } },
    ];
    expect([...blockIdsInPage([tab(doc)])]).toEqual([]);
  });

  it("counts a block pointed at twice only once", () => {
    expect([...blockIdsInPage([tab([pointerTo("b1"), pointerTo("b1")])])]).toEqual(["b1"]);
  });

  it("copes with a page that has no tabs at all", () => {
    expect(blockIdsInPage([]).size).toBe(0);
  });
});

describe("sidebarBlocks", () => {
  const blocks: Block[] = [
    { id: "a", kind: "text" },
    { id: "b", kind: "tags" },
    { id: "c", kind: "image" },
  ];

  it("leaves out what the page has claimed", () => {
    expect(sidebarBlocks(blocks, new Set(["b"])).map((block) => block.id)).toEqual(["a", "c"]);
  });

  it("keeps the order of what is left", () => {
    expect(sidebarBlocks(blocks, new Set(["a"])).map((block) => block.id)).toEqual(["b", "c"]);
  });

  it("hands back the same list when nothing is claimed", () => {
    // Identity, not just equality: this is the state every page is in until she
    // uses the feature, and it should cost nothing.
    expect(sidebarBlocks(blocks, new Set())).toBe(blocks);
  });

  it("ignores a claim on a block that no longer exists", () => {
    // The dangling pointer — the block was deleted from its own menu and the
    // document still names it. An ordinary state, not an error.
    expect(sidebarBlocks(blocks, new Set(["gone"])).map((block) => block.id)).toEqual(["a", "b", "c"]);
  });
});

// Phase 19.5, the infobox: a frame in the page holding several of the page's
// blocks. It claims its contents the same way a lone pointer claims one, so
// everything the sidebar does about not drawing a block twice has to know
// about both — these are the cases where knowing about only one shows.
describe("an infobox's claim on the page's blocks", () => {
  function tab(content: unknown[]) {
    return { id: "t1", label: "Overview", hidden: false, content };
  }

  it("claims everything it is holding", () => {
    const doc = [{ type: "infobox", props: { blockIds: "a,b,c" } }];
    expect([...blockIdsInPage([tab(doc)])]).toEqual(["a", "b", "c"]);
  });

  it("claims nothing when it is empty", () => {
    // How every infobox starts, and the state the sidebar must be unchanged by.
    expect(blockIdsInPage([tab([{ type: "infobox", props: { blockIds: "" } }])]).size).toBe(0);
  });

  it("counts a lone pointer and an infobox together", () => {
    const doc = [
      { type: "blockRef", props: { blockId: "alone" } },
      { type: "infobox", props: { blockIds: "grouped" } },
    ];
    expect([...blockIdsInPage([tab(doc)])].sort()).toEqual(["alone", "grouped"]);
  });

  it("is found inside another block, like a lone pointer is", () => {
    const doc = [{ type: "heading", children: [{ type: "infobox", props: { blockIds: "deep" } }] }];
    expect([...blockIdsInPage([tab(doc)])]).toEqual(["deep"]);
  });

  it("survives a prop that is not what it should be", () => {
    // It parses a file on somebody's disk. A broken prop costs the blocks in
    // one infobox, never the page.
    const doc = [
      { type: "infobox" },
      { type: "infobox", props: { blockIds: null } },
      { type: "infobox", props: { blockIds: 7 } },
      { type: "infobox", props: { blockIds: ",,," } },
    ];
    expect(blockIdsInPage([tab(doc)]).size).toBe(0);
  });
});

describe("parseBlockIds / serialiseBlockIds", () => {
  it("round-trips a list", () => {
    expect(parseBlockIds(serialiseBlockIds(["a", "b", "c"]))).toEqual(["a", "b", "c"]);
  });

  it("keeps the order, because the order is what the frame stores", () => {
    expect(parseBlockIds("c,a,b")).toEqual(["c", "a", "b"]);
  });

  it("reads an empty list from an empty string, not one empty id", () => {
    expect(parseBlockIds("")).toEqual([]);
    expect(serialiseBlockIds([])).toBe("");
  });

  it("drops blanks rather than writing an id that names nothing", () => {
    expect(serialiseBlockIds(["a", "", "b"])).toBe("a,b");
    expect(parseBlockIds("a,,b")).toEqual(["a", "b"]);
  });
});

describe("sweeping an infobox", () => {
  const alive = new Set(["keep"]);

  it("prunes a dead id but leaves the frame standing", () => {
    // **The difference that matters.** A lone pointer *is* its block, so a dead
    // one goes. An infobox is a frame she put there and may still be holding
    // things — removing it would take the survivors out of the page with it.
    const doc = [{ type: "infobox", props: { blockIds: "keep,gone" } }];
    expect(withoutDanglingBlockRefs(doc, alive)).toEqual([
      { type: "infobox", props: { blockIds: "keep" } },
    ]);
  });

  it("leaves an infobox emptied of everything, rather than deleting it", () => {
    const doc = [{ type: "infobox", props: { blockIds: "gone" } }];
    expect(withoutDanglingBlockRefs(doc, alive)).toEqual([{ type: "infobox", props: { blockIds: "" } }]);
  });

  it("still removes a lone pointer outright", () => {
    const doc = [{ type: "blockRef", props: { blockId: "gone" } }];
    expect(withoutDanglingBlockRefs(doc, alive)).toEqual([]);
  });

  it("touches nothing when every id is alive", () => {
    const doc = [{ type: "infobox", props: { blockIds: "keep" } }];
    expect(withoutDanglingBlockRefs(doc, alive)).toBe(doc);
  });

  it("prunes one nested inside another block", () => {
    const doc = [{ type: "heading", children: [{ type: "infobox", props: { blockIds: "keep,gone" } }] }];
    expect(withoutDanglingBlockRefs(doc, alive)).toEqual([
      { type: "heading", children: [{ type: "infobox", props: { blockIds: "keep" } }] },
    ]);
  });
});

describe("block widths", () => {
  it("sticks to a half, a third or a quarter when the drag lands near one", () => {
    expect(snapBlockWidth(48)).toBe(50);
    expect(snapBlockWidth(52)).toBe(50);
    expect(snapBlockWidth(35)).toBe(33);
    expect(snapBlockWidth(26)).toBe(25);
  });

  it("leaves a width alone anywhere between them, so a free drag stays free", () => {
    expect(snapBlockWidth(40)).toBe(40);
    expect(snapBlockWidth(58)).toBe(58);
    expect(snapBlockWidth(85)).toBe(85);
  });

  it("refuses a width too narrow to hold the block's own controls", () => {
    expect(snapBlockWidth(4)).toBe(BLOCK_WIDTH_MIN);
    expect(snapBlockWidth(-200)).toBe(BLOCK_WIDTH_MIN);
  });

  it("never goes past the column it is measured against", () => {
    expect(snapBlockWidth(140)).toBe(100);
  });

  it("stores nothing at full width, so an ordinary block carries no field", () => {
    expect(storedBlockWidth(100)).toBeUndefined();
    expect(storedBlockWidth(90)).toBe(90);
    // The snap runs first: a drag that ends near the edge is a full-width
    // block, and full width is the absent field rather than a stored 100.
    expect(storedBlockWidth(98)).toBeUndefined();
  });
});

describe("column widths", () => {
  it("reads a row's shares back out", () => {
    expect(parseColumnWidths("67,33", 2)).toEqual([67, 33]);
    expect(serialiseColumnWidths([67, 33])).toBe("67,33");
  });

  it("splits the row evenly when nothing is stored", () => {
    expect(parseColumnWidths("", 2)).toEqual([50, 50]);
    expect(parseColumnWidths("", 4)).toEqual([25, 25, 25, 25]);
  });

  it("falls back to even when the stored list no longer fits the row", () => {
    // A lane deleted or added leaves a list of the wrong length behind, and a
    // row drawn from it would be missing a share or carrying a spare one. An
    // even split is wrong in a way that is obvious and recoverable; a row with
    // a lane of zero width is not.
    expect(parseColumnWidths("67,33", 3)).toEqual([100 / 3, 100 / 3, 100 / 3]);
    expect(parseColumnWidths("wide,narrow", 2)).toEqual([50, 50]);
    expect(parseColumnWidths("100,0", 2)).toEqual([50, 50]);
  });
});

// Phase 19.5: an image block holds its own picture, and one of them holds the
// page's. The rule these tests are protecting is that a picture lives in
// exactly one place — on the node when the block is the page's, on the block
// otherwise — so nothing has two answers to keep in step.
describe("image blocks and the page's own picture", () => {
  const image = (id: string, patch: Partial<Block> = {}): Block => ({ id, kind: "image", ...patch });

  it("gives the page's picture to the first image block when nothing is stored", () => {
    const node = page({ blocks: [image("a"), image("b")], image: "portrait.png" });
    expect(pageImageBlockId(node, node.blocks!)).toBe("a");
    expect(blockImage(node, node.blocks!, node.blocks![0]).image).toBe("portrait.png");
  });

  // The migration, and the whole of it: a page written before this existed has
  // one image block, no stored pointer and no picture on the block. It has to
  // draw the portrait with nothing rewritten on disk.
  it("draws an old page's portrait in its one image block, unchanged", () => {
    const node = page({ blocks: undefined, image: "portrait.png", imageAlt: "Valera", imageFocusY: 30 });
    const blocks = blocksFor(node, schema);
    const slot = blocks.find((block) => block.kind === "image")!;
    expect(blockImage(node, blocks, slot)).toEqual({
      image: "portrait.png",
      imageAlt: "Valera",
      imageFocusY: 30,
    });
  });

  it("draws every other image block from its own record", () => {
    const node = page({ blocks: [image("a"), image("b", { image: "sword.png" })], image: "portrait.png" });
    expect(blockImage(node, node.blocks!, node.blocks![1]).image).toBe("sword.png");
  });

  it("honours a stored choice, and draws nothing for a block that has gone", () => {
    const chosen = page({ blocks: [image("a"), image("b")], pageImageBlockId: "b" });
    expect(pageImageBlockId(chosen, chosen.blocks!)).toBe("b");
    const orphaned = page({ blocks: [image("a")], pageImageBlockId: "gone" });
    expect(pageImageBlockId(orphaned, orphaned.blocks!)).toBeUndefined();
  });

  it("trades the two pictures when another block is made the page's", () => {
    const node = page({
      blocks: [image("a"), image("b", { image: "sword.png", imageAlt: "A sword" })],
      image: "portrait.png",
      imageAlt: "Valera",
    });
    const patch = planPageImageBlock(node, node.blocks!, "b");

    expect(patch.image).toBe("sword.png");
    expect(patch.imageAlt).toBe("A sword");
    expect(patch.pageImageBlockId).toBe("b");
    // Nothing is lost by choosing wrong: the portrait moves into the block
    // that used to hold the mark, and the chosen block stops holding its own.
    expect(patch.blocks?.find((block) => block.id === "a")).toEqual(
      image("a", { image: "portrait.png", imageAlt: "Valera" }),
    );
    expect(patch.blocks?.find((block) => block.id === "b")).toEqual(image("b"));
  });

  it("does nothing when the block asked for already holds the page's picture", () => {
    const node = page({ blocks: [image("a")], image: "portrait.png" });
    expect(planPageImageBlock(node, node.blocks!, "a")).toEqual({});
  });

  // Removing a block has never deleted what was in it, and a portrait is on
  // the tree row and in the export as well as in this frame.
  it("keeps the portrait when the last image block is removed", () => {
    const node = page({ blocks: [image("a"), { id: "t", kind: "tags" }], image: "portrait.png" });
    const patch = planBlockRemoval(node, node.blocks!, "a");
    expect(patch.blocks).toEqual([{ id: "t", kind: "tags" }]);
    expect("image" in patch).toBe(false);
  });

  it("promotes the next image block's own picture when the page's block is removed", () => {
    const node = page({
      blocks: [image("a"), image("b", { image: "sword.png", imageFocusY: 20 })],
      image: "portrait.png",
    });
    const patch = planBlockRemoval(node, node.blocks!, "a");
    // The mark moves to the block that is left, and the page's picture follows
    // it — otherwise the promoted block would draw the portrait instead of the
    // photo it is holding.
    expect(patch.image).toBe("sword.png");
    expect(patch.imageFocusY).toBe(20);
    expect(patch.blocks).toEqual([image("b")]);
    expect(patch.pageImageBlockId).toBeUndefined();
  });

  it("lets a promoted block with no picture of its own inherit the portrait", () => {
    const node = page({ blocks: [image("a"), image("b")], image: "portrait.png" });
    const patch = planBlockRemoval(node, node.blocks!, "a");
    expect(patch.blocks).toEqual([image("b")]);
    expect("image" in patch).toBe(false);
  });

  it("hands a duplicate its own copy of the picture rather than an empty frame", () => {
    const blocks = [image("a")];
    const copied = duplicateBlock(blocks, "a", { image: "portrait.png", imageAlt: "Valera" });
    expect(copied[1].image).toBe("portrait.png");
    expect(copied[1].imageAlt).toBe("Valera");
    expect(copied[1].id).not.toBe("a");
  });

  it("lists the pictures the blocks hold, and copies them one file each", () => {
    const blocks = [image("a", { image: "sword.png" }), image("b"), image("c", { image: "map.png" })];
    expect(blockImageFiles(blocks)).toEqual(["sword.png", "map.png"]);
    expect(blockImageFiles(undefined)).toEqual([]);

    const copied = withCopiedBlockImages(blocks, (fileName) => `copy-${fileName}`);
    expect(copied?.map((block) => block.image)).toEqual(["copy-sword.png", undefined, "copy-map.png"]);
    // The list comes back untouched when there is nothing in it to copy, which
    // is what keeps a page that has no pictures from being rewritten.
    const plain = [image("a")];
    expect(withCopiedBlockImages(plain, (fileName) => fileName)).toBe(plain);
  });
});

// Phase 19.5: duplicating an infobox. The frame holds pointers, so the copy has
// to be given copies — one block in two frames is what the phase rules out.
describe("duplicateBlocks", () => {
  const list = (): Block[] => [
    { id: "a", kind: "text", text: "one" },
    { id: "b", kind: "tags" },
    { id: "c", kind: "image" },
    { id: "d", kind: "alias" },
  ];
  let next = 0;
  const mint = () => `new-${++next}`;

  beforeEach(() => {
    next = 0;
  });

  it("copies each one and says which copy is which", () => {
    const { blocks, idMap } = duplicateBlocks(list(), ["a", "c"], mint);
    expect(idMap.get("a")).toBe("new-1");
    expect(idMap.get("c")).toBe("new-2");
    expect(blocks.find((block) => block.id === "new-1")).toEqual({ id: "new-1", kind: "text", text: "one" });
  });

  // Together after the last of them, so a frame's blocks stay a run in storage
  // rather than being interleaved with the ones they were copied from.
  it("lands them all after the last block copied", () => {
    const { blocks } = duplicateBlocks(list(), ["a", "c"], mint);
    expect(blocks.map((block) => block.id)).toEqual(["a", "b", "c", "new-1", "new-2", "d"]);
  });

  it("gives an image block copy its own picture rather than an empty frame", () => {
    const { blocks } = duplicateBlocks(list(), ["c"], mint, () => ({ image: "portrait.png" }));
    expect(blocks.find((block) => block.id === "new-1")?.image).toBe("portrait.png");
  });

  it("does nothing at all for ids that name nothing", () => {
    const before = list();
    const { blocks, idMap } = duplicateBlocks(before, ["gone"], mint);
    expect(blocks).toBe(before);
    expect(idMap.size).toBe(0);
  });
});

// Phase 19.5: copying a block in the writing copies its pointer, and two
// pointers at one record is two windows onto the same block. These say which
// pointer is the one to move.
describe("findRepeatedClaims", () => {
  const ref = (id: string, blockId: string) => ({ id, type: "blockRef", props: { blockId } });
  const frame = (id: string, ids: string[]) => ({ id, type: "infobox", props: { blockIds: ids.join(",") } });

  it("finds nothing when every pointer is its own", () => {
    expect(findRepeatedClaims([ref("e1", "a"), frame("e2", ["b", "c"])])).toEqual([]);
  });

  // The first one in reading order keeps the block: what was already on the
  // page is never the thing that moves.
  it("reports the second pointer, not the first", () => {
    const repeats = findRepeatedClaims([ref("e1", "a"), ref("e2", "a")]);
    expect(repeats).toEqual([{ editorBlockId: "e2", blockId: "a", index: -1, ids: [] }]);
  });

  it("says which entry of an infobox's list is the repeat", () => {
    const repeats = findRepeatedClaims([ref("e1", "b"), frame("e2", ["a", "b"])]);
    expect(repeats).toEqual([{ editorBlockId: "e2", blockId: "b", index: 1, ids: ["a", "b"] }]);
  });

  it("counts an id repeated inside one frame's own list", () => {
    const repeats = findRepeatedClaims([frame("e1", ["a", "a"])]);
    expect(repeats).toEqual([{ editorBlockId: "e1", blockId: "a", index: 1, ids: ["a", "a"] }]);
  });

  // BlockNote nests, so a pointer indented under a list item is as real as one
  // at the top level — the same reason blockIdsInPage walks children.
  it("looks inside nested blocks", () => {
    const nested = { id: "e0", type: "bulletListItem", children: [ref("e2", "a")] };
    expect(findRepeatedClaims([ref("e1", "a"), nested])[0]?.editorBlockId).toBe("e2");
  });

  // A copy pasted into a second tab is the same duplicate, and the editor only
  // ever holds one document. What the other tabs hold wins outright.
  it("treats what another tab already claims as the first claim", () => {
    expect(findRepeatedClaims([ref("e1", "a")], ["a"])).toEqual([
      { editorBlockId: "e1", blockId: "a", index: -1, ids: [] },
    ]);
  });
});
