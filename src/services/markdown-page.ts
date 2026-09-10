// One page turned into one markdown file (Phase 28).
//
// **The vault's shape is `markdown-vault.ts`'s job, not this file's.** This
// one knows nothing about folders, filenames or which pictures got copied
// where — everything outside the page arrives through the resolvers in
// `MarkdownPageContext`, so the whole converter is testable without a disk or
// a project. See `docs/plan.md` § Phase 28.
//
// **Obsidian is the target dialect**, because a vault *is* a folder of
// markdown and that is the round trip Phase 20 will read back. So callouts use
// `> [!info]`, a collapsed toggle is `> [!note]-`, and internal links are
// `[[wikilinks]]` — which are already the syntax the editor accepts for
// writing them, so nothing is being translated there, only unwrapped.
import { getGlyph } from "../constants/glyphs";
import { ICON_INLINE_TYPE, type Block, type Node } from "../constants/schema";
import { bumpLossy, type LossyTally } from "./export-walk";
import { isSpectrum, meterReadout, meterStyleOf, metersOf, showsMax, spectrumReadout } from "./meter-service";
import type { RenderableProperty } from "./property-service";
import { getPropertySchema, getTemplate } from "./template-registry";

/**
 * Tally keys this file counts under, read by the export's summary.
 *
 * Two rather than one, because they are different news. *Flattened* means the
 * writing is all there and something stopped being live — a database is now a
 * table, a meter is now a sentence. *Dropped* means there was nothing to
 * write down at all. Rolling them together would let "your graphs are gone"
 * hide inside "12 blocks changed".
 */
export const BLOCK_FLATTENED = "blockFlattened";
export const BLOCK_DROPPED = "blockDropped";

/** Everything about the rest of the world that converting one page needs. */
export type MarkdownPageContext = {
  /**
   * A finished markdown link to that page, or null when it is not in the
   * export at all.
   *
   * **The whole link rather than just a target**, because the two markdown
   * exports disagree about what a link even is: a vault wants `[[Kaine]]`,
   * which Obsidian resolves across files, and the one big file wants
   * `[Kaine](#kaine)`, which jumps within the document. Handing back a target
   * for this file to wrap would mean it had to know which.
   *
   * `label` is the words the link should read as. Absent means the page's own
   * name, which is what a reference field and a collection row want.
   */
  linkFor: (nodeId: string, label?: string) => string | null;
  /**
   * The vault-relative path a picture ended up at, or null when it could not
   * travel. Unlike the `.lk` export this should almost always answer, since
   * the vault copies pictures in rather than pointing at addresses.
   */
  pictureAt: (url: unknown) => string | null;
  /** The pages a collection block lists, already resolved and in its order. */
  rowsFor: (node: Node, block: Block) => Node[];
  tally: LossyTally;
};

// ---- Inline ----

type InlineRun = { type?: string; text?: string; styles?: Record<string, unknown>; content?: unknown; props?: Record<string, unknown>; href?: string };

/**
 * Characters that would change what a line means if left alone.
 *
 * Deliberately short. Over-escaping produces files full of backslashes that
 * are unpleasant to read in any editor, which defeats the point of exporting
 * to markdown at all — so this covers the marks that actually pair up into
 * formatting, plus `<` so a stray angle bracket is not read as HTML.
 * Underscore is left out on purpose: Obsidian does not italicise inside a
 * word, and `snake_case` is far more common in her writing than `_emphasis_`.
 */
const ESCAPABLE = /[\\`*[\]<]/g;

function escapeText(value: string): string {
  return value.replace(ESCAPABLE, (char) => `\\${char}`);
}

/**
 * Wraps a run in whatever its styles ask for.
 *
 * Order matters only in that it has to be consistent — nesting `**` inside `_`
 * or the other way round both render, but flipping between them makes a diff
 * of two exports unreadable. Underline has no markdown at all, so it uses the
 * HTML tag Obsidian honours rather than being silently dropped.
 */
function styleRun(text: string, styles: Record<string, unknown> | undefined): string {
  if (!text) return "";
  // Code first and alone: everything inside a code span is literal, so
  // wrapping it in emphasis marks would print the marks.
  if (styles?.code) return `\`${text.replace(/`/g, "")}\``;

  let out = escapeText(text);
  if (styles?.bold) out = `**${out}**`;
  if (styles?.italic) out = `*${out}*`;
  if (styles?.strike) out = `~~${out}~~`;
  if (styles?.underline) out = `<u>${out}</u>`;
  return out;
}

