// The Assets tab offers a delete button on anything this file reports as
// unused, so a miss here is a page losing its picture. These tests are written
// against that: every route a picture can be referenced by gets one.
import { describe, expect, it } from "vitest";
import {
  assetRefsInContent,
  buildAssetEntries,
  describeSize,
  describeAssetDeletion,
  describeUses,
  indexAssetUsage,
  isAssetInUse,
  type AssetUsageIndex,
} from "./asset-usage";
import { createTemplateLibrary, type Node, type TemplateLibrary } from "../constants/schema";
import type { AssetUse } from "./asset-usage";

function node(overrides: Partial<Node> & Pick<Node, "id" | "name">): Node {
  return {
    parentId: null,
    templateKey: "character",
    tabs: [],
    properties: {},
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function imageBlock(fileName: string, children?: unknown[]) {
  return { type: "image", props: { url: `anamnesis-asset:${fileName}` }, children };
}

function tab(content: unknown[], patch: { id?: string; hidden?: boolean } = {}) {
  return { id: patch.id ?? "overview", label: "Overview", hidden: patch.hidden ?? false, content };
}

function byId(nodes: Node[]): Record<string, Node> {
  return Object.fromEntries(nodes.map((n) => [n.id, n]));
}

function library(nodes: Node[]): TemplateLibrary {
  return { ...createTemplateLibrary(), nodes: byId(nodes) };
}

const empty = createTemplateLibrary();

function usersOf(index: AssetUsageIndex, fileName: string) {
  return (index.get(fileName) ?? []).map((use) => `${use.source}:${use.where}:${use.nodeId}`).sort();
}

describe("assetRefsInContent", () => {
  it("finds a picture written into a page", () => {
    expect(assetRefsInContent([imageBlock("a.png")])).toEqual(["a.png"]);
  });

  it("finds one nested inside another block", () => {
    const content = [{ type: "bulletListItem", children: [imageBlock("nested.png")] }];
    expect(assetRefsInContent(content)).toEqual(["nested.png"]);
  });

  it("finds one nested several levels down", () => {
    const content = [{ type: "bulletListItem", children: [{ type: "bulletListItem", children: [imageBlock("deep.png")] }] }];
    expect(assetRefsInContent(content)).toEqual(["deep.png"]);
  });

  it("ignores a picture embedded by web address, which is not a file we own", () => {
    expect(assetRefsInContent([{ type: "image", props: { url: "https://example.com/cat.png" } }])).toEqual([]);
  });

  it("survives content that isn't what it expected", () => {
    expect(assetRefsInContent(null)).toEqual([]);
    expect(assetRefsInContent("not blocks")).toEqual([]);
    expect(assetRefsInContent([null, 7, { type: "paragraph" }])).toEqual([]);
  });

  it("reports the same picture once per block that shows it", () => {
    expect(assetRefsInContent([imageBlock("twice.png"), imageBlock("twice.png")])).toEqual(["twice.png", "twice.png"]);
  });
});

describe("indexAssetUsage", () => {
  it("finds a portrait, a cover and a picture in the writing", () => {
    const index = indexAssetUsage(
      byId([node({ id: "v", name: "Valera", image: "face.png", banner: "cover.png", tabs: [tab([imageBlock("map.png")])] })]),
      empty,
    );
    expect(usersOf(index, "face.png")).toEqual(["project:portrait:v"]);
    expect(usersOf(index, "cover.png")).toEqual(["project:banner:v"]);
    expect(usersOf(index, "map.png")).toEqual(["project:page:v"]);
  });

  // A hidden tab is one she isn't looking at, not one that stopped holding
  // what's written in it.
  it("looks inside hidden tabs", () => {
    const index = indexAssetUsage(byId([node({ id: "v", name: "V", tabs: [tab([imageBlock("secret.png")], { hidden: true })] })]), empty);
    expect(usersOf(index, "secret.png")).toEqual(["project:page:v"]);
  });

  it("looks in every tab, not only the first", () => {
    const index = indexAssetUsage(
      byId([node({ id: "v", name: "V", tabs: [tab([], { id: "a" }), tab([imageBlock("late.png")], { id: "b" })] })]),
      empty,
    );
    expect(usersOf(index, "late.png")).toEqual(["project:page:v"]);
  });

  it("collects every page that uses one picture", () => {
    const index = indexAssetUsage(
      byId([node({ id: "a", name: "A", image: "shared.png" }), node({ id: "b", name: "B", banner: "shared.png" })]),
      empty,
    );
    expect(usersOf(index, "shared.png")).toEqual(["project:banner:b", "project:portrait:a"]);
  });

  // The fourth usage site, and the one that's easy to leave out: saveAsTemplate
  // copies a page's portrait and cover files but not the pictures inside its
  // tabs, so a template and its source page can share one.
  it("counts a picture used only by a template as in use", () => {
    const index = indexAssetUsage({}, library([node({ id: "t", name: "Character sheet", tabs: [tab([imageBlock("crest.png")])] })]));
    expect(usersOf(index, "crest.png")).toEqual(["template:page:t"]);
  });

  it("counts a template's own portrait and cover", () => {
    const index = indexAssetUsage({}, library([node({ id: "t", name: "T", image: "ti.png", banner: "tb.png" })]));
    expect(usersOf(index, "ti.png")).toEqual(["template:portrait:t"]);
    expect(usersOf(index, "tb.png")).toEqual(["template:banner:t"]);
  });

  it("reports a picture shared by a page and a template as used by both", () => {
    const index = indexAssetUsage(
      byId([node({ id: "p", name: "P", tabs: [tab([imageBlock("both.png")])] })]),
      library([node({ id: "t", name: "T", tabs: [tab([imageBlock("both.png")])] })]),
    );
    expect(usersOf(index, "both.png")).toEqual(["project:page:p", "template:page:t"]);
  });

  it("has nothing to say about a file nobody points at", () => {
    expect(indexAssetUsage(byId([node({ id: "a", name: "A" })]), empty).get("orphan.png")).toBeUndefined();
  });
});

describe("buildAssetEntries", () => {
  const files = [
    { fileName: "used.png", size: 2048 },
    { fileName: "orphan.png", size: 100 },
    { fileName: "another-orphan.png", size: 100 },
  ];

  it("marks a file nothing points at as unused, and puts those first", () => {
    const usage = indexAssetUsage(byId([node({ id: "a", name: "A", image: "used.png" })]), empty);
    const entries = buildAssetEntries(files, usage);
    expect(entries.map((e) => e.fileName)).toEqual(["another-orphan.png", "orphan.png", "used.png"]);
    expect(entries.map((e) => e.isUnused)).toEqual([true, true, false]);
  });

  // The directory is the truth about what exists. A reference to a file that
  // isn't there is a broken picture, not a picture you have.
  it("lists what's on disk, never what a page merely points at", () => {
    const usage = indexAssetUsage(byId([node({ id: "a", name: "A", image: "gone.png" })]), empty);
    const entries = buildAssetEntries([{ fileName: "here.png", size: 1 }], usage);
    expect(entries.map((e) => e.fileName)).toEqual(["here.png"]);
  });

  it("carries the uses through so the tile can name them", () => {
    const usage = indexAssetUsage(byId([node({ id: "a", name: "Valera", image: "used.png" })]), empty);
    const entry = buildAssetEntries(files, usage).find((e) => e.fileName === "used.png")!;
    expect(entry.uses).toEqual([{ where: "portrait", nodeId: "a", nodeName: "Valera", source: "project" }]);
  });
});

describe("describeUses", () => {
  const use = (nodeId: string, source: "project" | "template") =>
    ({ where: "page", nodeId, nodeName: nodeId, source }) as const;

  it("says so plainly when nothing uses it", () => {
    expect(describeUses([])).toBe("Not used anywhere");
  });

  it("counts pages and templates separately", () => {
    expect(describeUses([use("a", "project"), use("b", "project"), use("t", "template")])).toBe("2 pages · 1 template");
  });

  // One page carrying a picture as both its portrait and its banner is one
  // page you'd have to go and look at.
  it("counts a page once however many times it uses the picture", () => {
    expect(describeUses([use("a", "project"), use("a", "project")])).toBe("1 page");
  });

  it("says only what applies, with no stray separator", () => {
    expect(describeUses([use("t", "template")])).toBe("1 template");
    expect(describeUses([use("a", "project")])).toBe("1 page");
  });
});

describe("describeSize", () => {
  it("reads at a glance at every scale", () => {
    expect(describeSize(0)).toBe("0 B");
    expect(describeSize(900)).toBe("900 B");
    expect(describeSize(2048)).toBe("2 KB");
    expect(describeSize(1024 * 1024)).toBe("1.0 MB");
    expect(describeSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
  });
});

// `isAssetInUse` is the guard every asset delete now passes through, so these
// are written as the questions a delete asks: after this change, is anyone
// still holding the file? A false here deletes bytes someone is using.
describe("isAssetInUse", () => {
  it("is false when nothing points at the file", () => {
    expect(isAssetInUse(byId([node({ id: "a", name: "Valera" })]), empty, "map.png")).toBe(false);
  });

  it("finds it in a portrait", () => {
    const nodes = byId([node({ id: "a", name: "Valera", image: "map.png" })]);
    expect(isAssetInUse(nodes, empty, "map.png")).toBe(true);
  });

  it("finds it in a cover", () => {
    const nodes = byId([node({ id: "a", name: "Valera", banner: "map.png" })]);
    expect(isAssetInUse(nodes, empty, "map.png")).toBe(true);
  });

  it("finds it inside a page, including a hidden tab", () => {
    const nodes = byId([node({ id: "a", name: "Valera", tabs: [tab([imageBlock("map.png")], { hidden: true })] })]);
    expect(isAssetInUse(nodes, empty, "map.png")).toBe(true);
  });

  it("finds it nested inside another block", () => {
    const nodes = byId([
      node({ id: "a", name: "Valera", tabs: [tab([{ type: "bulletListItem", children: [imageBlock("map.png")] }])] }),
    ]);
    expect(isAssetInUse(nodes, empty, "map.png")).toBe(true);
  });

  // The one a caller forgets, which is why the parameter is required.
  it("finds it in a template even when no page uses it", () => {
    const templates = library([node({ id: "t", name: "Character", image: "map.png" })]);
    expect(isAssetInUse({}, templates, "map.png")).toBe(true);
  });

  // The whole point of the library: one file, many references. Deleting the
  // page that happened to be asked about must not take the file with it.
  it("is true while a second page still holds the same file", () => {
    const nodes = byId([
      node({ id: "b", name: "The Amber Coast", image: "map.png" }),
      node({ id: "c", name: "Her Sword", banner: "map.png" }),
    ]);
    expect(isAssetInUse(nodes, empty, "map.png")).toBe(true);
  });

  it("does not match a different file", () => {
    const nodes = byId([node({ id: "a", name: "Valera", image: "other.png" })]);
    expect(isAssetInUse(nodes, empty, "map.png")).toBe(false);
  });
});

describe("describeAssetDeletion", () => {
  const use = (nodeId: string, nodeName: string, source: AssetUse["source"] = "project"): AssetUse => ({
    where: "page",
    nodeId,
    nodeName,
    source,
  });

  it("says a single page is an 'it', not a 'they'", () => {
    // The bug the user caught on 2026-08-14: "it's on 1 page — Untitled — and
    // they'll be left with an empty space".
    const text = describeAssetDeletion([use("a", "Untitled")]);
    expect(text).toBe("Delete this picture? It's used by Untitled, which will be left with an empty space. You can undo this.");
    expect(text).not.toContain("they");
    // One name in front of her doesn't need counting.
    expect(text).not.toContain("1 page");
  });

  it("counts and names when there's more than one", () => {
    const text = describeAssetDeletion([use("a", "Valera"), use("b", "Sampo")]);
    expect(text).toContain("2 pages");
    expect(text).toContain("Valera and Sampo");
  });

  it("stops naming after three and counts the rest", () => {
    const text = describeAssetDeletion([
      use("a", "Valera"),
      use("b", "Sampo"),
      use("c", "Orynthia"),
      use("d", "Zeruel"),
      use("e", "Kavaan"),
    ]);
    expect(text).toContain("5 pages");
    expect(text).toContain("Valera, Sampo, Orynthia and 2 more");
    expect(text).not.toContain("Zeruel");
    expect(text).not.toContain("Kavaan");
  });

  it("keeps pages and templates apart, in prose rather than a middot", () => {
    const text = describeAssetDeletion([use("a", "Valera"), use("t", "Character", "template")]);
    expect(text).toContain("1 page and 1 template");
    expect(text).not.toContain("·");
  });

  it("counts one page once, however many times the picture is on it", () => {
    // A portrait and a picture in the writing on the same page is two uses of
    // one file, and "2 pages" would be a lie.
    const text = describeAssetDeletion([
      { where: "portrait", nodeId: "a", nodeName: "Valera", source: "project" },
      { where: "page", nodeId: "a", nodeName: "Valera", source: "project" },
    ]);
    expect(text).toContain("used by Valera, which");
    expect(text).not.toContain("2 pages");
  });

  it("is confident about an unused picture only when every page actually loaded", () => {
    expect(describeAssetDeletion([], true)).toContain("Nothing is using it.");
    const unsure = describeAssetDeletion([], false);
    expect(unsure).toContain("isn't certain");
    expect(unsure).toContain("didn't load");
  });
});
