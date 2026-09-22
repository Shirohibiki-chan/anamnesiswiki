// What Ctrl+C leaves on the clipboard (2026-09-22).
//
// A copy out of the editor carries three things at once: BlockNote's own HTML
// (so a block pasted back into a page arrives as that block), ordinary HTML
// (so Word, Google Docs and email get the formatting), and plain text (for
// everything that can only hold characters). Only the third is in question —
// a rich target never sees it, and it is the one the botmakers' round trip
// dies in. BlockNote's answer is always Markdown; the setting makes it either
// Markdown or the words themselves, and `copy-as-text.ts` is the second
// reading.
//
// **This replaces BlockNote's copy handler rather than running beside it.**
// `useCreateBlockNote` is given `disableExtensions: ["copyToClipboard"]` —
// see `use-editor.ts` — because two handlers for one event is a race decided
// by plugin order, and the loser is silent. What is replaced is only the
// plumbing below; the three readings still come from BlockNote's own
// `selectedFragmentToHTML`, so nothing about how a block becomes HTML is
// forked here. Drag and drop is part of the same handler upstream and so is
// part of it here: a block dragged out of the page carries the same three.
import {
  createExtension,
  selectedFragmentToHTML,
  type BlockNoteEditor,
  type BlockSchema,
  type ExtensionOptions,
  type InlineContentSchema,
  type StyleSchema,
} from "@blocknote/core";
import { NodeSelection, Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { PlainCopyMode } from "../preferences-service";
import { plainTextOf } from "./copy-as-text";

/**
 * Generic over the schema the same way BlockNote's own clipboard helper is —
 * a page's editor carries the app's blocks, and a signature naming one
 * instantiation would not accept it.
 */
type AnyEditor<B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> = BlockNoteEditor<B, I, S>;

/**
 * The selection as one string, for the button that copies it the way the
 * setting is not set to. Empty when there is nothing selected to copy.
 */
export function copiedText<B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(
  editor: AnyEditor<B, I, S>,
  view: EditorView | undefined,
  mode: PlainCopyMode,
): string {
  if (!view || view.state.selection.empty) return "";
  if (mode === "markdown") return selectedFragmentToHTML(view, editor).markdown;
  return plainTextOf(view.state.selection.content().content);
}

/**
 * Whether the browser should be left to do the copying.
 *
 * Upstream's check, kept: a selection inside a block that is not editable —
 * the words of a page card, a caption being read rather than written — is the
 * browser's to copy, and an empty one is nothing at all. The state's selection
 * decides the empty case rather than `window.getSelection()`, which lies about
 * collapsed selections in a shadow root.
 */
function leaveItToTheBrowser(view: EditorView): boolean {
  if (view.state.selection.empty) return true;
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    let node = selection.focusNode;
    while (node) {
      if (node instanceof HTMLElement && node.getAttribute("contenteditable") === "false") return true;
      node = node.parentElement;
    }
  }
  return false;
}

/** Puts all three readings on whatever is carrying them — the clipboard, or a drag. */
function writeFlavours<B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(
  editor: AnyEditor<B, I, S>,
  view: EditorView,
  carrier: DataTransfer,
  mode: PlainCopyMode,
): void {
  // First, because it settles the selection for the block-without-content
  // case; the plain text is read off the selection afterwards.
  const { clipboardHTML, externalHTML, markdown } = selectedFragmentToHTML(view, editor);
  carrier.clearData();
  carrier.setData("blocknote/html", clipboardHTML);
  carrier.setData("text/html", externalHTML);
  carrier.setData("text/plain", mode === "markdown" ? markdown : plainTextOf(view.state.selection.content().content));
}

export const copyClipboardExtension = createExtension(({ editor, options }: ExtensionOptions<{ mode: () => PlainCopyMode }>) => ({
  key: "anamnesisCopyClipboard",
  prosemirrorPlugins: [
    new Plugin({
      props: {
        handleDOMEvents: {
          copy(view, event) {
            if (leaveItToTheBrowser(view)) return true;
            event.preventDefault();
            writeFlavours(editor, view, event.clipboardData!, options.mode());
            return true;
          },
          cut(view, event) {
            if (leaveItToTheBrowser(view)) return true;
            event.preventDefault();
            writeFlavours(editor, view, event.clipboardData!, options.mode());
            if (view.editable) view.dispatch(view.state.tr.deleteSelection());
            return true;
          },
          // A block dragged by itself — a picture, say — rather than by its
          // handle. Upstream's shape, including the widening from the block's
          // content to the block, which is what makes the drag carry a block
          // rather than the thing inside it.
          dragstart(view, event) {
            if (!("node" in view.state.selection)) return false;
            if ((view.state.selection.node as { type: { spec: { group?: string } } }).type.spec.group !== "blockContent") return false;
            editor.transact((tr) => tr.setSelection(new NodeSelection(tr.doc.resolve(view.state.selection.from - 1))));
            event.preventDefault();
            writeFlavours(editor, view, event.dataTransfer!, options.mode());
            return true;
          },
        },
      },
    }),
  ],
}));
