// The numbers behind a meter block, and the geometry its arcs are drawn from.
// Phase 18c. Pure, so the six shapes are presentation over two value models
// rather than six implementations of "what fraction is this".
import { PIP_METER_STYLES, type Block, type MeterEntry, type MeterFace, type MeterStyle } from "../constants/schema";

/**
 * A proportional meter reads against 100 unless told otherwise, so "75" means
 * 75% without anyone configuring anything. A pip meter defaults to five,
 * because that is what a rating is unless she says otherwise.
 */
export const DEFAULT_MAX = 100;
export const DEFAULT_PIPS = 5;

/**
 * A sanity bound on pips, not a design one.
 *
 * The first cut capped this at twenty on the theory that more stops being
 * countable at a glance. Her reference draws seventy-six tokens in a wrapped
 * grid and it reads fine, so the cap only exists to stop a typed 5000 turning
 * into 5000 buttons.
 */
export const MAX_PIPS = 200;

/** A blank reading. Every meter block has at least one. */
export function newMeterEntry(extra: Partial<MeterEntry> = {}): MeterEntry {
  return { id: crypto.randomUUID(), ...extra };
}

// Shared so a block with no readings hands back the same array every render —
// a fresh [] each time re-renders every sidebar on every keystroke.
const NO_ENTRIES: MeterEntry[] = [];

/**
 * The readings in a block.
 *
 * Blocks written before the list existed are lifted into one entry by
 * `migrateBlocks` on read, so this never has to look at `block.value` — there
 * is one answer to "what is in this meter" and it is this field.
 */
export function metersOf(block: Block): MeterEntry[] {
  return block.meters ?? NO_ENTRIES;
}

/** Both display toggles default to on, and are stored only when turned off. */
export function showsText(block: Block): boolean {
  return block.showText !== false;
}

export function showsMax(block: Block): boolean {
  return block.showMax !== false;
}

/** The symbol a pip meter counts in. */
export function meterPip(block: Block): string {
  return block.pip ?? (meterStyleOf(block) === "rating" ? "star" : "circle");
}

/**
 * What goes inside a round meter, resolved.
 *
 * Absent means "whatever there is": the icon when one has been picked, the
 * number when one hasn't. A ring with nothing in the middle reads as a meter
 * that failed to draw, so there is no fourth answer of "neither".
 */
export function meterFace(block: Block, entry: MeterEntry): MeterFace {
  return block.face ?? (entry.icon ? "icon" : "value");
}

export function isPipMeter(style: MeterStyle): boolean {
  return PIP_METER_STYLES.includes(style);
}

export function meterStyleOf(block: Block): MeterStyle {
  return block.meter ?? "bar";
}

/** The maximum a reading is read against, defaulted and kept sane. */
export function meterMax(entry: MeterEntry, style: MeterStyle): number {
  const fallback = isPipMeter(style) ? DEFAULT_PIPS : DEFAULT_MAX;
  const raw = entry.max ?? fallback;
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  // A pip meter's maximum is a count of things drawn on screen, so it is a
  // whole number and it is bounded.
  return isPipMeter(style) ? Math.min(Math.round(raw), MAX_PIPS) : raw;
}

/**
 * The value, clamped into range.
 *
 * Clamped on read rather than only on write because the maximum can move
 * underneath it: dropping a rating from ten pips to three leaves a stored 8,
 * and a meter that draws eight of three is worse than one that says three.
 * The stored number is left alone so raising the maximum again restores it.
 */
export function meterValue(entry: MeterEntry, style: MeterStyle): number {
  const max = meterMax(entry, style);
  const raw = entry.value ?? 0;
  if (!Number.isFinite(raw)) return 0;
  const clamped = Math.min(Math.max(raw, 0), max);
  return isPipMeter(style) ? Math.round(clamped) : clamped;
}

/** How full it is, 0 to 1. A zero maximum can't happen, but never divide by it. */
export function meterFraction(entry: MeterEntry, style: MeterStyle): number {
  const max = meterMax(entry, style);
  return max <= 0 ? 0 : meterValue(entry, style) / max;
}

