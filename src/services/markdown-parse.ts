// One markdown file read back into blocks (Phase 20) — the inverse of
// `markdown-page.ts`.
//
// **Obsidian's dialect, because that is what the export writes and what the
// people arriving from elsewhere have.** `> [!info]` is a callout, `> [!note]-`
// with a title is a collapsed toggle, `- [x]` is a task, `[[Name]]` is a link
// to a page and `![[picture.png]]` is a picture. Plain CommonMark is a subset
// of that, so a folder of ordinary `.md` files reads the same way.
//
// **This is a reader for the shapes that matter, not a CommonMark
// implementation.** Everything a person writes in a vault by hand and
// everything the export produces is covered; the corners of the spec — lazy
// continuation of a blockquote across an unmarked line, link reference
// definitions, indented code blocks — are read as the prose they look like.
// A line the reader does not recognise becomes a paragraph, which is the same
// principle both halves of the `.lk` round trip apply: the words survive even
// when the formatting does not.
//
// **Nothing here knows about pages, folders or the disk.** Links and pictures
// are resolved through `MarkdownParseContext`, so the whole converter is
// testable from a string — the same split `markdown-page.ts` makes from the
// other direction. `markdown-import.ts` is the half that knows the vault.
import { normalizeCodeLanguage } from "../constants/code-languages";

export type BlockSeed = Record<string, unknown>;
export type InlineSeed = Record<string, unknown>;

/** Tally keys this file counts under, read by the import's summary. */
export const CALLOUT_RETYPED = "calloutRetyped";
export const EMBED_FLATTENED = "embedFlattened";
export const LINK_UNRESOLVED = "linkUnresolved";
export const PICTURE_MISSING = "pictureMissing";

export type ParseTally = Map<string, number>;

export function bumpTally(tally: ParseTally, key: string): void {
  tally.set(key, (tally.get(key) ?? 0) + 1);
}

/** Everything about the rest of the vault that reading one file needs. */
export type MarkdownParseContext = {
  /**
   * The page a `[[target]]` reaches, as the props of a mention chip, or null
   * when nothing in the import answers to it. `label` is what the link was
   * written to read as, when that is not the target itself.
   */
  linkFor: (target: string, label?: string) => { nodeId: string; label: string; text?: string } | null;
  /**
   * What an image block should point at for this picture — an asset
   * reference for a file in the vault, the address itself for a web picture,
   * or null when the file is not there.
   */
  pictureFor: (target: string) => string | null;
  tally: ParseTally;
};

// ---- Front matter ----

export type YamlValue = string | number | boolean | YamlValue[];

/**
 * Splits the leading `---` block off, when there is one.
 *
 * Only at the very top, and only closed by a `---` (or `...`) on a line of its
 * own — a `---` further down is a divider and stays one.
 */
export function splitFrontMatter(text: string): {
  frontMatter: Record<string, YamlValue>;
  body: string;
} {
  const normalised = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!normalised.startsWith("---\n") && normalised !== "---") return { frontMatter: {}, body: normalised };

  const lines = normalised.split("\n");
  for (let i = 1; i < lines.length; i += 1) {
    if (/^(---|\.\.\.)\s*$/.test(lines[i])) {
      return {
        frontMatter: parseYamlSubset(lines.slice(1, i)),
        body: lines.slice(i + 1).join("\n"),
      };
    }
  }
  // Opened and never closed: the whole file is body, dashes and all.
  return { frontMatter: {}, body: normalised };
}

/**
 * The part of YAML front matter actually uses.
 *
 * `key: value` at the left margin, with the value a quoted or bare scalar, a
 * `[flow, list]`, or a block list of `- item` lines beneath the key. That is
 * everything the export writes and everything Obsidian's own property editor
 * writes. Nested maps, anchors and multi-line scalars are not read; a key
 * whose value cannot be understood is left out rather than guessed at.
 */
