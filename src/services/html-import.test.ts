// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { htmlToMarkdown, inputWithHtmlAsNotes } from "./html-import";
import { planMarkdownImport, type MarkdownImportInput } from "./markdown-import";

const page = (body: string, title = "") => `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`;
const md = (html: string, path = "Page.html", notes: Record<string, string> = {}) =>
  htmlToMarkdown(html, { path, noteFor: (target) => notes[target] ?? null });

function listing(pages: Record<string, string>, other: string[] = []): MarkdownImportInput {
  const html = new Map(Object.entries(pages));
  return inputWithHtmlAsNotes({ name: "Site", files: [...html.keys(), ...other], texts: new Map(), readBytes: async () => new Uint8Array() }, html);
}

describe("htmlToMarkdown — one page", () => {
  it("takes the title from the first heading and doesn't say it twice", () => {
    const out = md(page("<h1>Kaine</h1><p>She keeps the bell.</p>", "Kaine — Site"));
    expect(out).toContain('title: "Kaine"');
    expect(out).not.toContain("# Kaine");
    expect(out).toContain("She keeps the bell.");
  });

  it("falls back to <title> when there is no heading", () => {
    expect(md(page("<p>Words</p>", "The Title"))).toContain('title: "The Title"');
  });

  it("writes the marks markdown has", () => {
    const out = md(page("<p><b>bold</b> <em>slanted</em> <s>gone</s> <u>under</u> <code>x = 1</code></p>"));
    expect(out).toContain("**bold** *slanted* ~~gone~~ <u>under</u> `x = 1`");
  });

  it("keeps spaces outside a mark, where the sentence needs them", () => {
    expect(md(page("<p>a<strong> b </strong>c</p>"))).toContain("a **b** c");
  });

  it("escapes what would otherwise turn into formatting", () => {
    const out = md(page("<p>*TEN SECONDS,* said &lt;Vale&gt; # not a heading</p>"));
    expect(out).toContain("\\*TEN SECONDS,\\* said \\<Vale\\> \\# not a heading");
  });

  it("guards a paragraph that starts like a list", () => {
    expect(md(page("<p>1. not a list</p><p>- nor this</p>"))).toMatch(/1\\\. not a list[\s\S]*\\- nor this/);
  });

  it("keeps a line break inside a paragraph", () => {
    expect(md(page("<p>one<br>two</p>"))).toContain("one\ntwo");
  });

  it("writes headings, lists, tasks and nesting", () => {
    const out = md(
      page(`<h2>Ties</h2><ul><li>Friends<ul><li>Vale</li></ul></li><li><input type="checkbox" checked> done</li></ul><ol start="3"><li>three</li><li>four</li></ol>`),
    );
    expect(out).toContain("## Ties");
    expect(out).toContain("- Friends\n    - Vale");
    expect(out).toContain("- [x] done");
    expect(out).toContain("3. three\n4. four");
  });

  it("writes tables, quotes, code and rules", () => {
    const out = md(
      page(`<table><tr><th>Name</th><th>Rank</th></tr><tr><td>Kaine</td><td>2</td></tr></table><blockquote><p>Said once.</p></blockquote><pre><code class="language-js">let a = 1;</code></pre><hr>`),
    );
    expect(out).toContain("| Name | Rank |\n| --- | --- |\n| Kaine | 2 |");
    expect(out).toContain("> Said once.");
    expect(out).toContain("```js\nlet a = 1;\n```");
    expect(out).toContain("---");
  });

  it("turns a details box into a collapsed section", () => {
    expect(md(page("<details><summary>Spoilers</summary><p>She lives.</p></details>"))).toContain("> [!note]- Spoilers\n> She lives.");
  });

  it("leaves the browser's furniture behind", () => {
    const out = md(page("<nav><a href='x.html'>Menu</a></nav><script>alert(1)</script><style>p{}</style><p>Kept</p><button>Click</button>"));
    expect(out).not.toMatch(/Menu|alert|p\{\}|Click/);
    expect(out).toContain("Kept");
  });

  it("links a page in the listing by its note, and keeps the words of one that isn't", () => {
    const out = md(page(`<p><a href="People/Vale%20Ro.html#top">Vale</a> and <a href="gone.html">gone</a> and <a href="https://example.com/a b">web</a></p>`), "Page.html", {
      "People/Vale Ro.html": "People/Vale Ro",
    });
    expect(out).toContain("[[People/Vale Ro|Vale]]");
    expect(out).toContain(" and gone and ");
    expect(out).toContain("[web](https://example.com/a%20b)");
  });

  it("points a picture at its place in the listing, from wherever the page sits", () => {
    const out = md(page(`<figure><img src="../assets/bell%20one.png" alt="x"><figcaption>The bell</figcaption></figure>`), "People/Kaine.html");
    expect(out).toContain("![The bell](assets/bell%20one.png)");
  });
});

