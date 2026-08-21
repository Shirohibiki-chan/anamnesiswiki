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

/**
 * Which suggestion typing `]]` should confirm, if any.
 *
 * **Never confirms a name that belongs to more than one page.** Taking the top
 * item is right when the typed name picks something out; when two pages are
 * both called ragatha it is a coin flip made silently, and the link lands on
 * whichever happened to sort first with nothing on screen saying a choice was
 * made. Her call, 2026-08-21: show both and let her pick.
 *
 * Only *exact* name ties are ambiguous. Several fuzzy matches are the ordinary
 * case — "val" matching Valera and Valeraverse — and guessing the top one is
 * exactly what typing the closing brackets is asking for. An exact match also
 * beats a fuzzy one that sorted above it, so a page literally called "Val"
 * wins over Valera.
 */
export function chooseWikilinkTarget<T extends { title: string; onItemClick: () => void }>(
  items: T[],
  typed: string,
): T | "none" | "ambiguous" {
  if (items.length === 0) return "none";
  const wanted = typed.trim().toLowerCase();
  const exact = items.filter((item) => item.title.toLowerCase() === wanted);
  if (exact.length > 1) return "ambiguous";
  return exact[0] ?? items[0];
}


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

    const typed = query.slice(0, -1);
    const items = filterSuggestionItems(getMentionMenuItems(editor, nodes, currentNodeId), typed);
    const choice = chooseWikilinkTarget(items, typed);

    if (choice === "none") return;
    // Ambiguous: swallow the bracket and leave the menu open on the list, so
    // the next Enter or click is a real answer rather than a coin flip.
    event.preventDefault();
    if (choice === "ambiguous") return;

    suggestionMenu.clearQuery();
    choice.onItemClick();
  };
}
