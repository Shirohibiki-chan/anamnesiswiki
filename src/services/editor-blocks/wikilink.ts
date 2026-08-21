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

// Scans the document for one completed `[[Name]]` run that matches a real
// node and replaces it with a mention. Only replaces one match per call —
// the pattern is gone from the document afterwards, so a second call (e.g.
// the re-entrant onChange this triggers) finds nothing left to do.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
export function resolveWikilinks(editor: BlockNoteEditor<any, any, any>, nodes: Record<string, Node>): void {
  for (const block of editor.document) {
    if (!Array.isArray(block.content)) continue;

    for (const item of block.content as TextItem[]) {
      if (item.type !== "text") continue;
      const match = WIKILINK_PATTERN.exec(item.text);
      if (!match) continue;

      const target = findNodeByName(nodes, match[1]);
      if (!target) continue;

      const before = item.text.slice(0, match.index);
      const after = item.text.slice(match.index + match[0].length);
      const replacement = [
        ...(before ? [{ type: "text", text: before, styles: item.styles }] : []),
        { type: "mention", props: { nodeId: target.id, label: target.name } },
        ...(after
          ? [{ type: "text", text: after, styles: item.styles }]
          : [{ type: "text", text: " ", styles: item.styles }]),
      ];
      const newContent = (block.content as unknown[]).flatMap((c) => (c === item ? replacement : [c]));
      editor.updateBlock(block.id, { content: newContent as never });
      return;
    }
  }
}
