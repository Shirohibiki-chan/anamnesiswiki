// A folder of web pages read as a world (2026-09-30).
//
// **Translated into markdown, then handed to the markdown importer.** A page
// of HTML becomes the note Obsidian would have written for it — headings,
// lists, tables, quotes, links and pictures in markdown, the title and fields
// in front matter — and from there it is Phase 20's importer that decides
// what a page is, which folder holds which, what a link reaches and which
// pictures are copied. Building a second importer beside it would have meant
// writing all of that twice and keeping the two agreeing.
//
// **Links between the pages become `[[wikilinks]]` by path.** A web page
// links its neighbours by relative address; the markdown importer resolves a
// wikilink by vault path, so every address that lands on another page in the
// listing is rewritten to that page's note path. One that lands anywhere else
// keeps its words and loses the link, the way a vault's dead link does.
//
// **A page that holds pages is `Name/index.html`.** That is how this app's own
// website writes one, and how most static sites do; the markdown importer
// reads `Name.md` beside a `Name/` folder as the same thing, so an
// `index.html` is filed as the note beside its folder rather than inside it.
//
// **Our own website is recognised and read more closely.** Its tabs come back
// as tabs, its side panel's fields as fields and its callouts as callouts, and
// the parts that are only there for reading a site — the tree down the side,
// the search box, the root `index.html` that repeats the home page — are left
// behind. What the website had already flattened (a meter drawn as a bar, a
// database drawn as a table) comes back as it was drawn; the backup zip is
// the way back in that loses nothing.
//
// Uses the page's own `DOMParser`, so it runs in the renderer; the tests give
// it one from happy-dom.
import type { MarkdownImportInput } from "./markdown-import";

const HTML_EXTENSIONS = new Set(["html", "htm"]);
const PICTURE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"]);

/** Everything a page carries that is there for the browser, not the reader. */
const DROPPED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "NAV", "BUTTON", "FORM", "INPUT", "SELECT", "TEXTAREA", "SVG", "IFRAME", "OBJECT", "EMBED", "CANVAS", "LINK", "META", "HEAD"]);

const BLOCK_TAGS = new Set([
  "P", "DIV", "SECTION", "ARTICLE", "MAIN", "ASIDE", "HEADER", "FOOTER", "H1", "H2", "H3", "H4", "H5", "H6",
  "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "TABLE", "HR", "FIGURE", "FIGCAPTION", "DETAILS", "SUMMARY", "DL", "DT", "DD",
  "ADDRESS", "CENTER",
]);

function extensionOf(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
}

function isHiddenPath(path: string): boolean {
  return path.split("/").some((segment) => segment.startsWith("."));
}

/** Whether a path is a web page this importer reads. */
export function isHtmlPath(path: string): boolean {
  return !isHiddenPath(path) && HTML_EXTENSIONS.has(extensionOf(path));
}

function dirOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? "" : path.slice(0, slash);
}

function baseOf(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/** `a/b/../c` → `a/c`, and a leading `./` gone. Null when it climbs out of the listing. */
function normalise(path: string): string | null {
  const out: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (out.length === 0) return null;
      out.pop();
      continue;
    }
    out.push(segment);
  }
  return out.join("/");
}

function decode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/** Whether an address leaves the listing — the web, mail, or a page's own data. */
function isExternal(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}

