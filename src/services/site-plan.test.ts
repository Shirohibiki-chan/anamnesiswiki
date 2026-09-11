import { describe, expect, it } from "vitest";
import { createNode, UNIVERSE_TEMPLATE_KEY, type Node, type Tab } from "../constants/schema";
import { planSite, relativeUrl, SITE_ASSETS_DIR, SITE_FONTS_DIR, siteScript, siteStylesheet, type SiteTheme } from "./site-plan";

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

const bare: SiteTheme = { tokens: { "--color-bg": "rgb(1, 2, 3)", "--font-ui": '"Inter", sans-serif' }, fonts: [] };

function plan(nodes: Node[], shape: Record<string, string[]>, extra: { rootIds?: string[]; theme?: SiteTheme; homeNodeId?: string | null } = {}) {
  return planSite({
    nodes,
    rootIds: extra.rootIds ?? shape.root,
    orderedIdsFor: ordering(shape),
    rowsFor: () => [],
    databaseFor: () => null,
    renderIcon: (_icon, className) => `<svg class="${className}"></svg>`,
    projectName: "Valeraverse",
    homeNodeId: extra.homeNodeId ?? null,
    theme: extra.theme ?? bare,
  });
}

function file(site: ReturnType<typeof plan>, path: string): string {
  const found = site.files.find((entry) => entry.path === path);
  if (!found) throw new Error(`no ${path} in ${site.files.map((entry) => entry.path).join(", ")}`);
  return found.text;
}

describe("relativeUrl", () => {
  it("climbs out of the page's folder and back down, encoding each segment", () => {
    expect(relativeUrl("Canon/Kaine", "Canon/Sampo & Co.html")).toBe("../Sampo%20%26%20Co.html");
    expect(relativeUrl("", "Canon/index.html")).toBe("Canon/index.html");
    expect(relativeUrl("A/B", "site.css")).toBe("../../site.css");
  });
});

