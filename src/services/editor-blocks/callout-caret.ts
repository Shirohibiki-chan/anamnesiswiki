// A click beside a callout's words puts the caret in them.
//
// Found 2026-09-21 chasing "Enter at the end of a fresh Note page does
// nothing": the caret was never at the end of anything. Every block made
// with BlockNote's `createBlockSpec` is `isolating`, and ProseMirror's gap
// cursor treats the edge of an isolating block as a place a caret can sit
// *beside* the block rather than in it. A callout has padding and an icon
// between its border and its first word, so a click there lands on that
// edge, and what she gets is an invisible caret inside the block container
// but outside the block's text. Enter on it throws ("Cannot join blockGroup
// onto blockContainer") and nothing happens; Ctrl+End does not move it.
//
// Nobody clicking the coloured strip of a callout wants a caret beside it.
// So a gap cursor that lands inside a block container is moved into the
// nearest words: forward into the block's own text when it sits before the
// content, back into it when it sits after. Gap cursors *between* blocks —
// in the block group, where a caret beside a table or a picture is the
// only way to type before it — are left alone.
import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey, Selection } from "prosemirror-state";
import type { EditorState, Transaction } from "prosemirror-state";

const key = new PluginKey("anamnesisCalloutCaret");

/** The container BlockNote wraps every block in; a gap cursor inside one is the case above. */
const BLOCK_CONTAINER = "blockContainer";

/** The transaction that moves a stray gap cursor into words, or null when there is none to move. */
export function settleGapCursor(state: EditorState): Transaction | null {
  const { selection } = state;
  if (selection.toJSON().type !== "gapcursor") return null;
  const $pos = selection.$from;
  if ($pos.parent.type.name !== BLOCK_CONTAINER) return null;
  // Before the block's content, look forward into it; after, look back.
  const direction = $pos.index() === 0 ? 1 : -1;
  const words = Selection.findFrom($pos, direction, true) ?? Selection.findFrom($pos, -direction, true);
  return words ? state.tr.setSelection(words).setMeta(key, SETTLED) : null;
}

const SETTLED = "settled";

export const calloutCaretExtension = createExtension(() => ({
  key: "anamnesisCalloutCaret",
  prosemirrorPlugins: [
    new Plugin<boolean>({
      key,
      state: {
        init: () => false,
        apply: (tr) => tr.getMeta(key) === SETTLED,
      },
      appendTransaction: (_transactions, _oldState, newState) => settleGapCursor(newState),
      // The state now says the caret is in the words, but the browser's is
      // not there yet: ProseMirror holds off moving the drawn caret while a
      // mouse button is down on Chromium, and the click that made the gap
      // cursor was claimed by the gap cursor's own plugin, so the usual move
      // on release never comes. Left like that, End and Ctrl+End go nowhere
      // and typing lands beside the words. `focus()` is the one call that
      // forces the drawn caret to where the state says — after the click has
      // finished, not in the middle of it.
      view: () => ({
        update: (view) => {
          if (!key.getState(view.state)) return;
          view.focus();
          setTimeout(() => {
            if (key.getState(view.state)) view.focus();
          }, 0);
        },
      }),
    }),
  ],
}));
