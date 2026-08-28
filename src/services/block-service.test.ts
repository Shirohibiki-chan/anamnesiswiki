import { describe, expect, it } from "vitest";
import { createNode, type Block, type BlockKind, type Node } from "../constants/schema";
import {
  blockKindLabel,
  blocksFor,
  deriveBlocks,
  duplicateBlock,
  migrateBlocks,
  moveBlock,
  newBlock,
  planTemplateSwap,
  seedBlocks,
  unshownPropertyKeys,
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
