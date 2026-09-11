// One page turned into the HTML of one published web page (Phase 1.5).
//
// **The site's shape is `site-plan.ts`'s job, not this file's.** This one
// knows nothing about folders, filenames, the sidebar or which pictures got
// copied where — everything outside the page arrives through the resolvers in
// `HtmlPageContext`, so the whole converter is testable without a disk or a
// project. It is `markdown-page.ts` with a different dialect on the other end,
// and it is kept a separate file for the reason `export-walk.ts` gives: the
// moment one format's vocabulary leaks into another's converter, the next
// format has to work around it.
//
// **Hidden means not published, and that rule is enforced here as well as
// upstream.** The planner never hands this file a hidden page, but a hidden
// *tab* and a Secret callout are inside the page, so they are this file's to
// leave out — and they are left out rather than offered as a toggle, because
// the one thing a reader must never see is the thing she marked private. Each
// one left out is counted, so the modal can say so.
//
// **What is drawn stays as close to the app as static HTML allows.** A meter is
// a real bar rather than a sentence, a database is a table, a toggle is a
// `<details>`, columns are columns. What cannot be live is counted under
// `BLOCK_FLATTENED` the way the Markdown export does, so the two exports tell
// her the same kind of news in the same words.
import type { LucideIcon } from "lucide-react";
import { getGlyph } from "../constants/glyphs";
import { getTemplateIcon } from "../constants/icons";
import { getPaletteHex } from "../constants/palette";
import { ICON_INLINE_TYPE, type Block, type Node } from "../constants/schema";
import type { DatabaseCell } from "./database-service";
import { bumpLossy, type LossyTally } from "./export-walk";
import { isPipMeter, isSpectrum, meterColor, meterFraction, meterMax, meterReadout, meterStyleOf, metersOf, meterValue, showsMax, spectrumReadout } from "./meter-service";
import type { RenderableProperty } from "./property-service";
import { getPropertySchema, getTemplate } from "./template-registry";

/**
 * Tally keys this file counts under, read by the site's summary.
 *
 * `BLOCK_FLATTENED` is the same news the Markdown export gives — the writing
 * is all there and something stopped being live. `SECRET_KEPT` and
 * `HIDDEN_TAB_KEPT` are the other kind: something was deliberately *not*
 * published, and she should know how much, because a count of zero on a world
 * she thought had secrets in it is the bug worth catching before the upload.
 */
export const BLOCK_FLATTENED = "blockFlattened";
export const SECRET_KEPT = "secretKept";
export const HIDDEN_TAB_KEPT = "hiddenTabKept";

/** A page shown as a database, already filtered, sorted and column-picked. */
export type DatabaseTable = {
  columns: string[];
  rows: { id: string; name: string; cells: DatabaseCell[] }[];
};

/** Everything about the rest of the site that converting one page needs. */
export type HtmlPageContext = {
  /**
   * The address of another page relative to the one being written, or null
   * when it is not on the site — hidden, or outside what was exported. A link
   * to nothing is written as plain text rather than a dead link, the same
   * choice the Markdown export makes.
   */
  hrefFor: (nodeId: string) => string | null;
  /** The page's name, for a link whose label was not chosen. */
  nameFor: (nodeId: string) => string | null;
  /**
   * The address a picture can be reached at from this page, or null. A web
   * address stays a web address; a picture from `assets/` becomes the relative
   * path of its copy.
   */
  pictureAt: (url: unknown) => string | null;
  /** The pages a collection block lists, already resolved and in its order. */
  rowsFor: (node: Node, block: Block) => Node[];
  /** The rows and columns of a page shown as a database, or null when it is not one. */
  databaseFor: (node: Node) => DatabaseTable | null;
  /** A Lucide icon as SVG markup wearing `className` — see `iconHtml`. */
  renderIcon: (icon: LucideIcon, className: string) => string;
  /** The pages directly inside this one that are on the site, in tree order. */
  childrenOf: (node: Node) => Node[];
  tally: LossyTally;
};

// ---- Text ----

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function attr(value: string): string {
  return `"${escapeHtml(value)}"`;
}

/**
 * A heading's anchor: lower-case, words joined by dashes, nothing else.
 *
 * Unicode letters are kept — her headings are not all ASCII — and the caller
 * makes the result unique within a page, since two sections called "History"
 * are ordinary and a second one that cannot be linked to is not.
 */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

// ---- Inline ----

type InlineRun = { type?: string; text?: string; styles?: Record<string, unknown>; content?: unknown; props?: Record<string, unknown>; href?: string };