export function inlineToMarkdown(content: unknown, ctx: MarkdownPageContext): string {
  if (!Array.isArray(content)) return "";
  let out = "";

  for (const raw of content as InlineRun[]) {
    if (!raw || typeof raw !== "object") continue;

    if (raw.type === "link") {
      const href = typeof raw.href === "string" ? raw.href : "";
      const label = (Array.isArray(raw.content) ? (raw.content as InlineRun[]) : [])
        .map((child) => (typeof child?.text === "string" ? child.text : ""))
        .join("");
      out += href ? `[${escapeText(label || href)}](${href})` : escapeText(label);
      continue;
    }

    if (raw.type === ICON_INLINE_TYPE) {
      // The same split `lk-export.ts` makes, for the same reason. An emoji is
      // a character and survives as one; a Lucide glyph is a drawing with no
      // character behind it, and writing the word "sword" into her prose
      // would be worse than losing the icon.
      const icon = typeof raw.props?.icon === "string" ? raw.props.icon : "";
      if (icon && !getGlyph(icon)) out += icon;
      else if (icon) bumpLossy(ctx.tally, BLOCK_DROPPED);
      continue;
    }

    if (raw.type === "mention") {
      const nodeId = typeof raw.props?.nodeId === "string" ? raw.props.nodeId : undefined;
      // Her wording first, exactly as the chip shows it — that is what the
      // link reads as in the sentence.
      const chosen = typeof raw.props?.text === "string" ? raw.props.text : "";
      const label = chosen || (typeof raw.props?.label === "string" ? raw.props.label : "");
      const link = nodeId ? ctx.linkFor(nodeId, label) : null;
      if (link) out += link;
      else if (label) out += escapeText(label);
      continue;
    }

    if (typeof raw.text === "string") out += styleRun(raw.text, raw.styles);
  }

  return out;
}

// ---- Blocks ----

type BlockNoteBlock = { type?: string; props?: Record<string, unknown>; content?: unknown; children?: unknown };

/**
 * Our three callouts in Obsidian's vocabulary.
 *
 * A Secret becomes a *warning* rather than a note, because the one thing a
 * reader has to know about it is that it was not meant for them — and Obsidian
 * has no "secret". The colour an Info wears is lost; that is counted.
 */
const CALLOUT_KIND: Record<string, string> = {
  calloutInfo: "info",
  calloutQuote: "quote",
  calloutSecret: "warning",
};

/** Prefixes every line, for callouts and quotes, including the blank ones. */
function prefixLines(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line) => (line ? `${prefix}${line}` : prefix.trimEnd()))
    .join("\n");
}

function captionOf(block: BlockNoteBlock): string {
  const caption = block.props?.caption;
  return typeof caption === "string" ? caption.trim() : "";
}

/**
 * One block as markdown, or null when it has nothing to write.
 *
 * `headingShift` moves the writing's own headings down so they nest under the
 * tab headings above them — see `pageToMarkdown`.
 */
