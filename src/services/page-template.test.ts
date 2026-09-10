import { unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { MAX_PAGE_TEMPLATE_NODES, PAGE_TEMPLATE_FORMAT, PAGE_TEMPLATE_MANIFEST } from "../constants/page-template";
import { createNode, type Node, type Tab } from "../constants/schema";
import { packPageTemplate, parsePageTemplate, picturesIn, summarizePageTemplate } from "./page-template";

const bytes = (text: string) => new TextEncoder().encode(text);

function node(id: string, name: string, parentId: string | null, extra: Partial<Node> = {}): Node {
  return { ...createNode({ name, parentId, templateKey: "character" }), id, tabs: [], ...extra };
}

function tab(content: unknown[]): Tab {
  return { id: "t", label: "Main", hidden: false, content: content as Tab["content"] };
}

async function roundTrip(input: Parameters<typeof packPageTemplate>[0]) {
  return parsePageTemplate(await packPageTemplate(input));
}

describe("picturesIn", () => {
  // A picture left out of a bundle is a broken image in whatever the person
  // it was sent to builds from it, so every place one can hide has to count.
  it("finds a portrait, a banner, a block's picture and one in the writing", () => {
    const nodes = [
      node("a", "Kaine", null, {
        image: "portrait.png",
        banner: "banner.jpg",
        blocks: [{ id: "b", kind: "image", image: "block.png" }],
        tabs: [tab([{ id: "x", type: "image", props: { url: "anamnesis-asset:inline.png" }, children: [] }])],
      }),
    ];
    expect(picturesIn(nodes)).toEqual(["banner.jpg", "block.png", "inline.png", "portrait.png"]);
  });

  it("counts a picture shared by two pages once", () => {
    const nodes = [node("a", "A", null, { image: "same.png" }), node("b", "B", "a", { image: "same.png" })];
    expect(picturesIn(nodes)).toEqual(["same.png"]);
  });

  // A file people send each other more than once has to be comparable with
  // the last one they were sent.
  it("comes back in the same order every time", () => {
    const nodes = [node("a", "A", null, { image: "z.png", banner: "a.png" })];
    expect(picturesIn(nodes)).toEqual(picturesIn(nodes));
    expect(picturesIn(nodes)).toEqual(["a.png", "z.png"]);
  });
});

describe("a bundle round trip", () => {
  it("brings the pages back whole, writing and all", async () => {
    const nodes = [node("a", "Kaine", null, { tabs: [tab([{ id: "p", type: "paragraph", content: [{ type: "text", text: "her life", styles: {} }] }])], tags: ["pc"] })];
    const { file } = await roundTrip({ rootId: "a", nodes, pictures: [] });
    expect(file.nodes).toEqual(nodes);
    expect(file.rootId).toBe("a");
  });

  it("brings the pictures back as the bytes they were", async () => {
    const raw = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
    const { file, pictures } = await roundTrip({ rootId: "a", nodes: [node("a", "K", null)], pictures: [{ fileName: "face.png", bytes: raw }] });
    expect(file.assets).toEqual(["face.png"]);
    expect([...pictures.get("face.png")!]).toEqual([...raw]);
  });

  // The switch that leaves pictures out makes the *same* format with an empty
  // asset list, so importing never has to know which it was handed.
  it("is the same format with no pictures in it", async () => {
    const { file, pictures } = await roundTrip({ rootId: "a", nodes: [node("a", "K", null)], pictures: [] });
    expect(file.format).toBe(PAGE_TEMPLATE_FORMAT);
    expect(file.assets).toEqual([]);
    expect(pictures.size).toBe(0);
  });

  it("keeps the manifest readable, the way the project folder is", async () => {
    const packed = await packPageTemplate({ rootId: "a", nodes: [node("a", "K", null)], pictures: [] });
    expect(new TextDecoder().decode(unzipSync(packed)[PAGE_TEMPLATE_MANIFEST])).toContain("\n  ");
  });

  it("says what is in it, for a modal to read out", async () => {
    const { file } = await roundTrip({
      rootId: "a",
      nodes: [node("a", "Character sheet", null), node("b", "Inventory", "a")],
      pictures: [{ fileName: "f.png", bytes: bytes("x") }],
    });
    expect(summarizePageTemplate(file)).toEqual({ name: "Character sheet", pages: 2, pictures: 1 });
  });
});

describe("a file that isn't one", () => {
  const manifest = (value: unknown) => zipSync({ [PAGE_TEMPLATE_MANIFEST]: bytes(JSON.stringify(value)) });

  it("says so when the file isn't an archive at all", () => {
    expect(() => parsePageTemplate(bytes("not a zip"))).toThrow(/couldn't be opened/);
  });

  it("says so when the archive holds no template", () => {
    expect(() => parsePageTemplate(zipSync({ "notes.txt": bytes("hello") }))).toThrow(/no template.json/);
  });

  it("says so when the manifest is damaged", () => {
    expect(() => parsePageTemplate(zipSync({ [PAGE_TEMPLATE_MANIFEST]: bytes("{oh dear") }))).toThrow(/damaged/);
  });

  // The two template formats share a word in the interface, so the one likely
  // mistake gets its own sentence pointing at where the other one opens.
  it("points at the start screen when handed a project template", () => {
    expect(() => parsePageTemplate(manifest({ format: "anamnesis-project-template", version: 1 }))).toThrow(/start screen/);
  });

  it("refuses a template from a newer version rather than half-reading it", () => {
    expect(() => parsePageTemplate(manifest({ format: PAGE_TEMPLATE_FORMAT, version: 99, rootId: "a", nodes: [node("a", "K", null)] }))).toThrow(/newer version/);
  });

  it("refuses one that describes more pages than a template should", () => {
    const many = Array.from({ length: MAX_PAGE_TEMPLATE_NODES + 1 }, (_, i) => node(`n${i}`, `N${i}`, null));
    expect(() => parsePageTemplate(manifest({ format: PAGE_TEMPLATE_FORMAT, version: 1, rootId: "n0", nodes: many }))).toThrow(/more than a template should hold/);
  });

  it("refuses one that doesn't say which page is the template", () => {
    expect(() => parsePageTemplate(manifest({ format: PAGE_TEMPLATE_FORMAT, version: 1, rootId: "missing", nodes: [node("a", "K", null)] }))).toThrow(/which page is the template/);
  });

  it("refuses an empty one", () => {
    expect(() => parsePageTemplate(manifest({ format: PAGE_TEMPLATE_FORMAT, version: 1, rootId: "a", nodes: [] }))).toThrow(/no pages in it/);
  });
});

describe("what a bundle is not allowed to carry", () => {
  const good = { format: PAGE_TEMPLATE_FORMAT, version: 1, rootId: "a", nodes: [node("a", "K", null)], assets: [] };

  // A nested path inside an archive is how a zip escapes the folder it is
  // unpacked into. An asset filename is a uuid and never has one.
  it("ignores an asset path that tries to climb out of the bundle", () => {
    const packed = zipSync({
      [PAGE_TEMPLATE_MANIFEST]: bytes(JSON.stringify(good)),
      "assets/../../evil.png": bytes("x"),
      "assets/nested/deep.png": bytes("x"),
    });
    expect([...parsePageTemplate(packed).pictures.keys()]).toEqual([]);
  });

  it("ignores a dot-file smuggled in beside the pictures", () => {
    const packed = zipSync({ [PAGE_TEMPLATE_MANIFEST]: bytes(JSON.stringify(good)), "assets/.hidden": bytes("x") });
    expect([...parsePageTemplate(packed).pictures.keys()]).toEqual([]);
  });

  // A manifest naming a picture the bundle does not carry is a download that
  // stopped early; the import takes what exists rather than failing on it.
  it("carries what is really there when the manifest overpromises", () => {
    const packed = zipSync({ [PAGE_TEMPLATE_MANIFEST]: bytes(JSON.stringify({ ...good, assets: ["gone.png"] })) });
    expect(parsePageTemplate(packed).pictures.size).toBe(0);
  });
});
