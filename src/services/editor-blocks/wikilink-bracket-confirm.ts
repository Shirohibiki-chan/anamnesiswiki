// Lets typing the closing `]]` on a `[[Name` wikilink confirm the top
// matching suggestion — an alternative to Enter/click for the same "[["
// suggestion menu wired up in page/Editor.tsx. The first `]` is allowed to
// type normally (it becomes part of the live query); only the *second*
// consecutive `]` is intercepted, at which point the stray bracket already
// in the document is wiped by clearQuery() along with the rest of the
// "[[query" text, so no leftover brackets are ever left behind.
import { filterSuggestionItems, SuggestionMenu, type BlockNoteEditor } from "@blocknote/core";
import { useExtension, useExtensionState } from "@blocknote/react";
import type { Node } from "../../constants/schema";
import { getMentionMenuItems } from "./mention-menu-items";

export const WIKILINK_TRIGGER = "[[";

export function useWikilinkBracketConfirm(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
  editor: BlockNoteEditor<any, any, any>,
  nodes: Record<string, Node>,
  currentNodeId: string,
) {
  const suggestionMenu = useExtension(SuggestionMenu, { editor });
  const query = useExtensionState(SuggestionMenu, {
    editor,
    selector: (state) => (state?.triggerCharacter === WIKILINK_TRIGGER ? state.query : undefined),
  });

  // Structural rather than a React or DOM `KeyboardEvent`: this is no longer
  // wired straight to the element. use-editor composes it behind one capture
  // handler with the suggestion-list keys, and only these two members are what
  // this actually needs from the event.
  return function onKeyDownCapture(event: { key: string; preventDefault: () => void }) {
    if (event.key !== "]" || query === undefined || !query.endsWith("]")) return;

    const items = filterSuggestionItems(getMentionMenuItems(editor, nodes, currentNodeId), query.slice(0, -1));
    if (items.length === 0) return;

    event.preventDefault();
    suggestionMenu.clearQuery();
    items[0].onItemClick();
  };
}
