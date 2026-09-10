import { describe, expect, it } from "vitest";
import { createNode, type Node, type Tab } from "../constants/schema";
import { planMarkdownImport, normalisePath, type MarkdownImportInput } from "./markdown-import";
import { planMarkdownVault } from "./markdown-vault";
import { getPropertySchema } from "./template-registry";

function input(files: Record<string, string | null>, name = "Vault"): MarkdownImportInput {
  const texts = new Map<string, string>();
  for (const [path, text] of Object.entries(files)) if (text !== null) texts.set(path, text);
  return { name, files: Object.keys(files), texts, readBytes: async (path) => new TextEncoder().encode(path) };
}

function byName(plan: ReturnType<typeof planMarkdownImport>, name: string): Node {
  const found = plan.nodes.find((node) => node.name === name);
  if (!found) throw new Error(`no node called ${name}`);
  return found;
}

function paragraphs(node: Node, tab = 0): string[] {
  return ((node.tabs[tab]?.content ?? []) as { type: string; content?: { text?: string }[] }[])
    .filter((block) => block.type === "paragraph")
    .map((block) => (block.content ?? []).map((item) => item.text ?? "").join(""));
}

describe("normalisePath", () => {
  it("resolves dots the way a link relative to a note does", () => {
    expect(normalisePath("Canon/../assets/x.png")).toBe("assets/x.png");
    expect(normalisePath("./a/./b")).toBe("a/b");
  });
});

