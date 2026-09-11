// A world planned out as a website (Phase 1.5).
//
// **Planned, not written.** Like `markdown-vault.ts`, nothing here touches the
// disk: it decides which file every page becomes, what each link has to say
// to reach it, which pictures and fonts travel, and hands that back as a plan
// the caller writes with `writeFileTree`. Every rule below is arguable in a
// test rather than only in a real export.
//
// **Hidden means not published.** A hidden page and everything under it is
// left out before the walk begins — filtering the roots is not enough, since a
// page can be hidden anywhere in the tree — and a link to a hidden page is
// written as plain text. The count of what stayed behind is in the notes, so
// the modal can say so before anything is uploaded. Hidden tabs and Secret
// callouts are `html-page.ts`'s half of the same rule.
//
// **One `.html` per page, in folders that mirror the tree.** A page holding
// pages becomes `Kaine/index.html` beside its children; a page holding none
// becomes `Kaine.html`. Readable addresses, and a host serves them with no
// configuration — every free static host (GitHub Pages, Netlify, Cloudflare
// Pages) takes a folder like this as-is.
//
// **The site works opened from a folder as well as hosted.** Every address is
// relative, the search index is a script rather than a fetched file, and the
// stylesheet is plain CSS — so double-clicking `index.html` is a fair preview
// of what the reader will get, which is how she checks it before uploading.
import fuseSource from "fuse.js/min-basic?raw";
import type { LucideIcon } from "lucide-react";
import { UNIVERSE_TEMPLATE_KEY, type Block, type Node } from "../constants/schema";
import { SITE_SCRIPT } from "../constants/site-script";
import { SITE_STYLE } from "../constants/site-style";
import { assetFileName } from "./asset-urls";
import { createLossyTally, lossyCount, plural, walkPages, type LossyTally, type WalkedPage } from "./export-walk";
import { sanitizeSegment } from "./filesystem-service";
import { BLOCK_FLATTENED, escapeHtml, HIDDEN_TAB_KEPT, pageIconHtml, pageListHtml, pageToHtml, SECRET_KEPT, type DatabaseTable, type HtmlPageContext } from "./html-page";
import { isHiddenByAncestor } from "./tree-service";

/** Where the copied pictures and the fonts go, at the root of the site. */
export const SITE_ASSETS_DIR = "assets";
export const SITE_FONTS_DIR = "fonts";

export type SiteFile = {
  /** Site-relative, always with `/` separators — the writer joins for the OS. */
  path: string;
  text: string;
};

export type SiteBinary = {
  path: string;
  bytes: Uint8Array;
};

export type SiteAsset = {
  /** The filename inside the project's own `assets/`. */
  fileName: string;
  /** Site-relative destination. */
  path: string;
};

/** One typeface file the site carries, so the page reads in the app's own type. */
export type SiteFont = {
  family: string;
  style: string;
  weight: string;
  fileName: string;
  bytes: Uint8Array;
};

/** What the running theme looks like, read by `site-theme.ts`. */
export type SiteTheme = {
  /** Token → resolved value, for every token in `site-style.ts`'s lists. */
  tokens: Record<string, string>;
  fonts: SiteFont[];
};

export type SitePlan = {
  files: SiteFile[];
  binaries: SiteBinary[];
  /** Every folder the writer has to make, parents before children. */
  folders: string[];
  assets: SiteAsset[];
  pageCount: number;
  /** Pages marked hidden, each counted once; what sits under them is not. */
  hiddenCount: number;
  /** Plain-language notes about anything that changed on the way out. */
  notes: string[];
};

type Placed = {
  page: WalkedPage;
  /** The page's own file, site-relative. */
  path: string;
  /** The folder the page's file sits in. "" at the top. */
  dir: string;
  /** Site-relative folder for this page's children, or null when it has none. */
  folder: string | null;
};

function isUniverse(node: Node): boolean {
  return node.templateKey === UNIVERSE_TEMPLATE_KEY;
}

