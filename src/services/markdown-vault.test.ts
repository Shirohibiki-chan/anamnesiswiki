import { describe, expect, it } from "vitest";
import { createNode, UNIVERSE_TEMPLATE_KEY, type Node, type Tab } from "../constants/schema";
import { planMarkdownVault, relativePath, VAULT_ASSETS_DIR } from "./markdown-vault";

function node(id: string, name: string, parentId: string | null, extra: Partial<Node> = {}): Node {
  return { ...createNode({ name, parentId, templateKey: "note" }), id, tabs: [], ...extra };
}

function tab(content: unknown[]): Tab {
  return { id: "t", label: "Main", hidden: false, content: content as Tab["content"] };
}

function para(...content: unknown[]) {
  return { id: "b", type: "paragraph", props: {}, content, children: [] };
}

function ordering(shape: Record<string, string[]>): (parentId: string | null) => string[] {
  return (parentId) => shape[parentId ?? "root"] ?? [];
}

function plan(nodes: Node[], shape: Record<string, string[]>, rootIds = shape.root) {
  return planMarkdownVault({ nodes, rootIds, orderedIdsFor: ordering(shape), rowsFor: () => [] });
}

describe("relativePath", () => {
  it("climbs out of the note's folder and back down", () => {
    expect(relativePath("", "assets/x.png")).toBe("assets/x.png");
    expect(relativePath("Canon", "assets/x.png")).toBe("../assets/x.png");
    expect(relativePath("Canon/Kaine", "assets/x.png")).toBe("../../assets/x.png");
  });

  it("stays inside a shared folder rather than climbing needlessly", () => {
    expect(relativePath("Canon", "Canon/Kaine.md")).toBe("Kaine.md");
  });
});

describe("planMarkdownVault", () => {
  it("puts a page with pages under it beside a folder of its own name", () => {
    const nodes = [node("k", "Kaine", null), node("s", "Her Sword", "k")];
    const result = plan(nodes, { root: ["k"], k: ["s"] });
    expect(result.files.map((file) => file.path)).toEqual(["Kaine.md", "Kaine/Her Sword.md"]);
    expect(result.folders).toEqual(["Kaine"]);
  });

  it("leaves a page with nothing under it as a file with no folder", () => {
    const result = plan([node("k", "Kaine", null)], { root: ["k"] });
    expect(result.files.map((file) => file.path)).toEqual(["Kaine.md"]);
    expect(result.folders).toEqual([]);
  });

  // A universe is a container chosen from a switcher, not a page anybody reads.
  it("gives a universe a folder and no note of its own", () => {
    const nodes = [node("u", "Demonic AU", null, { templateKey: UNIVERSE_TEMPLATE_KEY }), node("k", "Kaine", "u")];
    const result = plan(nodes, { root: ["u"], u: ["k"] });
    expect(result.files.map((file) => file.path)).toEqual(["Demonic AU/Kaine.md"]);
    expect(result.folders).toEqual(["Demonic AU"]);
  });

  it("makes parent folders before the ones inside them", () => {
    const nodes = [node("a", "A", null), node("b", "B", "a"), node("c", "C", "b")];
    const result = plan(nodes, { root: ["a"], a: ["b"], b: ["c"] });
    expect(result.folders).toEqual(["A", "A/B"]);
  });

  it("strips characters a filename cannot hold, and keeps the real name in the file", () => {
    const result = plan([node("k", "Kaine: Book 1/2", null)], { root: ["k"] });
    expect(result.files[0].path).toBe("Kaine_ Book 1_2.md");
    expect(result.files[0].text).toContain('title: "Kaine: Book 1/2"');
  });

  it("numbers two siblings that would land on the same filename", () => {
    const nodes = [node("a", "Sable", null), node("b", "Sable", null)];
    const result = plan(nodes, { root: ["a", "b"] });
    expect(result.files.map((file) => file.path)).toEqual(["Sable.md", "Sable (2).md"]);
  });

  it("lets the same name sit in two different folders untouched", () => {
    const nodes = [node("a", "Canon", null), node("b", "Notes", "a"), node("c", "AUs", null), node("d", "Notes", "c")];
    const result = plan(nodes, { root: ["a", "c"], a: ["b"], c: ["d"] });
    expect(result.files.map((file) => file.path)).toContain("Canon/Notes.md");
    expect(result.files.map((file) => file.path)).toContain("AUs/Notes.md");
  });
});