function blockToMarkdown(block: BlockNoteBlock, ctx: MarkdownPageContext, headingShift: number, node: Node): string | null {
  const inline = () => inlineToMarkdown(block.content, ctx);
  const children = (shift: number) => blocksToMarkdown(block.children, ctx, shift, node);

  switch (block.type) {
    case "paragraph": {
      const text = inline();
      return text || null;
    }

    case "heading": {
      const raw = block.props?.level;
      const level = Math.min(6, Math.max(1, (typeof raw === "number" ? raw : 1) + headingShift));
      const text = inline();
      return text ? `${"#".repeat(level)} ${text}` : null;
    }

    case "divider":
      return "---";

    case "codeBlock": {
      const language = typeof block.props?.language === "string" ? block.props.language : "";
      const text = (Array.isArray(block.content) ? (block.content as InlineRun[]) : [])
        .map((run) => (typeof run?.text === "string" ? run.text : ""))
        .join("");
      // A fence long enough to survive whatever is inside it. Three backticks
      // around a block that itself contains three ends the code early, and
      // she pastes code samples about markdown.
      const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((match) => match[0].length));
      const fence = "`".repeat(longest + 1);
      return `${fence}${language}\n${text}\n${fence}`;
    }

    case "quote": {
      const text = inline();
      return text ? prefixLines(text, "> ") : null;
    }

    case "calloutInfo":
    case "calloutQuote":
    case "calloutSecret": {
      const kind = CALLOUT_KIND[block.type];
      // A colour that is not the callout's own is ours alone and has no
      // Obsidian equivalent, so it goes and is counted.
      if (block.type === "calloutInfo" && typeof block.props?.color === "string" && block.props.color) {
        bumpLossy(ctx.tally, BLOCK_FLATTENED);
      }
      const body = [inline(), children(headingShift)].filter(Boolean).join("\n\n");
      return prefixLines(`[!${kind}]\n${body}`, "> ");
    }

    case "bulletListItem":
    case "numberedListItem":
    case "checkListItem": {
      // The marker is decided by the run this item is in — see
      // `blocksToMarkdown`, which is the only caller that knows the index.
      return inline();
    }

    case "image": {
      const path = ctx.pictureAt(block.props?.url);
      const alt = typeof block.props?.alt === "string" ? block.props.alt : "";
      const caption = captionOf(block);
      if (!path) {
        // Counted by the resolver. The caption is left behind rather than an
        // empty line, so a picture that was explaining something does not take
        // the explanation with it.
        return caption || null;
      }
      const image = `![${escapeText(alt || caption)}](${encodePath(path)})`;
      return caption ? `${image}\n*${escapeText(caption)}*` : image;
    }

    case "video":
    case "audio":
    case "file": {
      const path = ctx.pictureAt(block.props?.url);
      const caption = captionOf(block);
      const name = typeof block.props?.name === "string" ? block.props.name : caption || "File";
      if (!path) return caption || null;
      return `[${escapeText(name)}](${encodePath(path)})`;
    }

    case "toggleListItem": {
      // Obsidian's collapsed callout is the closest thing it has to a toggle,
      // and it collapses the same way — the `-` after the kind is what makes
      // it start closed.
      const title = inline();
      const body = children(headingShift);
      return prefixLines(`[!note]- ${title}\n${body}`, "> ");
    }

    case "table":
      return tableToMarkdown(block, ctx);

    case "pageColumns": {
      // Side-by-side lanes have no markdown, so the lanes run one after
      // another instead. The writing is all there; the arrangement is not.
      bumpLossy(ctx.tally, BLOCK_FLATTENED);
      return children(headingShift) || null;
    }

    case "pageColumn":
      return children(headingShift) || null;

    case "pageContents":
      // A generated contents list. Obsidian builds its own outline, and
      // writing a frozen copy of one would go stale the first time the page
      // is edited there.
      bumpLossy(ctx.tally, BLOCK_DROPPED);
      return null;

    case "blockRef": {
      const id = typeof block.props?.blockId === "string" ? block.props.blockId : "";
      const target = (node.blocks ?? []).find((candidate) => candidate.id === id);
      return target ? panelBlockToMarkdown(target, node, ctx) : null;
    }

    case "infobox": {
      // The frame is the thing that cannot travel; what it holds can. Its
      // blocks are written one after another where the frame was.
      const ids = Array.isArray(block.props?.blockIds)
        ? (block.props.blockIds as unknown[]).filter((id): id is string => typeof id === "string")
        : parseIdList(block.props?.blockIds);
      bumpLossy(ctx.tally, BLOCK_FLATTENED);
      const parts = ids
        .map((id) => (node.blocks ?? []).find((candidate) => candidate.id === id))
        .filter((candidate): candidate is Block => Boolean(candidate))
        .map((candidate) => panelBlockToMarkdown(candidate, node, ctx))
        .filter((part): part is string => Boolean(part));
      return parts.length > 0 ? parts.join("\n\n") : null;
    }

    default: {
      // An unknown block keeps its text rather than vanishing, the same
      // principle both halves of the `.lk` round trip apply.
      const text = inline();
      return text || null;
    }
  }
}