/**
 * BlockNote's named text colours, in the values its own stylesheet uses.
 *
 * Kept here rather than read from the editor's CSS because the site has no
 * editor: a run coloured "red" in the app has to be red on the page, and the
 * page only has what this file wrote into it.
 */
const TEXT_COLORS: Record<string, string> = {
  gray: "#9b9a97",
  brown: "#64473a",
  red: "#e03e3e",
  orange: "#d9730d",
  yellow: "#dfab01",
  green: "#4d6461",
  blue: "#0b6e99",
  purple: "#6940a5",
  pink: "#ad1a72",
};

const BACKGROUND_COLORS: Record<string, string> = {
  gray: "rgba(155, 154, 151, 0.25)",
  brown: "rgba(100, 71, 58, 0.25)",
  red: "rgba(224, 62, 62, 0.25)",
  orange: "rgba(217, 115, 13, 0.25)",
  yellow: "rgba(223, 171, 1, 0.25)",
  green: "rgba(77, 100, 97, 0.25)",
  blue: "rgba(11, 110, 153, 0.25)",
  purple: "rgba(105, 64, 165, 0.25)",
  pink: "rgba(173, 26, 114, 0.25)",
};

function colorStyle(styles: Record<string, unknown> | undefined): string {
  const rules: string[] = [];
  const text = typeof styles?.textColor === "string" ? TEXT_COLORS[styles.textColor] : undefined;
  const background = typeof styles?.backgroundColor === "string" ? BACKGROUND_COLORS[styles.backgroundColor] : undefined;
  if (text) rules.push(`color:${text}`);
  if (background) rules.push(`background:${background}`);
  return rules.join(";");
}

function styleRun(text: string, styles: Record<string, unknown> | undefined): string {
  if (!text) return "";
  let out = escapeHtml(text);
  if (styles?.code) out = `<code>${out}</code>`;
  if (styles?.bold) out = `<strong>${out}</strong>`;
  if (styles?.italic) out = `<em>${out}</em>`;
  if (styles?.strike) out = `<s>${out}</s>`;
  if (styles?.underline) out = `<u>${out}</u>`;
  const color = colorStyle(styles);
  if (color) out = `<span style=${attr(color)}>${out}</span>`;
  return out;
}

/**
 * An icon that is either a glyph of ours or an emoji she typed.
 *
 * The glyph is drawn by the context's `renderIcon` rather than here: a Lucide
 * icon is a React component and its path data is not reachable from plain
 * TypeScript, so the hook renders it to markup with React's own static
 * renderer and this file only places the result. That also means the SVG on
 * the site is byte-for-byte what the app draws.
 */
export function iconHtml(icon: string | undefined, className: string, ctx: HtmlPageContext): string {
  if (!icon) return "";
  const glyph = getGlyph(icon);
  return glyph ? ctx.renderIcon(glyph, className) : `<span class=${attr(className)}>${escapeHtml(icon)}</span>`;
}

/** A page's icon: its own if it has one, its template's otherwise. */
export function pageIconHtml(node: Node, className: string, ctx: HtmlPageContext): string {
  if (node.icon) return iconHtml(node.icon, className, ctx);
  return ctx.renderIcon(getTemplateIcon(node.templateKey), className);
}

export function inlineToHtml(content: unknown, ctx: HtmlPageContext): string {
  if (!Array.isArray(content)) return "";
  let out = "";

  for (const raw of content as InlineRun[]) {
    if (!raw || typeof raw !== "object") continue;

    if (raw.type === "link") {
      const href = typeof raw.href === "string" ? raw.href : "";
      const label = (Array.isArray(raw.content) ? (raw.content as InlineRun[]) : []).map((child) => styleRun(child?.text ?? "", child?.styles)).join("");
      // Outside links open in a new tab: the reader was in the middle of a
      // world, and the page they leave for should not replace it.
      out += href ? `<a href=${attr(href)} target="_blank" rel="noopener">${label || escapeHtml(href)}</a>` : label;
      continue;
    }

    if (raw.type === ICON_INLINE_TYPE) {
      const icon = typeof raw.props?.icon === "string" ? raw.props.icon : "";
      out += iconHtml(icon, "icon", ctx);
      continue;
    }

    if (raw.type === "mention") {
      const nodeId = typeof raw.props?.nodeId === "string" ? raw.props.nodeId : undefined;
      const chosen = typeof raw.props?.text === "string" ? raw.props.text : "";
      const label = chosen || (typeof raw.props?.label === "string" ? raw.props.label : "") || (nodeId ? (ctx.nameFor(nodeId) ?? "") : "");
      const href = nodeId ? ctx.hrefFor(nodeId) : null;
      out += href ? `<a class="ref" href=${attr(href)}>${escapeHtml(label)}</a>` : `<span class="ref ref-gone">${escapeHtml(label)}</span>`;
      continue;
    }

    if (typeof raw.text === "string") out += styleRun(raw.text, raw.styles);
  }

  return out;
}

