// The draggable edge of a side panel. One component for all three, because the
// only things that differ between them are which way the pointer's x maps to a
// width and which grid it is measured against.
//
// It's a `separator` with a tabindex rather than a bare div: dragging is not
// the only way anyone should be able to change a panel's width, and the arrow
// keys are the cheapest possible alternative. The same reasoning as the
// function-key escape hatch in the shortcut rules — a two-hand precision drag
// is exactly what's hard for the people that decision was made for.
import { useCallback, useRef, useState } from "react";

const KEYBOARD_STEP = 16;

/**
 * The panels that have a draggable edge, and what that edge is measured
 * against. `fromRight` is both the direction the pointer reads in and the
 * direction the arrow keys widen in.
 *
 * The grid rather than the window in every case, so a handle stays right if a
 * screen ever stops being flush to the window edges — the start screen's rail
 * is measured against `.start` for exactly the same reason the shell's two are
 * measured against `.app-layout`.
 */
const EDGES = {
  tree: { container: ".app-layout", fromRight: false },
  properties: { container: ".app-layout", fromRight: true },
  rail: { container: ".start", fromRight: true },
} as const;

export type ResizeEdge = keyof typeof EDGES;

type ResizeHandleProps = {
  /** Which panel this is the inner edge of. */
  edge: ResizeEdge;
  label: string;
  width: number;
  min: number;
  max: number;
  onResize: (width: number) => void;
  /** Double-click, and Home — puts the panel back to the width it shipped at. */
  onReset: () => void;
  /**
   * Lets the shell switch its column transition off for the duration.
   * Optional: a screen whose columns don't transition has nothing to switch.
   */
  onDragChange?: (isDragging: boolean) => void;
};

export function ResizeHandle({ edge, label, width, min, max, onResize, onReset, onDragChange }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);

  const setDragging = useCallback(
    (dragging: boolean) => {
      setIsDragging(dragging);
      onDragChange?.(dragging);
    },
    [onDragChange],
  );

  // Measured off the grid that owns the columns rather than off the window.
  const widthFromPointer = useCallback(
    (clientX: number): number | null => {
      const { container, fromRight } = EDGES[edge];
      const element = handleRef.current?.closest(container);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return fromRight ? rect.right - clientX : clientX - rect.left;
    },
    [edge],
  );

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Pointer capture, not a window listener: the pointer routinely leaves this
    // 5px strip within the first frame of a drag, and without capture the drag
    // would end there. It also means the release is delivered here however far
    // outside the window the pointer has gone.
    event.currentTarget.setPointerCapture(event.pointerId);
    // Stops the drag from selecting the text it passes over.
    event.preventDefault();
    setDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    const next = widthFromPointer(event.clientX);
    if (next !== null) onResize(next);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }

  // Arrows move the *edge*, so Left always narrows the tree and widens the two
  // right-hand panels — the key matches the direction the line goes, not the
  // direction the number does.
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const towardsStart = event.key === "ArrowLeft";
    const towardsEnd = event.key === "ArrowRight";
    if (!towardsStart && !towardsEnd) {
      if (event.key === "Home") {
        event.preventDefault();
        onReset();
      }
      return;
    }
    event.preventDefault();
    const outwards = EDGES[edge].fromRight ? towardsStart : towardsEnd;
    onResize(width + (outwards ? KEYBOARD_STEP : -KEYBOARD_STEP));
  }

  return (
    <div
      ref={handleRef}
      className={`resize-handle resize-handle-${edge}${isDragging ? " resize-handle-dragging" : ""}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
    />
  );
}
