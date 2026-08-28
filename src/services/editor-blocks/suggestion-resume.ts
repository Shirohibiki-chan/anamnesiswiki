// Reopens a suggestion menu when the cursor lands back inside a trigger that
// was typed and then abandoned.
//
// **BlockNote only opens these menus on freshly *typed* text** — see
// `handleTextInput` in @blocknote/core. So a `[[befo` or a bare `/` left on a
// line from an earlier attempt is inert: clicking back to the end of it does
// nothing, and the only way on is to delete it and type it again. This watches
// the selection instead, and when the cursor is sitting right after one of
// those, deletes the stale text and reopens the menu with the same query
// restored.
//
// **One hook for both triggers as of Phase 19.5**, when the `/` case was
// reported: it was written for `[[` first, and the second one arriving proved
// it was never about wikilinks. The two differ only in what counts as an
// unfinished trigger, which is the pattern each caller passes.
import { SuggestionMenu, type BlockNoteEditor } from "@blocknote/core";
import { useExtension } from "@blocknote/react";
import { useEffect } from "react";

/**
 * An unfinished `[[query` anywhere in the block.
 *
 * Unanchored at the start on purpose — `[[` is unusual enough in prose that
 * finding one mid-sentence is a real abandoned link, and the scan is already
 * scoped to the block the cursor is in.
 */
export const UNCLOSED_WIKILINK = /\[\[([^[\]]*)$/;

/**
 * A `/query` that is **the whole of the line so far**.
 *
 * **Anchored at both ends, and it has to match what typing does.** A slash only
 * opens the menu at the start of a line (see `slash-trigger.ts`, her call
 * 2026-08-28), so reopening it anywhere else would offer a menu that could never
 * have been typed there — and would do it while she moves the caret through her
 * own `and/or`, dates and paths, which is the behaviour she called insane.
 *
 * These two rules are one rule in two places. Loosen either and they disagree.
 */
export const UNFINISHED_SLASH = /^\/(\S*)$/;

/** Blocks where a trigger character is just a character. */
const NOT_A_TRIGGER = new Set(["codeBlock"]);

export function useSuggestionResume(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
  editor: BlockNoteEditor<any, any, any>,
  trigger: string,
  unfinished: RegExp,
) {
  const suggestionMenu = useExtension(SuggestionMenu, { editor });

  useEffect(() => {
    return editor.onSelectionChange(() => {
      if (suggestionMenu.shown()) return; // already open — normal typing already handles this

      const { selection } = editor._tiptapEditor.state;
      if (!selection.empty) return;

      // A slash in a code block is a slash. Read from the editor rather than
      // from the ProseMirror node so this keeps speaking the app's vocabulary.
      const here = editor.getTextCursorPosition().block;
      if (here && NOT_A_TRIGGER.has(here.type)) return;

      // Scope the scan to the current block only, so a trigger in an earlier
      // paragraph can never falsely match here.
      const blockStart = selection.from - selection.$from.parentOffset;
      const textBeforeCursor = editor._tiptapEditor.state.doc.textBetween(blockStart, selection.from);

      const match = unfinished.exec(textBeforeCursor);
      if (!match) return;

      const query = match[1];
      const triggerStart = selection.from - match[0].length;

      editor.transact((tr) => tr.delete(triggerStart, selection.from));
      suggestionMenu.openSuggestionMenu(trigger, { deleteTriggerCharacter: true });
      if (query) editor.insertInlineContent(query);
    });
  }, [editor, suggestionMenu, trigger, unfinished]);
}
