import { describe, expect, it } from "vitest";
import type { CustomPropertySpec, Node } from "../constants/schema";
import {
  indexProperties,
  indexTags,
  orderProperties,
  planPropertyDelete,
  planPropertyRename,
  planTagDelete,
  planTagRename,
} from "./property-service";

const specs = [
  { key: "summary" },
  { key: "when" },
  { key: "where" },
  { key: "custom-a" },
  { key: "custom-b" },
];

const keys = (list: { key: string }[]) => list.map((spec) => spec.key);

describe("orderProperties", () => {
  it("leaves a page nobody has reordered exactly as the caller grouped it", () => {
    expect(keys(orderProperties(specs, undefined))).toEqual(["summary", "when", "where", "custom-a", "custom-b"]);
    expect(keys(orderProperties(specs, []))).toEqual(["summary", "when", "where", "custom-a", "custom-b"]);
  });

  it("applies a stored order", () => {
    const order = ["custom-b", "where", "summary", "custom-a", "when"];
    expect(keys(orderProperties(specs, order))).toEqual(order);
  });

  // The case that arises the moment a property is added to a page that was
  // reordered earlier: the new key isn't in the stored order at all, and
  // dropping it would take the field off the panel.
  it("keeps unlisted keys, in default order, after the ones it knows", () => {
    expect(keys(orderProperties(specs, ["custom-b", "when"]))).toEqual([
      "custom-b",
      "when",
      "summary",
      "where",
      "custom-a",
    ]);
  });

  // A stored order outlives the properties it named — deleting a custom
  // property leaves its key behind in older saves, and a template's fixed
  // fields change with the template.
  it("ignores keys in the order that no longer exist", () => {
    expect(keys(orderProperties(specs, ["gone", "where", "also-gone", "summary"]))).toEqual([
      "where",
      "summary",
      "when",
      "custom-a",
      "custom-b",
    ]);
  });

  it("does not mutate the input", () => {
    const input = [...specs];
    orderProperties(input, ["custom-b", "summary"]);
    expect(keys(input)).toEqual(["summary", "when", "where", "custom-a", "custom-b"]);
  });
});

// ---- The project-wide index ----

function page(input: Partial<Node> & { id: string }): Node {
  return {
    parentId: null,
    templateKey: "note",
    name: input.id,
    tabs: [],
    properties: {},
    customProperties: [],
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    ...input,
  };
}

function custom(key: string, label: string, type: CustomPropertySpec["type"] = "text"): CustomPropertySpec {
  return { key, label, type };
}

const project = (...pages: Node[]): Record<string, Node> => Object.fromEntries(pages.map((node) => [node.id, node]));

// Two templates so the template/custom split has something to be wrong about.
const schemas: Record<string, { key: string; label: string; type: CustomPropertySpec["type"] }[]> = {
  character: [
    { key: "summary", label: "Summary", type: "longtext" },
    { key: "friends", label: "Friends", type: "refs" },
  ],
  note: [],
};
const getSchema = (templateKey: string) => schemas[templateKey] ?? [];

describe("indexProperties", () => {
  it("counts the pages that have each name, and how many have it filled in", () => {
    const nodes = project(
      page({ id: "a", customProperties: [custom("k1", "Pronouns")], properties: { k1: "she/her" } }),
      page({ id: "b", customProperties: [custom("k2", "Pronouns")], properties: { k2: "  " } }),
      page({ id: "c", customProperties: [custom("k3", "Pronouns")] }),
    );

    const [pronouns] = indexProperties(nodes, getSchema);
    expect(pronouns.label).toBe("Pronouns");
    expect(pronouns.nodeIds).toEqual(["a", "b", "c"]);
    expect(pronouns.filledCount).toBe(1);
  });

  // A number of 0 and an empty array are opposite answers to "is this filled
  // in" and both are easy to get wrong with a truthiness check.
  it("treats 0 as written in and an empty list as not", () => {
    const nodes = project(
      page({ id: "a", customProperties: [custom("k", "Population", "number")], properties: { k: 0 } }),
      page({ id: "b", customProperties: [custom("k", "Allies", "refs")], properties: { k: [] } }),
    );

    const byLabel = Object.fromEntries(indexProperties(nodes, getSchema).map((entry) => [entry.label, entry]));
    expect(byLabel.Population.filledCount).toBe(1);
    expect(byLabel.Allies.filledCount).toBe(0);
  });

  it("includes template fields and says which source each name came from", () => {
    const nodes = project(
      page({ id: "a", templateKey: "character", properties: { summary: "A swordswoman." } }),
      page({ id: "b", customProperties: [custom("k", "Summary", "longtext")] }),
    );

    const [summary] = indexProperties(nodes, getSchema).filter((entry) => entry.label === "Summary");
    expect(summary.fromTemplate).toBe(true);
    expect(summary.fromCustom).toBe(true);
    expect(summary.nodeIds).toEqual(["a", "b"]);
  });

  // The whole point of the view: two capitalisations stay two rows, sorted
  // next to each other, both flagged.
  it("keeps capitalisations apart but sorts them together and flags them", () => {
    const nodes = project(
      page({ id: "a", customProperties: [custom("k1", "pov"), custom("k2", "Alias")] }),
      page({ id: "b", customProperties: [custom("k3", "POV")] }),
    );

    const index = indexProperties(nodes, getSchema);
    expect(index.map((entry) => entry.label)).toEqual(["Alias", "pov", "POV"]);
    expect(index.map((entry) => entry.hasCaseVariants)).toEqual([false, true, true]);
  });

  it("counts a page once even when it holds the same name twice", () => {
    const nodes = project(page({ id: "a", customProperties: [custom("k1", "POV"), custom("k2", "POV")] }));
    expect(indexProperties(nodes, getSchema)[0].nodeIds).toEqual(["a"]);
  });
});