/** The words alone, for the search index and for a heading's anchor. */
export function inlineText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  let out = "";
  for (const raw of content as InlineRun[]) {
    if (!raw || typeof raw !== "object") continue;
    if (typeof raw.text === "string") out += raw.text;
    else if (Array.isArray(raw.content)) out += inlineText(raw.content);
    else if (raw.type === "mention") out += typeof raw.props?.text === "string" ? raw.props.text : typeof raw.props?.label === "string" ? raw.props.label : "";
  }
  return out;
}

// ---- Blocks ----

type BlockNoteBlock = { id?: string; type?: string; props?: Record<string, unknown>; content?: unknown; children?: unknown };

/** What one tab's conversion keeps track of as it goes. */
type PageState = {
  /** Anchors already given out on this page, so two "History" headings both link. */
  anchors: Set<string>;
  /** The headings of the tab being written, for a contents block to list. */
  headings: { level: number; text: string; id: string }[];
};

function blockStyle(block: BlockNoteBlock): string {
  const rules: string[] = [];
  const align = block.props?.textAlignment;
  if (typeof align === "string" && align && align !== "left") rules.push(`text-align:${align}`);
  const color = typeof block.props?.textColor === "string" ? TEXT_COLORS[block.props.textColor] : undefined;
  const background = typeof block.props?.backgroundColor === "string" ? BACKGROUND_COLORS[block.props.backgroundColor] : undefined;
  if (color) rules.push(`color:${color}`);
  if (background) rules.push(`background:${background}`);
  return rules.length > 0 ? ` style=${attr(rules.join(";"))}` : "";
}

function captionOf(block: BlockNoteBlock): string {
  const caption = block.props?.caption;
  return typeof caption === "string" ? caption.trim() : "";
}

function uniqueAnchor(state: PageState, text: string): string {
  const base = slugify(text);
  let id = base;
  for (let n = 2; state.anchors.has(id); n += 1) id = `${base}-${n}`;
  state.anchors.add(id);
  return id;
}

function parseIdList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((id): id is string => typeof id === "string");
  return typeof value === "string" ? value.split(",").map((part) => part.trim()).filter(Boolean) : [];
}

/**
 * One block as HTML, or null when it has nothing to draw.
 *
 * Headings are not shifted the way the Markdown export shifts them: a tab is
 * drawn as a tab rather than as a heading above the writing, so the writing's
 * own `h1` has nothing above it to collide with. The page's title is the only
 * `h1` outside the writing, and it is in the header rather than the body.
 */
