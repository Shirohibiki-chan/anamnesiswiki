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
// **The spectrum is the one exception, and it is not a handle.** Seven of the
// eight shapes say what they hold by how much of themselves is filled, so a
// dot on the end is decoration over a fact already drawn. A spectrum between
// two words has no fill to read — filling from `nonchalant` towards
// `emotional` would say there is more of it, which is exactly the meaning it
// exists to avoid — so the marker *is* the reading, and taking it away leaves
// an empty line. It still previews the same way everything else does.
//
// The arithmetic and the arc geometry are in meter-service, which is where
// they can be tested — including the inverse used here, turning a pointer
// position back into a value.
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Plus, X } from "lucide-react";
import { getPaletteHex, readableTextOn, sliceColorAt } from "../../constants/palette";
import { useColorPreview } from "../../hooks/use-color-preview";
import type { Block, MeterEntry, MeterFace, MeterStyle } from "../../constants/schema";
import {
  ARC_GEOMETRY,
  arcFractionAt,
  arcPath,
  arcSpan,
  piePath,
  barFractionAt,
  boundaryIndexAt,
  dragSliceBoundary,
  isArcMeter,
  isComposedPie,
  isSpectrum,
  spectrumReadout,
  meterFace,
  meterPoint,
  meterSegmented,
  MIN_LABEL_SHARE,
  pieAngleAt,
  pieSlices,
  pieTotal,
  seedEqualSlices,
  sliceIndexAt,
  sliceLabelPoint,
  PIE_RADIUS,
  type PieSlice,
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

/**
 * Enter and Escape leave a name field.
 *
 * **The name was always saved on every keystroke; Enter simply did nothing**,
 * which is indistinguishable from it not having taken — the field kept focus
 * and nothing on screen changed. Reported that way 2026-08-22. Blurring is the
 * confirmation, and it matches the number beside it, which closes on the same
 * two keys. Escape does not put the old name back for the same reason the
 * number does not: the edit has already been applied, and undo is what takes
 * a change back here.
 */
function leaveOnEnter(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  // Enter is stopped as well as acted on, because a spectrum's three word
  // fields are textareas: without this, the key that finishes the field would
  // also drop a line break into it on the way out.
  if (event.key === "Enter" || event.key === "Escape") {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

/**
 * What a wrapping field stores: one phrase, never the line breaks a paste
 * arrived with. The words wrap because the panel is narrow — that is a drawing
 * decision, and the value underneath stays a single line.
 */
function oneLine(text: string): string | undefined {
  return text.replace(/[\r\n]+/g, " ") || undefined;
}

/** Where a spectrum's marker sits, kept inside the ends of its own line. */
function markerAt(fraction: number): string {
  return `calc(${Math.min(Math.max(fraction, 0), 1)} * (100% - var(--spectrum-marker)) + var(--spectrum-marker) / 2)`;
}

type MeterBlockProps = {
  block: Block;
  onEdit: (meterId: string, patch: Partial<MeterEntry>) => void;
  /** Several readings at once — what dragging a pie's edge writes. */
  onEditMany: (patches: Record<string, Partial<MeterEntry>>) => void;
  onRemove: (meterId: string) => void;
  onAdd: () => void;
};

export function MeterBlock({ block, onEdit, onEditMany, onRemove, onAdd }: MeterBlockProps) {
  const style = meterStyleOf(block);
  const entries = metersOf(block);

  // **A pie with several readings is one chart, not several pies.** Every
  // other shape measures one number against its own maximum and so gets one
  // drawing each; a pie divides a whole between them, which is a single circle
  // with a legend under it. See meter-service's pie section for why a pie
  // holding exactly one reading still draws the wedge it always did.
  if (isComposedPie(style, entries)) {
    return (
      <div className={`block-meter block-meter-${style} block-meter-composed`}>
        <MeterPieChart
          block={block}
          entries={entries}
          onEdit={onEdit}
          onEditMany={onEditMany}
          onRemove={onRemove}
          onAdd={onAdd}
        />
      </div>
    );
  }

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
              segmented={meterSegmented(block, entry)}
              withText={showsText(block)}
              withMax={showsMax(block)}
              onEdit={(patch) => onEdit(entry.id, patch)}
              onRemove={() => onRemove(entry.id)}
            />
          ))}
          {/* The same + the pie's legend carries, and for the same reason:
              Add meter lived only in the block's `⋯` menu, which is not where
              anybody looks to put a second dial under the first. */}
          <button type="button" className="block-inline-link block-meter-add" onClick={onAdd}>
            <Plus size={12} /> Add meter
          </button>
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

  // The same preview the shell watches, for one reading rather than the block.
  const previewHex = useColorPreview(entry.id);
  const accent = previewHex ?? colour;

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
  const spectrum = isSpectrum(style);
  const solidShape = style === "pie";
  const iconInShape = isArcMeter(style) && !solidShape;
  const numberInShape = isArcMeter(style) && !solidShape && face !== "icon";
  const caption = (
    <div className="block-meter-caption">
      {!iconInShape && (
        <MeterIconButton icon={entry.icon} onPick={(icon) => onEdit({ icon })} className="block-meter-icon" />
      )}
      {withText &&
        (spectrum ? (
          // **A spectrum's name wraps where every other shape's ellipses.** The
          // cap and the ellipsis on `.block-meter-name` are there because a name
          // that grew with its text stretched the reading and pushed a dial
          // off-centre. A spectrum has no chart beside its name — the name owns
          // the row — so there is nothing to push, and the truncation that is
          // right next to a dial is just an unreadable name here.
          <textarea
            className="block-meter-name"
            rows={1}
            value={entry.label ?? ""}
            placeholder="Name"
            aria-label="Meter name"
            onChange={(e) => onEdit({ label: oneLine(e.target.value) })}
            onKeyDown={leaveOnEnter}
          />
        ) : (
          <input
            className="block-meter-name"
            value={entry.label ?? ""}
            placeholder="Name"
            aria-label="Meter name"
            onChange={(e) => onEdit({ label: e.target.value || undefined })}
            onKeyDown={leaveOnEnter}
          />
        ))}
      {/* **The number is printed once.** A dial showing it in the middle and
          again under the name is the same fact twice, which is not what the
          reference does — so when the shape has it, the caption doesn't.

          **A spectrum prints it nowhere.** Its number is machinery — where the
          marker sits between two words — and a "60%" beside `shy` and `bold`
          invites the reading that somebody is 60% of a person. It is still
          there, still dragged, still nudged by the arrow keys, and still what
          comes back if the block is switched to a bar. */}
      {!numberInShape && !spectrum && (
        <MeterNumberField
          text={meterReadout(entry, style, withMax)}
          className="block-meter-readout"
          onEdit={onEdit}
        />
      )}
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

  // **A spectrum is the bar's geometry with a different meaning drawn on it.**
  // Same track, same `barValueAt`, same drag and the same arrow keys — what
  // changes is that the value is a position rather than an amount, so it draws
  // a marker rather than a fill and names the two ends rather than printing a
  // number. The name sits above and the two words sit under the ends they
  // belong to, which is where anybody writing `shy ——x—— bold` puts them.
  if (spectrum) {
    return (
      <div
        className="block-meter-reading"
        data-meter-id={entry.id}
        style={accent ? ({ ["--block-accent" as string]: accent } as CSSProperties) : undefined}
      >
        {caption}
        <div
          {...slider}
          // The words are the value here, so the percentage on its own would
          // be the one thing a spectrum does not mean. See spectrumReadout.
          aria-valuetext={spectrumReadout(entry)}
          ref={track}
          className={`block-meter-spectrum-rail${segmented ? " block-meter-segmented" : ""}`}
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
          {/* The line is a child rather than the hit area itself: a 4px strip
              is a hard thing to aim at, and the rail around it is what
              actually answers the pointer. */}
          <div className="block-meter-spectrum-line" />
          {/* **Both markers travel the line minus their own width**, so the one
              at either extreme sits inside the end rather than hanging half of
              itself off it. It costs half a marker of accuracy against the
              pointer at the very ends, which is what every slider ever built
              does and what stops the dot colliding with the panel's edge.
              Written on the same 13px so the pale one stays concentric with
              the solid one wherever they meet. */}
          {previewFraction !== null && previewFraction !== fraction && (
            <span className="block-meter-spectrum-pending" style={{ left: markerAt(previewFraction) }} />
          )}
          <span className="block-meter-spectrum-marker" style={{ left: markerAt(fraction) }} />
        </div>
        {/* The two ends. Typed straight into, like the name above them, and
            left as placeholders until they are — a spectrum whose ends are
            unnamed is a spectrum nobody has finished, and it should look
            like one rather than inventing a pair of words. */}
        <div className="block-meter-ends">
          <textarea
            className="block-meter-end"
            rows={1}
            value={entry.startLabel ?? ""}
            placeholder="One end"
            aria-label="The word at the left end"
            onChange={(e) => onEdit({ startLabel: oneLine(e.target.value) })}
            onKeyDown={leaveOnEnter}
          />
          <textarea
            className="block-meter-end block-meter-end-last"
            rows={1}
            value={entry.endLabel ?? ""}
            placeholder="The other"
            aria-label="The word at the right end"
            onChange={(e) => onEdit({ endLabel: oneLine(e.target.value) })}
            onKeyDown={leaveOnEnter}
          />
        </div>
        {remove}
      </div>
    );
  }

  if (style === "bar") {
    return (
      <div
        className="block-meter-reading"
        data-meter-id={entry.id}
        style={accent ? ({ ["--block-accent" as string]: accent } as CSSProperties) : undefined}
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
      </div>
    );
  }

  if (isArcMeter(style)) {
    const geometry = ARC_GEOMETRY[style];
    return (
      <div
        className="block-meter-reading"
        data-meter-id={entry.id}
        style={accent ? ({ ["--block-accent" as string]: accent } as CSSProperties) : undefined}
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
              <MeterIconButton
                icon={entry.icon}
                onPick={(icon) => onEdit({ icon })}
                className="block-meter-arc-icon"
                size={face === "both" ? 15 : 20}
                plusSize={16}
                stopPointer
              />
            </foreignObject>
          )}
          {/* Edited where it is drawn, rather than opening something below —
              the dial's middle is where the number lives. */}
          {face !== "icon" && (
            <foreignObject x="18" y={READOUT_Y[style] - 11 + (face === "both" ? 8 : 0)} width="64" height="22">
              {/* A foreignObject has no layout of its own, so the field would
                  sit in the corner of its box at any width but 100%. This
                  centres it and lets it be as wide as its number. */}
              <div className="block-meter-arc-slot">
                <MeterNumberField
                  text={meterReadout(entry, style, withMax)}
                  className="block-meter-arc-readout"
                  onEdit={onEdit}
                  stopPointer
                />
              </div>
            </foreignObject>
          )}
        </svg>
        {caption}
        {remove}
      </div>
    );
  }

  const promisedTo = preview === null ? value : Math.min(Math.max(preview, 0), max);

  return (
    <div
      className="block-meter-reading"
      data-meter-id={entry.id}
      style={accent ? ({ ["--block-accent" as string]: accent } as CSSProperties) : undefined}
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// The two controls every reading carries, wherever it is drawn.
//
// Pulled out of the caption when the pie grew a legend: a slice's row wants
// the same icon button and the same click-the-number-to-type-it field that a
// dial's caption has, and three copies of the draft-state dance would be three
// places for it to drift.
// ---------------------------------------------------------------------------

type IconButtonProps = {
  icon: string | undefined;
  /** Undefined clears it — the picker offers "no icon" as an option. */
  onPick: (icon: string | undefined) => void;
  /** The base class; the empty state adds `-empty` to it. */
  className: string;
  size?: number;
  plusSize?: number;
  /** Inside an SVG the shape underneath is listening for the same press. */
  stopPointer?: boolean;
};

function MeterIconButton({ icon, onPick, className, size, plusSize = 12, stopPointer }: IconButtonProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  return (
    <>
      <button
        type="button"
        className={`${className}${icon ? "" : ` ${className}-empty`}`}
        aria-label={icon ? "Change icon" : "Add an icon"}
        onPointerDown={stopPointer ? (e) => e.stopPropagation() : undefined}
        onClick={(e) => {
          if (stopPointer) e.stopPropagation();
          setRect(e.currentTarget.getBoundingClientRect());
        }}
      >
        {icon ? <MeterIcon icon={icon} size={size} /> : <Plus size={plusSize} />}
      </button>
      {rect && (
        <TreePopover anchorRect={rect} onClose={() => setRect(null)}>
          <IconPicker
            value={icon}
            onPick={(next) => {
              onPick(next);
              setRect(null);
            }}
          />
        </TreePopover>
      )}
    </>
  );
}

type NumberFieldProps = {
  /** What the meter is showing when nobody is typing. */
  text: string;
  className: string;
  onEdit: (patch: Partial<MeterEntry>) => void;
  stopPointer?: boolean;
};

/**
 * The number, and typing over it.
 *
 * **One field, not two boxes.** Typing `4` sets the value and `4/10` sets both,
 * which is how the reference does it and how anybody writes those numbers down.
 * Half-typed states like `4/` parse to nothing and leave the meter alone rather
 * than emptying it, so it never flickers to nought mid-keystroke.
 */
function MeterNumberField({ text, className, onEdit, stopPointer }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <button
        type="button"
        className={className}
        onPointerDown={stopPointer ? (e) => e.stopPropagation() : undefined}
        onClick={(e) => {
          if (stopPointer) e.stopPropagation();
          setDraft(text);
        }}
      >
        {text}
      </button>
    );
  }

  return (
    <input
      className={`${className} block-meter-readout-input`}
      autoFocus
      aria-label="Value, or value/maximum"
      // **The box is the width of what is in it.** Left to fill its slot it
      // ran the whole width of the dial it sits in, which is a text field the
      // size of the chart. Three characters is the floor so a one-digit value
      // still has something to click.
      style={{ width: `calc(${Math.max(draft.length, 3)}ch + 14px)` }}
      value={draft}
      onPointerDown={stopPointer ? (e) => e.stopPropagation() : undefined}
      onChange={(e) => {
        setDraft(e.target.value);
        const patch = parseMeterInput(e.target.value);
        if (patch) onEdit(patch);
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") setDraft(null);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// A pie chart: every reading in the block as a slice of one circle.
// ---------------------------------------------------------------------------

type PieChartProps = {
  block: Block;
  entries: MeterEntry[];
  onEdit: (meterId: string, patch: Partial<MeterEntry>) => void;
  onEditMany: (patches: Record<string, Partial<MeterEntry>>) => void;
  onRemove: (meterId: string) => void;
  onAdd: () => void;
};

function MeterPieChart({ block, entries, onEdit, onEditMany, onRemove, onAdd }: PieChartProps) {
  const svg = useRef<SVGSVGElement | null>(null);
  // Which edge the drag is pushing, or null. A ref for the same reason the
  // other shapes keep one: pointer capture can be refused or lost without the
  // gesture ending, and reading it back leaves a chart that ignores the mouse.
  const dragging = useRef<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [aimed, setAimed] = useState<number | null>(null);

  const segmented = block.segmented === true;
  const slices = pieSlices(entries, segmented);
  const total = pieTotal(entries);
  const withText = showsText(block);
  // A pie has no maximum to show, so the toggle that hides one hides the share
  // instead — it is the same control doing the same job, which is whether the
  // number gets its context printed beside it. The menu renames itself to match.
  const withShare = showsMax(block);

  /** The pointer in the 100-wide box the chart is drawn in. */
  function pointIn(event: PointerEvent<SVGSVGElement>): [number, number] | null {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect || !(rect.width > 0)) return null;
    const scale = rect.width / 100;
    return [(event.clientX - rect.left) / scale, (event.clientY - rect.top) / scale];
  }

  function handleMove(event: PointerEvent<SVGSVGElement>) {
    const point = pointIn(event);
    if (!point) return;
    const [x, y] = point;

    if (event.buttons === 0) dragging.current = null;
    const edge = dragging.current;

    if (edge !== null) {
      // Dragging: the two slices either side of this edge trade, and every
      // other slice stays exactly where it is. See dragSliceBoundary.
      onEditMany(dragSliceBoundary(entries, edge, pieAngleAt(x, y) / 360));
      return;
    }

    setAimed(boundaryIndexAt(slices, x, y));
    setHovered(sliceIndexAt(slices, x, y));
  }

  function handleDown(event: PointerEvent<SVGSVGElement>) {
    const point = pointIn(event);
    if (!point) return;
    const edge = boundaryIndexAt(slices, point[0], point[1]);
    if (edge === null) return;

    dragging.current = edge;
    setAimed(edge);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Already gone; the drag still works while the pointer stays over the
      // chart, which is the ordinary case.
    }
    // **A pie nobody has typed into draws equal slices out of nothing.** The
    // first press is what writes those implied numbers down, so there is a
    // total for the drag that follows to divide.
    if (total <= 0) onEditMany(seedEqualSlices(entries));
  }

  function release() {
    dragging.current = null;
  }

  const shown = hovered === null ? null : slices[hovered];

  return (
    <>
      {/* **A slice too thin to hold a label still has to be readable.** Her
          case, and the reason this line exists rather than only the labels
          inside the wedges: pointing at a 2% sliver names it and gives its
          number at full size. With nothing under the pointer it holds the
          total, so the line never appears and disappears under the chart. */}
      <div className="block-meter-pie-readout" aria-live="polite">
        {shown ? (
          <>
            {shown.entry.icon && <MeterIcon icon={shown.entry.icon} size={13} />}
            <span className="block-meter-pie-readout-name">{shown.entry.label || "Unnamed"}</span>
            <span className="block-meter-pie-readout-value">
              {Math.round(shown.value * 10) / 10}
              {withShare && total > 0 && <em>{Math.round(shown.share * 100)}%</em>}
            </span>
          </>
        ) : (
          <span className="block-meter-pie-readout-total">
            {total > 0 ? `${Math.round(total * 10) / 10} in total` : "Drag an edge to begin"}
          </span>
        )}
      </div>

      <svg
        ref={svg}
        className={`block-meter-pie-chart${aimed !== null ? " block-meter-pie-aiming" : ""}`}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Pie chart: ${slices
          .map((slice) => `${slice.entry.label || "unnamed"} ${Math.round(slice.share * 100)}%`)
          .join(", ")}`}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={() => {
          setHovered(null);
          setAimed(null);
        }}
      >
        {slices.map((slice, index) => (
          <PieSlicePath
            key={slice.entry.id}
            slice={slice}
            index={index}
            lifted={hovered === index}
            dimmed={hovered !== null && hovered !== index}
            withShare={withShare && total > 0}
          />
        ))}
        {/* The edge being aimed at, drawn as a line from the middle out. It is
            the only handle on the chart, and without it the fact that an edge
            can be pushed at all is invisible until somebody guesses. */}
        {aimed !== null && slices[aimed] && (
          <line
            className="block-meter-slice-handle"
            x1="50"
            y1="50"
            x2={meterPoint(slices[aimed].start + slices[aimed].sweep, PIE_RADIUS)[0]}
            y2={meterPoint(slices[aimed].start + slices[aimed].sweep, PIE_RADIUS)[1]}
          />
        )}
      </svg>

      {/* The legend is where a slice is named, numbered and coloured — a pie
          cannot carry that inside itself the way a dial carries its caption. */}
      <div className="block-meter-legend">
        {slices.map((slice, index) => (
          <SliceRow
            key={slice.entry.id}
            slice={slice}
            index={index}
            highlighted={hovered === index}
            withText={withText}
            withShare={withShare && total > 0}
            onHover={(on) => setHovered(on ? index : null)}
            onEdit={(patch) => onEdit(slice.entry.id, patch)}
            onRemove={() => onRemove(slice.entry.id)}
          />
        ))}
        {/* **A slice is added from here, not from a menu.** The block's `⋯`
            menu has Add meter and always did, and it was not a thing anybody
            would think to go looking for to get another wedge — her words, and
            fair. A chart with a list under it wants a + at the end of the list. */}
        <button type="button" className="block-inline-link block-meter-add" onClick={onAdd}>
          <Plus size={12} /> Add slice
        </button>
      </div>
    </>
  );
}

/**
 * The colour a slice draws in.
 *
 * Its own when one has been picked, and the next colour along `SLICE_COLORS`
 * otherwise — a chart needs as many colours as it has slices and a block only
 * has one, so this is the one meter that does not fall back to the block's.
 */
function useSliceColor(entry: MeterEntry, index: number): string {
  const preview = useColorPreview(entry.id);
  return preview ?? getPaletteHex(entry.color) ?? sliceColorAt(index);
}

/**
 * One wedge.
 *
 * Its own component so it can watch the colour preview for its own reading —
 * hovering a swatch in the menu has to light up one slice, and a hook cannot
 * be called once per item of a list that changes length.
 */
function PieSlicePath({
  slice,
  index,
  lifted,
  dimmed,
  withShare,
}: {
  slice: PieSlice;
  index: number;
  lifted: boolean;
  dimmed: boolean;
  withShare: boolean;
}) {
  const colour = useSliceColor(slice.entry, index);
  // A slice narrower than this cannot hold a number; the readout above the
  // chart is what answers for those.
  const labelled = withShare && slice.share >= MIN_LABEL_SHARE;
  const [labelX, labelY] = sliceLabelPoint(slice);

  return (
    <g
      className={`block-meter-slice-group${lifted ? " block-meter-slice-lifted" : ""}${
        dimmed ? " block-meter-slice-dimmed" : ""
      }`}
      // Right-clicking a slice opens the block's menu pointed at that reading,
      // the same way right-clicking a dial does — see BlockShell.
      data-meter-id={slice.entry.id}
    >
      <path className="block-meter-slice" d={slice.path} fill={colour} />
      {labelled && (
        // Black or white, whichever can be read on this slice — the palette
        // runs from a pale amber to a navy and one colour cannot sit on both.
        <text className="block-meter-slice-label" x={labelX} y={labelY} fill={readableTextOn(colour)}>
          {Math.round(slice.share * 100)}%
        </text>
      )}
      <title>{`${slice.entry.label || "Unnamed"}: ${Math.round(slice.share * 100)}%`}</title>
    </g>
  );
}

type SliceRowProps = {
  slice: PieSlice;
  index: number;
  highlighted: boolean;
  withText: boolean;
  withShare: boolean;
  onHover: (on: boolean) => void;
  onEdit: (patch: Partial<MeterEntry>) => void;
  onRemove: () => void;
};

function SliceRow({ slice, index, highlighted, withText, withShare, onHover, onEdit, onRemove }: SliceRowProps) {
  const colour = useSliceColor(slice.entry, index);
  const rounded = Math.round(slice.value * 10) / 10;

  return (
    <div
      className={`block-meter-legend-row${highlighted ? " block-meter-legend-row-on" : ""}`}
      data-meter-id={slice.entry.id}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <span className="block-meter-swatch" style={{ background: colour }} aria-hidden />
      <MeterIconButton
        icon={slice.entry.icon}
        onPick={(icon) => onEdit({ icon })}
        className="block-meter-icon"
        plusSize={11}
      />
      {withText && (
        <input
          className="block-meter-name"
          value={slice.entry.label ?? ""}
          placeholder="Name"
          aria-label="Slice name"
          onChange={(e) => onEdit({ label: e.target.value || undefined })}
          onKeyDown={leaveOnEnter}
        />
      )}
      <MeterNumberField text={`${rounded}`} className="block-meter-readout" onEdit={onEdit} />
      {withShare && <span className="block-meter-share">{Math.round(slice.share * 100)}%</span>}
      <button type="button" className="block-meter-slice-remove" aria-label="Remove this slice" onClick={onRemove}>
        <X size={11} />
      </button>
    </div>
  );
}