export function parseYamlSubset(lines: string[]): Record<string, YamlValue> {
  const out: Record<string, YamlValue> = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    i += 1;
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^:\s][^:]*?)\s*:(?:\s+(.*)|\s*)$/.exec(line);
    if (!match) continue;
    const key = unquoteScalar(match[1]);
    const rest = (match[2] ?? "").trim();

    if (!rest || rest === "|" || rest === ">") {
      // A block list beneath the key, or nothing at all.
      const items: YamlValue[] = [];
      while (i < lines.length && /^\s+-(\s|$)/.test(lines[i])) {
        items.push(parseScalar(lines[i].replace(/^\s+-\s?/, "")));
        i += 1;
      }
      if (items.length > 0) out[key] = items;
      continue;
    }

    if (rest.startsWith("#")) continue;
    out[key] = parseScalar(rest);
  }

  return out;
}

function unquoteScalar(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\(.)/g, (_match, char: string) => (char === "n" ? "\n" : char === "t" ? "\t" : char));
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

function parseScalar(raw: string): YamlValue {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]") && !value.startsWith("[[")) {
    return splitFlowList(value.slice(1, -1)).map(parseScalar);
  }
  if (value.startsWith('"') || value.startsWith("'")) return unquoteScalar(value);
  // A wikilink is a string however it is written; YAML would read the
  // brackets as nested lists.
  if (value.startsWith("[[")) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  // A trailing comment on a bare scalar.
  return value.replace(/\s+#.*$/, "");
}

/** Splits `a, "b, c", [[d]]` on the commas that are not inside anything. */
function splitFlowList(inner: string): string[] {
  const items: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;

  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    if (quote) {
      current += char;
      if (char === "\\" && quote === '"' && i + 1 < inner.length) {
        current += inner[i + 1];
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
    } else if (char === "[") {
      depth += 1;
      current += char;
    } else if (char === "]") {
      depth = Math.max(0, depth - 1);
      current += char;
    } else if (char === "," && depth === 0) {
      items.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) items.push(current);
  return items.map((item) => item.trim()).filter(Boolean);
}

/** A front matter value as the list of strings it was meant to be. */
export function yamlStrings(value: YamlValue | undefined): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap(yamlStrings);
  const text = String(value).trim();
  return text ? [text] : [];
}

// ---- Inline ----

/** A wikilink's target, split into the note and the part after `#` or `|`. */
export function splitWikilink(inner: string): {
  target: string;
  label?: string;
} {
  const bar = inner.indexOf("|");
  const rawTarget = bar === -1 ? inner : inner.slice(0, bar);
  const label = bar === -1 ? undefined : inner.slice(bar + 1).trim();
  // `Page#Heading` and `Page#^block` both point at the page; the anchor has
  // no equivalent here and is dropped.
  const hash = rawTarget.indexOf("#");
  const target = (hash === -1 ? rawTarget : rawTarget.slice(0, hash)).trim();
  return label ? { target, label } : { target };
}

type Styles = {
  bold?: true;
  italic?: true;
  strike?: true;
  underline?: true;
  code?: true;
};

function isPunctuation(char: string): boolean {
  return /[!-/:-@[-`{-~]/.test(char);
}

function pushText(out: InlineSeed[], text: string, styles: Styles): void {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.type === "text" && sameStyles(last.styles as Styles, styles)) {
    last.text = `${last.text as string}${text}`;
    return;
  }
  out.push({ type: "text", text, styles: { ...styles } });
}

function sameStyles(a: Styles, b: Styles): boolean {
  const keys: (keyof Styles)[] = ["bold", "italic", "strike", "underline", "code"];
  return keys.every((key) => Boolean(a[key]) === Boolean(b[key]));
}

/** Whether a delimiter run at `at` has a closing partner further on. */
function hasCloser(text: string, at: number, delimiter: string): boolean {
  const next = text.indexOf(delimiter, at + delimiter.length);
  return next !== -1 && next > at + delimiter.length;
}

/**
 * Inline markdown as BlockNote inline content.
 *
 * A delimiter opens a style when a matching closer exists later in the text
 * and closes it when that style is on; anything else is literal. That is
 * looser than CommonMark's left- and right-flanking rules and reads more of
 * what people actually type; a `*` followed by a space, as in `2 * 3`, is
 * never an opener, so arithmetic stays arithmetic.
 */
export function parseInline(text: string, ctx: MarkdownParseContext): InlineSeed[] {
  const out: InlineSeed[] = [];
  const styles: Styles = {};
  let buffer = "";
  const flush = () => {
    pushText(out, buffer, styles);
    buffer = "";
  };

  let i = 0;
  while (i < text.length) {
    const char = text[i];
    const rest = text.slice(i);

    if (char === "\\" && i + 1 < text.length && isPunctuation(text[i + 1])) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }

    // Code span: everything inside is literal, closed by a run of the same
    // length.
    if (char === "`") {
      const run = /^`+/.exec(rest)![0];
      const close = rest.indexOf(run, run.length);
      if (close !== -1) {
        flush();
        pushText(out, rest.slice(run.length, close).replace(/^ (.+) $/, "$1"), {
          ...styles,
          code: true,
        });
        i += close + run.length;
        continue;
      }
      buffer += run;
      i += run.length;
      continue;
    }

    // Obsidian's comments are for the writer, not the page.
    if (rest.startsWith("%%")) {
      const close = rest.indexOf("%%", 2);
      if (close !== -1) {
        i += close + 2;
        continue;
      }
    }

    // Pictures and note embeds inside a line: the text is kept, the picture
    // is not — a block can hold one, a sentence cannot.
    const embed = /^!\[\[([^\]]+)\]\]/.exec(rest) ?? /^!\[([^\]]*)\]\(([^)]*)\)/.exec(rest);
    if (embed) {
      const words = embed[0].startsWith("![[") ? (splitWikilink(embed[1]).label ?? splitWikilink(embed[1]).target) : embed[1] || embed[2];
      bumpTally(ctx.tally, EMBED_FLATTENED);
      buffer += words;
      i += embed[0].length;
      continue;
    }

    const wiki = /^\[\[([^\]]+)\]\]/.exec(rest);
    if (wiki) {
      const { target, label } = splitWikilink(wiki[1]);
      const resolved = target ? ctx.linkFor(target, label) : null;
      if (resolved) {
        flush();
        out.push({
          type: "mention",
          props: {
            nodeId: resolved.nodeId,
            label: resolved.label,
            ...(resolved.text ? { text: resolved.text } : {}),
          },
        });
      } else {
        // A link to a page that is not here reads as its words. The brackets
        // would otherwise sit in the prose as a link half-typed, and the
        // editor treats `[[` as the start of one.
        bumpTally(ctx.tally, LINK_UNRESOLVED);
        buffer += label ?? target;
      }
      i += wiki[0].length;
      continue;
    }

    const link = /^\[((?:[^[\]\\]|\\.)*)\]\(\s*<?([^)\s>]*)>?(?:\s+"[^"]*")?\s*\)/.exec(rest);
    if (link) {
      flush();
      const href = link[2];
      const content = parseInline(link[1], ctx).filter((item) => item.type === "text");
      if (href)
        out.push({
          type: "link",
          href,
          content: content.length > 0 ? content : [{ type: "text", text: href, styles: {} }],
        });
      else pushText(out, link[1], styles);
      i += link[0].length;
      continue;
    }

    const auto = /^<(https?:\/\/[^\s>]+)>/.exec(rest);
    if (auto) {
      flush();
      out.push({
        type: "link",
        href: auto[1],
        content: [{ type: "text", text: auto[1], styles: {} }],
      });
      i += auto[0].length;
      continue;
    }

    // The few HTML tags Obsidian honours and markdown has no mark for.
    const tag = /^<(\/?)(u|b|strong|i|em|s|del|br)\s*\/?>/i.exec(rest);
    if (tag) {
      const name = tag[2].toLowerCase();
      if (name === "br") {
        buffer += "\n";
      } else {
        flush();
        const key: keyof Styles = name === "u" ? "underline" : name === "b" || name === "strong" ? "bold" : name === "i" || name === "em" ? "italic" : "strike";
        if (tag[1]) delete styles[key];
        else styles[key] = true;
      }
      i += tag[0].length;
      continue;
    }

    // What is buffered was written under the styles as they were, so it is
    // pushed under those and only then does the delimiter change them.
    const before = { ...styles };
    const toggled = toggleDelimiter(text, i, styles);
    if (toggled) {
      pushText(out, buffer, before);
      buffer = "";
      i += toggled;
      continue;
    }

    buffer += char;
    i += 1;
  }

  flush();
  return out;
}

/**
 * Applies an emphasis delimiter at `at`, returning how many characters it
 * took, or 0 when the characters there are literal.
 *
 * Two-character runs are tried first so `**` is bold rather than two italics.
 * `_` only counts at a word edge, since `snake_case` is far more common in
 * her writing than `_emphasis_` — the same call the export makes.
 */
function toggleDelimiter(text: string, at: number, styles: Styles): number {
  const rest = text.slice(at);
  const candidates: { mark: string; key: keyof Styles | null }[] = [
    { mark: "**", key: "bold" },
    { mark: "__", key: "bold" },
    { mark: "~~", key: "strike" },
    // Obsidian's highlight has no style here; the marks go, the words stay.
    { mark: "==", key: null },
    { mark: "*", key: "italic" },
    { mark: "_", key: "italic" },
  ];

  for (const { mark, key } of candidates) {
    if (!rest.startsWith(mark)) continue;
    if (mark.startsWith("_")) {
      const before = at === 0 ? " " : text[at - 1];
      const after = text[at + mark.length] ?? " ";
      const open = !/[\p{L}\p{N}]/u.test(before) && /\S/.test(after);
      const close = /\S/.test(before) && !/[\p{L}\p{N}]/u.test(after);
      if (!open && !close) return 0;
    }
    if (key === null) return mark.length;
    if (styles[key]) {
      delete styles[key];
      return mark.length;
    }
    if (hasCloser(text, at, mark) && /\S/.test(text[at + mark.length] ?? "")) {
      styles[key] = true;
      return mark.length;
    }
    return 0;
  }
  return 0;
}

/** The words of a run of inline content, marks ignored. */
export function inlineText(content: InlineSeed[]): string {
  return content
    .map((item) => {
      if (item.type === "text") return item.text as string;
      if (item.type === "mention") return ((item.props as { text?: string; label?: string }).text || (item.props as { label?: string }).label) ?? "";
      if (item.type === "link") return inlineText((item.content as InlineSeed[]) ?? []);
      return "";
    })
    .join("");
}

// ---- Blocks ----

const FENCE = /^(\s{0,3})(`{3,}|~{3,})\s*(\S*)/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*(?:\s#+\s*)?$/;
const RULE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const EMPTY_LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s*$/;
const TASK = /^\[([ xX])\]\s+(.*)$/;
const TABLE_DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const IMAGE_LINE = /^\s*(?:!\[\[([^\]]+)\]\]|!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\))\s*$/;
const CAPTION_LINE = /^\s*[*_]([^*_].*?)[*_]\s*$/;
const CALLOUT = /^\[!([A-Za-z0-9_-]+)\]([-+]?)\s*(.*)$/;
const SETEXT = /^\s{0,3}(=+|-+)\s*$/;

/** A callout kind in Obsidian's vocabulary, as one of ours. */
const CALLOUT_KINDS: Record<string, { type: string; color?: string }> = {
  info: { type: "calloutInfo" },
  note: { type: "calloutInfo" },
  abstract: { type: "calloutInfo" },
  summary: { type: "calloutInfo" },
  tldr: { type: "calloutInfo" },
  todo: { type: "calloutInfo" },
  example: { type: "calloutInfo" },
  question: { type: "calloutInfo" },
  help: { type: "calloutInfo" },
  faq: { type: "calloutInfo" },
  tip: { type: "calloutInfo", color: "emerald" },
  hint: { type: "calloutInfo", color: "emerald" },
  important: { type: "calloutInfo", color: "emerald" },
  success: { type: "calloutInfo", color: "emerald" },
  check: { type: "calloutInfo", color: "emerald" },
  done: { type: "calloutInfo", color: "emerald" },
  caution: { type: "calloutInfo", color: "amber" },
  attention: { type: "calloutInfo", color: "amber" },
  danger: { type: "calloutInfo", color: "red" },
  error: { type: "calloutInfo", color: "red" },
  failure: { type: "calloutInfo", color: "red" },
  fail: { type: "calloutInfo", color: "red" },
  missing: { type: "calloutInfo", color: "red" },
  bug: { type: "calloutInfo", color: "red" },
  quote: { type: "calloutQuote" },
  cite: { type: "calloutQuote" },
  // The export writes a Secret as a warning — the one thing a reader has to
  // know about it is that it was not meant for them — so a warning is read
  // back as one. An Obsidian user's own warnings come in the same way; a
  // Secret is a callout like the others, only kept out of anything published.
  warning: { type: "calloutSecret" },
};

function isBlank(line: string): boolean {
  return !line.trim();
}

/** Whether this line starts something other than a paragraph. */
function startsBlock(line: string, next: string | undefined): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    LIST_ITEM.test(line) ||
    /^\s{0,3}>/.test(line) ||
    IMAGE_LINE.test(line) ||
    (line.trimStart().startsWith("|") && next !== undefined && TABLE_DELIMITER.test(next))
  );
}

/**
 * A run of lines as blocks.
 *
 * Line-based on purpose. Every block this reads starts at a line boundary,
 * and a reader that works a line at a time can hand a callout's or a list
 * item's inner lines to itself — which is how nesting works here without a
 * grammar.
 */
export function parseBlocks(rawLines: string[], ctx: MarkdownParseContext): BlockSeed[] {
  // Indentation is measured in spaces below, so a tab at the margin has to be
  // spaces before anything slices by the measurement.
  const lines = rawLines.map((line) => line.replace(/^\t+/, (tabs) => "    ".repeat(tabs.length)));
  const out: BlockSeed[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      i += 1;
      continue;
    }

    // Obsidian's block-level comment.
    if (line.trim().startsWith("%%") && line.trim().endsWith("%%") && line.trim().length > 3) {
      i += 1;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const [, , marker, language] = fence;
      const body: string[] = [];
      let j = i + 1;
      while (j < lines.length && !new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`).test(lines[j])) {
        body.push(lines[j]);
        j += 1;
      }
      out.push({
        type: "codeBlock",
        props: { language: normalizeCodeLanguage(language) },
        content: [{ type: "text", text: body.join("\n"), styles: {} }],
      });
      i = j + 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      out.push({
        type: "heading",
        props: { level: heading[1].length },
        content: parseInline(heading[2], ctx),
      });
      i += 1;
      continue;
    }

    if (RULE.test(line)) {
      out.push({ type: "divider" });
      i += 1;
      continue;
    }

    if (/^\s{0,3}>/.test(line)) {
      let j = i;
      const inner: string[] = [];
      while (j < lines.length && /^\s{0,3}>/.test(lines[j])) {
        inner.push(lines[j].replace(/^\s{0,3}> ?/, ""));
        j += 1;
      }
      out.push(...parseQuoted(inner, ctx));
      i = j;
      continue;
    }

    if (LIST_ITEM.test(line) || EMPTY_LIST_ITEM.test(line)) {
      const { items, consumed } = parseList(lines, i, ctx);
      out.push(...items);
      i += consumed;
      continue;
    }

    if (line.trimStart().startsWith("|") && i + 1 < lines.length && TABLE_DELIMITER.test(lines[i + 1])) {
      let j = i + 2;
      const rows = [line];
      while (j < lines.length && lines[j].includes("|") && !isBlank(lines[j])) {
        rows.push(lines[j]);
        j += 1;
      }
      out.push(parseTable(rows, ctx));
      i = j;
      continue;
    }

    const image = IMAGE_LINE.exec(line);
    if (image) {
      const block = imageBlock(image, ctx);
      // The line under a picture, in italics alone, is its caption — the way
      // the export writes one.
      const caption = i + 1 < lines.length ? CAPTION_LINE.exec(lines[i + 1]) : null;
      if (block) {
        if (caption) (block.props as Record<string, unknown>).caption = unescapeMarkdown(caption[1]);
        out.push(block);
      } else if (caption) {
        out.push({ type: "paragraph", content: parseInline(caption[1], ctx) });
      }
      i += caption ? 2 : 1;
      continue;
    }

    // Paragraph: up to the next blank line or the next thing that is not
    // prose. A `---` or `===` right under it is a setext heading, not a rule
    // — which is why the rule check above never sees one: the paragraph
    // claims it first.
    const paragraph: string[] = [line];
    let j = i + 1;
    while (j < lines.length && !isBlank(lines[j]) && !startsBlock(lines[j], lines[j + 1]) && !SETEXT.test(lines[j])) {
      paragraph.push(lines[j]);
      j += 1;
    }
    const underline = j < lines.length ? SETEXT.exec(lines[j]) : null;
    if (underline) {
      out.push({
        type: "heading",
        props: { level: underline[1].startsWith("=") ? 1 : 2 },
        content: parseInline(paragraph.join(" "), ctx),
      });
      i = j + 1;
      continue;
    }
    out.push({
      type: "paragraph",
      content: parseInline(joinParagraph(paragraph), ctx),
    });
    i = j;
  }

  return out;
}

/**
 * The lines of one paragraph as one string, line ends kept as hard breaks.
 *
 * Obsidian shows a single newline as a line break, and the export writes one
 * for every break in the writing, so a newline means a newline. The two
 * trailing spaces and the backslash CommonMark uses to ask for one are
 * already saying the same thing and are dropped.
 */
function joinParagraph(lines: string[]): string {
  return lines.map((line, index) => (index < lines.length - 1 ? line.replace(/( {2,}|\\)$/, "") : line).trim()).join("\n");
}

function unescapeMarkdown(text: string): string {
  return text.replace(/\\([!-/:-@[-`{-~])/g, "$1");
}

/**
 * The inside of a `>` block: a callout, a toggle, or a plain quote.
 *
 * A quote here is inline content, so each paragraph of a quoted passage
 * becomes its own quote block and anything that is not a paragraph — a list,
 * a heading — is kept as itself. Nothing is lost; the bar down the side is.
 */
function parseQuoted(inner: string[], ctx: MarkdownParseContext): BlockSeed[] {
  const first = inner[0] ?? "";
  const callout = CALLOUT.exec(first.trim());

  if (callout) {
    const kind = callout[1].toLowerCase();
    const collapsed = callout[2] === "-";
    const title = callout[3].trim();
    const rest = inner.slice(1);

    // The export's toggle: a collapsed note whose title is the toggle's own
    // line. Obsidian users write the same thing to mean the same thing.
    if (kind === "note" && collapsed) {
      const children = parseBlocks(rest, ctx);
      return [
        {
          type: "toggleListItem",
          content: parseInline(title, ctx),
          ...(children.length > 0 ? { children } : {}),
        },
      ];
    }

    const mapped = CALLOUT_KINDS[kind];
    // A warning is not counted: it is the map's own word for a Secret in
    // both directions, so a vault this app wrote comes back without a note
    // saying something changed when nothing did.
    if (!mapped) bumpTally(ctx.tally, CALLOUT_RETYPED);
    const target = mapped ?? { type: "calloutInfo" };

    // A callout holds one run of inline content. Its first paragraph is
    // that; the title, when there is one, leads it in bold, and whatever
    // else was inside follows as blocks after it — the same shape the `.lk`
    // importer gives LegendKeeper's panels.
    const blocks = parseBlocks(rest, ctx);
    const firstParagraph = blocks.findIndex((block) => block.type === "paragraph");
    const lead = firstParagraph === -1 ? [] : ((blocks[firstParagraph].content as InlineSeed[]) ?? []);
    const content: InlineSeed[] = [];
    if (title) {
      content.push({
        type: "text",
        text: unescapeMarkdown(title),
        styles: { bold: true },
      });
      if (lead.length > 0) content.push({ type: "text", text: "\n", styles: {} });
    }
    content.push(...lead);
    const after = blocks.filter((_block, index) => index !== firstParagraph);
    return [
      {
        type: target.type,
        ...(target.color ? { props: { color: target.color } } : {}),
        content,
      },
      ...after,
    ];
  }

  return parseBlocks(inner, ctx).map((block) => (block.type === "paragraph" ? { ...block, type: "quote" } : block));
}

/**
 * One list, from the item at `start` to the end of its run.
 *
 * An item's children are the lines under it indented further than its own
 * marker — Obsidian is lenient about how much further, and so is this. The
 * marker sets the kind: a bullet, a number, or a task box.
 */
function parseList(lines: string[], start: number, ctx: MarkdownParseContext): { items: BlockSeed[]; consumed: number } {
  const items: BlockSeed[] = [];
  let i = start;
  const firstMatch = (LIST_ITEM.exec(lines[start]) ?? EMPTY_LIST_ITEM.exec(lines[start]))!;
  const listIndent = firstMatch[1].length;

  while (i < lines.length) {
    const match = LIST_ITEM.exec(lines[i]) ?? EMPTY_LIST_ITEM.exec(lines[i]);
    if (!match || match[1].length !== listIndent) break;
    const [, , marker, rawText = ""] = match;

    // The item's own line, then everything under it.
    let text = rawText;
    const childLines: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      if (isBlank(next)) {
        // A blank line inside an item is fine as long as something indented
        // follows; otherwise the list has ended.
        let k = j;
        while (k < lines.length && isBlank(lines[k])) k += 1;
        if (k < lines.length && indentOf(lines[k]) > listIndent) {
          childLines.push(...lines.slice(j, k));
          j = k;
          continue;
        }
        break;
      }
      const indent = indentOf(next);
      if (indent > listIndent) {
        childLines.push(next);
        j += 1;
        continue;
      }
      // A line at the list's own margin that is not an item continues the
      // item's text, as it does in Obsidian.
      if (!LIST_ITEM.test(next) && !EMPTY_LIST_ITEM.test(next) && !startsBlock(next, lines[j + 1])) {
        text = `${text}\n${next.trim()}`;
        j += 1;
        continue;
      }
      break;
    }

    const dedent = Math.min(...childLines.filter((line) => !isBlank(line)).map(indentOf), Number.POSITIVE_INFINITY);
    const children =
      childLines.length > 0
        ? parseBlocks(
            childLines.map((line) => (isBlank(line) ? "" : line.slice(Math.min(dedent, indentOf(line))))),
            ctx,
          )
        : [];

    const task = TASK.exec(text);
    const numbered = /^\d/.test(marker);
    const type = task ? "checkListItem" : numbered ? "numberedListItem" : "bulletListItem";
    const item: BlockSeed = {
      type,
      content: parseInline(task ? task[2] : text, ctx),
    };
    if (task) item.props = { checked: task[1] !== " " };
    if (children.length > 0) item.children = children;
    items.push(item);
    i = j;
  }

  return { items, consumed: i - start };
}

function indentOf(line: string): number {
  return /^\s*/.exec(line)![0].replace(/\t/g, "    ").length;
}

function parseTable(rows: string[], ctx: MarkdownParseContext): BlockSeed {
  const cells = rows.map((row) =>
    splitCells(row.trim()).map((cell) => {
      const content = parseInline(cell.trim(), ctx);
      return content.length > 0 ? content : [];
    }),
  );
  const width = Math.max(...cells.map((row) => row.length));
  return {
    type: "table",
    content: {
      type: "tableContent",
      rows: cells.map((row) => ({
        cells: [...row, ...Array.from({ length: width - row.length }, () => [])],
      })),
    },
  };
}

/** The cells of one `| a | b |` row, honouring `\|` inside a cell. */
function splitCells(row: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inCode = false;
  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    if (char === "\\" && row[i + 1] === "|") {
      current += "|";
      i += 1;
    } else if (char === "`") {
      inCode = !inCode;
      current += char;
    } else if (char === "|" && !inCode) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  if (row.startsWith("|")) cells.shift();
  if (row.endsWith("|") && !row.endsWith("\\|")) cells.pop();
  return cells;
}

function imageBlock(match: RegExpExecArray, ctx: MarkdownParseContext): BlockSeed | null {
  const [, embed, alt, address] = match;
  let target: string;
  let altText = alt ?? "";
  let width: number | undefined;
  if (embed) {
    // `![[picture.png|300]]` — Obsidian's size hint, or `![[picture.png|alt]]`.
    const { target: file, label } = splitWikilink(embed);
    target = file;
    if (label && /^\d+$/.test(label)) width = Number(label);
    else if (label) altText = label;
  } else {
    target = decodeAddress(address);
  }

  const url = ctx.pictureFor(target);
  if (!url) {
    bumpTally(ctx.tally, PICTURE_MISSING);
    return null;
  }
  const props: Record<string, unknown> = { url };
  if (altText) props.alt = unescapeMarkdown(altText);
  if (width) props.previewWidth = width;
  return { type: "image", props };
}

/** A markdown link target as the path it names — `%20` back to a space. */
export function decodeAddress(address: string): string {
  try {
    return decodeURIComponent(address);
  } catch {
    return address;
  }
}
