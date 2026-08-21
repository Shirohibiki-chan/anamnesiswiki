// A meter block: several readings, one shape, set by pointing at them.
// Phase 18c.
//
// **A block holds a list of readings, not one number.** The reference puts
// four dials under a single GAUGE heading, each with its own icon, name and
// numbers, and that is what a character's stats actually are — a panel, not
// five blocks stacked up with five headings between them. Add and remove them
// from the block's own menu; Show Text and Show Max live there too.
//
// **Nothing draws a handle.** The first cut put a dot on the end of the fill
// and it was wrong twice over: it reads as furniture, and on a semicircle it
// slides off the end of the arc. What the reference does instead is show the
// value you would get by hovering — a dimmed, pulsing preview of the change,
// so what a click will do is visible before it happens. Dragging still works;
// the preview is the affordance.
//
// The arithmetic and the arc geometry are in meter-service, which is where
// they can be tested — including the inverse used here, turning a pointer
// position back into a value.
import { Fragment, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Circle, Coins, Donut, Gauge, Plus, RectangleHorizontal, Star, X } from "lucide-react";
import type { Block, MeterEntry, MeterStyle } from "../../constants/schema";
import {
  ARC_GEOMETRY,
  arcFractionAt,
  arcPath,
  barFractionAt,
  isArcMeter,
  meterFraction,
  meterMax,
  meterReadout,
  meterStyleOf,
  meterValue,
  metersOf,
  nudgedValue,
  pipClickValue,
  showsMax,
  showsText,
  valueAtFraction,
  type ArcStyle,
} from "../../services/meter-service";
import { TreePopover } from "../tree/TreePopover";
import { IconPicker, MeterIcon } from "./IconPicker";

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
  onEdit: (meterId: string, patch: Partial<MeterEntry>) => void;
  onRemove: (meterId: string) => void;
  onAdd: () => void;
};

