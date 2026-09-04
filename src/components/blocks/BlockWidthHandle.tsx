// The draggable edges of a block sitting in the page. Phase 19.5.
//
// **A block in the writing has room the sidebar never had, and this is how she
// says how much of it to take.** Everything else about the block is unchanged:
// the width is a number on the block's own record (or, for an infobox, a prop
// on the frame), and this file only turns a pointer into that number.
//
// **Both edges drag, and the far edge is the one that moves.** A block is
// left-aligned in the column, so pulling the left handle outwards would take
// the box off the edge of the page — instead it grows to the right, which is
// what BlockNote's own picture handles do a few lines above in the same
// document. One behaviour in the editor beats a defensible second one.
//
// It is a `separator` with a tabindex for the same reason `ResizeHandle` in the
// shell is: a two-hand precision drag should not be the only way to set a
// width, so the arrow keys move it too and Home puts it back.
import { useRef, useState } from "react";
import { BLOCK_WIDTH_FULL, BLOCK_WIDTH_MIN, snapBlockWidth } from "../../services/block-service";
import "./blocks.css";

const KEYBOARD_STEP = 5;

/**
 * How wide the thing a percentage is measured against actually is.
 *
 * **The editor's box is not the writing column**: it carries the gutter the
 * hover controls live in on both sides, 54px each. A wrapped frame's width is
 * drawn in container units, which are a percentage of that same content box, so
 * a drag measured against the outer box would set a number that draws narrower
 * than the pointer.
 */
function writingWidth(column: Element, measureAgainst: "parent" | "column"): number {
  const box = column.getBoundingClientRect().width;
  if (measureAgainst !== "column") return box;
  const style = getComputedStyle(column);
  return box - parseFloat(style.paddingLeft || "0") - parseFloat(style.paddingRight || "0");
}

type BlockWidthHandlesProps = {
  /** The width drawn right now, as a percentage of the writing column. */
  width: number;
  /** What this is the width of — "This block", "This infobox". Read aloud. */
  label: string;
  /** Called throughout the drag, so the block redraws under the pointer. */
  onResize: (width: number) => void;
  /** Called once when the pointer is let go, for whoever needs to save then. */
  onCommit?: (width: number) => void;
  /** Double-click, and Home — back to the whole column. */
  onReset: () => void;
  /**
   * What the percentage is a percentage *of*. Phase 19.5.
   *
   * `"parent"` is the ordinary answer and the one that makes a block inside a
   * frame measure against the frame. `"column"` is for a wrapped infobox: it is
   * inside a floated box that is only as wide as itself, so the parent is the
   * frame's own width and every pixel of a drag would be worth four.
   */
  measureAgainst?: "parent" | "column";
};

export function BlockWidthHandles(props: BlockWidthHandlesProps) {
  return (
    <>
      <BlockWidthHandle side="left" {...props} />
      <BlockWidthHandle side="right" {...props} />
    </>
  );
}

function BlockWidthHandle({
  side,
  width,
  label,
  onResize,
  onCommit,
  onReset,
  measureAgainst = "parent",
}: BlockWidthHandlesProps & { side: "left" | "right" }) {
  const handleRef = useRef<HTMLDivElement>(null);
  // The three measurements a drag needs, taken once when it starts. Measuring
  // per move would read the box we are in the middle of resizing, so every
  // frame would be relative to the last one and the error would compound.
  const start = useRef<{ x: number; blockWidth: number; columnWidth: number } | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);

  function widthFromPointer(clientX: number): number | null {
    if (!start.current) return null;
    const { x, blockWidth, columnWidth } = start.current;
    if (columnWidth === 0) return null;
    // The left handle reads backwards: pull it towards the edge of the page and
    // the block gets wider, the same as the right one pulled the other way.
    const moved = side === "right" ? clientX - x : x - clientX;
    return snapBlockWidth(((blockWidth + moved) / columnWidth) * 100);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // The frame this handle sits in, and the column that frame is measured
    // against — which is the element BlockNote gives the block, so a block
    // inside an infobox one day still measures against what holds it. A wrapped
    // frame is the exception: see `measureAgainst`.
    const frame = handleRef.current?.parentElement;
    const column = measureAgainst === "column" ? frame?.closest(".bn-editor") : frame?.parentElement;
    if (!frame || !column) return;
    // Pointer capture rather than a window listener: the pointer leaves this
    // narrow strip in the first frame of any real drag, and the release has to
    // arrive here however far outside it has gone.
    event.currentTarget.setPointerCapture(event.pointerId);
    // Stops the drag selecting the writing it passes over.
    event.preventDefault();
    start.current = {
      x: event.clientX,
      blockWidth: frame.getBoundingClientRect().width,
      columnWidth: writingWidth(column, measureAgainst),
    };
    setDragged(width);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    const next = widthFromPointer(event.clientX);
    if (next === null) return;
    setDragged(next);
    onResize(next);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    start.current = null;
    onCommit?.(dragged ?? width);
    setDragged(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Home") {
      event.preventDefault();
      onReset();
      return;
    }
    const towardsStart = event.key === "ArrowLeft";
    const towardsEnd = event.key === "ArrowRight";
    if (!towardsStart && !towardsEnd) return;
    event.preventDefault();
    // The arrows move the edge, not the number: Right widens the right handle
    // and narrows the left one, so the key always points the way the line goes.
    const outwards = side === "right" ? towardsEnd : towardsStart;
    const next = Math.min(
      BLOCK_WIDTH_FULL,
      Math.max(BLOCK_WIDTH_MIN, width + (outwards ? KEYBOARD_STEP : -KEYBOARD_STEP)),
    );
    onResize(next);
    onCommit?.(next);
  }

  return (
    <div
      ref={handleRef}
      className={`block-width-handle block-width-${side}${dragged === null ? "" : " block-width-dragging"}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`${label} width`}
      aria-valuenow={width}
      aria-valuemin={BLOCK_WIDTH_MIN}
      aria-valuemax={BLOCK_WIDTH_FULL}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
    >
      {/* The number is only there while she is dragging: a width is hard to
          judge by eye against a column with no ruler on it, and a block that
          reads 50% is a block she can match another one to. */}
      {dragged !== null && <span className="block-width-readout">{dragged}%</span>}
    </div>
  );
}
