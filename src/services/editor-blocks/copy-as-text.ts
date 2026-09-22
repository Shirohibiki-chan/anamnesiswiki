// What a copied selection looks like as plain text (2026-09-22).
//
// BlockNote puts Markdown on the clipboard as `text/plain` — `# Heading`,
// `**bold**`, `* item`, and a backslash before every soft line break. That is
// right for Discord and wrong for a lorebook field, a character card or any
// other box that can only hold characters, which is where the measurement on
// 2026-09-21 found the complaints coming from (see `docs/ideas.md` § Import
// and paste fidelity). So there are two readings of a selection now, and the
// setting decides which one Ctrl+C leaves behind; see `copy-clipboard.ts`.
//
// **The rule this file follows: write down what is on screen, and nothing
// that isn't.** Bold, italic and a heading's rank are drawn rather than
// typed, so they go; a bullet is drawn too, but a line that was one of
// several bulleted lines stops looking like one without a mark in front of
// it, so it keeps the character it is drawn as — `•`, not Markdown's `*`.
// A number in a numbered list is information rather than decoration and
// stays. Nothing here ever emits a character that Markdown would read back
// as formatting, which is the anti-goal the whole entry is written against:
// losing formatting is recoverable, inventing it is not.
//
// **Separate from `markdown-page.ts` on purpose.** That converts a whole
// saved page for an export, from our own `Block` records. This reads a
// ProseMirror selection — half a sentence, three blocks, a cell — which is
// the only thing a copy has, and is the shape BlockNote hands the clipboard
// handler.
import type { Selection } from "prosemirror-state";

// `prosemirror-model` is BlockNote's own dependency rather than one of ours,
// so the two types this file works in are taken off the selection type the
// editor already exposes — the same route callout-caret.test.ts takes to a
// resolved position.
type Node = Selection["$from"]["parent"];
type Fragment = Node["content"];

/** The container BlockNote wraps every block in, and the group its children sit in. */
const BLOCK_CONTAINER = "blockContainer";
const BLOCK_GROUP = "blockGroup";

/** What a bullet is drawn as, so a copied list still reads as a list. */
const BULLET = "• ";
const TICKED = "☑ ";
const UNTICKED = "☐ ";

/** One line of the result, with what it needs to be joined to its neighbours. */
type Line = {
  text: string;
  /** Spaces standing in for how deeply the block was nested. */
  indent: string;
  /** The bullet, number or checkbox in front of it; empty for everything else. */
  marker: string;
  /** Whether it is an item of a list — items sit on consecutive lines, blocks get a blank line between them. */
  item: boolean;
};

/**
 * The words in an inline run — a paragraph's content, a cell's, a heading's.
 *
 * A soft break (Shift+Enter) is a line break here, which is what it looks
 * like. A mention gives the name it reads as, the way the search index and
 * the HTML export already read it (`html-page.ts` → `inlineText`); anything
 * else with no text of its own — an icon in a sentence — contributes none.
 */
function leafText(leaf: Node): string {
  if (leaf.type.name === "hardBreak") return "\n";
  const attrs = leaf.attrs as Record<string, unknown>;
  if (typeof attrs.text === "string") return attrs.text;
  if (typeof attrs.label === "string") return attrs.label;
  return "";
}

function textOf(node: Node): string {
  return node.textBetween(0, node.content.size, "\n", leafText);
}

/**
 * A table, as rows of tab-separated cells.
 *
 * Tabs because that is what every spreadsheet, and most plain boxes, read as
 * columns — the one place where a separator is doing the job a drawn line
 * does on screen rather than inventing formatting.
 */
function tableText(table: Node): string {
  const rows: string[] = [];
  table.descendants((node) => {
    if (node.type.name !== "tableRow") return true;
    const cells: string[] = [];
    node.forEach((cell) => cells.push(textOf(cell).trim()));
    rows.push(cells.join("\t"));
    return false;
  });
  return rows.join("\n");
}

/** The mark in front of a block's words, given what kind of block it is. */
function markerFor(content: Node, numberedAs: () => number): string {
  switch (content.type.name) {
    case "bulletListItem":
      return BULLET;
    case "checkListItem":
      return content.attrs.checked === true ? TICKED : UNTICKED;
    case "numberedListItem":
      return `${numberedAs()}. `;
    default:
      return "";
  }
}

const isItem = (content: Node): boolean =>
  content.type.name === "bulletListItem" || content.type.name === "numberedListItem" || content.type.name === "checkListItem";

function collect(fragment: Fragment, depth: number, lines: Line[]): void {
  // An inline selection — half a sentence, or a few words across two marks —
  // arrives as text nodes with no block around them, and is one line.
  if (fragment.firstChild?.isInline) {
    const text = fragment.textBetween(0, fragment.size, "\n", leafText);
    if (text) lines.push({ text, indent: "", marker: "", item: false });
    return;
  }

  // Where a numbered list is up to. Reset by anything that isn't the next
  // item of it, so two lists separated by a paragraph both start again.
  let counted = 0;

  fragment.forEach((node) => {
    const name = node.type.name;
    if (name === BLOCK_GROUP) {
      // The group at the top of a document or a slice is not a level of
      // nesting; the one inside a block container is, and that one is
      // recursed into from there with a deeper indent.
      collect(node.content, depth, lines);
      return;
    }
    if (name !== BLOCK_CONTAINER) {
      // A wrapper that is not a block of its own — a row of columns, a
      // column — whose blocks are the ones that matter.
      if (!node.isTextblock && node.content.size > 0) collect(node.content, depth, lines);
      else if (node.isTextblock) lines.push({ text: textOf(node), indent: "  ".repeat(depth), marker: "", item: false });
      counted = 0;
      return;
    }

    const content = node.firstChild;
    if (!content) return;

    const numbered = content.type.name === "numberedListItem";
    const marker = markerFor(content, () => {
      const start = typeof content.attrs.start === "number" ? content.attrs.start : 1;
      counted = counted === 0 ? start : counted + 1;
      return counted;
    });
    if (!numbered) counted = 0;

    const text = content.type.name === "table" ? tableText(content) : textOf(content);
    // A picture, a player or a page break has no words of its own. Its
    // caption is words and comes along; without one the block leaves nothing
    // behind rather than a blank line where something used to be.
    const wordless = !content.isTextblock && text === "";
    const caption = typeof content.attrs.caption === "string" ? content.attrs.caption.trim() : "";
    if (!wordless || caption) {
      lines.push({ text: wordless ? caption : text, indent: "  ".repeat(depth), marker, item: isItem(content) });
    }

    // A block's own children — an indented paragraph, a nested list — sit in
    // a group after its content.
    const last = node.childCount > 1 ? node.child(node.childCount - 1) : null;
    if (last && last.type.name === BLOCK_GROUP) collect(last.content, depth + 1, lines);
  });
}

/**
 * The selection as plain text.
 *
 * Blocks are separated by a blank line and list items are not, which is both
 * how they read and what survives the round trip: pasted back in, a blank
 * line is where one paragraph ends and the next begins, and an empty
 * paragraph somebody left there on purpose is still an empty line of its own.
 */
export function plainTextOf(fragment: Fragment): string {
  const lines: Line[] = [];
  collect(fragment, 0, lines);

  let out = "";
  lines.forEach((line, index) => {
    if (index > 0) out += lines[index - 1].item && line.item ? "\n" : "\n\n";
    out += line.indent + line.marker + line.text;
  });
  return out;
}