function uniqueIn(taken: Set<string>, base: string): string {
  if (!taken.has(base.toLowerCase())) {
    taken.add(base.toLowerCase());
    return base;
  }
  for (let n = 2; ; n += 1) {
    const candidate = `${base} (${n})`;
    if (!taken.has(candidate.toLowerCase())) {
      taken.add(candidate.toLowerCase());
      return candidate;
    }
  }
}

function joinSite(dir: string, name: string): string {
  return dir ? `${dir}/${name}` : name;
}

/**
 * Every page's file and folder, resolved together.
 *
 * `index.html` is reserved in every folder for the page that owns it, so a
 * child page called "index" gets ` (2)` the way a sibling collision would.
 */
function place(walked: WalkedPage[]): Map<string, Placed> {
  const placed = new Map<string, Placed>();
  const takenIn = new Map<string, Set<string>>();
  const hasChildren = new Set(walked.map((page) => page.parent?.id).filter((id): id is string => Boolean(id)));

  for (const page of walked) {
    const parent = page.parent ? placed.get(page.parent.id) : undefined;
    const dir = parent?.folder ?? "";
    const taken = takenIn.get(dir) ?? new Set<string>(["index"]);
    takenIn.set(dir, taken);

    const base = uniqueIn(taken, sanitizeSegment(page.node.name) || page.node.templateKey || "Page");
    // A universe is always a folder: it has no writing of its own, only pages.
    const holds = hasChildren.has(page.node.id) || isUniverse(page.node);
    const folder = holds ? joinSite(dir, base) : null;
    const path = holds ? `${folder}/index.html` : `${joinSite(dir, base)}.html`;
    placed.set(page.node.id, { page, path, dir, folder });
  }

  return placed;
}

/**
 * A relative address from one folder to a file, with each segment encoded so
 * a page called "Her Sword & Shield" links as a browser expects.
 */
export function relativeUrl(fromDir: string, target: string): string {
  const from = fromDir ? fromDir.split("/") : [];
  const to = target.split("/");
  let shared = 0;
  while (shared < from.length && shared < to.length - 1 && from[shared] === to[shared]) shared += 1;
  const up = Array(from.length - shared).fill("..");
  return [...up, ...to.slice(shared).map(encodeURIComponent)].join("/");
}

