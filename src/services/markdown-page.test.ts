import { describe, expect, it } from "vitest";
import { createLossyTally, lossyCount } from "./export-walk";
import { BLOCK_DROPPED, BLOCK_FLATTENED, blocksToMarkdown, frontMatterFor, inlineToMarkdown, pageToMarkdown, type MarkdownPageContext } from "./markdown-page";
import { createNode, type Block, type Node, type Tab } from "../constants/schema";

function ctx(overrides: Partial<MarkdownPageContext> = {}): MarkdownPageContext {
  return {
    linkFor: () => null,
    pictureAt: () => null,
    rowsFor: () => [],
    tally: createLossyTally(),
    ...overrides,
  };
}

function page(overrides: Partial<Node> = {}): Node {
  return { ...createNode({ name: "Kaine", parentId: null, templateKey: "note" }), tabs: [], ...overrides };
}

function tab(label: string, content: unknown[], hidden = false): Tab {
  return { id: `tab-${label}`, label, hidden, content: content as Tab["content"] };
}

function text(value: string, styles: Record<string, unknown> = {}) {
  return { type: "text", text: value, styles };
}

function para(...content: unknown[]) {
  return { id: "b", type: "paragraph", props: {}, content, children: [] };
}

describe("inlineToMarkdown", () => {
  it("wraps each style in the mark that renders it, and underline in the tag markdown lacks", () => {
    expect(inlineToMarkdown([text("bold", { bold: true })], ctx())).toBe("**bold**");
    expect(inlineToMarkdown([text("both", { bold: true, italic: true })], ctx())).toBe("***both***");
    expect(inlineToMarkdown([text("gone", { strike: true })], ctx())).toBe("~~gone~~");
    expect(inlineToMarkdown([text("under", { underline: true })], ctx())).toBe("<u>under</u>");
  });

  it("leaves code spans literal rather than wrapping marks the reader would see", () => {
    expect(inlineToMarkdown([text("a*b", { code: true, bold: true })], ctx())).toBe("`a*b`");
  });

  it("escapes what would otherwise change the line, and leaves underscores alone", () => {
    expect(inlineToMarkdown([text("a*b [c] `d`")], ctx())).toBe("a\\*b \\[c\\] \\`d\\`");
    expect(inlineToMarkdown([text("snake_case_name")], ctx())).toBe("snake_case_name");
  });

  it("turns a page mention into a wikilink, keeping her wording as the alias", () => {
    // The vault's own wikilink shape, supplied by `markdown-vault.ts` — this
    // file only asks for a link and drops it in.
    const linkFor = (id: string, label?: string) =>
      id !== "kaine" ? null : !label || label === "Kaine" ? "[[Kaine]]" : `[[Kaine|${label}]]`;
    expect(inlineToMarkdown([{ type: "mention", props: { nodeId: "kaine", label: "Kaine" } }], ctx({ linkFor }))).toBe("[[Kaine]]");
    expect(inlineToMarkdown([{ type: "mention", props: { nodeId: "kaine", text: "she", label: "Kaine" } }], ctx({ linkFor }))).toBe("[[Kaine|she]]");
  });

  it("degrades a mention of a page outside the vault to its own words", () => {
    expect(inlineToMarkdown([{ type: "mention", props: { nodeId: "elsewhere", label: "Elsewhere" } }], ctx())).toBe("Elsewhere");
  });

  // The same split lk-export makes: an emoji is a character, a glyph is a drawing.
  it("keeps an emoji icon and drops a glyph rather than printing its name", () => {
    const tally = createLossyTally();
    expect(inlineToMarkdown([{ type: "icon", props: { icon: "🗡" } }], ctx({ tally }))).toBe("🗡");
    expect(inlineToMarkdown([{ type: "icon", props: { icon: "sword" } }], ctx({ tally }))).toBe("");
    expect(lossyCount(tally, BLOCK_DROPPED)).toBe(1);
  });
});

