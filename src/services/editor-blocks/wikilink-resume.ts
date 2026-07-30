// Resumes the "[[" suggestion menu when the cursor lands back inside an
// abandoned, unfinished "[[query" — BlockNote's trigger detection only fires
// on freshly *typed* text (see @blocknote/core's handleTextInput), so
// clicking back into leftover "[[befo" text from an earlier attempt does
// nothing on its own. This watches every selection change and, if the
// cursor sits right after an unclosed "[[query" with the menu not already
// open, deletes that stale text and reopens the menu with the same query
// restored, so the user can pick up exactly where they left off.
import { SuggestionMenu, type BlockNoteEditor } from "@blocknote/core";
import { useExtension } from "@blocknote/react";
import { useEffect } from "react";
import { WIKILINK_TRIGGER } from "./wikilink-bracket-confirm";

const UNCLOSED_WIKILINK_PATTERN = /\[\[([^[\]]*)$/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
export function useWikilinkResume(editor: BlockNoteEditor<any, any, any>) {
  const suggestionMenu = useExtension(SuggestionMenu, { editor });

  useEffect(() => {
    return editor.onSelectionChange(() => {
      if (suggestionMenu.shown()) return; // already open — normal typing already handles this

      const { selection } = editor._tiptapEditor.state;
      if (!selection.empty) return;

      // Scope the scan to the current block only, so a "[[" in an earlier
      // paragraph can never falsely match here.
      const blockStart = selection.from - selection.$from.parentOffset;
      const textBeforeCursor = editor._tiptapEditor.state.doc.textBetween(blockStart, selection.from);

      const match = UNCLOSED_WIKILINK_PATTERN.exec(textBeforeCursor);
      if (!match) return;

      const query = match[1];
      const wikilinkStart = selection.from - match[0].length;

      editor.transact((tr) => tr.delete(wikilinkStart, selection.from));
      suggestionMenu.openSuggestionMenu(WIKILINK_TRIGGER, { deleteTriggerCharacter: true });
      if (query) editor.insertInlineContent(query);
    });
  }, [editor, suggestionMenu]);
}