/** The folder a site-relative file sits in. "" at the top. */
function fileDir(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

/** `../` for each folder deep the page is, so the page can reach the site root. */
function toRoot(dir: string): string {
  return dir ? `${dir.split("/").map(() => "..").join("/")}/` : "";
}

function assetOf(url: unknown): string | null {
  if (typeof url !== "string" || !url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return null;
  return assetFileName(url) ?? (url.includes("/") || url.includes("\\") ? null : url);
}

// ---- The tree in the sidebar ----

type NavEntry = { node: Node; path: string; children: NavEntry[] };

function navTree(walked: WalkedPage[], placed: Map<string, Placed>): NavEntry[] {
  const byId = new Map<string, NavEntry>();
  const roots: NavEntry[] = [];
  for (const page of walked) {
    const entry: NavEntry = { node: page.node, path: placed.get(page.node.id)!.path, children: [] };
    byId.set(page.node.id, entry);
    const parent = page.parent ? byId.get(page.parent.id) : undefined;
    (parent ? parent.children : roots).push(entry);
  }
  return roots;
}

/**
 * The sidebar for one page: the whole tree, with the branch to the current
 * page open and the page itself marked.
 *
 * Rendered per page rather than once, because every link is relative to the
 * page it is on. A universe is a section rather than a page — the same shape
 * the app's own tree gives it.
 */
function navHtml(entries: NavEntry[], fromDir: string, currentId: string, ancestors: Set<string>, ctx: HtmlPageContext): string {
  const items = entries
    .map((entry) => {
      const href = relativeUrl(fromDir, entry.path);
      const current = entry.node.id === currentId ? ' aria-current="page"' : "";
      const icon = pageIconHtml(entry.node, "row-icon", ctx);
      const link = `<a href="${escapeHtml(href)}"${current}>${icon}${escapeHtml(entry.node.name)}</a>`;
      if (entry.children.length === 0) return `<li>${link}</li>`;
      const open = ancestors.has(entry.node.id) || entry.node.id === currentId || isUniverse(entry.node) ? " open" : "";
      const kind = isUniverse(entry.node) ? ' class="universe"' : "";
      return `<li${kind}><details${open}><summary>${link}</summary>${navHtml(entry.children, fromDir, currentId, ancestors, ctx)}</details></li>`;
    })
    .join("");
  return `<ul>${items}</ul>`;
}

// ---- The page shell ----

function shell(input: { title: string; siteName: string; fromDir: string; nav: string; article: string; homeHref: string }): string {
  const root = toRoot(input.fromDir);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title)}</title>
<link rel="stylesheet" href="${escapeHtml(`${root}site.css`)}">
</head>
<body>
<div class="site">
<button type="button" class="menu-toggle" aria-label="Menu">☰</button>
<nav class="sidebar" aria-label="Pages">
<a class="site-name" href="${escapeHtml(input.homeHref)}">${escapeHtml(input.siteName)}</a>
<div class="search"><input type="search" placeholder="Search…" aria-label="Search"><div class="search-results"></div></div>
<div class="tree">${input.nav}</div>
</nav>
<main>${input.article}</main>
</div>
<script src="${escapeHtml(`${root}search-index.js`)}"></script>
<script src="${escapeHtml(`${root}site.js`)}" data-root="${escapeHtml(root)}"></script>
</body>
</html>
`;
}

/** A universe's own page: its name and the pages inside it. */
function universeArticle(entry: NavEntry, ctx: HtmlPageContext): string {
  const listing = pageListHtml(
    entry.children.map((child) => child.node),
    ctx,
  );
  return `<article class="page"><header class="page-head">${pageIconHtml(entry.node, "page-icon", ctx)}<div class="page-head-text"><h1 class="page-title">${escapeHtml(entry.node.name)}</h1></div></header><div class="page-columns"><div class="page-body">${listing}</div></div></article>`;
}

// ---- The stylesheet, with the theme written in ----

function fontFaces(fonts: SiteFont[], fromRoot: string): string {
  return fonts
    .map(
      (font) =>
        `@font-face { font-family: ${JSON.stringify(font.family)}; font-style: ${font.style}; font-weight: ${font.weight}; font-display: swap; src: url(${JSON.stringify(`${fromRoot}${SITE_FONTS_DIR}/${font.fileName}`)}) format("woff2"); }`,
    )
    .join("\n");
}

export function siteStylesheet(theme: SiteTheme): string {
  const tokens = Object.entries(theme.tokens)
    .filter(([, value]) => value)
    .map(([token, value]) => `  ${token}: ${value};`)
    .join("\n");
  return `${fontFaces(theme.fonts, "")}\n:root {\n${tokens}\n}\n${SITE_STYLE}`;
}

/**
 * Fuse.js, bundled in front of the site's own script.
 *
 * The ES build is the one Vite hands over, and it ends in an `export`
 * statement a plain `<script>` cannot carry — so that one statement is
 * rewritten into an assignment to `window.Fuse`. If Fuse ever changes how it
 * ends, the test beside this file catches it before a site does: a site whose
 * search script throws on line one has no search at all.
 */
export function siteScript(): string {
  const exported = fuseSource.match(/export\s*\{\s*(\w+)\s+as\s+default\s*\}\s*;?\s*$/);
  if (!exported) throw new Error("Fuse.js no longer ends the way the publisher expects.");
  const fuse = fuseSource.slice(0, exported.index) + `window.Fuse = ${exported[1]};`;
  return `${fuse}\n${SITE_SCRIPT}`;
}

// ---- The notes ----

function describe(tally: LossyTally, hidden: number, assets: number, fonts: number): string[] {
  const notes: string[] = [];

  if (hidden) notes.push(`${plural(hidden, "hidden page")} ${hidden === 1 ? "stays" : "stay"} off the site, along with everything inside ${hidden === 1 ? "it" : "them"}.`);

  const secrets = lossyCount(tally, SECRET_KEPT);
  if (secrets) notes.push(`${plural(secrets, "Secret callout")} ${secrets === 1 ? "is" : "are"} left out.`);

  const tabs = lossyCount(tally, HIDDEN_TAB_KEPT);
  if (tabs) notes.push(`${plural(tabs, "hidden tab")} ${tabs === 1 ? "is" : "are"} left out.`);

  const flattened = lossyCount(tally, BLOCK_FLATTENED);
  if (flattened) {
    notes.push(`${plural(flattened, "thing")} ${flattened === 1 ? "is" : "are"} drawn more simply than here — a round meter becomes a bar, and a database in cards or a board becomes a table. Nothing is lost, it just doesn't move.`);
  }

  if (assets) notes.push(`${plural(assets, "picture")} will be copied into the site's ${SITE_ASSETS_DIR} folder.`);
  if (fonts) notes.push(`The site uses your theme's colours and typefaces — ${plural(fonts, "font file")} come${fonts === 1 ? "s" : ""} along so it reads the same everywhere.`);
  else notes.push("The site uses your theme's colours. Its typefaces couldn't be read from the app, so readers will see their browser's own.");

  return notes;
}

