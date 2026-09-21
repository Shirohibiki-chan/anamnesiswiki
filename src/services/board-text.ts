// Bold, italic and links in a board's ordinary text. Phase 32, step 14.
//
// **The words carry their marks the way Markdown does** — `**bold**`,
// `*italic*` and `[label](address)` — inside the library's own text string.
// The library lays text out on a canvas one style per box, and its editor
// is a plain textarea, so the marks have to live in the string: the editor
// shows them as typed, and the drawing hides them and draws the runs (bold,
// slanted, underlined) through the patch in `scripts/excalidraw-patch.mjs`.
// The measuring the library does for wrapping and for a box's size goes
// through `hooks/board-text-metrics.ts`, which reads the runs from here, so
// a box is as wide as the drawn words and no wider. A link's address is a
// page link or a web address, as a note's is (`noteLinkAllowed`).
//
// **Reading the marks is forgiving in one direction only.** A star that
// could not be a mark — one before a space, one with no partner, a lone
// `*` in "5 * 3" — is a star and is drawn. A bracket that is not
// `[words](address)` with an address the app would follow is a bracket.
// Nothing here is ever wrong for plain words; it only ever finds marks
// that were meant.
import { noteLinkAllowed } from "./board-notes";
import { BOARD_PAGE_LINK_PREFIX } from "../constants/board";

/** A stretch of a text box's words in one style, the note's own shape. */
export type TextRun = { text: string; bold?: true; italic?: true; link?: string };

/** One line of a text box, as drawn: its runs, marks read out. */
export type TextLine = TextRun[];

/** The mark a toggle puts around the words: the bold pair or the italic star. */
export const BOLD_MARK = "**";
export const ITALIC_MARK = "*";

/** Whether `text` can hold a mark at all — the cheap test before parsing. */
export function hasMarks(text: string): boolean {
  return /[*[]/.test(text);
}

const WHITESPACE = /\s/;

/**
 * The lines of `text`, marks read into runs. One entry per line of the
 * text, the marks hidden, runs alike merged; a mark may run over a line
 * break, since the library wraps the words with breaks of its own.
 */
export function richLines(text: string): TextLine[] {
  const lines: TextLine[] = [[]];
  if (!hasMarks(text)) {
    return text.split("\n").map((line) => (line ? [{ text: line }] : []));
  }
  let bold = false;
  let italic = false;
  let link: string | undefined;
  let linkEnd = -1;
  let linkAfter = -1;
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    const run: TextRun = { text: buffer };
    if (bold) run.bold = true;
    if (italic) run.italic = true;
    if (link) run.link = link;
    lines[lines.length - 1].push(run);
    buffer = "";
  };
  let at = 0;
  while (at < text.length) {
    if (at === linkEnd) {
      flush();
      link = undefined;
      at = linkAfter;
      linkEnd = -1;
      continue;
    }
    const char = text[at];
    if (char === "\n") {
      flush();
      lines.push([]);
      at += 1;
      continue;
    }
    if (char === "[" && !link) {
      const found = linkAt(text, at);
      if (found) {
        flush();
        link = found.href;
        linkEnd = found.labelEnd;
        linkAfter = found.end;
        at += 1;
        continue;
      }
    }
    if (char === "*") {
      if (text[at + 1] === "*") {
        if (bold ? closes(text, at) : opensBold(text, at)) {
          flush();
          bold = !bold;
        } else {
          buffer += "**";
        }
        at += 2;
        continue;
      }
      if (italic ? closes(text, at) : opensItalic(text, at)) {
        flush();
        italic = !italic;
        at += 1;
        continue;
      }
    }
    buffer += char;
    at += 1;
  }
  flush();
  return lines;
}

/** A closing mark stands right after a word, never after a space. */
function closes(text: string, at: number): boolean {
  return at > 0 && !WHITESPACE.test(text[at - 1]);
}

/** `**` opens bold when a word follows it — or italic's star and then a word, `***both***` — and a closing `**` comes later. */
function opensBold(text: string, at: number): boolean {
  let next = text[at + 2];
  let from = at + 3;
  if (next === "*") {
    next = text[at + 3];
    from = at + 4;
  }
  if (next === undefined || WHITESPACE.test(next) || next === "*") return false;
  for (let scan = from; scan < text.length - 1; scan += 1) {
    if (text[scan] === "*" && text[scan + 1] === "*" && closes(text, scan)) return true;
  }
  return false;
}

