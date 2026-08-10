// The draggable edge of a side panel. One component for both, because the only
// thing that differs between them is which way the pointer's x maps to a width.
//
// It's a `separator` with a tabindex rather than a bare div: dragging is not
// the only way anyone should be able to change a panel's width, and the arrow
// keys are the cheapest possible alternative. The same reasoning as the
// function-key escape hatch in the shortcut rules — a two-hand precision drag
// is exactly what's hard for the people that decision was made for.
import { useCallback, useRef, useState } from "react";

const KEYBOARD_STEP = 16;

type ResizeHandleProps = {
  /** Which panel this is the inner edge of. Decides which way x reads. */
  edge: "tree" | "properties";
  label: string;
  width: number;
  min: number;
  max: number;
  onResize: (width: number) => void;
  /** Double-click, and Home — puts the panel back to the width it shipped at. */
  onReset: () => void;
  /** Lets the shell switch its column transition off for the duration. */
  onDragChange: (isDragging: boolean) => void;
};

export function ResizeHandle({ edge, label, width, min, max, onResize, onReset, onDragChange }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);

  const setDragging = useCallback(
    (dragging: boolean) => {
      setIsDragging(dragging);
      onDragChange(dragging);
    },
    [onDragChange],
  );

  // Measured off the grid that owns the columns rather than off the window, so
  // this stays right if the shell ever stops being flush to the window edges.
  const widthFromPointer = useCallback(
    (clientX: number): number | null => {
      const container = handleRef.current?.closest(".app-layout");
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      return edge === "tree" ? clientX - rect.left : rect.right - clientX;
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

  // Arrows move the *edge*, so Left always narrows the tree and widens the
  // properties panel — the key matches the direction the line goes, not the
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
    const outwards = edge === "tree" ? towardsEnd : towardsStart;
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