describe("inputWithHtmlAsNotes — a listing", () => {
  it("files a folder's index.html as the note beside the folder", () => {
    const input = listing({ "Kaine/index.html": page("<h1>Kaine</h1>"), "Kaine/Sword.html": page("<h1>Sword</h1>") });
    expect(input.files.sort()).toEqual(["Kaine.md", "Kaine/Sword.md"]);
    const plan = planMarkdownImport(input);
    expect(plan.preview.map((node) => node.name)).toEqual(["Kaine"]);
    expect(plan.preview[0].children.map((node) => node.name)).toEqual(["Sword"]);
  });

  it("links pages to each other through the markdown importer", () => {
    const plan = planMarkdownImport(
      listing({
        "a.html": page(`<h1>Alpha</h1><p>See <a href="sub/index.html">Beta</a>.</p>`),
        "sub/index.html": page("<h1>Beta</h1>"),
      }),
    );
    const alpha = plan.nodes.find((node) => node.name === "Alpha")!;
    const beta = plan.nodes.find((node) => node.name === "Beta")!;
    expect(JSON.stringify(alpha.tabs)).toContain(beta.id);
    expect(plan.lossyNotes.join(" ")).not.toMatch(/pointed at a page/);
  });

  it("keeps a plain site's front page as a page", () => {
    expect(listing({ "index.html": page("<h1>Home</h1>"), "a.html": page("<h1>A</h1>") }).files.sort()).toEqual(["a.md", "index.md"]);
  });
});

describe("our own website, read back", () => {
  const sitePage = (inner: string) =>
    page(`<nav class="sidebar"><a href="index.html">Home</a></nav><main>${inner}</main><script src="site.js"></script>`);
  const article = sitePage(`<article class="page has-panel">
    <header class="page-head"><div class="page-head-text"><h1 class="page-title">Kaine Ro</h1><span class="page-kind">Character</span></div></header>
    <div class="page-columns"><div class="page-body">
      <nav class="tab-strip"><button>Who They Are</button><button>Ties</button></nav>
      <section class="tab is-active" data-tab-label="Who They Are"><h2 class="tab-heading">Who They Are</h2><h2>Appearance</h2><p>Tall.</p>
        <aside class="callout callout-info"><div class="callout-body"><p>Watch her hands.</p></div></aside></section>
      <section class="tab" data-tab-label="Ties"><h2 class="tab-heading">Ties</h2><p>Vale.</p></section>
    </div>
    <aside class="page-panel"><dl>
      <div class="block block-property"><dt>Age</dt><dd>31</dd></div>
      <section class="block block-image"><img src="../assets/k.png"></section>
      <section class="block block-text"><h3 class="block-title">Notes</h3><p>Aside.</p></section>
    </dl></aside></div></article>`);

  it("brings the tabs, fields, portrait and callouts back", () => {
    const input = listing({ "People/Kaine Ro.html": article, "index.html": sitePage("<article class='page'></article>") }, ["site.css", "search-index.js", "assets/k.png"]);
    // The root index.html repeats the home page, so it is left behind.
    expect(input.files).not.toContain("index.md");
    const text = input.texts.get("People/Kaine Ro.md")!;
    expect(text).toContain('title: "Kaine Ro"');
    expect(text).toContain('template: "Character"');
    expect(text).toContain('Age: "31"');
    expect(text).toContain('image: "assets/k.png"');
    expect(text).toContain('tabs:\n  - "Who They Are"\n  - "Ties"');
    expect(text).toContain("## Who They Are\n\n### Appearance");
    expect(text).toContain("> [!info]\n> Watch her hands.");
    expect(text).not.toContain("Home");

    const plan = planMarkdownImport(input);
    const kaine = plan.nodes.find((node) => node.name === "Kaine Ro")!;
    expect(kaine.templateKey).toBe("character");
    expect(kaine.tabs.map((tab) => tab.label)).toEqual(["Who They Are", "Ties"]);
    expect(kaine.image).toBeTruthy();
  });
});