describe("blocksToMarkdown", () => {
  const node = page();

  it("numbers a run of list items together and restarts after something else", () => {
    const blocks = [
      { type: "numberedListItem", props: {}, content: [text("one")], children: [] },
      { type: "numberedListItem", props: {}, content: [text("two")], children: [] },
      para(text("break")),
      { type: "numberedListItem", props: {}, content: [text("one again")], children: [] },
    ];
    expect(blocksToMarkdown(blocks, ctx(), 0, node)).toBe("1. one\n\n2. two\n\nbreak\n\n1. one again");
  });

  it("indents a nested list under its item", () => {
    const blocks = [
      {
        type: "bulletListItem",
        props: {},
        content: [text("outer")],
        children: [{ type: "bulletListItem", props: {}, content: [text("inner")], children: [] }],
      },
    ];
    expect(blocksToMarkdown(blocks, ctx(), 0, node)).toBe("- outer\n    - inner");
  });

  it("writes a checklist as Obsidian's task syntax", () => {
    const blocks = [
      { type: "checkListItem", props: { checked: true }, content: [text("done")], children: [] },
      { type: "checkListItem", props: { checked: false }, content: [text("todo")], children: [] },
    ];
    expect(blocksToMarkdown(blocks, ctx(), 0, node)).toBe("- [x] done\n\n- [ ] todo");
  });

  it("writes our callouts as Obsidian callouts, with Secret as a warning", () => {
    const blocks = [{ type: "calloutSecret", props: {}, content: [text("not for them")], children: [] }];
    expect(blocksToMarkdown(blocks, ctx(), 0, node)).toBe("> [!warning]\n> not for them");
  });

  it("counts a coloured Info as flattened, since the colour is ours alone", () => {
    const tally = createLossyTally();
    blocksToMarkdown([{ type: "calloutInfo", props: { color: "amber" }, content: [text("careful")], children: [] }], ctx({ tally }), 0, node);
    expect(lossyCount(tally, BLOCK_FLATTENED)).toBe(1);
  });

  it("makes a toggle a collapsed callout, which is the nearest thing Obsidian has", () => {
    const blocks = [{ type: "toggleListItem", props: {}, content: [text("More")], children: [para(text("hidden"))] }];
    expect(blocksToMarkdown(blocks, ctx(), 0, node)).toBe("> [!note]- More\n> hidden");
  });

  it("grows the code fence past any backticks inside it", () => {
    const blocks = [{ type: "codeBlock", props: { language: "md" }, content: [text("a ``` b")], children: [] }];
    expect(blocksToMarkdown(blocks, ctx(), 0, node)).toBe("````md\na ``` b\n````");
  });

  it("shifts the writing's headings down so they nest under the tab headings", () => {
    const blocks = [{ type: "heading", props: { level: 1 }, content: [text("Early life")], children: [] }];
    expect(blocksToMarkdown(blocks, ctx(), 0, node)).toBe("# Early life");
    expect(blocksToMarkdown(blocks, ctx(), 1, node)).toBe("## Early life");
  });

  it("runs side-by-side columns one after the other and says so", () => {
    const tally = createLossyTally();
    const blocks = [
      {
        type: "pageColumns",
        props: {},
        children: [
          { type: "pageColumn", props: {}, children: [para(text("left"))] },
          { type: "pageColumn", props: {}, children: [para(text("right"))] },
        ],
      },
    ];
    expect(blocksToMarkdown(blocks, ctx({ tally }), 0, node)).toBe("left\n\nright");
    expect(lossyCount(tally, BLOCK_FLATTENED)).toBe(1);
  });

  it("leaves out a generated contents list rather than freezing a copy of one", () => {
    const tally = createLossyTally();
    expect(blocksToMarkdown([{ type: "pageContents", props: {}, children: [] }], ctx({ tally }), 0, node)).toBe("");
    expect(lossyCount(tally, BLOCK_DROPPED)).toBe(1);
  });

  it("keeps a picture's caption when the picture itself cannot travel", () => {
    const blocks = [{ type: "image", props: { url: "anamnesis-asset:x.png", caption: "her sword" }, children: [] }];
    expect(blocksToMarkdown(blocks, ctx(), 0, node)).toBe("her sword");
  });

  it("writes a picture that can travel, with the caption under it", () => {
    const blocks = [{ type: "image", props: { url: "anamnesis-asset:x.png", caption: "her sword" }, children: [] }];
    expect(blocksToMarkdown(blocks, ctx({ pictureAt: () => "../assets/x.png" }), 0, node)).toBe("![her sword](../assets/x.png)\n*her sword*");
  });

  it("escapes a pipe inside a table cell so it does not end the column", () => {
    const blocks = [
      {
        type: "table",
        props: {},
        content: { rows: [{ cells: [[text("a|b")], [text("c")]] }, { cells: [[text("d")], [text("e")]] }] },
        children: [],
      },
    ];
    expect(blocksToMarkdown(blocks, ctx(), 0, node)).toBe("| a\\|b | c |\n| --- | --- |\n| d | e |");
  });

  it("keeps the text of a block type it has never heard of", () => {
    expect(blocksToMarkdown([{ type: "somethingNew", props: {}, content: [text("still here")], children: [] }], ctx(), 0, node)).toBe("still here");
  });
});

