// A link to one block: the item that copies one, and what happens at the other
// end of it. Phase 19.5.
//
// Two small components rather than two files: they are the two halves of one
// feature, and neither is meaningful without the other.
import { SideMenuExtension } from "@blocknote/core/extensions";
import { useBlockNoteEditor, useComponentsContext, useEditorDOMElement, useExtensionState } from "@blocknote/react";
import { useCallback, useContext, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { anchorLink } from "../../services/anchor-service";
import { copyText } from "../../services/clipboard-service";
import { useDialogs } from "../../hooks/use-dialogs";
// Through the hook, which is the only door into services/editor-blocks/ — see
// its header. The two services above are ordinary ones and come straight in.
import { BlockAnchorContext } from "../../hooks/use-editor";

/** How long a block stays marked — by a link landing on it, or by being copied. */
const ARRIVAL_MS = 2000;

/**
 * **Copy link to this block**, in the block's own menu.
 *
 * **In the menu rather than as a third icon in the row beside the block, and
 * that is a measurement rather than a preference.** The gutter a block's hover
 * controls sit in is 54px wide and holds exactly two of them; a third widens
 * the row until it covers the left edge of the writing — the strip a click
 * lands in to put the caret at the start of a line. Built that way first, and
 * it took that click over: a dozen scenarios that type into a page started
 * copying a link instead. The reference has room for three there; this app's
 * writing column does not.
 */
export function BlockAnchorMenuItem() {
  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor();
  const slot = useContext(BlockAnchorContext);
  const { showNotice } = useDialogs();
  // Which block the menu was opened against. BlockNote's own items read it the
  // same way — there is no prop for it.
  const block = useExtensionState(SideMenuExtension, { editor, selector: (state) => state?.block });

  const copy = useCallback(() => {
    if (!slot || !block) return;
    void copyText(anchorLink({ nodeId: slot.nodeId, blockId: block.id })).then((ok) => {
      // **The block is marked rather than the item saying anything.** The menu
      // shuts on the click, so there is nowhere in it left to say so — see the
      // context beside this. A failure is the other way round: nothing is on
      // the clipboard, and that is worth interrupting for.
      if (ok) slot.onCopied(block.id);
      else showNotice("Couldn't put the link on your clipboard.");
    });
  }, [block, showNotice, slot]);

  if (!slot || !block) return null;

  return (
    <Components.Generic.Menu.Item className="bn-menu-item" onClick={copy}>
      Copy link to this block
    </Components.Generic.Menu.Item>
  );
}

/**
 * The mark on a block: one a link has just been followed to, or one whose link
 * has just been copied.
 *
 * **Scrolled to and marked, not selected.** Putting the caret in the block
 * would mean following a link quietly moved where the next keystroke lands —
 * the same call the contents list makes, for the same reason. The mark is what
 * answers "which of these did I come here for" on a page of similar-looking
 * paragraphs, and it fades on its own rather than needing to be dismissed.
 *
 * **The mark is a box drawn over the block, not a class put on it, and that is
 * a fix rather than a preference.** The first cut added a class to the block's
 * own element; measured in the running app, the element was gone inside 50ms —
 * ProseMirror redraws the block when the click changes the selection, and
 * anything written onto its DOM goes with it. This tracks the block's rectangle
 * instead and draws beside the editor rather than inside it, which is the same
 * rule the columns work arrived at: do not write into the editor's DOM.
 *
 * **Rendered as an ordinary child**, so it can be given the block to find as a
 * prop — it is the side menu above that has to be a bare component type.
 */
export function BlockAnchorArrival({
  blockId,
  scroll,
  onArrived,
}: {
  blockId: string | null;
  /** False when the mark is only confirming a copy: the block is already where she is looking. */
  scroll: boolean;
  onArrived: () => void;
}) {
  const editorDom = useEditorDOMElement();
  const mark = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!blockId || !editorDom) return;
    const find = () => editorDom.querySelector(`[data-id="${CSS.escape(blockId)}"]`);
    // **A block that is not there is not an error.** The page opened, which is
    // most of what the link asked for; the store has already worked out that
    // some tab holds this block, and the only way to be here without it is a
    // document that changed underneath in between.
    const target = find();
    if (!target) {
      onArrived();
      return;
    }
    if (scroll) {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
    }

    // **Followed frame by frame, because the page is still moving.** The scroll
    // is animated, and the block is re-found each time rather than held onto —
    // see the note above about the element being replaced underneath.
    let frame = 0;
    const startedAt = performance.now();
    const draw = () => {
      const box = mark.current;
      const block = find();
      if (!box) return;
      if (!block || performance.now() - startedAt > ARRIVAL_MS) {
        onArrived();
        return;
      }
      const rect = block.getBoundingClientRect();
      const within = editorDom.getBoundingClientRect();
      // Scrolled away from while it was showing: the mark belongs over the
      // writing, not over the toolbar above it.
      const visible = rect.bottom > within.top && rect.top < within.bottom;
      box.style.display = visible ? "block" : "none";
      box.style.top = `${rect.top}px`;
      box.style.left = `${rect.left}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [blockId, editorDom, onArrived, scroll]);

  if (!blockId) return null;
  // Out at the top of the document rather than inside the editor: it is
  // positioned against the window, and an ancestor with a transform on it
  // would quietly move it somewhere else.
  return createPortal(<div ref={mark} className="block-anchor-arrival" />, document.body);
}