/**
 * The infobox stores its ids as a list; older documents stored them as one
 * comma-separated string. Read both rather than migrating on export.
 */
function parseIdList(value: unknown): string[] {
  return typeof value === "string" ? value.split(",").map((part) => part.trim()).filter(Boolean) : [];
}

/** Percent-encodes the parts of a path that would break a markdown link. */
export function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.replace(/[()<> ]/g, (char) => encodeURIComponent(char)))
    .join("/");
}

function tableToMarkdown(block: BlockNoteBlock, ctx: MarkdownPageContext): string | null {
  const content = block.content as { rows?: { cells?: unknown[] }[] } | undefined;
  const rows = Array.isArray(content?.rows) ? content.rows : [];
  if (rows.length === 0) return null;

  const cells = rows.map((row) => (Array.isArray(row.cells) ? row.cells : []).map((cell) => inlineToMarkdown(cell, ctx).replace(/\|/g, "\\|") || " "));
  const width = Math.max(...cells.map((row) => row.length));
  const pad = (row: string[]) => [...row, ...Array(width - row.length).fill(" ")];

  // Markdown has no table without a header row, so the first row becomes one.
  // That is a real change of meaning for a table that had no header, and it is
  // the only shape the format offers.
  const [header, ...body] = cells;
  return [`| ${pad(header).join(" | ")} |`, `| ${Array(width).fill("---").join(" | ")} |`, ...body.map((row) => `| ${pad(row).join(" | ")} |`)].join("\n");
}

/**
 * A run of blocks, with list items gathered so consecutive ones number and
 * indent together rather than each becoming a list of its own.
 */
export function blocksToMarkdown(blocks: unknown, ctx: MarkdownPageContext, headingShift: number, node: Node): string {
  if (!Array.isArray(blocks)) return "";
  const parts: string[] = [];
  let ordinal = 0;

  for (const raw of blocks as BlockNoteBlock[]) {
    if (!raw || typeof raw !== "object") continue;
    const text = blockToMarkdown(raw, ctx, headingShift, node);

    if (raw.type === "numberedListItem" || raw.type === "bulletListItem" || raw.type === "checkListItem") {
      ordinal = raw.type === "numberedListItem" ? ordinal + 1 : 0;
      const marker =
        raw.type === "numberedListItem" ? `${ordinal}. ` : raw.type === "checkListItem" ? `- [${raw.props?.checked ? "x" : " "}] ` : "- ";
      // Children of a list item are the nested list, indented under it.
      const nested = blocksToMarkdown(raw.children, ctx, headingShift, node);
      const item = `${marker}${text ?? ""}`;
      parts.push(nested ? `${item}\n${prefixLines(nested, "    ")}` : item);
      continue;
    }

    ordinal = 0;
    if (text) parts.push(text);
    // Children of anything else are already folded into its own conversion.
  }

  return parts.join("\n\n");
}

// ---- The page's own blocks ----

/**
 * One of the page's blocks, written flat.
 *
 * **The kinds that are only a view of something else are not here.** A
 * `property`, `tags` or `alias` block shows a value that already sits in the
 * front matter, and writing it twice would make the file disagree with itself
 * the first time somebody edited one of them. The schema says the same thing
 * from the other side: a block is a view, not storage, for anything that
 * exists elsewhere.
 */