describe("frontMatterFor", () => {
  it("quotes every value, so nothing changes type on the way back in", () => {
    const node = page({ name: "no", tags: ["1.0"] });
    expect(frontMatterFor(node, ctx())).toContain('title: "no"');
    expect(frontMatterFor(node, ctx())).toContain('tags: ["1.0"]');
  });

  it("leaves hidden out entirely unless the page is hidden", () => {
    expect(frontMatterFor(page(), ctx())).not.toContain("hidden");
    expect(frontMatterFor(page({ hidden: true }), ctx())).toContain("hidden: true");
  });

  // Phase 20 reads the split from this line rather than guessing it from the
  // `##` headings; a single-tab page has no headings to split on and no line.
  it("names the tabs only when the body is split into them", () => {
    expect(frontMatterFor(page({ tabs: [tab("Main", [])] }), ctx())).not.toContain("tabs:");
    expect(frontMatterFor(page({ tabs: [tab("Overview", []), tab("Hist \"ory\"", [])] }), ctx())).toContain('tabs: ["Overview", "Hist \\"ory\\""]');
  });

  it("writes a property's label and its option's label, never the stored ids", () => {
    const node = page({
      customProperties: [{ key: "mood", label: "Mood", type: "select", options: [{ id: "opt-1", label: "Grim", color: "slate" }] }],
      properties: { mood: "opt-1" },
    });
    const yaml = frontMatterFor(node, ctx());
    expect(yaml).toContain('Mood: "Grim"');
    expect(yaml).not.toContain("opt-1");
  });

  it("keeps a reference field clickable by writing it as a wikilink", () => {
    const node = page({
      customProperties: [{ key: "friends", label: "Friends", type: "refs" }],
      properties: { friends: ["kaine"] },
    });
    // Quoted, or `[[[Kaine]]]` parses as a sequence three deep rather than a
    // list holding one wikilink.
    expect(frontMatterFor(node, ctx({ linkFor: () => "[[Kaine]]" }))).toContain('Friends: ["[[Kaine]]"]');
  });

  it("quotes each option of a multi-select, so a comma in a label stays inside it", () => {
    const node = page({
      customProperties: [
        { key: "traits", label: "Traits", type: "multiselect", options: [{ id: "a", label: "Quick, quiet", color: "slate" }, { id: "b", label: "Loyal", color: "slate" }] },
      ],
      properties: { traits: ["a", "b"] },
    });
    expect(frontMatterFor(node, ctx())).toContain('Traits: ["Quick, quiet", "Loyal"]');
  });

  it("quotes a label that is not a plain word", () => {
    const node = page({
      customProperties: [{ key: "h", label: "Height (cm)", type: "text" }],
      properties: { h: "180" },
    });
    expect(frontMatterFor(node, ctx())).toContain('"Height (cm)": "180"');
  });
});

