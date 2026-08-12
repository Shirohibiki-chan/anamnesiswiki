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

export type InsertAt = { blockId: string } | "end";

/**
 * Where a drop at these coordinates should put the picture.
 *
 * The block under the pointer, so it lands where she aimed rather than at the
 * end of the document — a page is scrolled and the end of it is usually not on
 * screen. A drop that misses every block (the empty space below the last line,
 * which is most of a short page) appends instead of doing nothing.
 */
function targetOf(container: Element, x: number, y: number): InsertAt {
  const under = document.elementFromPoint(x, y);
  const block = under && container.contains(under) ? under.closest(BLOCK_ID_SELECTOR) : null;
  const blockId = block?.getAttribute("data-id");
  return blockId ? { blockId } : "end";
}

/**
 * Listens on an element already wrapping the editor.
 *
 * Takes the ref rather than making one because the lightbox's double-click
 * handler wants the same element, and an element can only carry one ref.
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
    const container = containerRef.current;
    if (!container) return;

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
      insertRef.current(assetRef(fileName), targetOf(container as Element, event.clientX, event.clientY));
    }

    container.addEventListener("dragover", handleDragOver, true);
    container.addEventListener("drop", handleDrop, true);
    return () => {
      container.removeEventListener("dragover", handleDragOver, true);
      container.removeEventListener("drop", handleDrop, true);
    };
  }, [containerRef]);
}