export function panelBlockToMarkdown(block: Block, node: Node, ctx: MarkdownPageContext): string | null {
  const heading = block.showTitle === false ? "" : block.title?.trim() || "";
  const withHeading = (body: string) => (heading ? `**${escapeText(heading)}**\n\n${body}` : body);

  switch (block.kind) {
    case "property":
    case "tags":
    case "alias":
      return null;

    case "text":
      return block.text?.trim() ? withHeading(block.text.trim()) : null;

    case "image": {
      // One image block on a page is the page's own portrait and reads from
      // the node; every other one carries its own. `blockImage` in
      // `block-service.ts` is the app's answer to which, and this is the same
      // question — take the block's if it has one, the page's otherwise.
      const file = block.image ?? node.image;
      const path = file ? ctx.pictureAt(file) : null;
      if (!path) return null;
      // Falls through to the page's name rather than leaving `![]()`. An
      // empty alt is a picture with nothing to announce it, and every page
      // has at least a name worth saying.
      const alt = block.imageAlt || node.imageAlt || heading || node.name;
      return withHeading(`![${escapeText(alt)}](${encodePath(path)})`);
    }

    case "meter": {
      const style = meterStyleOf(block);
      const lines = metersOf(block).map((entry) => {
        const label = entry.label?.trim();
        const readout = isSpectrum(style) ? spectrumReadout(entry) : meterReadout(entry, style, showsMax(block));
        return label ? `- **${escapeText(label)}** — ${escapeText(readout)}` : `- ${escapeText(readout)}`;
      });
      if (lines.length === 0) return null;
      // A dial drawn as a number is the definition of flattened.
      bumpLossy(ctx.tally, BLOCK_FLATTENED);
      return withHeading(lines.join("\n"));
    }

    case "collection":
    case "link": {
      const rows = ctx.rowsFor(node, block);
      if (rows.length === 0) return null;
      bumpLossy(ctx.tally, BLOCK_FLATTENED);
      const lines = rows.map((row) => {
        const link = ctx.linkFor(row.id);
        return `- ${link ?? escapeText(row.name)}`;
      });
      return withHeading(lines.join("\n"));
    }

    default:
      return null;
  }
}

// ---- Front matter ----

/**
 * A YAML scalar that will read back as the string it started as.
 *
 * Always quoted rather than quoted-when-necessary. The rules for when a bare
 * YAML scalar is safe are long and full of traps — `no` is a boolean, `1.0` is
 * a number, a leading `@` is reserved — and a value that changes type on the
 * way back in is the kind of bug nobody finds until the reimport.
 */
function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function yamlList(values: string[]): string {
  return `[${values.map(yamlString).join(", ")}]`;
}

