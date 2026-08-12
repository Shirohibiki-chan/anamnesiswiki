// Dropping a picture from the Assets tab into a page.
//
// The other half of the sidebar's drag — see `AssetsPanel.tsx`. It reuses the
// file that's already in `assets/` rather than writing a second copy of the
// same bytes, which is the whole point of the library: one map on six pages is
// one file. See docs/plan.md Phase 17.
//
// **Native listeners on the capture phase, not React handlers**, for the same
// reason the lightbox's double-click is (see use-lightbox.ts): ProseMirror runs
// its own drop handling inside this subtree and would take the event first —
// it has real behaviour for a drop, so this isn't a theoretical clash. Capture
// runs before any of it, and `stopPropagation` there is what keeps the two
// from both acting on one drop.
import { useEffect, useRef, type RefObject } from "react";
import { ASSET_DRAG_TYPE } from "../constants/paths";
import { assetRef } from "../services/asset-urls";

/** BlockNote's own attribute on a block element — see services/page-images.ts. */
const BLOCK_ID_SELECTOR = "[data-id]";

/**
 * The reading column, which is what actually gets the listeners.
 *
 * **Not the editor's own wrapper, and that's the fix for a real complaint.**
 * BlockNote's editable area shrink-wraps its content and `.page-view` keeps its
 * page margin *outside* it, so on a short page the bottom band of the window
 * belonged to nobody — and the bottom is exactly where you aim when you mean
 * "put it after everything". The pointer left the target and the drag went to
 * the no-entry cursor with the window edge still 30px away.
 *
 * `.page-view` is the whole column top to bottom, so the margin, the title and
 * the tab strip all accept a drop now. The banner is deliberately outside it —
 * it's a sibling, not an ancestor — because dropping a picture on a banner
 * reads as *setting* the banner, and quietly shoving it into the writing
 * instead would be worse than refusing.
 */
const DROP_SURFACE_SELECTOR = ".page-view";

export type InsertAt = { blockId: string } | "start" | "end";

/**
 * Where a drop at these coordinates should put the picture.
 *
 * The block under the pointer, so it lands where she aimed rather than at the
 * end of the document — a page is scrolled and the end of it is usually not on
 * screen.
 *
 * Missing every block is now the common case rather than the odd one, because
 * the surface above is much bigger than the writing inside it: the page margin,
 * the title, the tab strip, and the empty space below the last line, which is
 * most of a short page. So a miss falls back to the nearest block *vertically*
 * — the last one that starts above the pointer — instead of always appending.
 * Appending from a drop beside paragraph 5 of a long page would scroll the
 * picture out of sight the moment it landed.
 */
function targetOf(container: Element, x: number, y: number): InsertAt {
  const under = document.elementFromPoint(x, y);
  const direct = under && container.contains(under) ? under.closest(BLOCK_ID_SELECTOR) : null;
  const directId = direct?.getAttribute("data-id");
  if (directId) return { blockId: directId };

  // Top level only. A block nested in a list or a callout sits inside its
  // parent's rectangle, so including them would let a scan by vertical
  // position pick the child and insert the picture *into* the list.
  const blocks = Array.from(container.querySelectorAll<HTMLElement>(BLOCK_ID_SELECTOR)).filter(
    (element) => !element.parentElement?.closest(BLOCK_ID_SELECTOR),
  );
  if (blocks.length === 0) return "end";
  if (y < blocks[0].getBoundingClientRect().top) return "start";

  let nearest: string | null = null;
  for (const block of blocks) {
    if (block.getBoundingClientRect().top > y) break;
    nearest = block.getAttribute("data-id") ?? nearest;
  }
  return nearest ? { blockId: nearest } : "end";
}

/**
 * Listens on the reading column around the editor.
 *
 * Takes the editor's own wrapper ref and walks up from it, rather than being
 * handed the column directly: the column is rendered by PageView and
 * TemplateView, neither of which knows an editor exists, and threading a ref
 * down through both to a component that already has one is a lot of wiring for
 * an ancestor lookup. It falls back to the wrapper if the class ever moves, so
 * the worst case is the old, smaller target rather than no drop at all.
 *
 * `insertImage` is handed in rather than reached for here, because the editor
 * instance belongs to the component that made it and there is exactly one
 * caller (components/page/Editor.tsx).
 */
export function useAssetDropTarget(
  containerRef: RefObject<HTMLDivElement | null>,
  insertImage: (url: string, at: InsertAt) => void,
): void {
  // Read through a ref so the listeners are attached once rather than torn
  // down and rebuilt on every keystroke — `insertImage` closes over the
  // editor's current document and is a new function on each render.
  const insertRef = useRef(insertImage);
  useEffect(() => {
    insertRef.current = insertImage;
  }, [insertImage]);

  useEffect(() => {
    const wrapper = containerRef.current;
    if (!wrapper) return;
    const container: HTMLElement = wrapper.closest<HTMLElement>(DROP_SURFACE_SELECTOR) ?? wrapper;

    const carriesAsset = (event: DragEvent): boolean =>
      Array.from(event.dataTransfer?.types ?? []).includes(ASSET_DRAG_TYPE);

    // Without this the browser refuses the drop outright — `dragover` calling
    // `preventDefault` is what marks an element as a valid target at all.
    function handleDragOver(event: DragEvent) {
      if (!carriesAsset(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }

    function handleDrop(event: DragEvent) {
      if (!carriesAsset(event)) return;
      const fileName = event.dataTransfer?.getData(ASSET_DRAG_TYPE);
      if (!fileName) return;
      event.preventDefault();
      event.stopPropagation();
      insertRef.current(assetRef(fileName), targetOf(container, event.clientX, event.clientY));
    }

    container.addEventListener("dragover", handleDragOver, true);
    container.addEventListener("drop", handleDrop, true);
    return () => {
      container.removeEventListener("dragover", handleDragOver, true);
      container.removeEventListener("drop", handleDrop, true);
    };
  }, [containerRef]);
}
