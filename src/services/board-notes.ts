// A sticky note on a board: a coloured square with words on it that take
// bold, italic and links. Phase 32, step 10.
//
// **A note is an embed drawn by the app**, the page card's and the bookmark
// card's mechanism: the library owns the box — where it is, how big, locked,
// grouped, undone, saved — and the app owns what is inside, kept on the
// element as `customData.note`. That is what makes rich words possible
// without touching the library's own text drawing, which lays out one
// style per box.
//
// **The words are runs, not HTML.** A run is a stretch of text with its
// marks; a line is runs; the note is lines. It is the app's own small shape
// rather than a string of markup because what is on the element is what a
// world handed to a player draws, and a shape with three named marks
// cannot carry a script or a style someone pasted in. The editor is a
// contenteditable box, so what it holds is read back into runs here from
// the DOM it made — through a node interface small enough to fake, since
// this file has no browser.
import { BOARD_NOTE_LINK, BOARD_PAGE_LINK_PREFIX } from "../constants/board";

/** The twelve colours a note comes in, in the order the picker shows them. */
export const NOTE_COLOURS = [
  "yellow",
  "orange",
  "red",
  "pink",
  "violet",
  "blue",
  "sky",
  "teal",
  "green",
  "lime",
  "grey",
  "white",
] as const;

export type NoteColour = (typeof NOTE_COLOURS)[number];

export const DEFAULT_NOTE_COLOUR: NoteColour = "yellow";

/** A stretch of a note's words in one style. A link is a page link or a web address. */
export type NoteRun = { text: string; bold?: true; italic?: true; link?: string };

export type NoteLine = NoteRun[];

/** What a note draws, as `customData.note` on the element. */
export type Note = { colour: NoteColour; lines: NoteLine[] };

/** The colour's name as the picker says it. */
export function noteColourName(colour: NoteColour): string {
  return colour.charAt(0).toUpperCase() + colour.slice(1);
}

export function emptyNote(colour: NoteColour): Note {
  return { colour, lines: [] };
}

/** Whether `element` is a note: an embed whose address is the note address. */
export function isNote(element: unknown): boolean {
  const record = element as { type?: unknown; link?: unknown };
  return record.type === "embeddable" && record.link === BOARD_NOTE_LINK;
}

/**
 * The note an element carries, or null for anything that is not one. Read
 * tolerantly: a colour the app does not know is the default, and a run
 * that is not a run is left out — a board file from a later version, or a
 * hand-edited one, draws a note rather than nothing.
 */
export function noteOf(element: unknown): Note | null {
  if (!isNote(element)) return null;
  const raw = (element as { customData?: { note?: unknown } }).customData?.note;
  const record = raw && typeof raw === "object" ? (raw as { colour?: unknown; lines?: unknown }) : {};
  const colour = (NOTE_COLOURS as readonly unknown[]).includes(record.colour) ? (record.colour as NoteColour) : DEFAULT_NOTE_COLOUR;
  const lines: NoteLine[] = Array.isArray(record.lines)
    ? record.lines.map((line): NoteLine => (Array.isArray(line) ? line.filter(isRun).map(cleanRun) : []))
    : [];
  return { colour, lines };
}

function isRun(value: unknown): value is NoteRun {
  return !!value && typeof value === "object" && typeof (value as { text?: unknown }).text === "string";
}

function cleanRun(run: NoteRun): NoteRun {
  const clean: NoteRun = { text: run.text };
  if (run.bold === true) clean.bold = true;
  if (run.italic === true) clean.italic = true;
  const link = typeof run.link === "string" ? noteLinkAllowed(run.link) : null;
  if (link) clean.link = link;
  return clean;
}

/**
 * A link a note's words may carry: a page link, or a web address. Anything
 * else — `javascript:`, a file, a relative path off a pasted page — is
 * dropped and the words stay plain.
 */
export function noteLinkAllowed(href: string): string | null {
  const trimmed = href.trim();
  if (trimmed.startsWith(BOARD_PAGE_LINK_PREFIX) && trimmed.length > BOARD_PAGE_LINK_PREFIX.length) return trimmed;
  return /^https?:\/\/\S+$/i.test(trimmed) ? trimmed : null;
}

/** The pages a note's words link to, each once, for the link index. */
export function notePageIds(note: Note): string[] {
  const found: string[] = [];
  for (const line of note.lines) {
    for (const run of line) {
      if (!run.link || !run.link.startsWith(BOARD_PAGE_LINK_PREFIX)) continue;
      const pageId = run.link.slice(BOARD_PAGE_LINK_PREFIX.length);
      if (!found.includes(pageId)) found.push(pageId);
    }
  }
  return found;
}

/** A note's words with the marks off, one line per line. */
export function noteText(note: Note): string {
  return note.lines.map((line) => line.map((run) => run.text).join("")).join("\n");
}

