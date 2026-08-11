// The lightbox: opening it, arrowing through it, and zooming and panning
// inside it. See docs/plan.md Phase 16, which took the three details that
// matter from Obsidian 1.13/1.14 — the file name is shown, the arrows cover
// every picture on the page rather than only the one clicked, and a zoomed
// picture can be dragged around.
//
// Split into separate hooks on purpose. Opening one is done from the editor and
// from the properties panel, and both of those re-render as she types; if they
// subscribed to the whole store they'd re-render on every frame of a zoom too.
// The two opener hooks select nothing but actions, which zustand keeps stable,
// so neither ever causes a render.
import { useCallback, useEffect, useRef, useState } from "react";
import { LIGHTBOX_MAX_SCALE, LIGHTBOX_MIN_SCALE, LIGHTBOX_ZOOM_STEP } from "../constants/limits";
import { embeddedImageAt, embeddedImageInBlock } from "../services/page-images";
import { useLightboxStore, type LightboxImage } from "../state/lightbox-store";

type View = { scale: number; x: number; y: number };

const FIT: View = { scale: LIGHTBOX_MIN_SCALE, x: 0, y: 0 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Opening the lightbox by **double-clicking** a picture inside the editor.
 *
 * It was a single click first, and that was wrong: a single click on a picture
 * is what selects the block, and selecting the block is what puts the
 * formatting toolbar on screen — where the caption, Save a copy and the
 * resize live. Opening a window over the top of that made the toolbar
 * unreachable in practice. Double-click is the ordinary gesture for "open this
 * properly" and costs the single click nothing; the toolbar's own Open full
 * size button (components/page/ExpandImageButton.tsx) is the findable half.
 *
 * Returns a ref to put on the element that wraps the editor. The listener is
 * native and on the capture phase rather than a React handler, which is not
 * defensiveness for its own sake: ProseMirror runs its own listeners inside
 * that subtree, React 19 attaches synthetic handlers up at the root container,
 * and anything in between calling `stopPropagation` would leave double-clicking
 * a picture silently doing nothing. Capture runs before any of it.
 */
export function useEditorImageLightbox() {
  const openLightbox = useLightboxStore((state) => state.openLightbox);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleDoubleClick(event: MouseEvent) {
      const found = embeddedImageAt(container as Element, event.target);
      if (!found) return;
      // A double-click on a picture would otherwise select the word behind it
      // and leave a highlight across the block once the lightbox closes.
      event.preventDefault();
      openLightbox(found.images, found.index);
    }

    container.addEventListener("dblclick", handleDoubleClick, true);
    return () => container.removeEventListener("dblclick", handleDoubleClick, true);
  }, [openLightbox]);

  return containerRef;
}

/**
 * Opening the lightbox for a block the toolbar knows is selected, rather than
 * one the pointer landed on. Same set of pictures and the same arrows — only
 * the way in differs.
 */
export function useOpenBlockImage() {
  const openLightbox = useLightboxStore((state) => state.openLightbox);
  return useCallback(
    (container: Element | null | undefined, blockId: string) => {
      if (!container) return;
      const found = embeddedImageInBlock(container, blockId);
      if (found) openLightbox(found.images, found.index);
    },
    [openLightbox],
  );
}

/**
 * Opening the lightbox on one picture that isn't in the editor — the sidebar
 * portrait. No arrows follow from a list of one, which is the honest answer:
 * the portrait and the pictures written into the page are different sets and
 * shuffling them together would make the arrows unpredictable.
 */
export function useOpenSingleImage() {
  const openLightbox = useLightboxStore((state) => state.openLightbox);
  return useCallback(
    (src: string, name: string) => {
      openLightbox([{ src, name }], 0);
    },
    [openLightbox],
  );
}

/**
 * Everything the lightbox itself needs. Only `components/shell/Lightbox.tsx`
 * calls this — see the note at the top about why openers don't.
 */
