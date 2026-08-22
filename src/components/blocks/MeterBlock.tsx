// A meter block: several readings, one shape, set by pointing at them.
// Phase 18c.
//
// **The block's heading is the shape's name, and there is only one of them.**
// The first cut drew "METER" as the heading and then a second label under it
// saying which shape — two names for one section, where the reference has one
// in the top left. So the heading follows the shape (see BlockPanel), and the
// shape is changed from the block's menu, which is where its other settings
// already live.
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
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Plus, X } from "lucide-react";
import { getPaletteHex } from "../../constants/palette";
import type { Block, MeterEntry, MeterFace, MeterStyle } from "../../constants/schema";
import {
  ARC_GEOMETRY,
  arcFractionAt,
  arcPath,
  arcSpan,
  piePath,
  barFractionAt,
  isArcMeter,
  meterFace,
  meterFraction,
  meterColor,
  meterPip,
  meterMax,
  meterReadout,
  meterStyleOf,
  meterValue,
  metersOf,
  nudgedValue,
  parseMeterInput,
  pipClickValue,
  showsMax,
  showsText,
  valueAtFraction,
  type ArcStyle,
} from "../../services/meter-service";
import { TreePopover } from "../tree/TreePopover";
import { IconPicker, MeterIcon } from "./IconPicker";

/** Where the readout sits inside each round shape. */
const READOUT_Y: Record<ArcStyle, number> = { circle: 50, semicircle: 44, gauge: 58, pie: 50 };

/** How much of the 100-wide box each round shape actually draws in. */
const VIEW_HEIGHT: Record<ArcStyle, number> = { circle: 100, semicircle: 58, gauge: 90, pie: 100 };

type MeterBlockProps = {
  block: Block;
  onEdit: (meterId: string, patch: Partial<MeterEntry>) => void;
  onRemove: (meterId: string) => void;
  onAdd: () => void;
};