/** Whether a note has any words at all. */
export function noteIsEmpty(note: Note): boolean {
  return note.lines.every((line) => line.every((run) => run.text === ""));
}

// ---- The editor's DOM, read back into runs ----

/** The little of a DOM node the reader needs — the browser's nodes have all of it. */
export type NodeLike = {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  childNodes: ArrayLike<NodeLike>;
  getAttribute?: (name: string) => string | null;
};

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/** Elements that start a new line of their own — what the editor makes of Enter. */
const BLOCKS = new Set(["DIV", "P", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "TR"]);

/** Elements whose insides are never words. */
const SKIPPED = new Set(["SCRIPT", "STYLE", "TEMPLATE", "HEAD", "TITLE"]);

type Marks = { bold?: true; italic?: true; link?: string };

/**
 * The lines of a note, read off the editor's DOM.
 *
 * The editor is the browser's own contenteditable, which writes what it
 * likes: the first line as bare text under the root, each Enter as a
 * `<div>`, an empty line as a `<div>` with a `<br>` in it, bold as `<b>`
 * or a span with a font-weight, a trailing `<br>` as a placeholder that is
 * no line at all. All of that is read here into the one shape the note
 * keeps, and anything it does not name — an underline, a colour, a pasted
 * heading's size — is read as plain words.
 */
export function noteLinesFromDom(root: NodeLike): NoteLine[] {
  const lines: NoteLine[] = [[]];
  // Whether the last line is spoken for: it has words, or a block ended on
  // it (an empty `<div>` is an empty line she made). A block that starts
  // on a line spoken for starts a new one; on a fresh line it takes that.
  let used = false;
  const newLine = () => {
    lines.push([]);
    used = false;
  };
  const append = (text: string, marks: Marks) => {
    if (!text) return;
    used = true;
    const line = lines[lines.length - 1];
    const last = line[line.length - 1];
    if (last && last.bold === marks.bold && last.italic === marks.italic && last.link === marks.link) {
      last.text += text;
      return;
    }
    const run: NoteRun = { text };
    if (marks.bold) run.bold = true;
    if (marks.italic) run.italic = true;
    if (marks.link) run.link = marks.link;
    line.push(run);
  };
  const visit = (node: NodeLike, marks: Marks) => {
    if (node.nodeType === TEXT_NODE) {
      append((node.nodeValue ?? "").replace(/\u00a0/g, " ").replace(/\r?\n/g, ""), marks);
      return;
    }
    if (node.nodeType !== ELEMENT_NODE) return;
    const name = node.nodeName.toUpperCase();
    if (SKIPPED.has(name)) return;
    if (name === "BR") {
      newLine();
      return;
    }
    const isBlock = node !== root && BLOCKS.has(name);
    if (isBlock && used) newLine();
    const next: Marks = { ...marks, ...marksOf(name, node.getAttribute?.("style") ?? null) };
    if (name === "A") {
      const href = node.getAttribute?.("href");
      const link = href ? noteLinkAllowed(href) : null;
      if (link) next.link = link;
    }
    const children = node.childNodes;
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      // A `<br>` last in a block, or last of all, is the editor's
      // placeholder for a line's end and not a line of its own.
      const lastChild = index === children.length - 1;
      if (lastChild && (isBlock || node === root) && child.nodeType === ELEMENT_NODE && child.nodeName.toUpperCase() === "BR") continue;
      visit(child, next);
    }
    if (isBlock) used = true;
  };
  visit(root, {});
  return lines.length === 1 && lines[0].length === 0 ? [] : lines;
}

function marksOf(name: string, style: string | null): Marks {
  const marks: Marks = {};
  if (name === "B" || name === "STRONG") marks.bold = true;
  if (name === "I" || name === "EM") marks.italic = true;
  if (style) {
    if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) marks.bold = true;
    if (/font-style\s*:\s*italic/i.test(style)) marks.italic = true;
  }
  return marks;
}

// ---- Runs written as the editor's HTML ----

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * A note's lines as HTML the editor starts from: a `<div>` per line, the
 * three marks as the elements the reader knows, everything escaped. The
 * same shape the browser writes back, so an untouched note reads back
 * unchanged.
 */
export function noteHtml(lines: NoteLine[]): string {
  return lines
    .map((line) => {
      const inner = line.map(runHtml).join("");
      return `<div>${inner || "<br>"}</div>`;
    })
    .join("");
}

function runHtml(run: NoteRun): string {
  let html = escapeHtml(run.text);
  if (run.italic) html = `<em>${html}</em>`;
  if (run.bold) html = `<strong>${html}</strong>`;
  if (run.link) html = `<a href="${escapeHtml(run.link)}">${html}</a>`;
  return html;
}
