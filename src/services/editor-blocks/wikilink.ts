// Converts a completed `[[Node Name]]` the user just typed into the same
// mention chip the "@" menu inserts. See docs/spec.md §BlockNote editor.
import type { BlockNoteEditor } from "@blocknote/core";
import type { Node } from "../../constants/schema";

// The editor here is deliberately typed `any, any, any` (this file doesn't
// know about the custom schema in editor-schema.ts), so inline content items
// are handled as this loose shape rather than the full generic union.
type TextItem = { type: "text"; text: string; styles: Record<string, unknown> };

const WIKILINK_PATTERN = /\[\[([^[\]]+)\]\]/;

// Only resolves when exactly one node has this name — same principle as
// Obsidian's wikilinks, which always ask you to pick when a name is
// ambiguous rather than silently guessing. If several pages share a name,
// the `[[Name]]` text is left alone; use the "@" mention menu instead, which
// lists every match so you can pick the right one explicitly.
function findNodeByName(nodes: Record<string, Node>, name: string): Node | undefined {
  const target = name.trim().toLowerCase();
  if (!target) return undefined;
  // Phase 18b: an alias is a name for this purpose, so `[[Val]]` reaches
  // Valera Jiang. A real name still wins outright — a page actually called
  // "Val" is not ambiguous just because somebody else answers to it.
  const named = Object.values(nodes).filter((node) => node.name.toLowerCase() === target);
  if (named.length === 1) return named[0];
  if (named.length > 1) return undefined;
  const aliased = Object.values(nodes).filter((node) =>
    (node.aliases ?? []).some((alias) => alias.toLowerCase() === target),
  );
  return aliased.length === 1 ? aliased[0] : undefined;
}

/**
 * One completed `[[Name]]` sitting in the document, and everything needed to
 * put something else in its place.
 *
 * Kept as a value rather than acted on where it is found, because there are now
 * two things that happen to one of these: it becomes a chip if a page answers
 * to the name, and it becomes an *offer to make that page* if none does. The
 * finding is the same work either way.
 */
type WikilinkHit = {
  blockId: string;
  item: TextItem;
  /** The block's whole content array, which the replacement is spliced into. */
  content: unknown[];
  name: string;
  before: string;
  after: string;
};

/**
 * Every completed `[[Name]]` in a block, in the order they appear.
 *
 * Scoped to one block rather than the document on purpose. Whole-document
 * scanning is right for turning names into chips — a paste can drop five of
 * them in at once, nowhere near the cursor. It is wrong for *asking a question*
 * about one: a page with `[[Something]]` typed in it as literal text would then
 * be interrupted about that text the moment anything else on the page was
 * edited. See `unknownWikilinkAt`.
 */
function hitsIn(block: { id: string; content?: unknown }): WikilinkHit[] {
  if (!Array.isArray(block.content)) return [];
  const hits: WikilinkHit[] = [];
  for (const item of block.content as TextItem[]) {
    if (item.type !== "text") continue;
    const match = WIKILINK_PATTERN.exec(item.text);
    if (!match) continue;
    hits.push({
      blockId: block.id,
      item,
      content: block.content as unknown[],
      name: match[1],
      before: item.text.slice(0, match.index),
      after: item.text.slice(match.index + match[0].length),
    });
  }
  return hits;
}

/** Swaps one hit for a mention chip pointing at `nodeId` and reading `label`. */
function replaceWithMention(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
  editor: BlockNoteEditor<any, any, any>,
  hit: WikilinkHit,
  nodeId: string,
  label: string,
  text?: string,
): void {
  const replacement = [
    ...(hit.before ? [{ type: "text", text: hit.before, styles: hit.item.styles }] : []),
    { type: "mention", props: { nodeId, label, text: text ?? "" } },
    ...(hit.after
      ? [{ type: "text", text: hit.after, styles: hit.item.styles }]
      : [{ type: "text", text: " ", styles: hit.item.styles }]),
  ];
  const newContent = hit.content.flatMap((c) => (c === hit.item ? replacement : [c]));
  editor.updateBlock(hit.blockId, { content: newContent as never });
}

// Scans the document for one completed `[[Name]]` run that matches a real
// node and replaces it with a mention. Only replaces one match per call —
// the pattern is gone from the document afterwards, so a second call (e.g.
// the re-entrant onChange this triggers) finds nothing left to do.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
export function resolveWikilinks(editor: BlockNoteEditor<any, any, any>, nodes: Record<string, Node>): void {
  for (const block of editor.document) {
    for (const hit of hitsIn(block)) {
      const target = findNodeByName(nodes, hit.name);
      if (!target) continue;
      replaceWithMention(editor, hit, target.id, target.name);
      return;
    }
  }
}

/**
 * The name in a completed `[[Name]]` that nothing in the project answers to,
 * in the block the cursor is in — or undefined if there is no such thing.
 *
 * **This is what makes writing the name of a page you have not written yet
 * mean something** (Phase 19.5). It used to mean nothing: `resolveWikilinks`
 * skipped what it could not resolve, so the brackets sat there as text and the
 * only way on was to go and make the page by hand, somewhere else.
 *
 * **Only the block the cursor is in**, which is the whole reason this is
 * separate from the scan above. Answering for the document would mean that a
 * page with literal `[[brackets]]` typed anywhere in it raised a dialog the
 * moment an unrelated paragraph was edited — a question about something she
 * wrote last week, triggered by something else entirely.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
export function unknownWikilinkAt(editor: BlockNoteEditor<any, any, any>, nodes: Record<string, Node>): string | undefined {
  const here = editor.getTextCursorPosition().block;
  if (!here) return undefined;
  for (const hit of hitsIn(here)) {
    if (!findNodeByName(nodes, hit.name)) return hit.name.trim() || undefined;
  }
  return undefined;
}

/**
 * Turns the `[[Name]]` the cursor's block holds into a chip for a page that now
 * exists — the other half of `unknownWikilinkAt`, after the page was made.
 *
 * Matched by name rather than by holding onto the hit, because the dialog is
 * open for as long as she takes over it and the document is not frozen while it
 * is. Doing nothing when the text has gone is the right answer: she deleted it,
 * and putting a chip back would be arguing with her.
 */
export function linkWikilink(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
  editor: BlockNoteEditor<any, any, any>,
  name: string,
  nodeId: string,
  label: string,
  text?: string,
): void {
  const wanted = name.trim().toLowerCase();
  for (const block of editor.document) {
    for (const hit of hitsIn(block)) {
      if (hit.name.trim().toLowerCase() !== wanted) continue;
      replaceWithMention(editor, hit, nodeId, label, text);
      return;
    }
  }
}