export function MeterBlock({ block, onSetStyle, onEdit, onRemove, onAdd }: MeterBlockProps) {
  const [styleRect, setStyleRect] = useState<DOMRect | null>(null);

  const style = meterStyleOf(block);
  const entries = metersOf(block);

  return (
    <div className={`block-meter block-meter-${style}`}>
      <button
        type="button"
        className="block-collection-source block-meter-style"
        onClick={(e) => setStyleRect(e.currentTarget.getBoundingClientRect())}
      >
        {STYLES.find((option) => option.key === style)?.label ?? "Progress bar"}
      </button>

      {entries.length === 0 ? (
        // The block's own menu has Add meter too, but an empty block needs the
        // way back to be visible rather than two clicks inside a menu.
        <button type="button" className="block-inline-link" onClick={onAdd}>
          <Plus size={12} /> Add meter
        </button>
      ) : (
        <div className="block-meter-list">
          {entries.map((entry) => (
            <MeterReading
              key={entry.id}
              entry={entry}
              style={style}
              withText={showsText(block)}
              withMax={showsMax(block)}
              removable={entries.length > 1}
              onEdit={(patch) => onEdit(entry.id, patch)}
              onRemove={() => onRemove(entry.id)}
            />
          ))}
        </div>
      )}

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

type ReadingProps = {
  entry: MeterEntry;
  style: MeterStyle;
  withText: boolean;
  withMax: boolean;
  removable: boolean;
  onEdit: (patch: Partial<MeterEntry>) => void;
  onRemove: () => void;
};

function MeterReading({ entry, style, withText, withMax, removable, onEdit, onRemove }: ReadingProps) {
  const track = useRef<HTMLDivElement | null>(null);
  const arc = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);
  // Set while a drag is crossing pips, so the click that ends it doesn't also
  // fire the toggle — otherwise dragging out and back to the pip you started
  // on clears a rating you were only adjusting.
  const draggedPips = useRef(false);
  // What the pointer is currently promising. Null means not hovering, and the
  // meter draws only what it holds.
  const [preview, setPreview] = useState<number | null>(null);
  const [iconRect, setIconRect] = useState<DOMRect | null>(null);

  const max = meterMax(entry, style);
  const value = meterValue(entry, style);
  const fraction = meterFraction(entry, style);
  const previewFraction = preview === null || max <= 0 ? null : Math.min(Math.max(preview, 0), max) / max;

  // Zero is the default and is stored as absent, the way every other block
  // field is. An emptied meter should read as one nobody has set, not as one
  // carrying a nought.
  function commit(next: number) {
    onEdit({ value: next || undefined });
  }

  // Capture is held on the element the gesture started on, so a drag that
  // leaves the track — or leaves the window — keeps steering it.
  //
  // **Whether a drag is in progress is a ref, not `hasPointerCapture`.**
  // Reading the capture back is the tidier-looking version and it is not
  // reliable: capture can be refused or lost without the gesture ending, and
  // the failure mode is a meter that does nothing at all when dragged.
  function capture(event: PointerEvent<Element>) {
    dragging.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that has already gone can't be captured; the drag still
      // works while it stays over the element, which is the common case.
    }
  }

  function isDragging(event: PointerEvent<Element>): boolean {
    if (event.buttons === 0) dragging.current = false;
    return dragging.current;
  }

  function release() {
    dragging.current = false;
  }

  function barValueAt(event: PointerEvent<HTMLDivElement>): number | null {
    const rect = track.current?.getBoundingClientRect();
    if (!rect) return null;
    return valueAtFraction(entry, style, barFractionAt(event.clientX - rect.left, rect.width));
  }

  // The pointer arrives in screen pixels and the arc is drawn in a 100-wide
  // box, so it has to be converted before meter-service can read an angle off
  // it. Every arc viewBox is 100 wide, which is what makes one scale enough.
  function arcValueAt(event: PointerEvent<SVGSVGElement>): number | null {
    const rect = arc.current?.getBoundingClientRect();
    if (!rect || !(rect.width > 0) || !isArcMeter(style)) return null;
    const scale = rect.width / 100;
    return valueAtFraction(
      entry,
      style,
      arcFractionAt(style, (event.clientX - rect.left) / scale, (event.clientY - rect.top) / scale),
    );
  }

  // Hovering shows what a click would do; pressing does it. One handler for
  // both, because a drag is a press that keeps moving.
  function aim(next: number | null, event: PointerEvent<Element>) {
    if (next === null) return;
    setPreview(next);
    if (isDragging(event)) commit(next);
  }

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
      commit(nudgedValue(entry, style, step));
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
    "aria-valuetext": meterReadout(entry, style, withMax),
    onKeyDown: handleKey,
  } as const;

  // Which pip the pointer is over. Read off the element under the pointer
  // rather than from an enter handler on each pip, because the capture that
  // keeps a drag alive also stops those firing.
  function pipUnder(event: PointerEvent<HTMLDivElement>): number | null {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const index = target?.closest("[data-pip]")?.getAttribute("data-pip");
    return index === null || index === undefined ? null : Number(index);
  }

  // The icon, the name and the number under every shape. `withText` hides the
  // name only — the number is what a meter *is*, and one with no number
  // showing is a decoration.
  const caption = (
    <div className="block-meter-caption">
      <button
        type="button"
        className={`block-meter-icon${entry.icon ? "" : " block-meter-icon-empty"}`}
        aria-label={entry.icon ? "Change icon" : "Add an icon"}
        onClick={(e) => setIconRect(e.currentTarget.getBoundingClientRect())}
      >
        {entry.icon ? <MeterIcon icon={entry.icon} /> : <Plus size={12} />}
      </button>
      {withText && (
        <input
          className="block-meter-name"
          value={entry.label ?? ""}
          placeholder="Name"
          aria-label="Meter name"
          onChange={(e) => onEdit({ label: e.target.value || undefined })}
        />
      )}
      <MeterNumbers entry={entry} style={style} withMax={withMax} onEdit={onEdit} />
      {removable && (
        <button type="button" className="ui-inline-remove" aria-label="Remove this meter" onClick={onRemove}>
          <X size={11} />
        </button>
      )}
      {iconRect && (
        <TreePopover anchorRect={iconRect} onClose={() => setIconRect(null)}>
          <IconPicker
            value={entry.icon}
            onPick={(icon) => {
              onEdit({ icon });
              setIconRect(null);
            }}
          />
        </TreePopover>
      )}
    </div>
  );

  if (style === "bar") {
    return (
      <div className="block-meter-reading">
        <div
          {...slider}
          ref={track}
          className="block-meter-track"
          onPointerDown={(e) => {
            capture(e);
            const next = barValueAt(e);
            if (next !== null) commit(next);
          }}
          onPointerMove={(e) => aim(barValueAt(e), e)}
          onPointerLeave={() => setPreview(null)}
          onPointerUp={release}
          onPointerCancel={release}
          onBlur={() => setPreview(null)}
        >
          {/* The preview sits under the fill, so raising a value shows the
              pending part beyond it, and lowering one shows the real fill
              still standing past where the pending edge cuts it. */}
          {previewFraction !== null && (
            <div className="block-meter-pending" style={{ width: `${previewFraction * 100}%` }} />
          )}
          <div className="block-meter-fill" style={{ width: `${fraction * 100}%` }} />
        </div>
        {caption}
      </div>
    );
  }

  if (isArcMeter(style)) {
    const geometry = ARC_GEOMETRY[style];
    return (
      <div className="block-meter-reading">
        <svg
          {...slider}
          ref={arc}
          className="block-meter-arc"
          viewBox={`0 0 100 ${VIEW_HEIGHT[style]}`}
          aria-label={entry.label || "Meter"}
          onPointerDown={(e) => {
            capture(e);
            const next = arcValueAt(e);
            if (next !== null) commit(next);
          }}
          onPointerMove={(e) => aim(arcValueAt(e), e)}
          onPointerLeave={() => setPreview(null)}
          onPointerUp={release}
          onPointerCancel={release}
          onBlur={() => setPreview(null)}
        >
          {/* The empty part of the shape is drawn as a full sweep underneath
              rather than as a separate outline, so the two always agree about
              where the ends are. */}
          <path className="block-meter-arc-track" d={arcPath(1, geometry.start, geometry.sweep)} />
          {previewFraction !== null && (
            <path className="block-meter-arc-pending" d={arcPath(previewFraction, geometry.start, geometry.sweep)} />
          )}
          <path className="block-meter-arc-fill" d={arcPath(fraction, geometry.start, geometry.sweep)} />
          {/* An icon in the middle when there is one, the number when there
              isn't — an empty ring reads as a meter that failed to load. */}
          {entry.icon ? (
            <foreignObject x="30" y={READOUT_Y[style] - 12} width="40" height="24">
              <div className="block-meter-arc-icon">
                <MeterIcon icon={entry.icon} size={18} />
              </div>
            </foreignObject>
          ) : (
            <text
              className="block-meter-arc-readout"
              x="50"
              y={READOUT_Y[style]}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {meterReadout(entry, style, withMax)}
            </text>
          )}
        </svg>
        {caption}
      </div>
    );
  }

  const Pip = style === "rating" ? Star : Circle;
  const promisedTo = preview === null ? value : Math.min(Math.max(preview, 0), max);

  return (
    <div className="block-meter-reading">
      <div
        className="block-meter-pips"
        onPointerDown={(e) => {
          draggedPips.current = false;
          capture(e);
        }}
        // Dragging across pips sets the level it passes over, for both pip
        // shapes: sweeping four stars means four either way. The gestures only
        // differ on a click, which is where pipClickValue still rules.
        onPointerMove={(e) => {
          const index = pipUnder(e);
          if (index === null) return;
          setPreview(index + 1);
          if (!isDragging(e) || index + 1 === value) return;
          draggedPips.current = true;
          commit(index + 1);
        }}
        onPointerLeave={() => setPreview(null)}
        onPointerUp={release}
        onPointerCancel={release}
      >
        {Array.from({ length: max }, (_, index) => {
          const filled = index < value;
          // A pip past the value but inside what the pointer is promising is
          // the preview: filled, dimmed and pulsing, which is how a rating
          // says "this is what you are about to pick".
          const promised = !filled && index < promisedTo;
          return (
            <button
              key={index}
              type="button"
              data-pip={index}
              className={`block-meter-pip${filled ? " block-meter-pip-filled" : ""}${
                promised ? " block-meter-pip-pending" : ""
              }`}
              aria-label={`${index + 1} of ${max}`}
              aria-pressed={filled}
              onClick={() => {
                // Consumed rather than just read, so a click that isn't
                // preceded by its own pointerdown — a keyboard press is one —
                // can't inherit a stale flag and be swallowed.
                const afterDrag = draggedPips.current;
                draggedPips.current = false;
                if (afterDrag) return;
                commit(pipClickValue(style, value, index));
              }}
            >
              <Pip size={13} fill={filled || promised ? "currentColor" : "none"} />
            </button>
          );
        })}
      </div>
      {caption}
    </div>
  );
}