/** `*` opens italic when a word follows it and a closing lone `*` comes later — a `**` on the way is bold's. */
function opensItalic(text: string, at: number): boolean {
  const next = text[at + 1];
  if (next === undefined || WHITESPACE.test(next) || next === "*") return false;
  for (let scan = at + 2; scan < text.length; scan += 1) {
    if (text[scan] !== "*") continue;
    if (text[scan + 1] === "*") {
      scan += 1;
      continue;
    }
    if (closes(text, scan)) return true;
  }
  return false;
}

/**
 * `[label](address)` starting at `at`, or null: the label has words in it
 * and no bracket, and the address — line breaks the wrapping put into it
 * taken out — is one the app would follow.
 */
function linkAt(text: string, at: number): { href: string; labelEnd: number; end: number } | null {
  const labelEnd = text.indexOf("](", at + 1);
  if (labelEnd === -1) return null;
  const label = text.slice(at + 1, labelEnd);
  if (!label.trim() || label.includes("[") || label.includes("]")) return null;
  const close = text.indexOf(")", labelEnd + 2);
  if (close === -1) return null;
  const href = noteLinkAllowed(text.slice(labelEnd + 2, close).replace(/\n/g, ""));
  return href ? { href, labelEnd, end: close + 1 } : null;
}

/** The words with the marks off, one line per line — what a list or an export shows. */
export function plainText(text: string): string {
  return richLines(text)
    .map((line) => line.map((run) => run.text).join(""))
    .join("\n");
}

/** The pages the words link to, each once, for the link index. */
export function textPageIds(text: string): string[] {
  const found: string[] = [];
  if (!text.includes("](")) return found;
  for (const line of richLines(text)) {
    for (const run of line) {
      if (!run.link || !run.link.startsWith(BOARD_PAGE_LINK_PREFIX)) continue;
      const pageId = run.link.slice(BOARD_PAGE_LINK_PREFIX.length);
      if (!found.includes(pageId)) found.push(pageId);
    }
  }
  return found;
}

// ---- Measuring: what the library asks, answered run by run ----

/** A width in the drawing's units for `text` set in `font`, the canvas's own measure. */
export type TextMeasure = (text: string, font: string) => number;

/**
 * The library's font string with a run's marks on the front — the one
 * composition the measuring and the drawing share, so a bold word is as
 * wide when measured as when drawn.
 */
export function runFont(font: string, run: TextRun): string {
  return `${run.italic ? "italic " : ""}${run.bold ? "bold " : ""}${font}`;
}

/** The width of a drawn line: its runs end to end, each in its own font. */
export function lineWidth(line: TextLine, font: string, measure: TextMeasure): number {
  return line.reduce((width, run) => width + measure(run.text, runFont(font, run)), 0);
}

/**
 * The width the library asks for, for wrapping and for the box: the marks
 * hidden and a bold run measured bold. A line without a mark is measured
 * whole, the way the library would.
 */
export function measuredLineWidth(text: string, font: string, measure: TextMeasure): number {
  if (!hasMarks(text)) return measure(text, font);
  return richLines(text).reduce((widest, line) => Math.max(widest, lineWidth(line, font, measure)), 0);
}

// ---- The editor's box: marks put on and taken off the selection ----

export type Selection = { value: string; start: number; end: number };

/**
 * `mark` put around the selected words, or taken off them when it is
 * already there — either side of the selection or inside it. Bold is two
 * stars and italic one, and both together are three, so what is there is
 * read by counting the stars: two or more is bold, an odd number is
 * italic. With nothing selected, an empty pair with the caret between,
 * ready to type into. Spaces at the selection's edges are left outside
 * the pair, since a mark against a space is no mark.
 */
export function toggledMark(selection: Selection, mark: string): Selection {
  const { value } = selection;
  let { start, end } = selection;
  if (start > end) [start, end] = [end, start];
  while (start < end && WHITESPACE.test(value[start])) start += 1;
  while (end > start && WHITESPACE.test(value[end - 1])) end -= 1;
  const size = mark.length;
  const wanted = size === 2 ? "bold" : "italic";
  const outside = Math.min(starsBefore(value, start), starsAfter(value, end));
  if (hasMark(outside, wanted)) {
    return { value: value.slice(0, start - size) + value.slice(start, end) + value.slice(end + size), start: start - size, end: end - size };
  }
  const inside = value.slice(start, end);
  const lead = starsAfter(inside, 0);
  const trail = starsBefore(inside, inside.length);
  const within = inside.length >= lead + trail ? Math.min(lead, trail) : 0;
  if (hasMark(within, wanted)) {
    return { value: value.slice(0, start) + inside.slice(size, inside.length - size) + value.slice(end), start, end: end - size * 2 };
  }
  return { value: value.slice(0, start) + mark + inside + mark + value.slice(end), start: start + size, end: end + size };
}

