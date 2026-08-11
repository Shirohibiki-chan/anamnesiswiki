// The timing half of a link's hover preview: when the card appears, when it
// goes, and what it says. The card itself is presentation and lives with the
// chip that opens it.
import { useCallback, useEffect, useRef, useState } from "react";
import { HOVER_PREVIEW_DELAY_MS } from "../constants/limits";
import { buildNodePreview, type NodePreview } from "../services/preview-service";
import { useProjectStore } from "../state/project-store";

export type HoverPreviewState = {
  /** Null while nothing is being previewed. */
  preview: NodePreview | null;
  anchorRect: DOMRect | null;
  /** Bind these to the link. `open` takes the element the pointer is on. */
  open: (element: HTMLElement) => void;
  close: () => void;
};

/**
 * The delay is the whole feature working or not working. Without one, a card
 * fires on every link the pointer crosses on its way somewhere else — which is
 * how a preview stops being a convenience and starts being something you learn
 * to move around.
 *
 * Reads the node through `getState()` at open time rather than subscribing.
 * The caller is a mention chip and a document can hold dozens of them; the
 * same reasoning as `use-reveal`, and the excerpt only has to be right for the
 * moment the card appears.
 */
export function useHoverPreview(nodeId: string | null): HoverPreviewState {
  const [preview, setPreview] = useState<NodePreview | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setPreview(null);
    setAnchorRect(null);
  }, [clearTimer]);

  const open = useCallback(
    (element: HTMLElement) => {
      if (!nodeId) return;
      clearTimer();
      timer.current = setTimeout(() => {
        timer.current = null;
        const node = useProjectStore.getState().nodes[nodeId];
        // A broken link has no page to preview, and a card saying so would be
        // a second way of reporting what the chip's own styling already does.
        if (!node) return;
        // Measured now, not when the pointer arrived: the document may have
        // reflowed under it in the meantime.
        setAnchorRect(element.getBoundingClientRect());
        setPreview(buildNodePreview(node));
      }, HOVER_PREVIEW_DELAY_MS);
    },
    [nodeId, clearTimer],
  );

  // A card outlives its anchor if the chip unmounts mid-hover — switching tabs
  // while a preview is up, or the page saving and re-rendering underneath it.
  useEffect(() => clearTimer, [clearTimer]);

  // Scrolling moves the chip and leaves the card behind, and the pointer never
  // leaves so nothing else would take it down. Capture, because the scroll
  // that matters is on the page container rather than the window.
  useEffect(() => {
    if (!preview) return;
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [preview, close]);

  return { preview, anchorRect, open, close };
}