export function MeterBlock({ block, onEdit, onRemove, onAdd }: MeterBlockProps) {
  const style = meterStyleOf(block);
  const entries = metersOf(block);

  return (
    <div className={`block-meter block-meter-${style}`}>
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
              pip={meterPip(block)}
              colour={getPaletteHex(meterColor(block, entry))}
              face={meterFace(block, entry)}
              segmented={block.segmented === true}
              withText={showsText(block)}
              withMax={showsMax(block)}
              onEdit={(patch) => onEdit(entry.id, patch)}
              onRemove={() => onRemove(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type ReadingProps = {
  entry: MeterEntry;
  style: MeterStyle;
  /** The symbol this block counts in — see meterPip. */
  pip: string;
  /** This reading's colour as a hex, its own or the block's. */
  colour: string | null;
  face: MeterFace;
  segmented: boolean;
  withText: boolean;
  withMax: boolean;
  onEdit: (patch: Partial<MeterEntry>) => void;
  onRemove: () => void;
};

function MeterReading({
  entry,
  style,
  pip,
  colour,
  face,
  segmented,
  withText,
  withMax,
  onEdit,
  onRemove,
}: ReadingProps) {
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
  // **One field, in the place the number already is.** Typing `4` sets the
  // value and `4/10` sets both, which is how the reference does it and how
  // anybody writes those numbers down. It replaced a pair of boxes with an
  // "of" between them, which was a form bolted under the meter.
  const [numberDraft, setNumberDraft] = useState<string | null>(null);

  function openNumber() {
    setNumberDraft(meterReadout(entry, style, withMax));
  }

  function typeNumber(text: string) {
    setNumberDraft(text);
    const patch = parseMeterInput(text);
    // Nothing sensible typed *yet* — "4/" on the way to "4/10". Left alone
    // rather than emptied, so a meter never flickers to nothing mid-keystroke.
    if (patch) onEdit(patch);
  }

  const max = meterMax(entry, style);
  const value = meterValue(entry, style);
  const fraction = meterFraction(entry, style);
  const previewFraction = preview === null || max <= 0 ? null : Math.min(Math.max(preview, 0), max) / max;
  // Which way the promise goes. Raising draws the part that would be added;
  // lowering draws the part that would be taken away, over the fill — the
  // first cut only ever drew the former, so aiming below the value previewed
  // nothing at all and reducing a meter was a blind click.
  // What is certain, and what is only being offered. The solid part is
  // whichever of the two is lower, so the pulsing band always sits at the end
  // of the fill — added on top when aiming higher, taken off it when aiming
  // lower — rather than being painted over what is already there.
  const solidFraction = previewFraction === null ? fraction : Math.min(previewFraction, fraction);

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
  // **A dial's caption never carries an icon.** When the dial is showing one
  // it would be the same icon twice; when the dial is showing its number
  // instead, an icon beside the name is a row of furniture in the narrowest
  // part of the panel — her words, and right. The icon lives inside the dial
  // or nowhere, so switching a block to Icon or Both is what puts it back.
  // Bars and pips keep theirs: it is the only place they have for one.
  // A pie has no hole: an icon or a number in the middle of one sits on top of
  // the wedge it is describing. Both stay in the caption for a pie, which is
  // also where a chart normally carries its label.
  const solidShape = style === "pie";
  const iconInShape = isArcMeter(style) && !solidShape;
  const numberInShape = isArcMeter(style) && !solidShape && face !== "icon";
  const caption = (
    <div className="block-meter-caption">
      {!iconInShape && (
        <button
          type="button"
          className={`block-meter-icon${entry.icon ? "" : " block-meter-icon-empty"}`}
          aria-label={entry.icon ? "Change icon" : "Add an icon"}
          onClick={(e) => setIconRect(e.currentTarget.getBoundingClientRect())}
        >
          {entry.icon ? <MeterIcon icon={entry.icon} /> : <Plus size={12} />}
        </button>
      )}
      {withText && (
        <input
          className="block-meter-name"
          value={entry.label ?? ""}
          placeholder="Name"
          aria-label="Meter name"
          onChange={(e) => onEdit({ label: e.target.value || undefined })}
        />
      )}
      {/* **The number is printed once.** A dial showing it in the middle and
          again under the name is the same fact twice, which is not what the
          reference does — so when the shape has it, the caption doesn't. */}
      {!numberInShape &&
        (numberDraft === null ? (
          <button type="button" className="block-meter-readout" onClick={openNumber}>
            {meterReadout(entry, style, withMax)}
          </button>
        ) : (
          <input
            className="block-meter-readout block-meter-readout-input"
            autoFocus
            aria-label="Value, or value/maximum"
            value={numberDraft}
            onChange={(e) => typeNumber(e.target.value)}
            onBlur={() => setNumberDraft(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setNumberDraft(null);
            }}
          />
        ))}
    </div>
  );

  // Sits in the reading's own top-right corner and appears with the pointer,
  // the way the block's own grip and menu do. One meter of four is a thing you
  // remove on its own, and hunting for the right row of a right-click menu to
  // do it is a detour past the thing you are pointing at.
  const remove = (
    <button type="button" className="block-meter-remove" aria-label="Remove this meter" onClick={onRemove}>
      <X size={11} />
    </button>
  );

  // Mounted once, beside whichever shape is drawn, because the button that
  // opens it lives in the caption for some shapes and inside the dial for
  // others.
  const picker = iconRect && (
    <TreePopover anchorRect={iconRect} onClose={() => setIconRect(null)}>
      <IconPicker
        value={entry.icon}
        onPick={(icon) => {
          onEdit({ icon });
          setIconRect(null);
        }}
      />
    </TreePopover>
  );

  if (style === "bar") {
    return (
      <div
        className="block-meter-reading"
        data-meter-id={entry.id}
        style={colour ? ({ ["--block-accent" as string]: colour } as CSSProperties) : undefined}
      >
        <div
          {...slider}
          ref={track}
          className={`block-meter-track${segmented ? " block-meter-segmented" : ""}`}
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
          {/* The fill stops at whichever is lower — the value or the promise —
              and the difference is drawn once, as a pulsing band, in the same
              colour. The first cut painted the *removal* over the top in the
              track's colour, which left a hard second edge inside the bar and
              a visibly ragged one on an arc. Nothing overlaps now. */}
          <div className="block-meter-fill" style={{ width: `${solidFraction * 100}%` }} />
          {previewFraction !== null && previewFraction !== fraction && (
            <div
              className="block-meter-pending"
              style={{
                left: `${Math.min(previewFraction, fraction) * 100}%`,
                width: `${Math.abs(previewFraction - fraction) * 100}%`,
              }}
            />
          )}
        </div>
        {caption}
        {remove}
        {picker}
      </div>
    );
  }

  if (isArcMeter(style)) {
    const geometry = ARC_GEOMETRY[style];
    return (
      <div
        className="block-meter-reading"
        data-meter-id={entry.id}
        style={colour ? ({ ["--block-accent" as string]: colour } as CSSProperties) : undefined}
      >
        <svg
          {...slider}
          ref={arc}
          className={`block-meter-arc${segmented ? " block-meter-segmented" : ""}`}
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
          {solidShape ? (
            <>
              <circle className="block-meter-pie-track" cx="50" cy="50" r="44" />
              {/* The promise is drawn *under* the certain part, spanning to
                  whichever of the two is larger — so raising shows a pale
                  wedge past the solid one, and lowering shows the pale wedge
                  the solid one has retreated out of. */}
              {previewFraction !== null && previewFraction !== fraction && (
                <path className="block-meter-pie-pending" d={piePath(Math.max(previewFraction, fraction))} />
              )}
              <path className="block-meter-pie-fill" d={piePath(solidFraction)} />
            </>
          ) : (
            <>
              <path className="block-meter-arc-track" d={arcPath(1, geometry.start, geometry.sweep)} />
              <path className="block-meter-arc-fill" d={arcPath(solidFraction, geometry.start, geometry.sweep)} />
              {previewFraction !== null && previewFraction !== fraction && (
                <path
                  className="block-meter-arc-pending"
                  d={arcSpan(previewFraction, fraction, geometry.start, geometry.sweep)}
                />
              )}
            </>
          )}
          {/* Three faces, as the reference offers: the number, the icon, or
              both stacked. **A face that asks for an icon shows an empty slot
              when there isn't one** rather than quietly falling back to the
              number — that fallback is why all three options looked identical
              on a meter nobody had given an icon. The slot is the button that
              picks one, so a dial showing an icon is also where you change it. */}
          {face !== "value" && (
            <foreignObject x="26" y={READOUT_Y[style] - (face === "both" ? 22 : 13)} width="48" height="26">
              <button
                type="button"
                className={`block-meter-arc-icon${entry.icon ? "" : " block-meter-arc-icon-empty"}`}
                aria-label={entry.icon ? "Change icon" : "Add an icon"}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIconRect(e.currentTarget.getBoundingClientRect());
                }}
              >
                {entry.icon ? <MeterIcon icon={entry.icon} size={face === "both" ? 15 : 20} /> : <Plus size={16} />}
              </button>
            </foreignObject>
          )}
          {/* Edited where it is drawn, rather than opening something below —
              the dial's middle is where the number lives. */}
          {face !== "icon" && (
            <foreignObject x="18" y={READOUT_Y[style] - 11 + (face === "both" ? 8 : 0)} width="64" height="22">
              {numberDraft === null ? (
                <button
                  type="button"
                  className="block-meter-arc-readout"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    openNumber();
                  }}
                >
                  {meterReadout(entry, style, withMax)}
                </button>
              ) : (
                <input
                  className="block-meter-arc-readout block-meter-readout-input"
                  autoFocus
                  aria-label="Value, or value/maximum"
                  value={numberDraft}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => typeNumber(e.target.value)}
                  onBlur={() => setNumberDraft(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") setNumberDraft(null);
                  }}
                />
              )}
            </foreignObject>
          )}
        </svg>
        {caption}
        {remove}
        {picker}
      </div>
    );
  }

  const promisedTo = preview === null ? value : Math.min(Math.max(preview, 0), max);

  return (
    <div
      className="block-meter-reading"
      data-meter-id={entry.id}
      style={colour ? ({ ["--block-accent" as string]: colour } as CSSProperties) : undefined}
    >
      <div
        className="block-meter-pips"
        // **Committed on pointerdown, not on a click.** Capturing the pointer
        // on this container retargets the click that follows to the container
        // itself, so a `onClick` on each pip fired only when the press and the
        // release happened to agree — which is why half the taps on a token
        // pool did nothing. Pressing is also what the bar and the dials do, so
        // all six shapes now answer the same gesture at the same moment.
        onPointerDown={(e) => {
          draggedPips.current = false;
          capture(e);
          const index = pipUnder(e);
          if (index !== null) commit(pipClickValue(style, value, index));
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
          // A pip past the value but inside what the pointer promises is about
          // to be gained; one inside the value but past the promise is about
          // to be lost. Both pulse, which is how a rating says "this is what
          // you are about to pick" in either direction.
          const promised = !filled && index < promisedTo;
          const losing = filled && index >= promisedTo;
          return (
            <button
              key={index}
              type="button"
              data-pip={index}
              className={`block-meter-pip${filled ? " block-meter-pip-filled" : ""}${
                promised ? " block-meter-pip-pending" : ""
              }${losing ? " block-meter-pip-losing" : ""}`}
              aria-label={`${index + 1} of ${max}`}
              aria-pressed={filled}
              // The pointer is handled by the row above; this is the keyboard's
              // way in, which a button would otherwise get through onClick.
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                commit(pipClickValue(style, value, index));
              }}
            >
              <MeterIcon icon={pip} size={20} filled={filled || promised} />
            </button>
          );
        })}
      </div>
      {caption}
      {remove}
      {picker}
    </div>
  );
}