/** Whether `stars` on each side of some words mean the mark: two or more is bold, an odd number is italic. */
function hasMark(stars: number, mark: "bold" | "italic"): boolean {
  return mark === "bold" ? stars >= 2 : stars % 2 === 1;
}

/** How many stars stand right before `at`, up to the three both marks make. */
function starsBefore(value: string, at: number): number {
  let count = 0;
  while (count < 3 && at - count - 1 >= 0 && value[at - count - 1] === "*") count += 1;
  return count;
}

/** How many stars stand right after `at`, up to three. */
function starsAfter(value: string, at: number): number {
  let count = 0;
  while (count < 3 && value[at + count] === "*") count += 1;
  return count;
}

/**
 * The selected words made a link to `href`, or `label` put in linked at
 * the caret when nothing is selected; the caret lands after the link. A
 * space at the selection's edge is left where it was, outside the link.
 */
export function linkedWords(selection: Selection, href: string, label: string): Selection {
  const { value } = selection;
  let { start, end } = selection;
  if (start > end) [start, end] = [end, start];
  // Spaces at the selection's edges stay outside the link, and stay.
  while (start < end && WHITESPACE.test(value[start])) start += 1;
  while (end > start && WHITESPACE.test(value[end - 1])) end -= 1;
  const words = value.slice(start, end) || label;
  const markup = `[${words}](${href})`;
  const after = start + markup.length;
  return { value: value.slice(0, start) + markup + value.slice(end), start: after, end: after };
}

// ---- A click on a drawn link ----

/** The little of a text element the hit test reads. */
export type TextBoxLike = {
  type?: string;
  isDeleted?: boolean;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  fontSize?: number;
  lineHeight?: number;
  textAlign?: string;
};

/**
 * The address of the link drawn under `point` (in the drawing's own
 * coordinates), or null. The run boxes are laid out here as the drawing
 * lays them — the same runs, the same fonts, the line height the element
 * carries — so the test is against where the words actually are. The
 * topmost text box wins; `font` is the library's font string for a box.
 */
export function textLinkAt<T extends TextBoxLike>(elements: readonly T[], point: { x: number; y: number }, measure: TextMeasure, font: (element: T) => string): string | null {
  let found: string | null = null;
  for (const element of elements) {
    if (element.type !== "text" || element.isDeleted || typeof element.text !== "string" || !element.text.includes("](")) continue;
    if (typeof element.fontSize !== "number" || typeof element.lineHeight !== "number") continue;
    const local = localPoint(element, point);
    if (local.x < 0 || local.y < 0 || local.x > element.width || local.y > element.height) continue;
    const lines = richLines(element.text);
    const lineHeightPx = element.fontSize * element.lineHeight;
    const line = lines[Math.floor(local.y / lineHeightPx)];
    if (!line) continue;
    const base = font(element);
    const widths = line.map((run) => measure(run.text, runFont(base, run)));
    const total = widths.reduce((sum, width) => sum + width, 0);
    let x = element.textAlign === "center" ? (element.width - total) / 2 : element.textAlign === "right" ? element.width - total : 0;
    line.forEach((run, index) => {
      if (run.link && local.x >= x && local.x < x + widths[index]) found = run.link;
      x += widths[index];
    });
  }
  return found;
}

/** `point` in the box's own coordinates: from its top-left corner, its turn undone. */
function localPoint(box: TextBoxLike, point: { x: number; y: number }): { x: number; y: number } {
  const centreX = box.x + box.width / 2;
  const centreY = box.y + box.height / 2;
  const angle = box.angle ?? 0;
  const dx = point.x - centreX;
  const dy = point.y - centreY;
  return {
    x: dx * Math.cos(-angle) - dy * Math.sin(-angle) + box.width / 2,
    y: dx * Math.sin(-angle) + dy * Math.cos(-angle) + box.height / 2,
  };
}
