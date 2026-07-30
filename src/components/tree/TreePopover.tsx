// Portals popover content (color picker, template picker, context menu) to
// document.body with fixed positioning computed from the trigger's
// bounding rect. Necessary because every react-arborist row is its own
// position:absolute stacking context inside the virtualized list — a
// position:absolute popover nested inside one row can't paint above a
// neighboring row no matter what z-index it's given, since z-index only
// resolves within a shared stacking context.
import { createPortal } from "react-dom";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { useClickOutside } from "../../hooks/use-click-outside";

const POPOVER_MARGIN = 4;

type TreePopoverProps = {
  anchorRect: DOMRect;
  onClose: () => void;
  className?: string;
  children: ReactNode;
};

export function TreePopover({ anchorRect, onClose, className, children }: TreePopoverProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, onClose, true);

  const style: CSSProperties = {
    position: "fixed",
    top: anchorRect.bottom + POPOVER_MARGIN,
    left: anchorRect.right,
    transform: "translateX(-100%)",
  };

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
