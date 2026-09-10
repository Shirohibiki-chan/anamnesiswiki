import { describe, expect, it } from "vitest";
import {
  CALLOUT_RETYPED,
  EMBED_FLATTENED,
  LINK_UNRESOLVED,
  PICTURE_MISSING,
  parseBlocks,
  parseInline,
  parseYamlSubset,
  splitFrontMatter,
  splitWikilink,
  yamlStrings,
  type MarkdownParseContext,
} from "./markdown-parse";

function ctx(overrides: Partial<MarkdownParseContext> = {}): MarkdownParseContext {
  return {
    linkFor: (target, label) => (target === "Kaine" ? { nodeId: "k", label: "Kaine", ...(label && label !== "Kaine" ? { text: label } : {}) } : null),
    pictureFor: (target) => (/^(\.\.\/)?(assets\/)?x\.png$/.test(target) ? "anamnesis-asset:x.png" : /^https?:/.test(target) ? target : null),
    tally: new Map(),
    ...overrides,
  };
}

function blocks(text: string, context = ctx()) {
  return parseBlocks(text.split("\n"), context);
}

function text(value: string, styles: Record<string, true> = {}) {
  return { type: "text", text: value, styles };
}

describe("splitFrontMatter", () => {
  it("takes the block off the top and leaves the rest", () => {
    const { frontMatter, body } = splitFrontMatter('---\ntitle: "Kaine"\n---\n\nHello');
    expect(frontMatter).toEqual({ title: "Kaine" });
    expect(body).toBe("\nHello");
  });

  it("leaves a file with no block alone, dividers included", () => {
    const { frontMatter, body } = splitFrontMatter("Hello\n\n---\n\nMore");
    expect(frontMatter).toEqual({});
    expect(body).toBe("Hello\n\n---\n\nMore");
  });

  it("treats an unclosed block as body", () => {
    expect(splitFrontMatter("---\ntitle: x\nno end").body).toBe("---\ntitle: x\nno end");
  });

  it("copes with Windows line ends and a byte-order mark", () => {
    const { frontMatter, body } = splitFrontMatter("﻿---\r\ntitle: x\r\n---\r\nbody");
    expect(frontMatter).toEqual({ title: "x" });
    expect(body).toBe("body");
  });
});

describe("parseYamlSubset", () => {
  it("reads what the export writes back as what it was", () => {
    const parsed = parseYamlSubset([
      'title: "no"',
      'tags: ["1.0", "two"]',
      'Friends: ["[[Kaine]]", "[[Sable|Sab]]"]',
      '"Height (cm)": "180"',
      "hidden: true",
      'aliases: ["The \\"Bell\\""]',
    ]);
    expect(parsed).toEqual({
      title: "no",
      tags: ["1.0", "two"],
      Friends: ["[[Kaine]]", "[[Sable|Sab]]"],
      "Height (cm)": "180",
      hidden: true,
      aliases: ['The "Bell"'],
    });
  });

  it("reads Obsidian's own shapes: bare scalars, block lists, unquoted wikilinks", () => {
    const parsed = parseYamlSubset(["tags:", "  - lore", "  - #canon", "born: 1204", "home: [[Ninefold Bell]]", "mood: grim, quiet", "cssclasses: [wide]"]);
    expect(parsed).toEqual({ tags: ["lore", "#canon"], born: 1204, home: "[[Ninefold Bell]]", mood: "grim, quiet", cssclasses: ["wide"] });
  });

  it("skips comments and keys it cannot read rather than guessing", () => {
    const parsed = parseYamlSubset(["# a comment", "title: x", "nested:", "  deeper: y", "empty:"]);
    expect(parsed).toEqual({ title: "x" });
  });

  it("flattens any value to the strings it holds", () => {
    expect(yamlStrings(["a", 1, ["b"]])).toEqual(["a", "1", "b"]);
    expect(yamlStrings(undefined)).toEqual([]);
    expect(yamlStrings("  ")).toEqual([]);
  });
});

describe("splitWikilink", () => {
  it("separates the page from a heading and a label", () => {
    expect(splitWikilink("Kaine")).toEqual({ target: "Kaine" });
    expect(splitWikilink("Kaine#History")).toEqual({ target: "Kaine" });
    expect(splitWikilink("Kaine|the bell")).toEqual({ target: "Kaine", label: "the bell" });
    expect(splitWikilink("Kaine#^abc|her")).toEqual({ target: "Kaine", label: "her" });
  });
});

