// A meter in the sidebar: one number, drawn six ways and set by dragging it.
// Phase 18c.
//
// One block with a switchable shape rather than six block kinds, the same way
// a collection carries a source — a bar that should have been a gauge is a
// setting rather than a delete and a rebuild, and every shape keeps the number
// that was already typed into it.
//
// **Every shape is dragged, not typed.** Typing a number into a box to move a
// bar is the interaction this block exists to replace; the boxes underneath
// stay for the times a number has to be exact. The arithmetic and the arc
// geometry are in meter-service, which is where they can be tested — including
// the inverse used here, turning a pointer position back into a value.
import { Fragment, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Circle, Coins, Donut, Gauge, RectangleHorizontal, Star } from "lucide-react";
import type { Block, MeterStyle } from "../../constants/schema";
import {
  ARC_GEOMETRY,
  arcFractionAt,
  arcPath,
  barFractionAt,
  isArcMeter,
  isPipMeter,
  meterFraction,
  meterMax,
  meterPoint,
  meterReadout,
  meterStyleOf,
  meterValue,
  nudgedValue,
  pipClickValue,
  valueAtFraction,
  type ArcStyle,
} from "../../services/meter-service";
import { NumberProperty } from "../properties/NumberProperty";
import { TreePopover } from "../tree/TreePopover";

// Grouped by what the number *means*, because that is the choice underneath
// the six pictures: the first four measure a proportion and the last two count
// whole things. Someone picking between a gauge and a token pool is picking
// between those two ideas, not between two drawings.
const STYLES: { key: MeterStyle; label: string; hint: string; icon: typeof Circle }[] = [
  { key: "bar", label: "Progress bar", hint: "A filled track", icon: RectangleHorizontal },
  { key: "circle", label: "Circle", hint: "A full ring", icon: Circle },
  { key: "semicircle", label: "Semi-circle", hint: "An arc over the top", icon: Donut },
  { key: "gauge", label: "Gauge", hint: "A dial with a gap at the bottom", icon: Gauge },
  { key: "rating", label: "Rating", hint: "Stars you set a level with", icon: Star },
  { key: "pool", label: "Token pool", hint: "Tokens you spend one at a time", icon: Coins },
];

/** Where the readout sits inside each round shape. */
const READOUT_Y: Record<ArcStyle, number> = { circle: 50, semicircle: 44, gauge: 58 };

/** How much of the 100-wide box each round shape actually draws in. */
const VIEW_HEIGHT: Record<ArcStyle, number> = { circle: 100, semicircle: 58, gauge: 90 };

type MeterBlockProps = {
  block: Block;
  onSetStyle: (style: MeterStyle) => void;
  onSetValue: (value: number | undefined) => void;
  onSetMax: (max: number | undefined) => void;
};