describe("indexTags", () => {
  it("counts pages per tag and flags capitalisations", () => {
    const nodes = project(
      page({ id: "a", tags: ["canon", "Canon", "canon"] }),
      page({ id: "b", tags: ["canon"] }),
      page({ id: "c", tags: [] }),
    );

    const index = indexTags(nodes);
    expect(index.map((entry) => [entry.label, entry.nodeIds.length, entry.hasCaseVariants])).toEqual([
      ["canon", 2, true],
      ["Canon", 1, true],
    ]);
  });
});

describe("planPropertyRename", () => {
  it("renames every page's copy and leaves template fields alone", () => {
    const nodes = project(
      page({ id: "a", customProperties: [custom("k1", "pov")] }),
      page({ id: "b", customProperties: [custom("k2", "pov"), custom("k3", "Alias")] }),
      page({ id: "c", templateKey: "character" }),
    );

    const plan = planPropertyRename(nodes, "pov", "POV");
    expect(plan.pages).toBe(2);
    expect(plan.merged).toBe(0);
    expect(plan.kept).toBe(0);
    expect(plan.patches[1].patch.customProperties?.map((spec) => spec.label)).toEqual(["POV", "Alias"]);
  });

  // Merging is what rename does when the new name already exists, and the rule
  // is that nothing written gets thrown away.
  it("folds an empty duplicate into the one that has a value", () => {
    const nodes = project(
      page({
        id: "a",
        customProperties: [custom("k1", "pov"), custom("k2", "POV")],
        properties: { k2: "Valera" },
        propertyOrder: ["k1", "k2"],
      }),
    );

    const plan = planPropertyRename(nodes, "pov", "POV");
    expect(plan.merged).toBe(1);
    expect(plan.kept).toBe(0);
    expect(plan.patches[0].patch.customProperties).toEqual([custom("k2", "POV")]);
    expect(plan.patches[0].patch.properties).toEqual({ k2: "Valera" });
    expect(plan.patches[0].patch.propertyOrder).toEqual(["k2"]);
  });

  it("drops the empty one when the value is on the side being renamed", () => {
    const nodes = project(
      page({ id: "a", customProperties: [custom("k1", "pov"), custom("k2", "POV")], properties: { k1: "Valera" } }),
    );

    const plan = planPropertyRename(nodes, "pov", "POV");
    expect(plan.merged).toBe(1);
    expect(plan.patches[0].patch.customProperties).toEqual([custom("k1", "POV")]);
    expect(plan.patches[0].patch.properties).toEqual({ k1: "Valera" });
  });

  // The likeliest typo there is: a misspelling of a template field's own name.
  // Nothing can merge into a template field, so the honest answer is to say so.
  it("flags pages whose template already declares the new name", () => {
    const nodes = project(
      page({ id: "a", templateKey: "character", customProperties: [custom("k1", "Sumary")] }),
      page({ id: "b", customProperties: [custom("k2", "Sumary")] }),
    );

    const plan = planPropertyRename(nodes, "Sumary", "Summary", getSchema);
    expect(plan.pages).toBe(2);
    expect(plan.templateClash).toBe(1);
    expect(plan.merged).toBe(0);
  });

  it("keeps both when both have something written in them", () => {
    const nodes = project(
      page({
        id: "a",
        customProperties: [custom("k1", "pov"), custom("k2", "POV")],
        properties: { k1: "Valera", k2: "Ren" },
      }),
    );

    const plan = planPropertyRename(nodes, "pov", "POV");
    expect(plan.kept).toBe(1);
    expect(plan.merged).toBe(0);
    expect(plan.patches[0].patch.customProperties?.map((spec) => spec.key)).toEqual(["k1", "k2"]);
    expect(plan.patches[0].patch.properties).toBeUndefined();
  });
});

describe("planPropertyDelete", () => {
  it("removes the field, its value and its place in the manual order", () => {
    const nodes = project(
      page({
        id: "a",
        customProperties: [custom("k1", "Scrapped"), custom("k2", "Alias")],
        properties: { k1: "old text", k2: "Val" },
        propertyOrder: ["k2", "k1"],
      }),
      page({ id: "b", customProperties: [custom("k3", "Scrapped")] }),
    );

    const plan = planPropertyDelete(nodes, "Scrapped");
    expect(plan.pages).toBe(2);
    expect(plan.filled).toBe(1);
    expect(plan.patches[0].patch.customProperties).toEqual([custom("k2", "Alias")]);
    expect(plan.patches[0].patch.properties).toEqual({ k2: "Val" });
    expect(plan.patches[0].patch.propertyOrder).toEqual(["k2"]);
  });
});

describe("planTagRename", () => {
  it("renames, and merges without leaving a duplicate behind", () => {
    const nodes = project(
      page({ id: "a", tags: ["pov", "canon"] }),
      page({ id: "b", tags: ["POV", "pov"] }),
      page({ id: "c", tags: ["canon"] }),
    );

    const plan = planTagRename(nodes, "pov", "POV");
    expect(plan.pages).toBe(2);
    expect(plan.merged).toBe(1);
    expect(plan.patches[0].tags).toEqual(["POV", "canon"]);
    expect(plan.patches[1].tags).toEqual(["POV"]);
  });
});

describe("planTagDelete", () => {
  it("takes the tag off every page carrying it", () => {
    const nodes = project(page({ id: "a", tags: ["pov", "canon"] }), page({ id: "b", tags: ["canon"] }));

    const plan = planTagDelete(nodes, "pov");
    expect(plan.pages).toBe(1);
    expect(plan.patches[0].tags).toEqual(["canon"]);
  });
});