/** An address as a listing path, resolved from the page it was written on. */
function resolveAddress(fromDir: string, href: string): string | null {
  const bare = href.replace(/[?#].*$/, "");
  if (!bare) return null;
  const decoded = decode(bare).replace(/\\/g, "/");
  return normalise(decoded.startsWith("/") ? decoded : fromDir ? `${fromDir}/${decoded}` : decoded);
}

/** A path written into markdown so the parser reads it back whole. */
function encodePath(path: string): string {
  return path.replace(/%/g, "%25").replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
}

function escapeText(text: string): string {
  return text.replace(/[\\`*_[\]<>~|#]/g, (char) => `\\${char}`);
}

/** A line of paragraph text that would otherwise read as a list or a quote. */
function guardLineStart(line: string): string {
  return line.replace(/^(\s*)(\d+)([.)] )/, "$1$2\\$3").replace(/^(\s*)([-+] )/, "$1\\$2");
}

function yamlString(text: string): string {
  return JSON.stringify(text);
}

type Context = {
  /** The listing path of the page being read. */
  path: string;
  /** A listing path of another page, as the vault path its note will have — without `.md`. */
  noteFor: (listingPath: string) => string | null;
};

type Marks = { code?: boolean };

// ---- Inline ----

function wrapMark(inner: string, mark: string): string {
  const leading = /^\s*/.exec(inner)![0];
  const trailing = /\s*$/.exec(inner)![0];
  const core = inner.trim();
  if (!core) return inner;
  return `${leading}${mark}${core}${mark.startsWith("<") ? mark.replace("<", "</") : mark}${trailing}`;
}

function imageMarkdown(img: Element, ctx: Context, caption?: string): string | null {
  const src = img.getAttribute("src")?.trim();
  if (!src) return null;
  const alt = (caption ?? img.getAttribute("alt") ?? "").replace(/[[\]\n]/g, " ").trim();
  if (/^(https?:|data:)/i.test(src)) return `![${alt}](${src.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29")})`;
  if (isExternal(src)) return null;
  const path = resolveAddress(dirOf(ctx.path), src);
  if (!path || !PICTURE_EXTENSIONS.has(extensionOf(path))) return null;
  return `![${alt}](${encodePath(path)})`;
}

function linkMarkdown(a: Element, text: string, ctx: Context): string {
  const href = a.getAttribute("href")?.trim() ?? "";
  const label = text.trim();
  if (!href || href.startsWith("#")) return text;
  if (isExternal(href)) {
    if (!/^(https?:|mailto:)/i.test(href)) return text;
    return label ? wrapLink(text, `[${label}](${href.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29")})`) : text;
  }
  const path = resolveAddress(dirOf(ctx.path), href);
  const note = path ? ctx.noteFor(path) : null;
  if (!note) return text;
  // The label goes through as the words she sees, minus the three characters
  // a wikilink cannot hold; they are rare in a link's words and never matter.
  const words = (a.textContent ?? "").replace(/[[\]|\n]/g, " ").replace(/\s+/g, " ").trim();
  return wrapLink(text, words ? `[[${note}|${words}]]` : `[[${note}]]`);
}

/** Keeps the spaces around a link outside it, where the sentence needs them. */
function wrapLink(original: string, link: string): string {
  const leading = /^\s*/.exec(original)![0];
  const trailing = /\s*$/.exec(original)![0];
  return `${leading}${link}${trailing}`;
}

function inline(node: Node, ctx: Context, marks: Marks = {}): string {
  if (node.nodeType === 3) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ");
    return marks.code ? text : escapeText(text);
  }
  if (node.nodeType !== 1) return "";
  const el = node as Element;
  const tag = el.tagName.toUpperCase();
  if (DROPPED_TAGS.has(tag)) return "";
  const children = () => Array.from(el.childNodes).map((child) => inline(child, ctx, marks)).join("");

  switch (tag) {
    case "BR":
      return "\n";
    case "STRONG":
    case "B":
      return wrapMark(children(), "**");
    case "EM":
    case "I":
    case "CITE":
      return wrapMark(children(), "*");
    case "S":
    case "DEL":
    case "STRIKE":
      return wrapMark(children(), "~~");
    case "U":
    case "INS":
      return wrapMark(children(), "<u>");
    case "CODE":
    case "KBD":
    case "SAMP": {
      const text = (el.textContent ?? "").replace(/\s+/g, " ");
      if (!text.trim()) return text;
      // A backtick inside the code needs a longer fence, padded so the two
      // don't run together.
      return text.includes("`") ? wrapLink(text, `\`\` ${text.trim()} \`\``) : wrapMark(text, "`");
    }
    case "A":
      return linkMarkdown(el, children(), ctx);
    case "IMG":
      return imageMarkdown(el, ctx) ?? escapeText(el.getAttribute("alt") ?? "");
    default:
      return children();
  }
}

/** Inline content as the lines of one paragraph, blank ones dropped. */
function paragraphLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(guardLineStart);
}

// ---- Blocks ----

type Chunk = string[];

type BlockOptions = {
  /** How far every heading moves down, for writing that sits under a tab's `##`. */
  headingShift: number;
  /** Whether this is our own website, whose furniture is known by class. */
  ownSite: boolean;
};

function isBlockElement(node: Node): boolean {
  return node.nodeType === 1 && BLOCK_TAGS.has((node as Element).tagName.toUpperCase());
}

function hasClass(el: Element, name: string): boolean {
  return (el.getAttribute("class") ?? "").split(/\s+/).includes(name);
}

/** Every block inside a container, with loose inline runs as paragraphs. */
function blocks(container: Element, ctx: Context, options: BlockOptions): Chunk[] {
  const out: Chunk[] = [];
  let run = "";
  const flush = () => {
    const lines = paragraphLines(run);
    if (lines.length > 0) out.push(lines);
    run = "";
  };
  for (const child of Array.from(container.childNodes)) {
    if (child.nodeType === 1 && DROPPED_TAGS.has((child as Element).tagName.toUpperCase())) continue;
    if (isBlockElement(child)) {
      flush();
      out.push(...block(child as Element, ctx, options));
    } else if (child.nodeType === 1 && (child as Element).tagName.toUpperCase() === "IMG") {
      // A picture on its own between blocks is a picture block, not a word.
      const md = imageMarkdown(child as Element, ctx);
      if (md && !run.trim()) out.push([md]);
      else run += md ?? "";
    } else {
      run += inline(child, ctx);
    }
  }
  flush();
  return out;
}

function prefixLines(chunks: Chunk[], prefix: string): string[] {
  const lines: string[] = [];
  chunks.forEach((chunk, index) => {
    if (index > 0) lines.push(prefix.trimEnd());
    for (const line of chunk) lines.push(`${prefix}${line}`);
  });
  return lines;
}

function listLines(list: Element, ctx: Context, options: BlockOptions, depth: number): string[] {
  const ordered = list.tagName.toUpperCase() === "OL";
  const start = Number(list.getAttribute("start")) || 1;
  const indent = "    ".repeat(depth);
  const lines: string[] = [];
  let n = start;
  for (const item of Array.from(list.children)) {
    if (item.tagName.toUpperCase() !== "LI") continue;
    const box = item.querySelector(":scope > input[type=checkbox], :scope > label > input[type=checkbox], :scope > p > input[type=checkbox]");
    const marker = ordered ? `${n}. ` : box ? `- [${(box as HTMLInputElement).hasAttribute("checked") ? "x" : " "}] ` : "- ";
    n += 1;

    let text = "";
    const nested: Element[] = [];
    for (const child of Array.from(item.childNodes)) {
      if (child.nodeType === 1 && ["UL", "OL"].includes((child as Element).tagName.toUpperCase())) nested.push(child as Element);
      else if (isBlockElement(child)) text += ` ${inline(child, ctx)} `;
      else text += inline(child, ctx);
    }
    const [first = "", ...rest] = text
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    lines.push(`${indent}${marker}${first}`);
    for (const line of rest) lines.push(`${indent}    ${line}`);
    for (const sub of nested) lines.push(...listLines(sub, ctx, options, depth + 1));
  }
  return lines;
}

function tableLines(table: Element, ctx: Context): string[] {
  const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
    Array.from(row.children)
      .filter((cell) => ["TD", "TH"].includes(cell.tagName.toUpperCase()))
      .map((cell) => inline(cell, ctx).replace(/\n/g, " ").replace(/\s+/g, " ").trim()),
  );
  const width = Math.max(0, ...rows.map((row) => row.length));
  if (width === 0) return [];
  const pad = (row: string[]) => [...row, ...Array(width - row.length).fill("")];
  const line = (row: string[]) => `| ${pad(row).join(" | ")} |`;
  const [head, ...body] = rows;
  return [line(head), `|${" --- |".repeat(width)}`, ...body.map(line)];
}

function block(el: Element, ctx: Context, options: BlockOptions): Chunk[] {
  const tag = el.tagName.toUpperCase();

  // Our website's furniture: a heading over each tab (the tabs are written by
  // the caller), the contents block that only makes sense live, a folder's
  // automatic list of its pages (the tree already holds them).
  if (options.ownSite) {
    if (hasClass(el, "tab-heading") || hasClass(el, "contents") || hasClass(el, "page-banner")) return [];
    if (hasClass(el, "callout")) {
      const kind = hasClass(el, "callout-quote") ? "quote" : "info";
      const body = el.querySelector(":scope > .callout-body") ?? el;
      return [[`> [!${kind}]`, ...prefixLines(blocks(body, ctx, options), "> ")]];
    }
    if (hasClass(el, "block-title")) {
      const text = inline(el, ctx).replace(/\s+/g, " ").trim();
      return text ? [[`**${text}**`]] : [];
    }
  }

  switch (tag) {
    case "H1":
    case "H2":
    case "H3":
    case "H4":
    case "H5":
    case "H6": {
      const text = inline(el, ctx).replace(/\s+/g, " ").trim();
      if (!text) return [];
      const level = Math.min(6, Number(tag[1]) + options.headingShift);
      return [[`${"#".repeat(level)} ${text}`]];
    }
    case "P":
    case "ADDRESS":
    case "FIGCAPTION":
    case "DT":
    case "SUMMARY":
      return blocks(el, ctx, options);
    case "UL":
    case "OL": {
      const lines = listLines(el, ctx, options, 0);
      return lines.length > 0 ? [lines] : [];
    }
    case "BLOCKQUOTE": {
      const inner = blocks(el, ctx, options);
      return inner.length > 0 ? [prefixLines(inner, "> ")] : [];
    }
    case "PRE": {
      const code = el.querySelector("code");
      const language = /(?:^|\s)(?:language|lang)-([\w+-]+)/.exec(code?.getAttribute("class") ?? el.getAttribute("class") ?? "")?.[1] ?? "";
      const text = (el.textContent ?? "").replace(/\n$/, "");
      const fence = text.includes("```") ? "~~~~" : "```";
      return [[`${fence}${language}`, ...text.split("\n"), fence]];
    }
    case "TABLE": {
      const lines = tableLines(el, ctx);
      return lines.length > 0 ? [lines] : [];
    }
    case "HR":
      return [["---"]];
    case "FIGURE": {
      const img = el.querySelector("img");
      const caption = el.querySelector("figcaption")?.textContent?.replace(/\s+/g, " ").trim();
      if (img) {
        const md = imageMarkdown(img, ctx, caption || undefined);
        return md ? [[md]] : [];
      }
      return blocks(el, ctx, options);
    }
    case "DETAILS": {
      const summary = el.querySelector(":scope > summary");
      const title = summary ? inline(summary, ctx).replace(/\s+/g, " ").trim() : "";
      const body = Array.from(el.childNodes).filter((child) => child !== summary);
      const holder = el.ownerDocument.createElement("div");
      for (const child of body) holder.appendChild(child.cloneNode(true));
      return [[`> [!note]- ${title}`.trimEnd(), ...prefixLines(blocks(holder, ctx, options), "> ")]];
    }
    case "DL": {
      const lines: string[] = [];
      for (const child of Array.from(el.querySelectorAll("dt, dd"))) {
        const text = inline(child, ctx).replace(/\s+/g, " ").trim();
        if (!text) continue;
        lines.push(child.tagName.toUpperCase() === "DT" ? `**${text}**` : text);
      }
      return lines.length > 0 ? [lines] : [];
    }
    case "DD":
      return blocks(el, ctx, options);
    default:
      return blocks(el, ctx, options);
  }
}

function render(chunks: Chunk[]): string {
  return chunks.map((chunk) => chunk.join("\n")).join("\n\n");
}

// ---- A page ----

/** The first heading, when it is the page's own name and should not be said twice. */
function takeLeadingTitle(root: Element): string | null {
  const first = root.querySelector("h1");
  if (!first) return null;
  const title = (first.textContent ?? "").replace(/\s+/g, " ").trim();
  first.remove();
  return title || null;
}

function frontMatter(entries: [string, string | string[]][]): string {
  if (entries.length === 0) return "";
  const lines = entries.map(([key, value]) =>
    Array.isArray(value) ? `${key}:\n${value.map((item) => `  - ${yamlString(item)}`).join("\n")}` : `${key}: ${yamlString(value)}`,
  );
  return `---\n${lines.join("\n")}\n---\n\n`;
}

/** Whether a document is a page of this app's own published website. */
function isOwnSitePage(doc: Document): boolean {
  return Boolean(doc.querySelector("main > article.page"));
}

function ownSiteNote(doc: Document, ctx: Context): string {
  const article = doc.querySelector("main > article.page")!;
  const meta: [string, string | string[]][] = [];
  const title = article.querySelector(".page-head .page-title")?.textContent?.replace(/\s+/g, " ").trim();
  if (title) meta.push(["title", title]);
  const kind = article.querySelector(".page-head .page-kind")?.textContent?.trim();
  if (kind) meta.push(["template", kind]);

  const options: BlockOptions = { headingShift: 0, ownSite: true };
  const body = article.querySelector(".page-body");
  const sections = body ? Array.from(body.querySelectorAll(":scope > section.tab")) : [];
  const chunks: Chunk[] = [];

  if (body) {
    for (const child of Array.from(body.children)) {
      if (child.tagName.toUpperCase() === "SECTION" && hasClass(child, "tab")) continue;
      // A folder's automatic list of its pages: the tree says the same thing.
      if (hasClass(child, "page-list") || child.tagName.toUpperCase() === "NAV") continue;
      chunks.push(...block(child, ctx, options));
    }
  }

  if (sections.length > 1) {
    const labels = sections.map((section, index) => section.getAttribute("data-tab-label")?.trim() || `Tab ${index + 1}`);
    meta.push(["tabs", labels]);
    sections.forEach((section, index) => {
      chunks.push([`## ${escapeText(labels[index])}`]);
      chunks.push(...blocks(section, ctx, { ...options, headingShift: 1 }));
    });
  } else if (sections.length === 1) {
    chunks.push(...blocks(sections[0], ctx, options));
  }

  // The side panel: its fields become the page's fields, a picture its
  // portrait, and anything else is written under Details, which is where the
  // markdown export puts the same blocks.
  const panel = article.querySelector(".page-panel");
  if (panel) {
    const details: Chunk[] = [];
    let portrait: string | null = null;
    for (const item of Array.from(panel.querySelectorAll(":scope > dl > *"))) {
      if (hasClass(item, "block-property")) {
        const label = item.querySelector("dt")?.textContent?.replace(/\s+/g, " ").trim();
        const value = item.querySelector("dd")?.textContent?.replace(/\s+/g, " ").trim();
        if (label && value && !["title", "tabs", "template", "tags", "aliases", "image", "banner", "hidden", "style"].includes(label.toLowerCase()))
          meta.push([label, value]);
        continue;
      }
      const img = item.querySelector("img");
      if (!portrait && img && /(^|\s)block-(image|picture)(\s|$)/.test(item.getAttribute("class") ?? "")) {
        const src = img.getAttribute("src");
        const path = src && !isExternal(src) ? resolveAddress(dirOf(ctx.path), src) : null;
        if (path) {
          portrait = path;
          continue;
        }
      }
      details.push(...block(item, ctx, options));
    }
    if (portrait) meta.push(["image", portrait]);
    if (details.length > 0) chunks.push(["## Details"], ...details);
  }

  return `${frontMatter(meta)}${render(chunks)}\n`;
}

function genericNote(doc: Document, ctx: Context): string {
  const root = doc.querySelector("main") ?? doc.querySelector("article") ?? doc.body;
  if (!root) return "";
  const heading = takeLeadingTitle(root);
  const title = heading ?? doc.querySelector("title")?.textContent?.replace(/\s+/g, " ").trim() ?? null;
  const meta: [string, string][] = title ? [["title", title]] : [];
  return `${frontMatter(meta)}${render(blocks(root, ctx, { headingShift: 0, ownSite: false }))}\n`;
}

/** One web page as the markdown note the importer reads. */
export function htmlToMarkdown(html: string, ctx: Context): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return isOwnSitePage(doc) ? ownSiteNote(doc, ctx) : genericNote(doc, ctx);
}

// ---- A listing ----

/** Whether a listing is this app's own website, whose root page repeats the home page. */
function isOwnSite(files: string[]): boolean {
  const set = new Set(files.map((path) => path.toLowerCase()));
  return set.has("site.css") && set.has("search-index.js");
}

/**
 * Where each page's note goes: `Name.html` → `Name.md`, and a folder's
 * `Name/index.html` → `Name.md` beside `Name/`, which is how the markdown
 * importer knows the page holds the folder.
 */
function planNotePaths(pages: string[], files: string[], ownSite: boolean): Map<string, string> {
  const out = new Map<string, string>();
  const taken = new Set(files.filter((path) => !isHtmlPath(path)).map((path) => path.toLowerCase()));
  const claim = (path: string): string | null => {
    if (taken.has(path.toLowerCase())) return null;
    taken.add(path.toLowerCase());
    return path;
  };

  // Plain pages first, so a folder's index can tell whether its name is taken.
  const indexes = pages.filter((path) => /^index\.html?$/i.test(path.slice(path.lastIndexOf("/") + 1)));
  const plain = pages.filter((path) => !indexes.includes(path));
  for (const page of plain) {
    const dir = dirOf(page);
    const note = claim(`${dir ? `${dir}/` : ""}${baseOf(page)}.md`);
    if (note) out.set(page, note);
  }
  for (const page of indexes) {
    const dir = dirOf(page);
    if (!dir) {
      // The site's front door. Ours repeats the home page, which is already
      // one of the pages; anyone else's is a page of its own.
      if (ownSite && plain.length + indexes.length > 1) continue;
      const note = claim("index.md");
      if (note) out.set(page, note);
      continue;
    }
    const note = claim(`${dir}.md`) ?? claim(`${dir}/index.md`);
    if (note) out.set(page, note);
  }
  return out;
}

/**
 * A listing that holds web pages, with each page swapped for its note.
 *
 * Everything else in the listing — pictures, and any markdown already there —
 * goes through as it was, so a folder mixing the two imports both.
 */
export function inputWithHtmlAsNotes(input: MarkdownImportInput, html: Map<string, string>): MarkdownImportInput {
  const pages = [...html.keys()];
  if (pages.length === 0) return input;
  const ownSite = isOwnSite(input.files);
  const notePaths = planNotePaths(pages, input.files, ownSite);
  const noteFor = (listingPath: string) => {
    const note = notePaths.get(listingPath) ?? notePaths.get(`${listingPath}/index.html`) ?? notePaths.get(`${listingPath}/index.htm`);
    return note ? note.replace(/\.md$/, "") : null;
  };

  const texts = new Map(input.texts);
  for (const [page, note] of notePaths) texts.set(note, htmlToMarkdown(html.get(page)!, { path: page, noteFor }));

  const files = [...input.files.filter((path) => !isHtmlPath(path)), ...notePaths.values()];
  return { ...input, files, texts };
}
