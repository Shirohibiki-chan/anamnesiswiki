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
 * A `/query` that begins a line, or follows a space, with nothing after it.
 *
 * **The lookbehind is the whole design.** A slash is ordinary punctuation —
 * `and/or`, `12/05`, a path, the end of `at this scale.` — so a rule that
 * matched one anywhere would have the menu opening as she moved the caret
 * through her own writing. Requiring the start of a line or a space before it,
 * and no space after, leaves only a command somebody typed and abandoned. That
 * is the case reported: click back onto a row with a `/` at the front and
 * nothing happened.
 *
 * **Deliberately stricter than BlockNote's own trigger**, which was measured
 * 2026-08-28 to open the menu for a `/` typed straight after a full stop.
 * Reopening is not typing: she is moving a caret, not asking for anything, so
 * the bar for interrupting her is higher than the bar for answering a keypress.
 */
export const UNFINISHED_SLASH = /(?<=^|\s)\/(\S*)$/;

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