describe("what a link says", () => {
  const mention = (nodeId: string, label: string) => ({ type: "mention", props: { nodeId, label } });

  it("uses the bare name, which is what Obsidian resolves first", () => {
    const nodes = [node("a", "Canon", null), node("k", "Kaine", "a"), node("s", "Her Sword", "a", { tabs: [tab([para(mention("k", "Kaine"))])] })];
    const result = plan(nodes, { root: ["a"], a: ["k", "s"] });
    expect(result.files.find((file) => file.path.endsWith("Her Sword.md"))!.text).toContain("[[Kaine]]");
  });

  // Obsidian's own tie-break, applied to both of them: a link that resolves to
  // whichever note got indexed first is worse than a long link.
  it("falls back to the full path for both notes when two share a name", () => {
    const nodes = [
      node("a", "Canon", null),
      node("b", "AUs", null),
      node("k1", "Sable", "a"),
      node("k2", "Sable", "b"),
      node("s", "Her Sword", null, { tabs: [tab([para(mention("k1", "Sable"), mention("k2", "Sable"))])] }),
    ];
    const result = plan(nodes, { root: ["a", "b", "s"], a: ["k1"], b: ["k2"] });
    const text = result.files.find((file) => file.path === "Her Sword.md")!.text;
    // The path is the target and her wording stays the label, so the sentence
    // still reads "Sable" while the link points somewhere definite.
    expect(text).toContain("[[Canon/Sable|Sable]]");
    expect(text).toContain("[[AUs/Sable|Sable]]");
  });

  it("degrades a link to a page left out of the export to its own words", () => {
    const nodes = [node("s", "Her Sword", null, { tabs: [tab([para(mention("gone", "Kaine"))])] }), node("k", "Kaine", null)];
    const result = plan(nodes, { root: ["s", "k"], s: [], k: [] });
    expect(result.files[0].text).toContain("Kaine");
    expect(result.files[0].text).not.toContain("[[");
  });
});

describe("pictures", () => {
  const picture = (url: string) => ({ id: "b", type: "image", props: { url, caption: "" }, children: [] });

  it("collects each one once and points every note at the copy", () => {
    const nodes = [
      node("a", "Canon", null),
      node("k", "Kaine", "a", { tabs: [tab([picture("anamnesis-asset:face.png")])] }),
      node("s", "Sable", null, { tabs: [tab([picture("anamnesis-asset:face.png")])] }),
    ];
    const result = plan(nodes, { root: ["a", "s"], a: ["k"] });
    expect(result.assets).toEqual([{ fileName: "face.png", path: `${VAULT_ASSETS_DIR}/face.png` }]);
    expect(result.files.find((file) => file.path.endsWith("Kaine.md"))!.text).toContain("(../assets/face.png)");
    expect(result.files.find((file) => file.path === "Sable.md")!.text).toContain("(assets/face.png)");
  });

  it("takes the page's portrait along too, through the front matter", () => {
    const result = plan([node("k", "Kaine", null, { image: "face.png" })], { root: ["k"] });
    expect(result.assets.map((asset) => asset.fileName)).toEqual(["face.png"]);
    expect(result.files[0].text).toContain('image: "assets/face.png"');
  });

  // Hers, decided 2026-08-11 — and copying somebody else's URL into a folder
  // is not something an export should do on her behalf.
  it("leaves a picture embedded by web address exactly where it is", () => {
    const nodes = [node("k", "Kaine", null, { tabs: [tab([picture("https://example.com/face.png")])] })];
    const result = plan(nodes, { root: ["k"] });
    expect(result.assets).toEqual([]);
    expect(result.files[0].text).toContain("(https://example.com/face.png)");
  });

  it("escapes a space in a filename so the markdown link does not break", () => {
    const nodes = [node("k", "Kaine", null, { tabs: [tab([picture("anamnesis-asset:her face.png")])] })];
    expect(plan(nodes, { root: ["k"] }).files[0].text).toContain("(assets/her%20face.png)");
  });
});

describe("what the summary says", () => {
  it("says nothing at all about a world that came out whole", () => {
    expect(plan([node("k", "Kaine", null)], { root: ["k"] }).notes).toEqual([]);
  });

  it("counts the pictures it is about to copy", () => {
    const nodes = [node("k", "Kaine", null, { image: "face.png" })];
    expect(plan(nodes, { root: ["k"] }).notes.join(" ")).toContain("1 picture");
  });

  it("separates what went flat from what was left out", () => {
    const nodes = [
      node("k", "Kaine", null, {
        blocks: [{ id: "m", kind: "meter", meters: [{ id: "e", label: "Resolve", value: 7, max: 10 }] }],
        tabs: [tab([{ id: "c", type: "pageContents", props: {}, children: [] }])],
      }),
    ];
    const notes = plan(nodes, { root: ["k"] }).notes;
    expect(notes.some((note) => note.includes("came out as plain writing"))).toBe(true);
    expect(notes.some((note) => note.includes("nothing to write down"))).toBe(true);
  });

  it("gives the same plan twice, so an untouched world exports identically", () => {
    const nodes = [node("a", "Canon", null), node("k", "Kaine", "a", { image: "face.png" })];
    const shape = { root: ["a"], a: ["k"] };
    expect(JSON.stringify(plan(nodes, shape))).toBe(JSON.stringify(plan(nodes, shape)));
  });
});
