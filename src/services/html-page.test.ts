import { describe, expect, it } from "vitest";
import { createNode, type Block, type Node, type Tab } from "../constants/schema";
import { createLossyTally, lossyCount } from "./export-walk";
import { BLOCK_FLATTENED, HIDDEN_TAB_KEPT, SECRET_KEPT, blocksToHtml, inlineToHtml, pageToHtml, panelBlockToHtml, slugify, type HtmlPageContext } from "./html-page";

function ctx(overrides: Partial<HtmlPageContext> = {}): HtmlPageContext {
  return {
    hrefFor: () => null,
    nameFor: () => null,
    pictureAt: () => null,
    rowsFor: () => [],
    databaseFor: () => null,
    renderIcon: (_icon, className) => `<svg class="${className}"></svg>`,
    childrenOf: () => [],
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

const state = () => ({ anchors: new Set<string>(), headings: [] });

describe("inlineToHtml", () => {
  it("wraps each style in its tag and escapes what would otherwise be markup", () => {
    expect(inlineToHtml([text("bold", { bold: true })], ctx())).toBe("<strong>bold</strong>");
    expect(inlineToHtml([text("a<b & \"c\"")], ctx())).toBe("a&lt;b &amp; &quot;c&quot;");
    expect(inlineToHtml([text("x", { code: true, italic: true })], ctx())).toBe("<em><code>x</code></em>");
  });

  it("links a mention to the page when it is on the site, and leaves the words when it is not", () => {
    const on = ctx({ hrefFor: (id) => (id === "kaine" ? "../Kaine.html" : null) });
    expect(inlineToHtml([{ type: "mention", props: { nodeId: "kaine", text: "she", label: "Kaine" } }], on)).toBe('<a class="ref" href="../Kaine.html">she</a>');
    expect(inlineToHtml([{ type: "mention", props: { nodeId: "hidden", label: "Secret Twin" } }], on)).toBe('<span class="ref ref-gone">Secret Twin</span>');
  });

  it("opens an outside link in a new tab", () => {
    expect(inlineToHtml([{ type: "link", href: "https://example.com", content: [text("there")] }], ctx())).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener">there</a>',
    );
  });

  it("draws a glyph in the writing as inline SVG and an emoji as itself", () => {
    expect(inlineToHtml([{ type: "icon", props: { icon: "sword" } }], ctx())).toContain("<svg");
    expect(inlineToHtml([{ type: "icon", props: { icon: "🗡️" } }], ctx())).toBe('<span class="icon">🗡️</span>');
  });
});

describe("blocksToHtml", () => {
  it("gathers consecutive list items into one list and nests children", () => {
    const html = blocksToHtml(
      [
        { type: "numberedListItem", content: [text("one")], children: [{ type: "bulletListItem", content: [text("inner")], children: [] }] },
        { type: "numberedListItem", content: [text("two")], children: [] },
        { type: "checkListItem", props: { checked: true }, content: [text("done")], children: [] },
      ],
      ctx(),
      page(),
      state(),
    );
    expect(html).toBe('<ol><li>one<ul><li>inner</li></ul></li><li>two</li></ol><ul><li class="check"><input type="checkbox" disabled checked> done</li></ul>');
  });

  it("gives headings anchors, unique within the page, and lists them in a contents block", () => {
    const html = blocksToHtml(
      [
        { type: "heading", props: { level: 2 }, content: [text("History")], children: [] },
        { type: "heading", props: { level: 2 }, content: [text("History")], children: [] },
        { type: "pageContents", props: {}, content: undefined, children: [] },
      ],
      ctx(),
      page(),
      state(),
    );
    expect(html).toContain('<h2 id="history">History</h2><h2 id="history-2">History</h2>');
    expect(html).toContain('<nav class="contents"><ul><li class="toc-2"><a href="#history">History</a></li><li class="toc-2"><a href="#history-2">History</a></li></ul></nav>');
  });

  it("leaves a Secret callout out entirely and counts it", () => {
    const tally = createLossyTally();
    const html = blocksToHtml([{ type: "calloutSecret", props: {}, content: [text("the twist")], children: [] }, para(text("after"))], ctx({ tally }), page(), state());
    expect(html).toBe("<p>after</p>");
    expect(lossyCount(tally, SECRET_KEPT)).toBe(1);
  });

  it("draws an Info callout with its colour and icon", () => {
    const html = blocksToHtml([{ type: "calloutInfo", props: { color: "rose", icon: "flame" }, content: [text("hot")], children: [] }], ctx(), page(), state());
    expect(html).toContain('class="callout callout-info callout-colored" style="--callout-accent:#fda4af"');
    expect(html).toContain("<svg");
    expect(html).toContain('<div class="callout-body"><p>hot</p></div>');
  });

  it("turns columns into columns and a toggle into a details element", () => {
    const html = blocksToHtml(
      [
        { type: "pageColumns", props: { widths: "2,1" }, children: [{ type: "pageColumn", children: [para(text("left"))] }, { type: "pageColumn", children: [para(text("right"))] }] },
        { type: "toggleListItem", content: [text("More")], children: [para(text("inside"))] },
      ],
      ctx(),
      page(),
      state(),
    );
    expect(html).toBe('<div class="columns"><div class="column" style="flex:2 1 0"><p>left</p></div><div class="column" style="flex:1 1 0"><p>right</p></div></div><details><summary>More</summary><p>inside</p></details>');
  });

  it("points a picture at the copy the site carries, and keeps the caption when it cannot", () => {
    const carried = ctx({ pictureAt: (url) => (url === "asset://a.png" ? "../assets/a.png" : null) });
    expect(blocksToHtml([{ type: "image", props: { url: "asset://a.png", caption: "Her" }, children: [] }], carried, page(), state())).toBe(
      '<figure><img src="../assets/a.png" alt="Her" loading="lazy"><figcaption>Her</figcaption></figure>',
    );
    expect(blocksToHtml([{ type: "image", props: { url: "asset://gone.png", caption: "Her" }, children: [] }], ctx(), page(), state())).toBe('<p class="caption">Her</p>');
  });

  it("draws a block placed in the writing where it was placed", () => {
    const meter: Block = { id: "m", kind: "meter", title: "Health", meter: "bar", meters: [{ id: "e", label: "HP", value: 30, max: 100 }] };
    const html = blocksToHtml([{ type: "blockRef", props: { blockId: "m" }, children: [] }], ctx(), page({ blocks: [meter] }), state());
    expect(html).toContain('<div class="inline-block">');
    expect(html).toContain('style="width:30%"');
  });
});

describe("panelBlockToHtml", () => {
  it("prints a property with its label and a select as a coloured chip", () => {
    const node = page({
      templateKey: "blank",
      customProperties: [{ key: "status", label: "Status", type: "select", options: [{ id: "o1", label: "Alive", color: "sage" }] }],
      properties: { status: "o1" },
    });
    const html = panelBlockToHtml({ id: "p", kind: "property", propertyKey: "status" }, node, ctx());
    expect(html).toBe('<div class="block block-property"><dt>Status</dt><dd><span class="chip" style="--chip:#86efac">Alive</span></dd></div>');
  });

  it("links a reference field to the page it names", () => {
    const node = page({ templateKey: "blank", customProperties: [{ key: "friends", label: "Friends", type: "refs" }], properties: { friends: ["k2"] } });
    const html = panelBlockToHtml({ id: "p", kind: "property", propertyKey: "friends" }, node, ctx({ nameFor: () => "Sampo", hrefFor: () => "Sampo.html" }));
    expect(html).toContain('<a class="ref" href="Sampo.html">Sampo</a>');
  });

  it("draws a rating as pips and a round meter as a bar, counting the round one", () => {
    const tally = createLossyTally();
    const rating = panelBlockToHtml({ id: "r", kind: "meter", meter: "rating", meters: [{ id: "e", value: 2, max: 4 }] }, page(), ctx({ tally }));
    expect(rating).toContain('<span class="pip pip-on">★</span><span class="pip pip-on">★</span><span class="pip">☆</span><span class="pip">☆</span>');
    expect(lossyCount(tally, BLOCK_FLATTENED)).toBe(0);

    const ring = panelBlockToHtml({ id: "c", kind: "meter", meter: "circle", meters: [{ id: "e", value: 50, max: 100 }] }, page(), ctx({ tally }));
    expect(ring).toContain("meter-fill");
    expect(lossyCount(tally, BLOCK_FLATTENED)).toBe(1);
  });

  it("lists a collection's pages as links", () => {
    const other = page({ id: "k2", name: "Sampo" });
    const html = panelBlockToHtml({ id: "c", kind: "collection", source: "subpages", title: "Inside" }, page(), ctx({ rowsFor: () => [other], hrefFor: () => "Sampo.html" }));
    expect(html).toContain('<h3 class="block-title">Inside</h3>');
    expect(html).toContain('href="Sampo.html"');
    expect(html).toContain("Sampo</a></li>");
  });
});

describe("pageToHtml", () => {
  it("makes a tab strip only when there is more than one visible tab, and leaves a hidden one out", () => {
    const tally = createLossyTally();
    const one = pageToHtml(page({ tabs: [tab("Main", [para(text("hi"))])] }), ctx({ tally }));
    expect(one.article).not.toContain("tab-strip");
    expect(one.article).toContain('<section class="tab is-active" id="tab-1" data-tab-label="Main"><p>hi</p></section>');

    const two = pageToHtml(page({ tabs: [tab("Main", [para(text("hi"))]), tab("History", [para(text("then"))]), tab("Private", [para(text("no"))], true)] }), ctx({ tally }));
    expect(two.article).toContain('<button type="button" class="tab-button is-active" data-tab="tab-1">Main</button><button type="button" class="tab-button" data-tab="tab-2">History</button>');
    expect(two.article).not.toContain("Private");
    expect(two.article).not.toContain(">no<");
    expect(lossyCount(tally, HIDDEN_TAB_KEPT)).toBe(1);
  });

  it("puts the page's blocks in a side panel, skipping any the writing already draws", () => {
    const blocks: Block[] = [
      { id: "t", kind: "text", title: "Note", text: "panel" },
      { id: "m", kind: "meter", meter: "bar", meters: [{ id: "e", value: 1, max: 2 }] },
    ];
    const html = pageToHtml(page({ blocks, tabs: [tab("Main", [{ type: "blockRef", props: { blockId: "m" }, children: [] }])] }), ctx()).article;
    expect(html).toContain('<aside class="page-panel">');
    expect(html).toContain("panel");
    // The meter appears once, in the writing, and not again in the panel.
    expect(html.match(/meter-fill/g)).toHaveLength(1);
  });

  it("draws a page shown as a database as a table above the writing", () => {
    const node = page({ view: { layout: "cards" }, tabs: [tab("Main", [para(text("under"))])] });
    const tally = createLossyTally();
    const html = pageToHtml(
      node,
      ctx({ tally, databaseFor: () => ({ columns: ["Status"], rows: [{ id: "k2", name: "Sampo", cells: [{ kind: "text", text: "Alive" }] }] }), hrefFor: () => "Sampo.html" }),
    ).article;
    expect(html.indexOf("<table>")).toBeLessThan(html.indexOf("under"));
    expect(html).toContain("<th>Name</th><th>Status</th>");
    expect(html).toContain('<td><a class="ref" href="Sampo.html">Sampo</a></td><td>Alive</td>');
    expect(lossyCount(tally, BLOCK_FLATTENED)).toBe(1);
  });

  it("indexes the words of the visible tabs and never a Secret's", () => {
    const html = pageToHtml(
      page({ tabs: [tab("Main", [para(text("public words")), { type: "calloutSecret", props: {}, content: [text("twist")], children: [] }]), tab("Private", [para(text("unseen"))], true)] }),
      ctx(),
    );
    expect(html.text).toBe("public words");
  });

  it("lists a folder's pages in its body, the way the app shows a folder", () => {
    const inside = page({ id: "k2", name: "Sampo" });
    const html = pageToHtml(page({ templateKey: "folder" }), ctx({ childrenOf: () => [inside], hrefFor: () => "Folder/Sampo.html" })).article;
    expect(html).toContain('<ul class="page-list"><li><a class="ref" href="Folder/Sampo.html">');
    // An ordinary page holds pages through the tree, not through its body.
    expect(pageToHtml(page(), ctx({ childrenOf: () => [inside] })).article).not.toContain("page-list");
  });

  it("escapes the page's own name in the title and the header", () => {
    const html = pageToHtml(page({ name: "Sword & <Shield>" }), ctx()).article;
    expect(html).toContain('<h1 class="page-title">Sword &amp; &lt;Shield&gt;</h1>');
  });
});

describe("slugify", () => {
  it("keeps letters from any alphabet and joins words with dashes", () => {
    expect(slugify("Her Sword & Shield")).toBe("her-sword-shield");
    expect(slugify("Ærø — Ørsted")).toBe("ærø-ørsted");
    expect(slugify("!!!")).toBe("section");
  });
});
