// The numbers behind a meter block, and the geometry its arcs are drawn from.
// Phase 18c. Pure, so the six shapes are presentation over two value models
// rather than six implementations of "what fraction is this".
import { PIP_METER_STYLES, type Block, type MeterStyle } from "../constants/schema";

/**
 * A proportional meter reads against 100 unless told otherwise, so "75" means
 * 75% without anyone configuring anything. A pip meter defaults to five,
 * because that is what a rating is unless she says otherwise.
 */
export const DEFAULT_MAX = 100;
export const DEFAULT_PIPS = 5;

/** Above this, pips stop being countable at a glance and the row wraps badly. */
export const MAX_PIPS = 20;

export function isPipMeter(style: MeterStyle): boolean {
  return PIP_METER_STYLES.includes(style);
}

export function meterStyleOf(block: Block): MeterStyle {
  return block.meter ?? "bar";
}

/** The maximum this block reads against, defaulted and kept sane. */
export function meterMax(block: Block): number {
  const style = meterStyleOf(block);
  const fallback = isPipMeter(style) ? DEFAULT_PIPS : DEFAULT_MAX;
  const raw = block.max ?? fallback;
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  // A pip meter's maximum is a count of things drawn on screen, so it is a
  // whole number and it is capped — "out of 5000" is not a widget.
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
export function meterValue(block: Block): number {
  const max = meterMax(block);
  const raw = block.value ?? 0;
  if (!Number.isFinite(raw)) return 0;
  const clamped = Math.min(Math.max(raw, 0), max);
  return isPipMeter(meterStyleOf(block)) ? Math.round(clamped) : clamped;
}

/** How full it is, 0 to 1. A zero maximum can't happen, but never divide by it. */
export function meterFraction(block: Block): number {
  const max = meterMax(block);
  return max <= 0 ? 0 : meterValue(block) / max;
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
  const point = (angle: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return [centre + radius * Math.cos(radians), centre + radius * Math.sin(radians)];
  };

  const [x0, y0] = point(startAngle);
  if (degrees >= 359.999) {
    const [xm, ym] = point(startAngle + 180);
    return `M ${x0} ${y0} A ${radius} ${radius} 0 1 1 ${xm} ${ym} A ${radius} ${radius} 0 1 1 ${x0} ${y0}`;
  }

  const [x1, y1] = point(startAngle + degrees);
  const largeArc = degrees > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${radius} ${radius} 0 ${largeArc} 1 ${x1} ${y1}`;
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
export function meterReadout(block: Block): string {
  const max = meterMax(block);
  const value = meterValue(block);
  const rounded = Math.round(value * 10) / 10;
  return max === DEFAULT_MAX ? `${Math.round(meterFraction(block) * 100)}%` : `${rounded}/${max}`;
}