/**
 * The numbers under a meter: text until you click them, two boxes after that.
 *
 * **The maximum has to be reachable and it is not something a drag can say.**
 * The first cut kept two number boxes standing under every meter, which is
 * four boxes on a four-reading block and reads as a form rather than as a
 * panel of stats — and those boxes used the sidebar's bleed-out input style,
 * whose negative margin hung the focus ring out over the meter above. So the
 * readout is the control: it shows what the reference shows, and clicking it
 * opens the pair.
 *
 * The drafts are strings, for the reason NumberProperty spells out: "-", "1."
 * and "1e" are all states you pass through on the way to a number, and a
 * controlled numeric input that reparses each keystroke fights you through
 * every one of them.
 */
function MeterNumbers({
  entry,
  style,
  withMax,
  onEdit,
}: {
  entry: MeterEntry;
  style: MeterStyle;
  withMax: boolean;
  onEdit: (patch: Partial<MeterEntry>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ value: "", max: "" });

  function open() {
    setDraft({
      value: entry.value === undefined ? "" : String(entry.value),
      max: entry.max === undefined ? "" : String(entry.max),
    });
    setEditing(true);
  }

  function parse(text: string): number | undefined {
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (!editing) {
    return (
      <button type="button" className="block-meter-readout" title="Set the numbers" onClick={open}>
        {meterReadout(entry, style, withMax)}
      </button>
    );
  }

  return (
    <span
      className="block-meter-numbers"
      // Closes when focus leaves the pair rather than on either box's own
      // blur, or tabbing from the value to the maximum would shut it.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") setEditing(false);
      }}
    >
      <input
        className="block-meter-number"
        autoFocus
        inputMode="decimal"
        aria-label="Value"
        value={draft.value}
        onChange={(e) => {
          setDraft({ ...draft, value: e.target.value });
          onEdit({ value: parse(e.target.value) });
        }}
      />
      <span className="block-meter-of">of</span>
      <input
        className="block-meter-number"
        inputMode="decimal"
        aria-label="Maximum"
        placeholder={String(meterMax(entry, style))}
        value={draft.max}
        onChange={(e) => {
          setDraft({ ...draft, max: e.target.value });
          onEdit({ max: parse(e.target.value) });
        }}
      />
    </span>
  );
}