export function useLightbox() {
  const images = useLightboxStore((state) => state.images);
  const index = useLightboxStore((state) => state.index);
  const closeLightbox = useLightboxStore((state) => state.closeLightbox);
  const stepLightbox = useLightboxStore((state) => state.stepLightbox);

  const [view, setView] = useState<View>(FIT);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const current: LightboxImage | undefined = images[index];

  // Back to fit whenever the picture changes, including on open. Carrying a
  // zoom across the arrows would mean the next picture arrives cropped to a
  // corner of a frame that was chosen for a different picture.
  //
  // Adjusted during render rather than in an effect, which is React's own
  // answer for state that has to follow other state: an effect would paint the
  // new picture at the old zoom for one frame first, and the lint rule against
  // it (react-hooks/set-state-in-effect) is right that it's a cascading render.
  const [shownFor, setShownFor] = useState({ images, index });
  if (shownFor.images !== images || shownFor.index !== index) {
    setShownFor({ images, index });
    setView(FIT);
  }

  /**
   * Keeps a zoomed picture from being dragged off into empty space: the offset
   * can't exceed how far the scaled picture actually overhangs the stage.
   *
   * `offsetWidth` is the laid-out size, which the CSS transform doesn't touch —
   * so it stays the honest baseline to multiply by the scale, where a measured
   * bounding box would already have the scale baked in.
   */
  const clampView = useCallback((next: View): View => {
    const image = imageRef.current;
    const stage = stageRef.current;
    if (!image || !stage) return next;
    const overhangX = Math.max(0, (image.offsetWidth * next.scale - stage.clientWidth) / 2);
    const overhangY = Math.max(0, (image.offsetHeight * next.scale - stage.clientHeight) / 2);
    return { scale: next.scale, x: clamp(next.x, -overhangX, overhangX), y: clamp(next.y, -overhangY, overhangY) };
  }, []);

  /**
   * `anchorX/Y` are measured from the middle of the stage, and are what makes
   * the wheel zoom toward the cursor instead of the centre: the point under the
   * cursor is held still while everything else moves away from it.
   */
  const zoomBy = useCallback(
    (factor: number, anchorX = 0, anchorY = 0) => {
      setView((previous) => {
        const scale = clamp(previous.scale * factor, LIGHTBOX_MIN_SCALE, LIGHTBOX_MAX_SCALE);
        const ratio = scale / previous.scale;
        // Zooming back out to fit re-centres rather than leaving the picture
        // parked wherever the last drag left it.
        if (scale === LIGHTBOX_MIN_SCALE) return FIT;
        return clampView({
          scale,
          x: anchorX - (anchorX - previous.x) * ratio,
          y: anchorY - (anchorY - previous.y) * ratio,
        });
      });
    },
    [clampView],
  );

  const handleWheel = useCallback(
    (event: { deltaY: number; clientX: number; clientY: number }) => {
      const stage = stageRef.current;
      if (!stage) return;
      const bounds = stage.getBoundingClientRect();
      zoomBy(
        event.deltaY < 0 ? LIGHTBOX_ZOOM_STEP : 1 / LIGHTBOX_ZOOM_STEP,
        event.clientX - (bounds.left + bounds.width / 2),
        event.clientY - (bounds.top + bounds.height / 2),
      );
    },
    [zoomBy],
  );

  const startPan = useCallback(
    (event: { clientX: number; clientY: number; pointerId: number; currentTarget: Element }) => {
      if (view.scale <= LIGHTBOX_MIN_SCALE) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { x: event.clientX, y: event.clientY };
    },
    [view.scale],
  );

  const movePan = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const from = dragRef.current;
      if (!from) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      dragRef.current = { x: event.clientX, y: event.clientY };
      setView((previous) => clampView({ ...previous, x: previous.x + dx, y: previous.y + dy }));
    },
    [clampView],
  );

  const endPan = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Window-level rather than on the dialog, so the keys work without anything
  // inside having been clicked first.
  useEffect(() => {
    if (!current) return;

    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "Escape":
          closeLightbox();
          break;
        case "ArrowRight":
          stepLightbox(1);
          break;
        case "ArrowLeft":
          stepLightbox(-1);
          break;
        case "+":
        case "=":
          zoomBy(LIGHTBOX_ZOOM_STEP);
          break;
        case "-":
          zoomBy(1 / LIGHTBOX_ZOOM_STEP);
          break;
        case "0":
          setView(FIT);
          break;
        default:
          return;
      }
      event.preventDefault();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current, closeLightbox, stepLightbox, zoomBy]);

  return {
    current,
    index,
    count: images.length,
    view,
    isZoomed: view.scale > LIGHTBOX_MIN_SCALE,
    stageRef,
    imageRef,
    close: closeLightbox,
    step: stepLightbox,
    // Given as two directions rather than as `zoomBy`, so the step size stays
    // in constants/limits.ts instead of being written into a button.
    zoomIn: useCallback(() => zoomBy(LIGHTBOX_ZOOM_STEP), [zoomBy]),
    zoomOut: useCallback(() => zoomBy(1 / LIGHTBOX_ZOOM_STEP), [zoomBy]),
    resetView: useCallback(() => setView(FIT), []),
    handleWheel,
    startPan,
    movePan,
    endPan,
  };
}