describe("planSite", () => {
  it("gives a page with pages under it a folder with an index, and a page with none a file", () => {
    const site = plan([node("k", "Kaine", null), node("s", "Her Sword", "k"), node("n", "Note", null)], { root: ["k", "n"], k: ["s"] });
    expect(site.files.map((entry) => entry.path)).toEqual(expect.arrayContaining(["Kaine/index.html", "Kaine/Her Sword.html", "Note.html"]));
    expect(site.pageCount).toBe(3);
  });

  it("leaves a hidden page and everything under it off the site, and says so", () => {
    const site = plan([node("k", "Kaine", null), node("p", "Private", null, { hidden: true }), node("c", "Child of private", "p")], {
      root: ["k", "p"],
      p: ["c"],
    });
    expect(site.files.map((entry) => entry.path)).not.toContain("Private/index.html");
    expect(site.files.some((entry) => entry.text.includes("Child of private"))).toBe(false);
    expect(site.pageCount).toBe(1);
    expect(site.hiddenCount).toBe(1);
    expect(site.notes.join("\n")).toContain("1 hidden page stays off the site");
  });

  it("writes a mention of a hidden page as words rather than a link", () => {
    const site = plan(
      [node("k", "Kaine", null, { tabs: [tab([para({ type: "mention", props: { nodeId: "p", label: "Private" } })])] }), node("p", "Private", null, { hidden: true })],
      { root: ["k", "p"] },
    );
    expect(file(site, "Kaine.html")).toContain('<span class="ref ref-gone">Private</span>');
  });

  it("links pages to each other relative to where each sits", () => {
    const site = plan(
      [node("k", "Kaine", null), node("s", "Her Sword", "k", { tabs: [tab([para({ type: "mention", props: { nodeId: "n", label: "Note" } })])] }), node("n", "Note", null)],
      { root: ["k", "n"], k: ["s"] },
    );
    expect(file(site, "Kaine/Her Sword.html")).toContain('href="../Note.html"');
  });

  it("puts the whole tree in every page's sidebar, marking the current page and opening its branch", () => {
    const site = plan([node("k", "Kaine", null), node("s", "Her Sword", "k"), node("n", "Note", null)], { root: ["k", "n"], k: ["s"] });
    const sword = file(site, "Kaine/Her Sword.html");
    expect(sword).toContain('<a href="Her%20Sword.html" aria-current="page">');
    expect(sword).toContain("<details open>");
    expect(sword).toContain('<a href="../Note.html">');
    const note = file(site, "Note.html");
    expect(note).toContain("<details>");
    expect(note).toContain('<a href="Note.html" aria-current="page">');
  });

  it("makes a universe a section of the sidebar and a folder with a listing", () => {
    const site = plan([node("u", "Canon", null, { templateKey: UNIVERSE_TEMPLATE_KEY }), node("k", "Kaine", "u")], { root: ["u"], u: ["k"] });
    expect(site.files.map((entry) => entry.path)).toEqual(expect.arrayContaining(["Canon/index.html", "Canon/Kaine.html"]));
    expect(file(site, "Canon/Kaine.html")).toContain('<li class="universe"><details open>');
    expect(file(site, "Canon/index.html")).toContain('<a class="ref" href="Kaine.html">');
    expect(site.pageCount).toBe(1);
  });

  it("writes the home page at the front door as well as at its own address", () => {
    const site = plan([node("k", "Kaine", null), node("n", "Note", null)], { root: ["k", "n"] }, { homeNodeId: "n" });
    expect(file(site, "index.html")).toContain('<a href="Note.html" aria-current="page">');
    expect(file(site, "index.html")).toContain('<h1 class="page-title">Note</h1>');
    expect(file(site, "Note.html")).toContain('<h1 class="page-title">Note</h1>');
  });

  it("falls back to the first page when no home is set, and counts a secret once", () => {
    const site = plan(
      [node("k", "Kaine", null, { tabs: [tab([{ type: "calloutSecret", props: {}, content: [{ type: "text", text: "twist", styles: {} }], children: [] }])] })],
      { root: ["k"] },
    );
    expect(file(site, "index.html")).toContain('<h1 class="page-title">Kaine</h1>');
    expect(site.notes.join("\n")).toContain("1 Secret callout is left out");
  });

  it("collects each picture once, points every page at the copy, and leaves web addresses alone", () => {
    const site = plan(
      [
        node("k", "Kaine", null, { image: "portrait.png", blocks: [{ id: "i", kind: "image" }], tabs: [tab([{ type: "image", props: { url: "asset://portrait.png" }, children: [] }])] }),
        node("s", "Sword", "k", { tabs: [tab([{ type: "image", props: { url: "https://example.com/a.png" }, children: [] }])] }),
      ],
      { root: ["k"], k: ["s"] },
    );
    expect(site.assets).toEqual([{ fileName: "portrait.png", path: `${SITE_ASSETS_DIR}/portrait.png` }]);
    expect(file(site, "Kaine/index.html")).toContain('src="../assets/portrait.png"');
    expect(file(site, "Kaine/Sword.html")).toContain('src="https://example.com/a.png"');
    expect(site.folders).toContain(SITE_ASSETS_DIR);
  });

  it("indexes every page's words for the search box, with its place in the tree", () => {
    const site = plan([node("k", "Kaine", null, { tags: ["hero"] }), node("s", "Her Sword", "k", { tabs: [tab([para({ type: "text", text: "sharp", styles: {} })])] })], { root: ["k"], k: ["s"] });
    const index = JSON.parse(file(site, "search-index.js").replace(/^window\.ANAMNESIS_INDEX = /, "").replace(/;$/, ""));
    expect(index).toEqual([
      { t: "Kaine", u: "Kaine/index.html", p: "", x: "", a: [], g: ["hero"] },
      { t: "Her Sword", u: "Kaine/Her%20Sword.html", p: "Kaine", x: "sharp", a: [], g: [] },
    ]);
  });

  it("reaches the stylesheet and scripts from however deep a page sits", () => {
    const site = plan([node("k", "Kaine", null), node("s", "Sword", "k"), node("h", "Hilt", "s")], { root: ["k"], k: ["s"], s: ["h"] });
    const hilt = file(site, "Kaine/Sword/Hilt.html");
    expect(hilt).toContain('href="../../site.css"');
    expect(hilt).toContain('src="../../site.js" data-root="../../"');
    expect(file(site, "Kaine/index.html")).toContain('href="../site.css"');
    expect(file(site, "index.html")).toContain('href="site.css"');
  });

  it("carries the theme's fonts as files and declares them in the stylesheet", () => {
    const theme: SiteTheme = { ...bare, fonts: [{ family: "Inter", style: "normal", weight: "400", fileName: "inter-400.woff2", bytes: new Uint8Array([1, 2]) }] };
    const site = plan([node("k", "Kaine", null)], { root: ["k"] }, { theme });
    expect(site.binaries).toEqual([{ path: `${SITE_FONTS_DIR}/inter-400.woff2`, bytes: new Uint8Array([1, 2]) }]);
    expect(file(site, "site.css")).toContain('@font-face { font-family: "Inter"; font-style: normal; font-weight: 400; font-display: swap; src: url("fonts/inter-400.woff2") format("woff2"); }');
    expect(site.notes.join("\n")).toContain("1 font file comes along");
  });

  it("numbers two siblings that would land on the same file, and never uses index for a page", () => {
    const site = plan([node("a", "Sampo", null), node("b", "Sampo", null), node("i", "index", null)], { root: ["a", "b", "i"] });
    expect(site.files.map((entry) => entry.path)).toEqual(expect.arrayContaining(["Sampo.html", "Sampo (2).html", "index (2).html"]));
  });
});

describe("the stylesheet and the script", () => {
  it("writes the theme's values into :root ahead of the rules that use them", () => {
    const css = siteStylesheet(bare);
    expect(css.indexOf("--color-bg: rgb(1, 2, 3);")).toBeLessThan(css.indexOf("body {"));
    expect(css).toContain('--font-ui: "Inter", sans-serif;');
  });

  it("bundles Fuse ahead of the site's own code as a global", () => {
    const js = siteScript();
    expect(js).toContain("window.Fuse = ");
    expect(js).toContain("root.classList.add(\"js\")");
    expect(js).not.toMatch(/export\s*\{/);
    // Runs as a plain script and leaves a working Fuse behind.
    const scope = {
      window: { addEventListener() {} } as Record<string, unknown>,
      document: { documentElement: { classList: { add() {} } }, currentScript: null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {} },
    };
    new Function("window", "document", "history", "location", js)(scope.window, scope.document, {}, { hash: "" });
    const Fuse = scope.window.Fuse as new (list: unknown[], options: unknown) => { search: (q: string) => { item: unknown }[] };
    expect(new Fuse([{ t: "Kaine" }], { keys: ["t"] }).search("kain")[0]?.item).toEqual({ t: "Kaine" });
  });
});
