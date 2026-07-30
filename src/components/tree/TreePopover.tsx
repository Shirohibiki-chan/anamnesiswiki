// Portals popover content (color picker, template picker, context menu) to
// document.body with fixed positioning computed from the trigger's
// bounding rect. Necessary because every react-arborist row is its own
// position:absolute stacking context inside the virtualized list — a
// position:absolute popover nested inside one row can't paint above a
// neighboring row no matter what z-index it's given, since z-index only
// resolves within a shared stacking context.
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useClickOutside } from "../../hooks/use-click-outside";

const POPOVER_MARGIN = 4;
const VIEWPORT_MARGIN = 8;

type TreePopoverProps = {
  anchorRect: DOMRect;
  onClose: () => void;
  className?: string;
  children: ReactNode;
};

export function TreePopover({ anchorRect, onClose, className, children }: TreePopoverProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, onClose, true);

  // Popover content varies in size (color grid vs. template grid vs. context
  // menu), so its footprint isn't known until it's actually in the DOM.
  // Render once invisibly to measure it, then clamp/flip against the
  // viewport so it can't open off the bottom or side of the window — e.g. a
  // template picker opened from a row near the bottom of a tall tree used to
  // push its last grid row (Species/Note) below the visible window entirely.
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    top: anchorRect.bottom + POPOVER_MARGIN,
    left: anchorRect.right,
    transform: "translateX(-100%)",
    visibility: "hidden",
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    let left = anchorRect.right - rect.width;
    if (left < VIEWPORT_MARGIN) left = anchorRect.left;
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - rect.width - VIEWPORT_MARGIN);

    let top = anchorRect.bottom + POPOVER_MARGIN;
    if (top + rect.height > window.innerHeight - VIEWPORT_MARGIN) {
      top = anchorRect.top - rect.height - POPOVER_MARGIN;
    }
    top = Math.min(Math.max(top, VIEWPORT_MARGIN), window.innerHeight - rect.height - VIEWPORT_MARGIN);

    setStyle({ position: "fixed", top, left, visibility: "visible" });
  }, [anchorRect]);

  return createPortal(
    <div
      ref={ref}
      className={`tree-popover${className ? ` ${className}` : ""}`}
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
