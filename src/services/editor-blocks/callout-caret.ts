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
import type { EditorView } from "prosemirror-view";

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

/**
 * Puts the browser's caret where the state's selection is, and *in the text
 * node* there rather than on the element before it. `focus()` alone leaves
 * it at the element's edge — the same spot the click left it — and from that
 * spot End and Ctrl+End move nothing.
 */
function drawCaretInWords(view: EditorView): void {
  view.focus();
  const from = view.state.selection.from;
  let at: { node: globalThis.Node; offset: number };
  try {
    at = view.domAtPos(from);
  } catch {
    return;
  }
  if (at.node.nodeType === Node.TEXT_NODE) return;
  const after = at.node.childNodes[at.offset];
  const before = at.offset > 0 ? at.node.childNodes[at.offset - 1] : null;
  const selection = view.dom.ownerDocument.getSelection();
  if (after?.nodeType === Node.TEXT_NODE) selection?.collapse(after, 0);
  else if (before?.nodeType === Node.TEXT_NODE) selection?.collapse(before, before.textContent?.length ?? 0);
}

/**
 * Whether the browser's caret sits on an element rather than in a text node,
 * at the place the state's selection is — the leftover of the click above.
 * False when it is in text, or when it has been moved somewhere else.
 */
function caretOnAnEdge(view: EditorView): boolean {
  const selection = view.dom.ownerDocument.getSelection();
  const anchor = selection?.anchorNode;
  if (!anchor || !view.dom.contains(anchor)) return true;
  if (anchor.nodeType === Node.TEXT_NODE) return false;
  try {
    return view.posAtDOM(anchor, selection.anchorOffset) === view.state.selection.from;
  } catch {
    return true;
  }
}

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
      // The state now says the caret is in the words, but the drawn one is
      // not there yet: the click that made the gap cursor was claimed by the
      // gap cursor's own plugin, and what the browser is left holding is a
      // caret on the edge of the callout's content element rather than in
      // its text — a spot End and Ctrl+End cannot move from, and where typing
      // lands beside the words. `focus()` forces the drawn caret to where the
      // state says. Once now, and once more after the click has finished —
      // but that second time only if the caret is still on the edge: a key
      // pressed in between (Ctrl+End, say) has moved it on, and pulling it
      // back would undo the press.
      view: () => ({
        update: (view) => {
          if (!key.getState(view.state)) return;
          drawCaretInWords(view);
          setTimeout(() => {
            if (key.getState(view.state) && caretOnAnEdge(view)) drawCaretInWords(view);
          }, 0);
        },
      }),
    }),
  ],
}));
