import { describe, expect, it } from "vitest";
import { createNode, type Node, type Tab } from "../constants/schema";
import { anchorSlug, planSingleMarkdown } from "./markdown-single";

function node(id: string, name: string, parentId: string | null, extra: Partial<Node> = {}): Node {
  return { ...createNode({ name, parentId, templateKey: "note" }), id, tabs: [], ...extra };
}

function tab(content: unknown[]): Tab {
  return { id: "t", label: "Main", hidden: false, content: content as Tab["content"] };
}

function para(...content: unknown[]) {
  return { id: "b", type: "paragraph", props: {}, content, children: [] };
}

function text(value: string) {
  return { type: "text", text: value, styles: {} };
}

function ordering(shape: Record<string, string[]>): (parentId: string | null) => string[] {
  return (parentId) => shape[parentId ?? "root"] ?? [];
}

function plan(nodes: Node[], shape: Record<string, string[]>, rootIds = shape.root) {
  return planSingleMarkdown({ projectName: "Valeraverse", nodes, rootIds, orderedIdsFor: ordering(shape), rowsFor: () => [] });
}

describe("anchorSlug", () => {
  it("matches the way GitHub makes one, which is what every reader copies", () => {
    expect(anchorSlug("Her Sword")).toBe("her-sword");
    expect(anchorSlug("Who? What: Where")).toBe("who-what-where");
    expect(anchorSlug("Kaine  Jiang")).toBe("kaine-jiang");
  });
});

describe("planSingleMarkdown", () => {
  it("names the document once at the top and never again", () => {
    const result = plan([node("k", "Kaine", null)], { root: ["k"] });
    expect(result.text.startsWith('---\ntitle: "Valeraverse"\n---')).toBe(true);
    expect(result.text.match(/^---$/gm)).toHaveLength(2);
  });

  // The whole reason the format is navigable: an outline pane shows her tree.
  it("puts a page as deep in the headings as it sits in the tree", () => {
    const nodes = [node("a", "Canon", null), node("k", "Kaine", "a"), node("s", "Her Sword", "k")];
    const result = plan(nodes, { root: ["a"], a: ["k"], k: ["s"] });
    expect(result.text).toContain("# Canon");
    expect(result.text).toContain("## Kaine");
    expect(result.text).toContain("### Her Sword");
  });

  it("stops at six, because markdown has no seventh level", () => {
    const names = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const nodes = names.map((id, index) => node(id, id.toUpperCase(), index === 0 ? null : names[index - 1]));
    const shape: Record<string, string[]> = { root: ["a"] };
    names.slice(0, -1).forEach((id, index) => (shape[id] = [names[index + 1]]));
    const result = plan(nodes, shape);
    expect(result.text).toContain("###### F");
    expect(result.text).toContain("###### H");
    expect(result.text).not.toContain("####### ");
  });

  it("links pages to each other inside the one document", () => {
    const nodes = [
      node("k", "Kaine", null),
      node("s", "Her Sword", null, { tabs: [tab([para({ type: "mention", props: { nodeId: "k", label: "Kaine" } })])] }),
    ];
    expect(plan(nodes, { root: ["k", "s"] }).text).toContain("[Kaine](#kaine)");
  });

  it("numbers the second page of a shared name, the way a renderer will", () => {
    const nodes = [
      node("a", "Sable", null),
      node("b", "Sable", null),
      node("s", "Her Sword", null, {
        tabs: [tab([para({ type: "mention", props: { nodeId: "b", label: "Sable" } })])],
      }),
    ];
    expect(plan(nodes, { root: ["a", "b", "s"] }).text).toContain("[Sable](#sable-1)");
  });

  it("writes tags and properties under the heading, since there is no front matter per page", () => {
    const nodes = [
      node("k", "Kaine", null, {
        tags: ["pc"],
        customProperties: [{ key: "age", label: "Age", type: "number" }],
        properties: { age: 31 },
      }),
    ];
    const result = plan(nodes, { root: ["k"] });
    expect(result.text).toContain("*#pc*");
    // A bullet, not a bare line: two lines with one newline between them are
    // a single run-on paragraph in markdown.
    expect(result.text).toContain("- **Age** — 31");
    expect(/\*#pc\*\n\*\*Age\*\*/.test(result.text)).toBe(false);
  });
});

describe("pictures in one file", () => {
  const picture = (url: string, caption = "") => ({ id: "b", type: "image", props: { url, caption }, children: [] });

  // The inverse of the vault's rule, and the reason the two are separate:
  // a single file with a folder of images beside it is not one file.
  it("leaves a picture from her own disk out, keeps its caption, and says how many", () => {
    const nodes = [node("k", "Kaine", null, { tabs: [tab([picture("anamnesis-asset:face.png", "her face")])] })];
    const result = plan(nodes, { root: ["k"] });
    expect(result.text).toContain("her face");
    expect(result.text).not.toContain("face.png");
    expect(result.notes.join(" ")).toContain("1 picture from your own computer");
  });

  it("keeps a picture that has a web address, because it still shows", () => {
    const nodes = [node("k", "Kaine", null, { tabs: [tab([picture("https://example.com/face.png")])] })];
    const result = plan(nodes, { root: ["k"] });
    expect(result.text).toContain("(https://example.com/face.png)");
    expect(result.notes.join(" ")).not.toContain("from your own computer");
  });
});

describe("what the summary says", () => {
  it("says nothing at all about a world that came out whole", () => {
    expect(plan([node("k", "Kaine", null, { tabs: [tab([para(text("hi"))])] })], { root: ["k"] }).notes).toEqual([]);
  });

  it("gives the same file twice, so an untouched world exports identically", () => {
    const nodes = [node("a", "Canon", null), node("k", "Kaine", "a", { tabs: [tab([para(text("hi"))])] })];
    const shape = { root: ["a"], a: ["k"] };
    expect(plan(nodes, shape).text).toBe(plan(nodes, shape).text);
  });
});