/** The printed form of a property value, by its spec — labels, never raw ids. */
function propertyText(spec: RenderableProperty, value: unknown, ctx: MarkdownPageContext): string | string[] | null {
  if (spec.type === "number") return typeof value === "number" && Number.isFinite(value) ? String(value) : null;

  if (spec.type === "refs") {
    const ids = Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
    // A reference is a link, so it stays one. Obsidian resolves a wikilink
    // inside front matter, which is what makes a character's Friends field
    // still clickable over there.
    const links = ids.map((id) => ctx.linkFor(id)).filter((link): link is string => Boolean(link));
    return links.length > 0 ? links : null;
  }

  if (spec.type === "select" || spec.type === "status" || spec.type === "multiselect") {
    const ids = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    const labels = ids
      .map((id) => (spec.options ?? []).find((option) => option.id === id)?.label)
      .filter((label): label is string => Boolean(label));
    if (labels.length === 0) return null;
    return spec.type === "multiselect" ? labels : labels.join(", ");
  }

  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

/**
 * A key YAML will hand back unchanged.
 *
 * Property labels are hers and can be anything — "Height (cm)", "Who?" — so
 * the key is quoted whenever it is not a plain word.
 */
function yamlKey(label: string): string {
  return /^[A-Za-z][A-Za-z0-9 _-]*$/.test(label) ? label : yamlString(label);
}

/**
 * Every property that has something to say, with its label and printed value.
 *
 * Shared so the two markdown exports print the same values in different
 * furniture: the vault puts them in front matter, and the one big file — which
 * can only have one front matter block, at the very top — puts them in a list
 * under each page's heading. Two copies of the label-resolution rules is how
 * one of them starts writing a UUID where a Status should be.
 */
export function printedProperties(node: Node, ctx: MarkdownPageContext): { label: string; printed: string | string[] }[] {
  const specs: RenderableProperty[] = [...getPropertySchema(node.templateKey), ...(node.customProperties ?? [])];
  const out: { label: string; printed: string | string[] }[] = [];
  for (const spec of specs) {
    const printed = propertyText(spec, node.properties[spec.key], ctx);
    if (printed === null) continue;
    out.push({ label: spec.label, printed });
  }
  return out;
}

export function frontMatterFor(node: Node, ctx: MarkdownPageContext): string {
  const lines: string[] = [];

  // `title` always, even though Obsidian shows the filename: a name with a
  // slash or a colon in it cannot be a filename, so the file is the only place
  // the real name would otherwise be lost.
  lines.push(`title: ${yamlString(node.name)}`);
  if (node.aliases?.length) lines.push(`aliases: ${yamlList(node.aliases)}`);
  if (node.tags.length > 0) lines.push(`tags: ${yamlList(node.tags)}`);
  // The label rather than the key: "Race" is what she sees, `race` is our
  // storage — and a key she never chose reads as a leak in her own file.
  const label = getTemplate(node.templateKey)?.label;
  if (label) lines.push(`template: ${yamlString(label)}`);
  // Only when true. A `hidden: false` on every page in the vault is noise
  // about a state almost nothing is in.
  if (node.hidden) lines.push("hidden: true");

  const portrait = node.image ? ctx.pictureAt(node.image) : null;
  if (portrait) lines.push(`image: ${yamlString(portrait)}`);
  const banner = node.banner ? ctx.pictureAt(node.banner) : null;
  if (banner) lines.push(`banner: ${yamlString(banner)}`);

  for (const { label: key, printed } of printedProperties(node, ctx)) {
    // A list goes through `yamlList` rather than being joined raw. Unquoted,
    // `[[[Kaine]]]` is a YAML sequence three deep instead of a one-item list
    // holding a wikilink, and a multi-select label with a comma in it would
    // silently become two options.
    lines.push(`${yamlKey(key)}: ${Array.isArray(printed) ? yamlList(printed) : yamlString(printed)}`);
  }

  return `---\n${lines.join("\n")}\n---`;
}

// ---- The whole page ----

/**
 * One page as the text of one `.md` file.
 *
 * **Tabs become `##` headings in this one file** (her call, 2026-09-10) — one
 * page stays one file, which is what somebody opening the vault expects.
 *
 * **A single-tab page gets no heading at all.** Most pages have one tab, and
 * printing its name over the writing would put a heading on every note in the
 * vault that says nothing.
 *
 * **The writing's own headings shift down a level when tab headings are
 * printed.** Otherwise a `#` written inside a tab would sit above the `##`
 * naming that tab, and the note's outline would come out inside out. The shift
 * is why `blockToMarkdown` takes it rather than reading a constant.
 */
export function pageToMarkdown(node: Node, ctx: MarkdownPageContext): string {
  // The note's title is its filename here, so nothing prints it — but it is
  // still notionally level 1, and everything below hangs off that.
  return `${[frontMatterFor(node, ctx), ...pageBody(node, ctx, 1)].join("\n\n")}\n`;
}

/**
 * The smallest heading level anywhere in a run of blocks, or null for prose
 * with no headings in it at all.
 *
 * Needed because *her* top level is not a fixed number. One page starts its
 * sections at `#` and another at `##`, and a fixed shift is right for one of
 * them and wrong for the other — see `pageBody`.
 */
function minHeadingLevel(blocks: unknown): number | null {
  if (!Array.isArray(blocks)) return null;
  let smallest: number | null = null;
  for (const block of blocks as BlockNoteBlock[]) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "heading") {
      const raw = block.props?.level;
      const level = Math.min(6, Math.max(1, typeof raw === "number" ? raw : 1));
      smallest = smallest === null ? level : Math.min(smallest, level);
    }
    const inside = minHeadingLevel(block.children);
    if (inside !== null) smallest = smallest === null ? inside : Math.min(smallest, inside);
  }
  return smallest;
}