function blockToHtml(block: BlockNoteBlock, ctx: HtmlPageContext, node: Node, state: PageState): string | null {
  const inline = () => inlineToHtml(block.content, ctx);
  const children = () => blocksToHtml(block.children, ctx, node, state);

  switch (block.type) {
    case "paragraph": {
      const text = inline();
      return text ? `<p${blockStyle(block)}>${text}</p>` : null;
    }

    case "heading": {
      const raw = block.props?.level;
      const level = Math.min(6, Math.max(1, typeof raw === "number" ? raw : 1));
      const text = inline();
      if (!text) return null;
      const plain = inlineText(block.content);
      const id = uniqueAnchor(state, plain);
      state.headings.push({ level, text: plain, id });
      return `<h${level} id=${attr(id)}${blockStyle(block)}>${text}</h${level}>`;
    }

    case "divider":
      return "<hr>";

    case "codeBlock": {
      const language = typeof block.props?.language === "string" ? block.props.language : "";
      const text = (Array.isArray(block.content) ? (block.content as InlineRun[]) : []).map((run) => (typeof run?.text === "string" ? run.text : "")).join("");
      const lang = language ? ` class=${attr(`language-${language}`)}` : "";
      return `<pre><code${lang}>${escapeHtml(text)}</code></pre>`;
    }

    case "quote": {
      const text = inline();
      return text ? `<blockquote${blockStyle(block)}>${text}</blockquote>` : null;
    }

    case "calloutSecret":
      // Never published, whatever else this page says. Counted so the modal
      // can tell her how many stayed behind.
      bumpLossy(ctx.tally, SECRET_KEPT);
      return null;

    case "calloutInfo":
    case "calloutQuote": {
      const variant = block.type === "calloutInfo" ? "info" : "quote";
      const hex = getPaletteHex(typeof block.props?.color === "string" ? block.props.color : undefined);
      const icon = typeof block.props?.icon === "string" ? block.props.icon : "";
      const style = hex ? ` style=${attr(`--callout-accent:${hex}`)}` : "";
      const body = [inline() ? `<p>${inline()}</p>` : "", children()].filter(Boolean).join("");
      return `<aside class=${attr(`callout callout-${variant}${hex ? " callout-colored" : ""}`)}${style}>${icon ? iconHtml(icon, "callout-icon", ctx) : ""}<div class="callout-body">${body}</div></aside>`;
    }

    case "bulletListItem":
    case "numberedListItem":
    case "checkListItem":
      // Wrapped by `blocksToHtml`, which is the only caller that knows the
      // run this item is in.
      return inline();

    case "image": {
      const src = ctx.pictureAt(block.props?.url);
      const alt = typeof block.props?.alt === "string" ? block.props.alt : "";
      const caption = captionOf(block);
      if (!src) return caption ? `<p class="caption">${escapeHtml(caption)}</p>` : null;
      const width = typeof block.props?.previewWidth === "number" && block.props.previewWidth > 0 ? ` style=${attr(`max-width:${block.props.previewWidth}px`)}` : "";
      const figcaption = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "";
      return `<figure${blockStyle(block)}><img src=${attr(src)} alt=${attr(alt || caption)} loading="lazy"${width}>${figcaption}</figure>`;
    }

    case "video":
    case "audio": {
      const src = ctx.pictureAt(block.props?.url);
      const caption = captionOf(block);
      if (!src) return caption ? `<p class="caption">${escapeHtml(caption)}</p>` : null;
      const media = `<${block.type} controls src=${attr(src)}></${block.type}>`;
      return caption ? `<figure>${media}<figcaption>${escapeHtml(caption)}</figcaption></figure>` : media;
    }

    case "file": {
      const src = ctx.pictureAt(block.props?.url);
      const caption = captionOf(block);
      const name = typeof block.props?.name === "string" ? block.props.name : caption || "File";
      if (!src) return caption ? `<p class="caption">${escapeHtml(caption)}</p>` : null;
      return `<p><a class="file" href=${attr(src)} download>${escapeHtml(name)}</a></p>`;
    }

    case "toggleListItem": {
      const title = inline();
      return `<details><summary>${title || "…"}</summary>${children()}</details>`;
    }

    case "table":
      return tableToHtml(block, ctx);

    case "pageColumns": {
      const lanes = Array.isArray(block.children) ? (block.children as BlockNoteBlock[]) : [];
      const widths = typeof block.props?.widths === "string" && block.props.widths ? block.props.widths.split(",").map((part) => Number(part.trim())) : [];
      const columns = lanes
        .map((lane, index) => {
          const body = blocksToHtml(lane?.children, ctx, node, state);
          const grow = Number.isFinite(widths[index]) && widths[index] > 0 ? ` style=${attr(`flex:${widths[index]} 1 0`)}` : "";
          return `<div class="column"${grow}>${body}</div>`;
        })
        .join("");
      return columns ? `<div class="columns">${columns}</div>` : null;
    }

    case "pageColumn":
      return children() || null;

    case "pageContents": {
      // Built from the headings written so far on this tab, which is what the
      // app's own contents block lists. A block placed above every heading
      // therefore lists nothing — the same as it does in the app.
      if (state.headings.length === 0) return null;
      const items = state.headings.map((heading) => `<li class=${attr(`toc-${heading.level}`)}><a href=${attr(`#${heading.id}`)}>${escapeHtml(heading.text)}</a></li>`).join("");
      return `<nav class="contents"><ul>${items}</ul></nav>`;
    }

    case "blockRef": {
      const id = typeof block.props?.blockId === "string" ? block.props.blockId : "";
      const target = (node.blocks ?? []).find((candidate) => candidate.id === id);
      if (!target) return null;
      const width = typeof target.width === "number" && target.width > 0 && target.width < 100 ? ` style=${attr(`width:${target.width}%`)}` : "";
      const html = panelBlockToHtml(target, node, ctx);
      return html ? `<div class="inline-block"${width}>${html}</div>` : null;
    }

    case "infobox": {
      const ids = parseIdList(block.props?.blockIds);
      const parts = ids
        .map((id) => (node.blocks ?? []).find((candidate) => candidate.id === id))
        .filter((candidate): candidate is Block => Boolean(candidate))
        .map((candidate) => panelBlockToHtml(candidate, node, ctx))
        .filter((part): part is string => Boolean(part));
      if (parts.length === 0) return null;
      const hex = getPaletteHex(typeof block.props?.color === "string" ? block.props.color : undefined);
      const float = block.props?.float === "left" || block.props?.float === "right" ? ` infobox-${block.props.float}` : "";
      const centred = block.props?.centred ? " infobox-centred" : "";
      const rules: string[] = [];
      if (hex) rules.push(`--infobox-accent:${hex}`);
      if (typeof block.props?.width === "number" && block.props.width > 0 && !block.props.autoWidth) rules.push(`width:${block.props.width}%`);
      const style = rules.length > 0 ? ` style=${attr(rules.join(";"))}` : "";
      return `<aside class=${attr(`infobox${float}${centred}`)}${style}>${parts.join("")}</aside>`;
    }

    default: {
      // An unknown block keeps its text rather than vanishing.
      const text = inline();
      return text ? `<p>${text}</p>` : null;
    }
  }
}

function tableToHtml(block: BlockNoteBlock, ctx: HtmlPageContext): string | null {
  const content = block.content as { rows?: { cells?: unknown[] }[] } | undefined;
  const rows = Array.isArray(content?.rows) ? content.rows : [];
  if (rows.length === 0) return null;
  const html = rows
    .map((row) => `<tr>${(Array.isArray(row.cells) ? row.cells : []).map((cell) => `<td>${inlineToHtml(cell, ctx)}</td>`).join("")}</tr>`)
    .join("");
  return `<table>${html}</table>`;
}

/**
 * A run of blocks, with list items gathered into one list so consecutive
 * ones number and nest together.
 */
export function blocksToHtml(blocks: unknown, ctx: HtmlPageContext, node: Node, state: PageState): string {
  if (!Array.isArray(blocks)) return "";
  const parts: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;

  const flush = () => {
    if (list && list.items.length > 0) parts.push(`<${list.tag}>${list.items.join("")}</${list.tag}>`);
    list = null;
  };

  for (const raw of blocks as BlockNoteBlock[]) {
    if (!raw || typeof raw !== "object") continue;

    if (raw.type === "numberedListItem" || raw.type === "bulletListItem" || raw.type === "checkListItem") {
      const tag = raw.type === "numberedListItem" ? "ol" : "ul";
      if (!list || list.tag !== tag) {
        flush();
        list = { tag, items: [] };
      }
      const text = blockToHtml(raw, ctx, node, state) ?? "";
      const nested = blocksToHtml(raw.children, ctx, node, state);
      const box = raw.type === "checkListItem" ? `<input type="checkbox" disabled${raw.props?.checked ? " checked" : ""}> ` : "";
      list.items.push(`<li${raw.type === "checkListItem" ? ' class="check"' : ""}>${box}${text}${nested}</li>`);
      continue;
    }

    flush();
    const html = blockToHtml(raw, ctx, node, state);
    if (html) parts.push(html);
  }

  flush();
  return parts.join("");
}

// ---- The page's own blocks ----

function propertyOf(node: Node, key: string): RenderableProperty | undefined {
  return [...getPropertySchema(node.templateKey), ...(node.customProperties ?? [])].find((spec) => spec.key === key);
}

/** A property's value as HTML, or null when there is nothing to show. */
function propertyHtml(spec: RenderableProperty, value: unknown, ctx: HtmlPageContext): string | null {
  if (spec.type === "number") return typeof value === "number" && Number.isFinite(value) ? escapeHtml(String(value)) : null;

  if (spec.type === "refs") {
    const ids = Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
    const links = ids
      .map((id) => {
        const name = ctx.nameFor(id);
        if (!name) return null;
        const href = ctx.hrefFor(id);
        return href ? `<a class="ref" href=${attr(href)}>${escapeHtml(name)}</a>` : `<span class="ref ref-gone">${escapeHtml(name)}</span>`;
      })
      .filter((link): link is string => Boolean(link));
    return links.length > 0 ? links.join(", ") : null;
  }

  if (spec.type === "select" || spec.type === "status" || spec.type === "multiselect") {
    const ids = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    const chips = ids
      .map((id) => (spec.options ?? []).find((option) => option.id === id))
      .filter((option): option is NonNullable<typeof option> => Boolean(option))
      .map((option) => {
        const hex = getPaletteHex(option.color);
        return `<span class="chip"${hex ? ` style=${attr(`--chip:${hex}`)}` : ""}>${escapeHtml(option.label)}</span>`;
      });
    return chips.length > 0 ? chips.join(" ") : null;
  }

  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return `<a href=${attr(text)} target="_blank" rel="noopener">${escapeHtml(text)}</a>`;
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function meterHtml(block: Block, ctx: HtmlPageContext): string | null {
  const style = meterStyleOf(block);
  const entries = metersOf(block);
  if (entries.length === 0) return null;

  // The round shapes are drawn as bars: a static ring is a lot of SVG for a
  // number a bar says just as well. Counted, because the shape she chose is
  // not the shape on the page.
  if (!isPipMeter(style) && !isSpectrum(style) && style !== "bar") bumpLossy(ctx.tally, BLOCK_FLATTENED);

  const rows = entries.map((entry) => {
    const hex = getPaletteHex(meterColor(block, entry));
    const color = hex ? ` style=${attr(`--meter:${hex}`)}` : "";
    const label = entry.label?.trim() ? `<span class="meter-label">${iconHtml(entry.icon, "meter-icon", ctx)}${escapeHtml(entry.label.trim())}</span>` : "";

    if (isPipMeter(style)) {
      const max = meterMax(entry, style);
      const value = meterValue(entry, style);
      const pip = style === "rating" ? ["★", "☆"] : ["●", "○"];
      const pips = Array.from({ length: max }, (_, index) => `<span class=${attr(index < value ? "pip pip-on" : "pip")}>${index < value ? pip[0] : pip[1]}</span>`).join("");
      return `<div class="meter meter-pips"${color}>${label}<span class="meter-track" title=${attr(`${value} of ${max}`)}>${pips}</span></div>`;
    }

    const percent = Math.round(meterFraction(entry, style) * 1000) / 10;
    if (isSpectrum(style)) {
      const start = escapeHtml(entry.startLabel?.trim() || "");
      const end = escapeHtml(entry.endLabel?.trim() || "");
      return `<div class="meter meter-spectrum"${color}>${label}<span class="meter-ends"><span>${start}</span><span>${end}</span></span><span class="meter-track" title=${attr(spectrumReadout(entry))}><span class="meter-mark" style=${attr(`left:${percent}%`)}></span></span></div>`;
    }

    const readout = block.showText === false ? "" : `<span class="meter-readout">${escapeHtml(meterReadout(entry, style, showsMax(block)))}</span>`;
    return `<div class="meter meter-bar"${color}>${label}<span class="meter-track"><span class="meter-fill" style=${attr(`width:${percent}%`)}></span></span>${readout}</div>`;
  });

  return rows.join("");
}

/**
 * One of the page's blocks, drawn as the side panel draws it.
 *
 * Unlike the Markdown export, a property block *is* written here — the panel
 * is the page's own furniture and this is what the reader sees beside the
 * writing, in the order she arranged it.
 */
export function panelBlockToHtml(block: Block, node: Node, ctx: HtmlPageContext): string | null {
  const title = block.showTitle === false ? "" : (block.title?.trim() ?? "");
  const hex = getPaletteHex(block.color);
  const accent = hex ? ` style=${attr(`--block-accent:${hex}`)}` : "";
  const wrap = (kind: string, heading: string, body: string) =>
    `<section class=${attr(`block block-${kind}`)}${accent}>${heading ? `<h3 class="block-title">${escapeHtml(heading)}</h3>` : ""}${body}</section>`;

  switch (block.kind) {
    case "property": {
      const spec = block.propertyKey ? propertyOf(node, block.propertyKey) : undefined;
      if (!spec) return null;
      const value = propertyHtml(spec, node.properties[spec.key], ctx);
      if (value === null) return null;
      return `<div class="block block-property"${accent}><dt>${escapeHtml(block.title?.trim() || spec.label)}</dt><dd>${value}</dd></div>`;
    }

    case "tags": {
      if (node.tags.length === 0) return null;
      const chips = node.tags.map((tag) => `<span class="chip tag">${escapeHtml(tag)}</span>`).join(" ");
      return wrap("tags", block.showTitle === false ? "" : title || "Tags", `<p>${chips}</p>`);
    }

    case "alias": {
      const aliases = node.aliases ?? [];
      if (aliases.length === 0) return null;
      return wrap("alias", block.showTitle === false ? "" : title || "Also known as", `<p>${aliases.map((alias) => escapeHtml(alias)).join(", ")}</p>`);
    }

    case "text":
      return block.text?.trim() ? wrap("text", title, `<p>${escapeHtml(block.text.trim()).replace(/\n/g, "<br>")}</p>`) : null;

    case "image": {
      // The page's own portrait lives on the node; every other image block
      // carries its own. Same rule as `blockImage` in block-service.
      const file = block.image ?? node.image;
      const src = file ? ctx.pictureAt(file) : null;
      if (!src) return null;
      const alt = block.imageAlt || node.imageAlt || title || node.name;
      const focus = block.image ? block.imageFocusY : node.imageFocusY;
      const position = typeof focus === "number" ? ` style=${attr(`object-position:50% ${Math.round(focus)}%`)}` : "";
      return wrap("image", title, `<img src=${attr(src)} alt=${attr(alt)} loading="lazy"${position}>`);
    }

    case "meter": {
      const body = meterHtml(block, ctx);
      return body ? wrap("meter", title, body) : null;
    }

    case "collection":
    case "link": {
      const rows = ctx.rowsFor(node, block);
      if (rows.length === 0) return null;
      return wrap("collection", title, pageListHtml(rows, ctx));
    }

    default:
      return null;
  }
}

/** A list of pages as links, each with its icon — the shape the sidebar's collection blocks use. */
export function pageListHtml(pages: Node[], ctx: HtmlPageContext): string {
  if (pages.length === 0) return "";
  const items = pages
    .map((row) => {
      const href = ctx.hrefFor(row.id);
      const icon = pageIconHtml(row, "row-icon", ctx);
      return `<li>${href ? `<a class="ref" href=${attr(href)}>${icon}${escapeHtml(row.name)}</a>` : `${icon}${escapeHtml(row.name)}`}</li>`;
    })
    .join("");
  return `<ul class="page-list">${items}</ul>`;
}

// ---- The database view ----

function cellHtml(cell: DatabaseCell): string {
  if (cell.kind === "text") return escapeHtml(cell.text);
  if (cell.kind === "chips") {
    return cell.chips
      .map((chip) => {
        const hex = getPaletteHex(chip.color);
        return `<span class="chip"${hex ? ` style=${attr(`--chip:${hex}`)}` : ""}>${escapeHtml(chip.label)}</span>`;
      })
      .join(" ");
  }
  return "";
}

/**
 * A page shown as a database, as a table.
 *
 * Every layout becomes a table — cards, a board and a list are the same rows
 * with the same values, and a table is the one shape that shows all of them
 * without any of the app's interaction. Counted as flattened only when the
 * layout was not a table already.
 */
export function databaseToHtml(node: Node, ctx: HtmlPageContext): string | null {
  const table = ctx.databaseFor(node);
  if (!table) return null;
  if (node.view?.layout && node.view.layout !== "table") bumpLossy(ctx.tally, BLOCK_FLATTENED);

  const head = `<tr><th>Name</th>${table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>`;
  const body = table.rows
    .map((row) => {
      const href = ctx.hrefFor(row.id);
      const name = href ? `<a class="ref" href=${attr(href)}>${escapeHtml(row.name)}</a>` : escapeHtml(row.name);
      return `<tr><td>${name}</td>${row.cells.map((cell) => `<td>${cellHtml(cell)}</td>`).join("")}</tr>`;
    })
    .join("");
  if (table.rows.length === 0) return `<p class="empty">Nothing here yet.</p>`;
  return `<div class="database"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

// ---- The whole page ----

function referencedBlockIds(tabs: Node["tabs"]): Set<string> {
  const found = new Set<string>();
  function walk(blocks: unknown): void {
    if (!Array.isArray(blocks)) return;
    for (const block of blocks as BlockNoteBlock[]) {
      if (!block || typeof block !== "object") continue;
      if (block.type === "blockRef" && typeof block.props?.blockId === "string") found.add(block.props.blockId);
      if (block.type === "infobox") for (const id of parseIdList(block.props?.blockIds)) found.add(id);
      walk(block.children);
    }
  }
  for (const tab of tabs ?? []) walk(tab.content);
  return found;
}

export type PageHtml = {
  /** The page's `<article>`, complete. */
  article: string;
  /** The words of the visible tabs, for the search index. */
  text: string;
};

/**
 * A page's header, tabs, writing and side panel as one `<article>`.
 *
 * **Tabs are tabs.** The visible ones become a tab strip and one section each;
 * with JavaScript the strip switches between them and without it they run down
 * the page under their own headings. A single-tab page gets neither, the way
 * the app shows none. A hidden tab is not written at all — see the file
 * comment.
 *
 * **The side panel is the page's blocks in her order**, minus any the writing
 * already draws inline, exactly as the app decides. A page shown as a database
 * gets its table above the writing, where the app puts it.
 */
export function pageToHtml(node: Node, ctx: HtmlPageContext): PageHtml {
  const state: PageState = { anchors: new Set(), headings: [] };
  const template = getTemplate(node.templateKey);

  // ---- Header
  const banner = node.banner ? ctx.pictureAt(node.banner) : null;
  const bannerFocus = typeof node.bannerFocusY === "number" ? `;background-position:50% ${Math.round(node.bannerFocusY)}%` : "";
  const bannerHtml = banner ? `<div class="page-banner" style=${attr(`background-image:url(${JSON.stringify(banner)})${bannerFocus}`)}></div>` : "";
  const icon = pageIconHtml(node, "page-icon", ctx);
  const kind = template?.label && node.templateKey !== "blank" ? `<span class="page-kind">${escapeHtml(template.label)}</span>` : "";
  const header = `<header class="page-head">${icon}<div class="page-head-text"><h1 class="page-title">${escapeHtml(node.name)}</h1>${kind}</div></header>`;

  // ---- Tabs
  const tabs = (node.tabs ?? []).filter((tab) => {
    if (tab.hidden) bumpLossy(ctx.tally, HIDDEN_TAB_KEPT);
    return !tab.hidden;
  });
  const texts: string[] = [];
  const sections = tabs.map((tab, index) => {
    state.headings = [];
    const body = blocksToHtml(tab.content, ctx, node, state);
    texts.push(inlineTextOf(tab.content));
    const id = `tab-${index + 1}`;
    const heading = tabs.length > 1 ? `<h2 class="tab-heading">${escapeHtml(tab.label)}</h2>` : "";
    return `<section class=${attr(`tab${index === 0 ? " is-active" : ""}`)} id=${attr(id)} data-tab-label=${attr(tab.label)}>${heading}${body}</section>`;
  });
  const strip =
    tabs.length > 1
      ? `<nav class="tab-strip" aria-label="Tabs">${tabs.map((tab, index) => `<button type="button" class=${attr(`tab-button${index === 0 ? " is-active" : ""}`)} data-tab=${attr(`tab-${index + 1}`)}>${escapeHtml(tab.label)}</button>`).join("")}</nav>`
      : "";

  // ---- Database
  const database = databaseToHtml(node, ctx);

  // ---- What is inside a folder
  // A folder's page in the app is the list of its pages, so it is here too.
  // Every other page holds pages through the tree and its own index blocks,
  // which is what the app shows for them.
  const listing = node.templateKey === "folder" && !database ? pageListHtml(ctx.childrenOf(node), ctx) : "";

  // ---- Panel
  const inWriting = referencedBlockIds(node.tabs);
  const panelBlocks = (node.blocks ?? []).filter((block) => !inWriting.has(block.id)).map((block) => panelBlockToHtml(block, node, ctx)).filter((part): part is string => Boolean(part));
  const panel = panelBlocks.length > 0 ? `<aside class="page-panel"><dl>${panelBlocks.join("")}</dl></aside>` : "";

  const body = `<div class="page-body">${database ?? ""}${strip}${sections.join("")}${listing}</div>`;
  const article = `<article class=${attr(`page${panel ? " has-panel" : ""}`)}>${bannerHtml}${header}<div class="page-columns">${body}${panel}</div></article>`;

  return { article, text: texts.join("\n").replace(/\s+/g, " ").trim() };
}

/** Every word in a run of blocks, for the search index. */
function inlineTextOf(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  const parts: string[] = [];
  for (const block of blocks as BlockNoteBlock[]) {
    if (!block || typeof block !== "object") continue;
    // A Secret's words are not on the page, so they are not in the index
    // either — a search that finds what the page will not show is a leak.
    if (block.type === "calloutSecret") continue;
    if (block.type === "table") {
      const rows = (block.content as { rows?: { cells?: unknown[] }[] } | undefined)?.rows ?? [];
      for (const row of rows) for (const cell of row.cells ?? []) parts.push(inlineText(cell));
    } else {
      parts.push(inlineText(block.content));
    }
    parts.push(inlineTextOf(block.children));
  }
  return parts.filter(Boolean).join(" ");
}