describe("parseInline", () => {
  it("reads the marks the export writes", () => {
    expect(parseInline("a **b** *c* ~~d~~ <u>e</u> `f*g`", ctx())).toEqual([
      text("a "),
      text("b", { bold: true }),
      text(" "),
      text("c", { italic: true }),
      text(" "),
      text("d", { strike: true }),
      text(" "),
      text("e", { underline: true }),
      text(" "),
      text("f*g", { code: true }),
    ]);
  });

  it("nests marks in either order", () => {
    expect(parseInline("***both***", ctx())).toEqual([text("both", { bold: true, italic: true })]);
    expect(parseInline("_under_ and __double__", ctx())).toEqual([text("under", { italic: true }), text(" and "), text("double", { bold: true })]);
  });

  it("leaves arithmetic and snake_case alone", () => {
    expect(parseInline("2 * 3 * 4 and snake_case_name", ctx())).toEqual([text("2 * 3 * 4 and snake_case_name")]);
  });

  it("honours backslash escapes and drops the backslash", () => {
    expect(parseInline("\\*not bold\\* and \\[brackets\\]", ctx())).toEqual([text("*not bold* and [brackets]")]);
  });

  it("turns a wikilink into a mention, with her wording when it differs", () => {
    expect(parseInline("see [[Kaine]] and [[Kaine|the bell]]", ctx())).toEqual([
      text("see "),
      { type: "mention", props: { nodeId: "k", label: "Kaine" } },
      text(" and "),
      { type: "mention", props: { nodeId: "k", label: "Kaine", text: "the bell" } },
    ]);
  });

  it("leaves the words of a link nobody answers to, and counts it", () => {
    const context = ctx();
    expect(parseInline("see [[Nobody|him]] and [[Ghost]]", context)).toEqual([text("see him and Ghost")]);
    expect(context.tally.get(LINK_UNRESOLVED)).toBe(2);
  });

  it("reads markdown links and autolinks", () => {
    expect(parseInline("[the site](https://x.y) <https://z.w>", ctx())).toEqual([
      { type: "link", href: "https://x.y", content: [text("the site")] },
      text(" "),
      { type: "link", href: "https://z.w", content: [text("https://z.w")] },
    ]);
  });

  it("keeps the words of a picture in a sentence and counts it", () => {
    const context = ctx();
    expect(parseInline("here ![the map](x.png) and ![[y.png|a sketch]]", context)).toEqual([text("here the map and a sketch")]);
    expect(context.tally.get(EMBED_FLATTENED)).toBe(2);
  });

  it("drops Obsidian comments and highlight marks, keeping the words", () => {
    expect(parseInline("a %%hidden%% b ==lit== c", ctx())).toEqual([text("a  b lit c")]);
  });

  it("reads <br> as a line break", () => {
    expect(parseInline("one<br>two", ctx())).toEqual([text("one\ntwo")]);
  });
});

