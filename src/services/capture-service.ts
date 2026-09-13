// What a Quick capture block does with what was typed into it. Phase 30,
// step 1. See docs/plan.md.
//
// **Destinations are pages, because pages hold pages.** The block names one
// page — its own unless it says otherwise — and the places a thought can be
// filed are that page and the pages directly under it. A `Quick capture`
// page with `Magic`, `Story` and `Characters` inside it is the folder tree the
// reference dashboard used, made of the thing this app already has, and a
// captured page can be dragged out into the world proper once it has grown
// up. Nothing here is a folder-shaped object of its own — see CLAUDE.md, Data
// on disk.
//
// **A code word is a shortcut into the picker, not a second system.** Text
// that starts with a destination's name and a dash pre-selects that
// destination and loses the prefix; text that starts with anything else is
// kept whole and goes where the picker says. The reference version filed an
// unmatched word under "other" silently, and a typo vanishing into a bin is
// the failure this design exists to avoid. The picker is always the answer;
// the word only moves it.
import type { BlockNoteDocument, CustomPropertySpec, Node } from "../constants/schema";

/** The name of the field a captured page carries saying when it was written. */
export const CAPTURED_PROPERTY_LABEL = "Captured";

/** What the box says while it is empty. */
export const CAPTURE_PLACEHOLDER = "Write down a thought before it disappears…";

/** The fallback name for a page whose first line was empty. */
export const CAPTURE_UNTITLED = "A captured thought";

/**
 * The most a title takes before the rest goes into the body. The first line
 * *is* the title, and a line long enough to be a paragraph is one — it stays
 * in the page whole, and only its opening becomes the name.
 */
export const CAPTURE_TITLE_MAX_CHARS = 80;

export type CaptureDestination = {
  id: string;
  name: string;
  /** True for the page the destinations hang under, which is itself one of them. */
  isRoot: boolean;
};

/**
 * Where a block can file to: its root page first, then that page's own
 * children by name. By name rather than by the tree's order because this list
 * is typed into, and a list that is typed into is scanned alphabetically.
 *
 * The root is a destination too. "Just drop it here" is the honest default
 * for a block that has nothing under its page yet, and it is what makes a
 * fresh block work before anybody has made a single category.
 */
export function captureDestinations(nodes: Record<string, Node>, rootId: string): CaptureDestination[] {
  const root = nodes[rootId];
  if (!root) return [];
  const children = Object.values(nodes)
    .filter((node) => node.parentId === rootId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .map((node) => ({ id: node.id, name: node.name || "Untitled", isRoot: false }));
  return [{ id: root.id, name: root.name || "Untitled", isRoot: true }, ...children];
}

/** The destinations whose names contain what was typed, in the same order. */
export function filterDestinations(destinations: CaptureDestination[], query: string): CaptureDestination[] {
  const term = query.trim().toLowerCase();
  if (!term) return destinations;
  return destinations.filter((destination) => destination.name.toLowerCase().includes(term));
}

export type ParsedCapture = {
  /** The page's name: the first line, or its opening if the line ran long. */
  title: string;
  /** Every line the title did not take, in order, blank lines included between them. */
  body: string[];
  /** The destination a code word named, or undefined when no line opened with one. */
  codeWordId?: string;
};

// A hyphen, an en dash or an em dash, with room either side: `magic - a
// thought`, `magic — a thought`. The dash has to be followed by a space so a
// hyphenated name (`well-known`) is not read as a code word for `well`.
const CODE_WORD = /^\s*([^\n]+?)\s+[-–—](?:\s+(.*))?\s*$/;

/**
 * Reads the typed text into a title, a body and — if its first line opened
 * with a destination's name and a dash — the destination it named.
 *
 * Matching is the whole name, case-insensitively, and nothing looser: `mag -`
 * does not pick Magic. The picker beside the box does the narrowing; the code
 * word is for the moment somebody already knows the name and does not want to
 * reach for the mouse. A prefix that matches nothing is left in the text, so
 * a misspelt one shows up in the page's own title where it can be seen.
 */
export function parseCapture(text: string, destinations: CaptureDestination[]): ParsedCapture {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  // Leading blank lines are not a title.
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length === 0) return { title: CAPTURE_UNTITLED, body: [] };

  let first = lines[0];
  let codeWordId: string | undefined;
  const match = CODE_WORD.exec(first);
  if (match) {
    const word = match[1].trim().toLowerCase();
    const hit = destinations.find((destination) => destination.name.toLowerCase() === word);
    if (hit) {
      codeWordId = hit.id;
      first = match[2] ?? "";
    }
  }

  const rest = lines.slice(1);
  const trimmedFirst = first.trim();
  if (trimmedFirst === "") {
    // `magic -` and nothing after it on that line: the next line is the title.
    const parsedRest = parseCapture(rest.join("\n"), []);
    return { ...parsedRest, codeWordId };
  }

  if (trimmedFirst.length <= CAPTURE_TITLE_MAX_CHARS) {
    return { title: trimmedFirst, body: rest, codeWordId };
  }

  // A long first line stays in the page whole and lends its opening to the
  // name, cut at a word so the title does not end mid-syllable.
  const cut = trimmedFirst.slice(0, CAPTURE_TITLE_MAX_CHARS);
  const atWord = cut.lastIndexOf(" ");
  const title = (atWord > CAPTURE_TITLE_MAX_CHARS / 2 ? cut.slice(0, atWord) : cut).trimEnd() + "…";
  return { title, body: [trimmedFirst, ...rest], codeWordId };
}

/**
 * The body lines as a page's writing: one paragraph per line, blank lines
 * dropped. The same shape the Markdown importer writes, so a captured page
 * opens in the editor as ordinary paragraphs rather than as one block with
 * line breaks in it.
 */
export function captureDocument(body: string[]): BlockNoteDocument {
  return body
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => ({ type: "paragraph", content: [{ type: "text", text: line, styles: {} }] }));
}

/**
 * When a thought was captured, as text that sorts: `2026-09-13 14:05`, in
 * local time. A property rather than the filename, which is where the
 * reference put it — a tree of timestamps is unreadable, and a field a
 * database can sort by is what the time is actually for.
 */
export function captureStamp(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/** The field a captured page carries, matched by name across pages the way every custom field is. */
export function capturedPropertySpec(key: string): CustomPropertySpec {
  return { key, label: CAPTURED_PROPERTY_LABEL, type: "date" };
}