describe("pageToMarkdown", () => {
  it("gives a one-tab page no heading, because most pages have one", () => {
    const node = page({ tabs: [tab("Main", [para(text("body"))])] });
    expect(pageToMarkdown(node, ctx())).toContain("---\n\nbody\n");
    expect(pageToMarkdown(node, ctx())).not.toContain("## Main");
  });

  it("names every tab when there is more than one", () => {
    const node = page({ tabs: [tab("Life", [para(text("one"))]), tab("Secrets", [para(text("two"))], true)] });
    const out = pageToMarkdown(node, ctx());
    expect(out).toContain("## Life");
    expect(out).toContain("## Secrets *(hidden)*");
  });

  it("writes a meter as a line of text and counts it as flattened", () => {
    const tally = createLossyTally();
    const blocks: Block[] = [{ id: "m", kind: "meter", title: "Stats", meter: "bar", meters: [{ id: "e", label: "Resolve", value: 7, max: 10 }] }];
    const out = pageToMarkdown(page({ blocks, tabs: [tab("Main", [])] }), ctx({ tally }));
    expect(out).toContain("**Stats**");
    expect(out).toContain("**Resolve** — 7/10");
    expect(lossyCount(tally, BLOCK_FLATTENED)).toBe(1);
  });

  // Seen wrong in a real export first: with one tab, the writing keeps its own
  // levels and its sections are `##`, so a `#` here was larger than everything
  // above it.
  it("puts Details at the same level as the sections above it, tabs or no tabs", () => {
    const blocks: Block[] = [{ id: "n", kind: "text", text: "a note", showTitle: false }];
    const oneTab = pageToMarkdown(page({ blocks, tabs: [tab("Main", [])] }), ctx());
    const twoTabs = pageToMarkdown(page({ blocks, tabs: [tab("Life", []), tab("Secrets", [])] }), ctx());
    expect(oneTab).toContain("## Details");
    expect(/^# Details$/m.test(oneTab)).toBe(false);
    expect(twoTabs).toContain("## Details");
  });

  // The schema's own rule: a block is a view, not storage, for what lives elsewhere.
  it("does not print a property or tags block, which the front matter already carries", () => {
    const blocks: Block[] = [
      { id: "p", kind: "property", propertyKey: "mood" },
      { id: "t", kind: "tags" },
    ];
    expect(pageToMarkdown(page({ blocks, tags: ["pc"], tabs: [tab("Main", [])] }), ctx())).not.toContain("Details");
  });

  it("writes a collection block as a list of links", () => {
    const rows = [createNode({ name: "Her Sword", parentId: null, templateKey: "item" })];
    const blocks: Block[] = [{ id: "c", kind: "collection", source: "subpages", title: "Inside" }];
    const out = pageToMarkdown(page({ blocks, tabs: [tab("Main", [])] }), ctx({ rowsFor: () => rows, linkFor: () => "[[Her Sword]]" }));
    expect(out).toContain("- [[Her Sword]]");
  });

  // A block can live in the sidebar, in the writing, or in an infobox, and it
  // is the same record wherever it is — so it must not be written twice.
  it("does not repeat a block that is already drawn inside the writing", () => {
    const blocks: Block[] = [{ id: "note", kind: "text", text: "a note", showTitle: false }];
    const tabs = [tab("Main", [{ type: "blockRef", props: { blockId: "note" }, children: [] }])];
    const out = pageToMarkdown(page({ blocks, tabs }), ctx());
    expect(out.match(/a note/g)).toHaveLength(1);
    expect(out).not.toContain("Details");
  });
});
