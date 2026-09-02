// Ctrl+A, on a page that has columns on it. Phase 19.5.
//
// **Select-all stops working once a row of columns is on the page**, which she
// found and I could only confirm by measuring both cases in the running app:
//
// - no row on the page — Ctrl+A selects the writing, positions 3 to 1443;
// - a row on the page — Ctrl+A collapses the cursor to the *end* of the
//   document and selects nothing, so the Backspace after it deletes a single
//   character instead of the page.
//
// **The command itself is fine.** `selectAll` run directly on the same document
// produces exactly what it should, so what is broken is whatever handles the
// keystroke, not the editor's ability to select everything. Rather than chase
// that through a minified bundle, this binds the key to the command that works.
//
// Registered through BlockNote's own extension API, which is the documented way
// in — see CLAUDE.md on extending the editor rather than forking it.
import { createExtension } from "@blocknote/core";

export const selectAllExtension = createExtension(() => ({
  key: "anamnesisSelectAll",
  keyboardShortcuts: {
    // Returning true claims the key, so nothing further down gets to move the
    // cursor afterwards — which is what the broken handler was doing.
    "Mod-a": ({ editor }: { editor: { _tiptapEditor: { commands: { selectAll: () => boolean } } } }) => {
      editor._tiptapEditor.commands.selectAll();
      return true;
    },
  },
}));