/**
 * A page's tabs and its Details section, as markdown, under a title at
 * `titleLevel`.
 *
 * **The level is a parameter because the one big file needs it to be.** There
 * a page sits as deep in the headings as it sits in the tree, so the same page
 * is `##` in one export and `####` in another; the vault always passes 1.
 *
 * **A single-tab page gets no tab heading at all.** Most pages have one, and
 * printing its name over the writing would put a heading on every note that
 * says nothing.
 *
 * **The writing is shifted so *its own* top heading lands one below whatever
 * is above it, rather than by a fixed amount.** A fixed shift assumes her
 * sections start at a particular level, and they do not — one page uses `#`
 * and the next uses `##`. Shifting by a constant therefore either collides
 * with the tab heading above or buries the writing two levels too deep,
 * depending on the page. Measuring first is what makes both come out right.
 */
export function pageBody(node: Node, ctx: MarkdownPageContext, titleLevel: number): string[] {
  const tabs = node.tabs ?? [];
  const named = tabs.length > 1;
  const hash = (level: number) => "#".repeat(Math.min(6, level));
  // Tabs, and the Details section, are one below the page's title.
  const sectionLevel = titleLevel + 1;
  // The writing sits below the tab heading when there is one, and level with
  // the other sections when there is not.
  const contentBase = named ? sectionLevel + 1 : sectionLevel;

  const sections: string[] = [];

  for (const tab of tabs) {
    const smallest = minHeadingLevel(tab.content);
    const shift = smallest === null ? 0 : Math.max(0, contentBase - smallest);
    const body = blocksToMarkdown(tab.content, ctx, shift, node);
    if (!named && !body) continue;
    if (named) sections.push(`${hash(sectionLevel)} ${escapeText(tab.label)}${tab.hidden ? " *(hidden)*" : ""}`);
    if (body) sections.push(body);
  }

  // The page's own blocks that carry something of their own, after the
  // writing. A block that is only a view of a property is already in the front
  // matter — see `panelBlockToMarkdown`.
  const inWriting = new Set(referencedBlockIds(tabs));
  const panel = (node.blocks ?? [])
    .filter((block) => !inWriting.has(block.id))
    .map((block) => panelBlockToMarkdown(block, node, ctx))
    .filter((part): part is string => Boolean(part));

  if (panel.length > 0) {
    // Level with the tabs rather than with the page's title. A `#` here came
    // out *larger* than the sections above it and the outline read inside
    // out — seen in a real export before it was believed.
    sections.push(`${hash(sectionLevel)} Details`);
    sections.push(...panel);
  }

  return sections;
}

/**
 * The page's blocks that are already drawn inside the writing, so the Details
 * section does not print them a second time.
 *
 * A block can sit in the sidebar, in the page body or inside an infobox
 * (Phase 19.5) and it is the same record wherever it is — which is exactly why
 * this has to be checked rather than assumed.
 */
function referencedBlockIds(tabs: Node["tabs"]): string[] {
  const found: string[] = [];

  function walk(blocks: unknown): void {
    if (!Array.isArray(blocks)) return;
    for (const block of blocks as BlockNoteBlock[]) {
      if (!block || typeof block !== "object") continue;
      if (block.type === "blockRef" && typeof block.props?.blockId === "string") found.push(block.props.blockId);
      if (block.type === "infobox") {
        const ids = Array.isArray(block.props?.blockIds)
          ? (block.props.blockIds as unknown[]).filter((id): id is string => typeof id === "string")
          : parseIdList(block.props?.blockIds);
        found.push(...ids);
      }
      walk(block.children);
    }
  }

  for (const tab of tabs ?? []) walk(tab.content);
  return found;
}