// ---- The whole site ----

export function planSite(input: {
  nodes: Node[];
  rootIds: string[];
  orderedIdsFor: (parentId: string | null) => string[];
  rowsFor: (node: Node, block: Block) => Node[];
  databaseFor: (node: Node) => DatabaseTable | null;
  renderIcon: (icon: LucideIcon, className: string) => string;
  projectName: string;
  homeNodeId: string | null | undefined;
  theme: SiteTheme;
}): SitePlan {
  // Hidden pages go before the walk, so their descendants are never reached.
  const byId: Record<string, Node> = Object.fromEntries(input.nodes.map((node) => [node.id, node]));
  const visible = input.nodes.filter((node) => !node.hidden && !isHiddenByAncestor(node.id, byId));
  const visibleIds = new Set(visible.map((node) => node.id));
  const walked = walkPages({ nodes: visible, rootIds: input.rootIds.filter((id) => visibleIds.has(id)), orderedIdsFor: input.orderedIdsFor });
  // The hidden pages among what was asked for — counted once each, at the
  // top of what they hide, since the note says "along with everything inside".
  const asked = walkPages({ nodes: input.nodes, rootIds: input.rootIds, orderedIdsFor: input.orderedIdsFor });
  const hiddenCount = asked.filter((page) => page.node.hidden && !isHiddenByAncestor(page.node.id, byId)).length;

  const placed = place(walked);
  const tree = navTree(walked, placed);
  const tally = createLossyTally();
  const assets = new Map<string, string>();
  const files: SiteFile[] = [];
  const folders: string[] = [];
  const searchIndex: { t: string; u: string; p: string; x: string; a: string[]; g: string[] }[] = [];

  const parentOf = new Map(walked.map((page) => [page.node.id, page.parent?.id ?? null]));
  function ancestorsOf(id: string): Set<string> {
    const out = new Set<string>();
    let current = parentOf.get(id) ?? null;
    while (current) {
      out.add(current);
      current = parentOf.get(current) ?? null;
    }
    return out;
  }
  function breadcrumb(id: string): string {
    const names: string[] = [];
    let current = parentOf.get(id) ?? null;
    while (current) {
      names.unshift(byId[current]?.name ?? "");
      current = parentOf.get(current) ?? null;
    }
    return names.filter(Boolean).join(" › ");
  }

  // The home page is written twice — at its own address and as the site's
  // `index.html` — so the front door is a real page rather than a redirect.
  const home = (input.homeNodeId && placed.get(input.homeNodeId)) || [...placed.values()].find((entry) => !isUniverse(entry.page.node)) || null;

  function navEntryFor(id: string): NavEntry | null {
    const stack = [...tree];
    while (stack.length > 0) {
      const candidate = stack.pop()!;
      if (candidate.node.id === id) return candidate;
      stack.push(...candidate.children);
    }
    return null;
  }

  function contextFor(dir: string): HtmlPageContext {
    return {
      hrefFor: (nodeId) => {
        const target = placed.get(nodeId);
        return target ? relativeUrl(dir, target.path) : null;
      },
      nameFor: (nodeId) => byId[nodeId]?.name ?? null,
      pictureAt: (url) => {
        if (typeof url === "string" && (/^https?:\/\//i.test(url) || url.startsWith("data:"))) return url;
        const fileName = assetOf(url);
        if (!fileName) return null;
        const sitePath = `${SITE_ASSETS_DIR}/${fileName}`;
        assets.set(fileName, sitePath);
        return relativeUrl(dir, sitePath);
      },
      rowsFor: input.rowsFor,
      databaseFor: input.databaseFor,
      renderIcon: input.renderIcon,
      childrenOf: (node) => (navEntryFor(node.id)?.children ?? []).map((child) => child.node),
      tally,
    };
  }

  /** The page's HTML, written as if it sat in `dir`. */
  function render(entry: Placed, dir: string, title: string): string {
    const node = entry.page.node;
    const ctx = contextFor(dir);
    const nav = navHtml(tree, dir, node.id, ancestorsOf(node.id), ctx);
    const homeHref = relativeUrl(dir, "index.html");
    const article = isUniverse(node)
      ? (() => {
          const navEntry = navEntryFor(node.id);
          return navEntry ? universeArticle(navEntry, ctx) : "";
        })()
      : pageToHtml(node, ctx).article;
    return shell({ title, siteName: input.projectName, fromDir: dir, nav, article, homeHref });
  }

  for (const entry of placed.values()) {
    if (entry.folder) folders.push(entry.folder);
    files.push({ path: entry.path, text: render(entry, fileDir(entry.path), `${entry.page.node.name} — ${input.projectName}`) });

    const node = entry.page.node;
    if (isUniverse(node)) continue;
    // Indexed from a second conversion whose tally is thrown away, so the
    // counts above are of what is published rather than doubled.
    const words = pageToHtml(node, { ...contextFor(""), tally: createLossyTally() }).text;
    searchIndex.push({
      t: node.name,
      u: entry.path.split("/").map(encodeURIComponent).join("/"),
      p: breadcrumb(node.id),
      x: words.slice(0, 4000),
      a: node.aliases ?? [],
      g: node.tags,
    });
  }

  // Counted before the front door is written: the home page is rendered a
  // second time there and would otherwise count its secrets twice.
  const notes = describe(tally, hiddenCount, assets.size, input.theme.fonts.length);

  if (home) {
    files.push({ path: "index.html", text: render(home, "", input.projectName) });
  } else {
    files.push({ path: "index.html", text: shell({ title: input.projectName, siteName: input.projectName, fromDir: "", nav: navHtml(tree, "", "", new Set(), contextFor("")), article: `<article class="page"><header class="page-head"><div class="page-head-text"><h1 class="page-title">${escapeHtml(input.projectName)}</h1></div></header></article>`, homeHref: "index.html" }) });
  }

  files.push({ path: "site.css", text: siteStylesheet(input.theme) });
  files.push({ path: "site.js", text: siteScript() });
  files.push({ path: "search-index.js", text: `window.ANAMNESIS_INDEX = ${JSON.stringify(searchIndex).replace(/<\//g, "<\\/")};` });

  const binaries: SiteBinary[] = input.theme.fonts.map((font) => ({ path: `${SITE_FONTS_DIR}/${font.fileName}`, bytes: font.bytes }));
  if (binaries.length > 0) folders.push(SITE_FONTS_DIR);
  if (assets.size > 0) folders.push(SITE_ASSETS_DIR);

  return {
    files,
    binaries,
    folders: [...new Set(folders)].sort((a, b) => a.split("/").length - b.split("/").length || (a < b ? -1 : 1)),
    assets: [...assets].map(([fileName, path]) => ({ fileName, path })),
    pageCount: walked.filter((page) => !isUniverse(page.node)).length,
    hiddenCount,
    notes,
  };
}