export function MeterBlock({ block, onSetStyle, onSetValue, onSetMax }: MeterBlockProps) {
  const [styleRect, setStyleRect] = useState<DOMRect | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  const arc = useRef<SVGSVGElement | null>(null);
  // Set while a drag is crossing pips, so the click that ends it doesn't also
  // fire the toggle — otherwise dragging out and back to the pip you started
  // on clears a rating you were only adjusting.
  const draggedPips = useRef(false);
  const dragging = useRef(false);

  const style = meterStyleOf(block);
  const max = meterMax(block);
  const value = meterValue(block);
  const fraction = meterFraction(block);

  // Zero is the default and is stored as absent, the way every other block
  // field is — see withField. An emptied meter should read as a meter nobody
  // has set, not as one carrying a nought.
  function commit(next: number) {
    onSetValue(next || undefined);
  }

  // Capture is held on the element the gesture started on, so a drag that
  // leaves the track — or leaves the window — keeps steering it instead of
  // stopping wherever the pointer crossed the edge.
  //
  // **Whether a drag is in progress is a ref, not `hasPointerCapture`.**
  // Reading the capture back is the tidier-looking version and it is not
  // reliable: capture can be refused or lost without the gesture ending, and
  // the failure mode is a meter that does nothing at all when dragged. The ref
  // is closed out by the button state instead, which cannot silently disagree
  // with whether a button is down.
  function capture(event: PointerEvent<Element>) {
    dragging.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that has already gone away can't be captured. The drag still
      // works while it stays over the element, which is the common case.
    }
  }

  function isDragging(event: PointerEvent<Element>): boolean {
    if (event.buttons === 0) dragging.current = false;
    return dragging.current;
  }

  function setFromBar(event: PointerEvent<HTMLDivElement>) {
    const rect = track.current?.getBoundingClientRect();
    if (!rect) return;
    commit(valueAtFraction(block, barFractionAt(event.clientX - rect.left, rect.width)));
  }

  // The pointer arrives in screen pixels and the arc is drawn in a 100-wide
  // box, so it has to be converted before meter-service can read an angle off
  // it. Every arc viewBox is 100 wide, which is what makes one scale enough.
  function setFromArc(event: PointerEvent<SVGSVGElement>) {
    const rect = arc.current?.getBoundingClientRect();
    if (!rect || !(rect.width > 0) || !isArcMeter(style)) return;
    const scale = rect.width / 100;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    commit(valueAtFraction(block, arcFractionAt(style, x, y)));
  }

  // The keyboard half of being a slider. Whole units per press, both ends
  // reachable outright, because a hundred presses to cross a bar is not a
  // keyboard path anybody would use.
  function handleKey(event: KeyboardEvent<Element>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : event.key === "PageUp"
            ? 10
            : event.key === "PageDown"
              ? -10
              : 0;
    if (step !== 0) {
      event.preventDefault();
      commit(nudgedValue(block, step));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      commit(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      commit(max);
    }
  }

  const slider = {
    role: "slider",
    tabIndex: 0,
    "aria-valuemin": 0,
    "aria-valuemax": max,
    "aria-valuenow": value,
    "aria-valuetext": meterReadout(block),
    onKeyDown: handleKey,
  } as const;

  // Which pip the pointer is over, for a drag that crosses them. Read off the
  // element under the pointer rather than from an enter handler on each pip,
  // because the capture that keeps the drag alive also stops those firing.
  function pipUnder(event: PointerEvent<HTMLDivElement>): number | null {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const pip = target?.closest("[data-pip]");
    const index = pip?.getAttribute("data-pip");
    return index === null || index === undefined ? null : Number(index);
  }

  return (
    <div className="block-meter">
      <button
        type="button"
        className="block-collection-source block-meter-style"
        onClick={(e) => setStyleRect(e.currentTarget.getBoundingClientRect())}
      >
        {STYLES.find((option) => option.key === style)?.label ?? "Progress bar"}
      </button>

      {style === "bar" && (
        <div className="block-meter-bar">
          <div
            {...slider}
            ref={track}
            className="block-meter-track"
            onPointerDown={(e) => {
              capture(e);
              setFromBar(e);
            }}
            onPointerMove={(e) => isDragging(e) && setFromBar(e)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
          >
            <div className="block-meter-fill" style={{ width: `${fraction * 100}%` }} />
            {/* The handle is what says the bar can be dragged at all. It sits
                on the fill's end rather than inside the track, so an empty
                meter still shows one to grab. */}
            <span className="block-meter-thumb" style={{ left: `${fraction * 100}%` }} />
          </div>
          <span className="block-meter-readout">{meterReadout(block)}</span>
        </div>
      )}

      {isArcMeter(style) && (
        <svg
          {...slider}
          ref={arc}
          className="block-meter-arc"
          viewBox={`0 0 100 ${VIEW_HEIGHT[style]}`}
          aria-label={`${STYLES.find((option) => option.key === style)?.label} meter`}
          onPointerDown={(e) => {
            capture(e);
            setFromArc(e);
          }}
          onPointerMove={(e) => isDragging(e) && setFromArc(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          {/* The empty part of the shape is drawn as a full sweep underneath
              rather than as a separate outline, so the two always agree about
              where the ends are. */}
          <path className="block-meter-arc-track" d={arcPath(1, ARC_GEOMETRY[style].start, ARC_GEOMETRY[style].sweep)} />
          <path className="block-meter-arc-fill" d={arcPath(fraction, ARC_GEOMETRY[style].start, ARC_GEOMETRY[style].sweep)} />
          <circle
            className="block-meter-knob"
            r="6"
            cx={meterPoint(ARC_GEOMETRY[style].start + fraction * ARC_GEOMETRY[style].sweep)[0]}
            cy={meterPoint(ARC_GEOMETRY[style].start + fraction * ARC_GEOMETRY[style].sweep)[1]}
          />
          <text className="block-meter-arc-readout" x="50" y={READOUT_Y[style]} textAnchor="middle" dominantBaseline="middle">
            {meterReadout(block)}
          </text>
        </svg>
      )}

      {isPipMeter(style) && (
        <div
          className="block-meter-pips"
          onPointerDown={(e) => {
            draggedPips.current = false;
            capture(e);
          }}
          // Dragging across pips sets the level it passes over, for both pip
          // shapes: sweeping four stars means four either way. The gestures
          // only differ on a click, which is where pipClickValue still rules.
          onPointerMove={(e) => {
            if (!isDragging(e)) return;
            const index = pipUnder(e);
            if (index === null || index + 1 === value) return;
            draggedPips.current = true;
            commit(index + 1);
          }}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          {Array.from({ length: max }, (_, index) => {
            const filled = index < value;
            const Pip = style === "rating" ? Star : Circle;
            return (
              <button
                key={index}
                type="button"
                data-pip={index}
                className={`block-meter-pip${filled ? " block-meter-pip-filled" : ""}`}
                aria-label={`${index + 1} of ${max}`}
                aria-pressed={filled}
                onClick={() => {
                  // Consumed rather than just read: the flag is set by a drag
                  // and cleared by whatever happens next, so a click that
                  // isn't preceded by its own pointerdown — a keyboard press
                  // is one — can't inherit a stale one and be swallowed.
                  const afterDrag = draggedPips.current;
                  draggedPips.current = false;
                  if (afterDrag) return;
                  commit(pipClickValue(style, value, index));
                }}
              >
                <Pip size={15} fill={filled ? "currentColor" : "none"} />
              </button>
            );
          })}
        </div>
      )}

      {/* Typed rather than clamped on the way in — see setBlockValue. The
          inputs show what is stored, not what is drawn, so a rating whose pip
          count was lowered still says what it will go back to. They are also
          the only way to a number a drag can't land on exactly. */}
      <div className="block-meter-numbers">
        <NumberProperty label="" value={block.value} placeholder="0" onChange={onSetValue} />
        <span className="block-meter-of">of</span>
        <NumberProperty label="" value={block.max} placeholder={String(max)} onChange={onSetMax} />
      </div>

      {styleRect && (
        <TreePopover anchorRect={styleRect} onClose={() => setStyleRect(null)}>
          <div className="tree-context-menu block-source-menu">
            <div className="tree-context-menu-heading">Measures a proportion</div>
            {STYLES.map((option) => (
              <Fragment key={option.key}>
                {option.key === "rating" && <div className="tree-context-menu-heading">Counts whole units</div>}
                <button
                  type="button"
                  onClick={() => {
                    onSetStyle(option.key);
                    setStyleRect(null);
                  }}
                >
                  <option.icon size={13} />
                  <span className="block-source-label">
                    {option.label}
                    <small>{option.hint}</small>
                  </span>
                </button>
              </Fragment>
            ))}
          </div>
        </TreePopover>
      )}
    </div>
  );
}