describe("parseBlocks", () => {
  it("reads headings, paragraphs and dividers", () => {
    expect(blocks("# Title\n\nSome words\nmore words\n\n---\n\n### Deep")).toEqual([
      { type: "heading", props: { level: 1 }, content: [text("Title")] },
      { type: "paragraph", content: [text("Some words\nmore words")] },
      { type: "divider" },
      { type: "heading", props: { level: 3 }, content: [text("Deep")] },
    ]);
  });

  it("reads a setext heading rather than a paragraph over a rule", () => {
    expect(blocks("Title\n===\n\nSub\n---")).toEqual([
      { type: "heading", props: { level: 1 }, content: [text("Title")] },
      { type: "heading", props: { level: 2 }, content: [text("Sub")] },
    ]);
  });

  it("reads a fenced code block whole, whatever is inside it", () => {
    expect(blocks("````md\n```\n# not a heading\n```\n````")).toEqual([
      { type: "codeBlock", props: { language: "markdown" }, content: [text("```\n# not a heading\n```")] },
    ]);
  });

  it("reads bullet, numbered and task lists, nested", () => {
    expect(blocks("- one\n- two\n    - inner\n    1. deep\n- [x] done\n- [ ] not")).toEqual([
      { type: "bulletListItem", content: [text("one")] },
      {
        type: "bulletListItem",
        content: [text("two")],
        children: [{ type: "bulletListItem", content: [text("inner")] }, { type: "numberedListItem", content: [text("deep")] }],
      },
      { type: "checkListItem", props: { checked: true }, content: [text("done")] },
      { type: "checkListItem", props: { checked: false }, content: [text("not")] },
    ]);
  });

  it("nests a two-space indent the way Obsidian does, tabs included", () => {
    expect(blocks("1. a\n  - b\n  - c")).toEqual([
      {
        type: "numberedListItem",
        content: [text("a")],
        children: [{ type: "bulletListItem", content: [text("b")] }, { type: "bulletListItem", content: [text("c")] }],
      },
    ]);
    expect(blocks("- a\n\t- b")).toEqual([{ type: "bulletListItem", content: [text("a")], children: [{ type: "bulletListItem", content: [text("b")] }] }]);
  });

  it("puts a picture under a list item with the item", () => {
    expect(blocks("- look\n\n    ![map](x.png)")).toEqual([
      { type: "bulletListItem", content: [text("look")], children: [{ type: "image", props: { url: "anamnesis-asset:x.png", alt: "map" } }] },
    ]);
  });

  it("reads the export's callouts back as the blocks they were", () => {
    expect(blocks("> [!info]\n> Heads up\n\n> [!quote]\n> Said so\n\n> [!warning]\n> Not for you")).toEqual([
      { type: "calloutInfo", content: [text("Heads up")] },
      { type: "calloutQuote", content: [text("Said so")] },
      { type: "calloutSecret", content: [text("Not for you")] },
    ]);
  });

  it("colours Obsidian's other kinds and counts the ones that changed", () => {
    const context = ctx();
    expect(blocks("> [!tip] Try this\n> body\n\n> [!danger]\n> no\n\n> [!custom]\n> what", context)).toEqual([
      { type: "calloutInfo", props: { color: "emerald" }, content: [text("Try this", { bold: true }), text("\n"), text("body")] },
      { type: "calloutInfo", props: { color: "red" }, content: [text("no")] },
      { type: "calloutInfo", content: [text("what")] },
    ]);
    expect(context.tally.get(CALLOUT_RETYPED)).toBe(1);
  });

  it("does not count a warning as a change, since it is the map's word for a Secret", () => {
    const context = ctx();
    blocks("> [!warning]\n> x", context);
    expect(context.tally.get(CALLOUT_RETYPED)).toBeUndefined();
  });

  it("reads a collapsed note with a title as a toggle", () => {
    expect(blocks("> [!note]- Spoilers\n> inside\n>\n> - and a list")).toEqual([
      {
        type: "toggleListItem",
        content: [text("Spoilers")],
        children: [{ type: "paragraph", content: [text("inside")] }, { type: "bulletListItem", content: [text("and a list")] }],
      },
    ]);
  });

  it("reads a plain quote, one block per paragraph", () => {
    expect(blocks("> one\n> still one\n>\n> two")).toEqual([
      { type: "quote", content: [text("one\nstill one")] },
      { type: "quote", content: [text("two")] },
    ]);
  });

  it("reads a table, with escaped pipes inside cells", () => {
    expect(blocks("| a | b |\n| --- | --- |\n| c \\| d | **e** |")).toEqual([
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: [[text("a")], [text("b")]] }, { cells: [[text("c | d")], [text("e", { bold: true })]] }],
        },
      },
    ]);
  });

  it("reads a picture on its own line, with the italic line under it as caption", () => {
    expect(blocks("![the map](../assets/x.png)\n*Where it all happened*\n\n![[x.png|300]]")).toEqual([
      { type: "image", props: { url: "anamnesis-asset:x.png", alt: "the map", caption: "Where it all happened" } },
      { type: "image", props: { url: "anamnesis-asset:x.png", previewWidth: 300 } },
    ]);
  });

  it("keeps a web picture's address as it is", () => {
    expect(blocks("![](https://a.b/c.png)")).toEqual([{ type: "image", props: { url: "https://a.b/c.png" } }]);
  });

  it("keeps the caption and counts the picture when the file is not there", () => {
    const context = ctx();
    expect(blocks("![gone](nowhere.png)\n*It was here*", context)).toEqual([{ type: "paragraph", content: [text("It was here")] }]);
    expect(context.tally.get(PICTURE_MISSING)).toBe(1);
  });

  it("does not mistake a `## ` inside a code fence for anything", () => {
    expect(blocks("```\n## fake\n```")).toEqual([{ type: "codeBlock", props: { language: "text" }, content: [text("## fake")] }]);
  });
});