/**
 * What a click on pip `index` should set the value to.
 *
 * The two pip shapes differ here and nowhere else, which is the whole reason
 * Token Pool survived being questioned as a D&D-only idea.
 *
 * - **Rating** sets the level: clicking the third star means three. Clicking
 *   the pip that is already the level clears it, because otherwise a rating
 *   set by mistake can never go back to nothing.
 * - **Token Pool** spends and refills one at a time: clicking a full token
 *   spends down to it, clicking an empty one fills up to it. Setting five
 *   rations to two by clicking the second one is the same gesture either way;
 *   the difference is that a pool of one spends to zero rather than toggling.
 */
export function pipClickValue(style: MeterStyle, current: number, index: number): number {
  const clicked = index + 1;
  if (style === "rating") return current === clicked ? 0 : clicked;
  return current >= clicked ? clicked - 1 : clicked;
}

/**
 * A point on the circle, by angle in degrees with zero at twelve o'clock.
 *
 * Exported because the arc and the handle that drags it have to agree about
 * where the end of the arc is — two copies of this drift by a pixel and the
 * handle sits off the line.
 */
export function meterPoint(angle: number, radius = 40, centre = 50): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [centre + radius * Math.cos(radians), centre + radius * Math.sin(radians)];
}

/**
 * An SVG arc path for the round shapes, drawn clockwise from `startAngle`
 * over `sweep` degrees of the fraction given.
 *
 * Angles are in degrees, zero at twelve o'clock, because that is how the three
 * shapes are described — a circle runs the whole way round from the top, a
 * semicircle sweeps 180 from nine o'clock, a gauge sweeps 270 with a gap at
 * the bottom. Returns an empty path for an empty fraction rather than a dot.
 */