describe("planMarkdownImport", () => {
  it("reads a note beside a folder of its name as one page holding pages", () => {
    const plan = planMarkdownImport(input({ "Kaine.md": "Hello", "Kaine/Her Sword.md": "Sharp", "Kaine/notes.png": null }));
    expect(plan.preview.map((node) => node.name)).toEqual(["Kaine"]);
    expect(plan.preview[0].children.map((node) => node.name)).toEqual(["Her Sword"]);
    expect(byName(plan, "Her Sword").parentId).toBe(byName(plan, "Kaine").id);
    expect(byName(plan, "Kaine").templateKey).toBe("note");
    expect(plan.totalResources).toBe(2);
  });

  it("makes a folder page for a folder with no note of its own", () => {
    const plan = planMarkdownImport(input({ "Characters/Kaine.md": "", "Characters/Sable.md": "" }));
    expect(byName(plan, "Characters").templateKey).toBe("folder");
    expect(plan.templateCounts).toEqual({ folder: 1, note: 2 });
    expect(plan.rootOrder).toEqual([byName(plan, "Characters").id]);
  });

  it("ignores Obsidian's own folders and a folder holding only pictures", () => {
    const plan = planMarkdownImport(input({ ".obsidian/app.json": null, ".trash/Old.md": "gone", "attachments/x.png": null, "A.md": "" }));
    expect(plan.nodes.map((node) => node.name)).toEqual(["A"]);
  });

  it("orders siblings by name, numbers included, and names the project after the folder", () => {
    const plan = planMarkdownImport(input({ "b.md": "", "Chapter 10.md": "", "Chapter 2.md": "", "a.md": "" }, "My Vault"));
    expect(plan.preview.map((node) => node.name)).toEqual(["a", "b", "Chapter 2", "Chapter 10"]);
    expect(plan.projectName).toBe("My Vault");
  });

  it("takes the page's fields from the front matter", () => {
    const plan = planMarkdownImport(
      input({
        "K.md": '---\ntitle: "Kaine: Book 1"\naliases: ["Kai"]\ntags: ["lore", "#canon"]\ntemplate: "Character"\nhidden: true\n---\nbody',
      }),
    );
    const node = plan.nodes[0];
    expect(node.name).toBe("Kaine: Book 1");
    expect(node.aliases).toEqual(["Kai"]);
    expect(node.tags).toEqual(["lore", "canon"]);
    expect(node.templateKey).toBe("character");
    expect(node.hidden).toBe(true);
  });

  it("fills a template's own field by label and makes the rest custom properties", () => {
    const field = getPropertySchema("character").find((spec) => spec.type === "text" || spec.type === "longtext")!;
    const plan = planMarkdownImport(
      input({
        "K.md": `---\ntemplate: "Character"\n${field.label}: "Tall"\nMood: grim\nAge: 30\nKnows: ["[[S]]"]\n---\n`,
        "S.md": "",
      }),
    );
    const node = byName(plan, "K");
    expect(node.properties[field.key]).toBe("Tall");
    const custom = Object.fromEntries((node.customProperties ?? []).map((spec) => [spec.label, spec]));
    expect(custom.Mood.type).toBe("longtext");
    expect(node.properties[custom.Mood.key]).toBe("grim");
    expect(custom.Age.type).toBe("number");
    expect(node.properties[custom.Age.key]).toBe(30);
    expect(custom.Knows.type).toBe("refs");
    expect(node.properties[custom.Knows.key]).toEqual([byName(plan, "S").id]);
  });

  it("resolves links by name, by path when names collide, and by alias", () => {
    const plan = planMarkdownImport(
      input({
        "A.md": "see [[Sable]] and [[Canon/Notes]] and [[Sab]] and [[Nobody]]",
        "Sable.md": "---\naliases: [Sab]\n---\n",
        "Canon/Notes.md": "",
        "AUs/Notes.md": "",
      }),
    );
    const content = byName(plan, "A").tabs[0].content as unknown as { content?: { type: string; props?: { nodeId: string } }[] }[];
    const mentions = content[0]?.content ?? [];
    const ids = mentions.filter((item) => item.type === "mention").map((item) => item.props!.nodeId);
    expect(ids).toEqual([byName(plan, "Sable").id, plan.nodes.find((node) => node.name === "Notes" && byName(plan, "Canon").id === node.parentId)!.id, byName(plan, "Sable").id]);
    expect(plan.lossyNotes.some((note) => note.includes("1 link pointed at a page"))).toBe(true);
  });

  it("copies a picture in once however many pages use it, and points every use at the copy", () => {
    const plan = planMarkdownImport(
      input({
        "A.md": "![map](assets/map.png)",
        "Deep/B.md": "![[map.png]]\n\n![again](../assets/map.png)",
        "C.md": "---\nimage: \"assets/map.png\"\nbanner: https://x.y/b.jpg\n---\n",
        "assets/map.png": null,
      }),
    );
    expect(plan.assets).toHaveLength(1);
    const fileName = plan.assets[0].fileName;
    expect(fileName.endsWith(".png")).toBe(true);
    const urls = plan.nodes.flatMap((node) => node.tabs.flatMap((tab) => (tab.content as { type: string; props?: { url?: string } }[]).map((block) => block.props?.url)));
    expect(urls.filter(Boolean)).toEqual([`anamnesis-asset:${fileName}`, `anamnesis-asset:${fileName}`, `anamnesis-asset:${fileName}`]);
    expect(byName(plan, "C").image).toBe(fileName);
    expect(byName(plan, "C").banner).toBe("https://x.y/b.jpg");
  });

  it("hands the picture's bytes back through the plan", async () => {
    const plan = planMarkdownImport(input({ "A.md": "![](x.png)", "x.png": null }));
    expect(new TextDecoder().decode(await plan.assets[0].read())).toBe("x.png");
  });

  it("splits the body into tabs only when the front matter names them", () => {
    const withTabs = planMarkdownImport(
      input({ "A.md": '---\ntabs: ["Overview", "History"]\n---\n\n## Overview\n\nfirst\n\n### Deeper\n\n## History *(hidden)*\n\nsecond\n\n## Details\n\n- **Strength** — 7' }),
    );
    const tabs = withTabs.nodes[0].tabs;
    expect(tabs.map((tab) => [tab.label, tab.hidden])).toEqual([
      ["Overview", false],
      ["History", true],
    ]);
    expect(paragraphs(withTabs.nodes[0], 0)).toEqual(["first"]);
    expect(paragraphs(withTabs.nodes[0], 1)).toEqual(["second"]);
    // The Details section rides in the last tab, heading and all, and the
    // writing's headings climb back up a level.
    const history = tabs[1].content as { type: string; props?: { level?: number } }[];
    expect(history.map((block) => block.type)).toEqual(["paragraph", "heading", "bulletListItem"]);
    expect(history[1].props?.level).toBe(1);
    expect((tabs[0].content[1] as { props: { level: number } }).props.level).toBe(2);
    expect(withTabs.lossyNotes.some((note) => note.includes("Details section"))).toBe(true);

    const without = planMarkdownImport(input({ "A.md": "## Overview\n\nfirst\n\n## History\n\nsecond" }));
    expect(without.nodes[0].tabs).toHaveLength(1);
    expect((without.nodes[0].tabs[0].content as { type: string }[]).map((block) => block.type)).toEqual(["heading", "paragraph", "heading", "paragraph"]);
  });

  it("reads a plain text file as a page of paragraphs", () => {
    const plan = planMarkdownImport(input({ "notes.txt": "one\n\ntwo" }));
    expect(paragraphs(plan.nodes[0])).toEqual(["one", "two"]);
  });
});

// ---- The round trip through the export ----

function node(id: string, name: string, parentId: string | null, extra: Partial<Node> = {}): Node {
  return { ...createNode({ name, parentId, templateKey: "note" }), id, tabs: [], ...extra };
}

function tab(id: string, label: string, content: unknown[], hidden = false): Tab {
  return { id, label, hidden, content: content as Tab["content"] };
}

function para(...content: unknown[]) {
  return { id: crypto.randomUUID(), type: "paragraph", props: {}, content, children: [] };
}

function text(value: string, styles: Record<string, boolean> = {}) {
  return { type: "text", text: value, styles };
}

describe("the round trip through the markdown export", () => {
  const nodes = [
    node("k", "Kaine", null, {
      templateKey: "character",
      tags: ["lore"],
      aliases: ["Kai"],
      hidden: true,
      image: "portrait.png",
      tabs: [
        tab("t1", "Overview", [
          { id: "h", type: "heading", props: { level: 2 }, content: [text("Early years")], children: [] },
          para(text("She met "), { type: "mention", props: { nodeId: "s", label: "Sable", text: "" } }, text(" at the "), { type: "mention", props: { nodeId: "b", label: "Ninefold Bell", text: "the bell" } }, text(".")),
          { id: "c", type: "calloutSecret", props: {}, content: [text("Not for readers")], children: [] },
          { id: "i", type: "image", props: { url: "anamnesis-asset:map.png", caption: "The map" }, children: [] },
        ]),
        tab("t2", "History", [{ id: "l", type: "bulletListItem", props: {}, content: [text("one")], children: [{ id: "l2", type: "bulletListItem", props: {}, content: [text("two", { bold: true })], children: [] }] }], true),
      ],
    }),
    node("s", "Sable", "k", { tabs: [tab("t3", "Main", [para(text("Sharp"))])] }),
    node("b", "Ninefold Bell", null, { tabs: [tab("t4", "Main", [{ id: "q", type: "quote", props: {}, content: [text("Rings")], children: [] }])] }),
  ];
  const vault = planMarkdownVault({ nodes, rootIds: ["k", "b"], orderedIdsFor: (parentId) => (parentId === null ? ["k", "b"] : parentId === "k" ? ["s"] : []), rowsFor: () => [] });
  const files: Record<string, string | null> = Object.fromEntries(vault.files.map((file) => [file.path, file.text]));
  for (const asset of vault.assets) files[asset.path] = null;
  const back = planMarkdownImport(input(files));

  it("rebuilds the tree", () => {
    expect(back.preview.map((entry) => [entry.name, entry.children.map((child) => child.name)])).toEqual([
      ["Kaine", ["Sable"]],
      ["Ninefold Bell", []],
    ]);
  });

  it("keeps the page's fields", () => {
    const kaine = byName(back, "Kaine");
    expect(kaine.templateKey).toBe("character");
    expect(kaine.tags).toEqual(["lore"]);
    expect(kaine.aliases).toEqual(["Kai"]);
    expect(kaine.hidden).toBe(true);
    expect(kaine.image).toMatch(/\.png$/);
    expect(back.assets.map((asset) => asset.fileName)).toHaveLength(2);
  });

  it("splits the tabs back apart with their names and hidden marks", () => {
    const kaine = byName(back, "Kaine");
    expect(kaine.tabs.map((entry) => [entry.label, entry.hidden])).toEqual([
      ["Overview", false],
      ["History", true],
    ]);
  });

  it("brings the writing back as the blocks it was", () => {
    const [overview, history] = byName(back, "Kaine").tabs;
    const types = (overview.content as { type: string }[]).map((block) => block.type);
    expect(types).toEqual(["heading", "paragraph", "calloutSecret", "image"]);
    expect((overview.content[0] as { props: { level: number } }).props.level).toBe(2);
    expect((overview.content[3] as { props: { caption: string } }).props.caption).toBe("The map");
    const sentence = (overview.content[1] as { content: unknown }).content as { type: string; text?: string; props?: { nodeId: string; text?: string } }[];
    expect(sentence.map((item) => item.type)).toEqual(["text", "mention", "text", "mention", "text"]);
    expect(sentence[1].props?.nodeId).toBe(byName(back, "Sable").id);
    expect(sentence[3].props?.nodeId).toBe(byName(back, "Ninefold Bell").id);
    expect(sentence[3].props?.text).toBe("the bell");

    const list = history.content[0] as { type: string; children: { content: { styles: Record<string, boolean> }[] }[] };
    expect(list.type).toBe("bulletListItem");
    expect(list.children[0].content[0].styles).toEqual({ bold: true });
    expect((byName(back, "Ninefold Bell").tabs[0].content[0] as { type: string }).type).toBe("quote");
  });
});