export function arcPath(fraction: number, startAngle: number, sweep: number, radius = 40, centre = 50): string {
  const filled = Math.min(Math.max(fraction, 0), 1);
  if (filled <= 0) return "";

  // A full circle cannot be drawn as one arc — start and end land on the same
  // point and the renderer draws nothing at all. Two half arcs, always.
  const degrees = filled * sweep;
  const point = (angle: number) => meterPoint(angle, radius, centre);

  const [x0, y0] = point(startAngle);
  if (degrees >= 359.999) {
    const [xm, ym] = point(startAngle + 180);
    return `M ${x0} ${y0} A ${radius} ${radius} 0 1 1 ${xm} ${ym} A ${radius} ${radius} 0 1 1 ${x0} ${y0}`;
  }

  const [x1, y1] = point(startAngle + degrees);
  const largeArc = degrees > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${radius} ${radius} 0 ${largeArc} 1 ${x1} ${y1}`;
}

/**
 * The stretch of arc between two fractions.
 *
 * A preview that *lowers* a dial has to draw the part being taken away, which
 * starts partway round rather than at the beginning — `arcPath` can only start
 * at the sweep's origin. Hands back an empty path when the two ends meet, for
 * the same reason `arcPath` does: a zero-length arc is a dot, not nothing.
 */
export function arcSpan(
  from: number,
  to: number,
  startAngle: number,
  sweep: number,
  radius = 40,
  centre = 50,
): string {
  const low = Math.min(Math.max(Math.min(from, to), 0), 1);
  const high = Math.min(Math.max(Math.max(from, to), 0), 1);
  const degrees = (high - low) * sweep;
  if (degrees <= 0.001) return "";

  const [x0, y0] = meterPoint(startAngle + low * sweep, radius, centre);
  const [x1, y1] = meterPoint(startAngle + high * sweep, radius, centre);
  return `M ${x0} ${y0} A ${radius} ${radius} 0 ${degrees > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}

/** Where each round shape starts and how far it sweeps. */
export const ARC_GEOMETRY: Record<"circle" | "semicircle" | "gauge", { start: number; sweep: number }> = {
  circle: { start: 0, sweep: 360 },
  semicircle: { start: 270, sweep: 180 },
  gauge: { start: 225, sweep: 270 },
};

/**
 * The number drawn inside a round meter.
 *
 * Percent when the block reads against a plain 100, because that is what "75"
 * on a default meter means and "75 / 100" is the same fact spelled longer.
 * Anything else shows the pair, since 3 out of 8 is not a percentage in
 * anyone's head. Pip shapes never call this — you count the pips.
 */
export function meterReadout(entry: MeterEntry, style: MeterStyle, withMax = true): string {
  const max = meterMax(entry, style);
  const rounded = Math.round(meterValue(entry, style) * 10) / 10;
  if (!withMax) return `${rounded}`;
  return max === DEFAULT_MAX ? `${Math.round(meterFraction(entry, style) * 100)}%` : `${rounded}/${max}`;
}

/** The round shapes, as their own type — the three that are drawn as an arc. */
export type ArcStyle = "circle" | "semicircle" | "gauge";

export function isArcMeter(style: MeterStyle): style is ArcStyle {
  return style === "circle" || style === "semicircle" || style === "gauge";
}

/**
 * Where a point sits along a round meter's sweep, 0 to 1.
 *
 * The inverse of `meterPoint`, and the whole of dragging a dial: the pointer's
 * position in the same 100-wide space the arc is drawn in, turned back into an
 * angle and then into a fraction of the sweep.
 *
 * **A point in the gap snaps to the nearer end rather than to zero.** A gauge
 * has 90 degrees of nothing at the bottom, and a drag that overshoots the full
 * end by a few pixels means "all of it", not "none of it" — that reading is
 * what makes a dial feel broken at exactly the moment you fill it.
 *
 * Distance from the centre is ignored on purpose. Requiring the pointer to
 * stay on a 9-unit-wide ring would mean a drag that drifts inwards silently
 * stops responding.
 */
export function arcFractionAt(style: ArcStyle, x: number, y: number, centre = 50): number {
  const { start, sweep } = ARC_GEOMETRY[style];
  const degrees = (Math.atan2(y - centre, x - centre) * 180) / Math.PI + 90;
  const relative = (((degrees - start) % 360) + 360) % 360;
  if (relative <= sweep) return relative / sweep;
  return relative - sweep < (360 - sweep) / 2 ? 1 : 0;
}

/** Where along a bar a point sits, 0 to 1, clamped to the ends. */
export function barFractionAt(offsetX: number, width: number): number {
  if (!(width > 0)) return 0;
  return Math.min(Math.max(offsetX / width, 0), 1);
}

/**
 * The value a fraction of the way along this block's range.
 *
 * Rounded to whole units, because every maximum here is either a percentage or
 * a count of things and neither wants 61.837. Typing still takes decimals —
 * dragging is the coarse gesture and the box beneath it is the precise one.
 */
export function valueAtFraction(entry: MeterEntry, style: MeterStyle, fraction: number): number {
  return Math.round(Math.min(Math.max(fraction, 0), 1) * meterMax(entry, style));
}

/**
 * The value `steps` whole units away from where this block is now, clamped.
 *
 * What an arrow key does. It reads through `meterValue` rather than off the
 * block so a nudge on a meter whose maximum has since shrunk starts from what
 * is on screen — pressing Up on a meter drawn at 3 must not jump to 9.
 */
export function nudgedValue(entry: MeterEntry, style: MeterStyle, steps: number): number {
  const max = meterMax(entry, style);
  return Math.min(Math.max(meterValue(entry, style) + steps, 0), max);
}

/**
 * The readings with one of them changed, or added, or taken out.
 *
 * Pure list edits kept beside the arithmetic rather than inlined in the store,
 * for the reason `block-service` gives: the store's job is which block, and
 * this is what a meter *is*.
 *
 * **Removing the last reading leaves the block empty rather than refilling
 * it.** An empty meter block is a block she can see and delete; one that grows
 * a fresh reading every time she removes the last is a block that will not go
 * away.
 */
export function withMeter(entries: MeterEntry[], meterId: string, patch: Partial<MeterEntry>): MeterEntry[] {
  return entries.map((entry) => {
    if (entry.id !== meterId) return entry;
    const next = { ...entry, ...patch };
    // Written to disk, so an emptied field is removed rather than stored as
    // undefined — the same rule block-service's withField follows.
    for (const key of Object.keys(patch) as (keyof MeterEntry)[]) {
      if (next[key] === undefined) delete next[key];
    }
    return next;
  });
}

export function withoutMeter(entries: MeterEntry[], meterId: string): MeterEntry[] {
  return entries.filter((entry) => entry.id !== meterId);
}
