// What a coloured callout means, and the icon that says so. Phase 19.5.
//
// **Colour and type are different axes, and this file is only the colour one.**
// A callout's *type* carries behaviour — Secret is the block a publish has to
// strip, Quote is what a `.lk` blockquote imports as — so colouring one never
// changes what it is. What a colour does change is what it reads as at a
// glance, and there is a convention for that older than any of this: green is
// a confirmation, amber is a caution, red is a stop, blue is a note.
//
// **Only those four get an icon, on purpose.** The convention exists for them
// and nowhere else; a tick on a green box is read without being learned, and
// an arbitrary mark on a purple one is a small puzzle on every page. The other
// colours simply recolour the box, which is the whole of what was asked for.
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";

/**
 * The palette keys that read as each convention.
 *
 * Grouped by hue rather than by row, so a callout coloured Emerald, Sage, Teal
 * or Pine all say the same thing — she picks the green she likes the look of,
 * not the one that happens to carry the meaning.
 */
const CALLOUT_ICONS: Array<{ icon: LucideIcon; label: string; keys: string[] }> = [
  { icon: CircleCheck, label: "Confirmation", keys: ["emerald", "sage", "teal", "pine"] },
  { icon: TriangleAlert, label: "Caution", keys: ["amber", "orange", "bronze", "rust"] },
  { icon: CircleAlert, label: "Warning", keys: ["red", "rose", "coral", "wine"] },
  { icon: Info, label: "Note", keys: ["sky", "cyan", "blue", "ocean", "navy", "indigo"] },
];

/**
 * The icon a callout of this colour wears, or undefined for one that wears
 * none.
 *
 * **A colour she mixed herself never gets one.** A raw hex has no name, so
 * there is nothing to read a meaning off — guessing at one from how red the
 * number is would put a stop sign on a page for a colour she chose because she
 * liked it.
 */
export function getCalloutIcon(color: string | undefined): LucideIcon | undefined {
  if (!color || color.startsWith("#")) return undefined;
  return CALLOUT_ICONS.find((entry) => entry.keys.includes(color))?.icon;
}

/** What that icon means, for the label a screen reader reads. */
export function getCalloutIconLabel(color: string | undefined): string | undefined {
  if (!color || color.startsWith("#")) return undefined;
  return CALLOUT_ICONS.find((entry) => entry.keys.includes(color))?.label;
}

/**
 * What a callout stores when it has been told to wear no icon at all.
 *
 * **"No icon" and "the usual icon" are two different answers**, and an empty
 * prop can only carry one of them. Empty is the default — the icon the colour
 * implies — so refusing one needs a value of its own. A sentinel rather than a
 * second boolean prop: BlockNote props are flat, and one field with three
 * states cannot disagree with itself the way two fields can.
 *
 * It is a word no glyph in the catalogue is called, and an emoji is a
 * character, so nothing she could actually pick collides with it.
 */
export const CALLOUT_ICON_NONE = "none";

/** What to draw on a callout, once the colour and her choice are both read. */
export type CalloutIconChoice =
  | { kind: "none" }
  /** The convention its colour implies, which is what an untouched callout wears. */
  | { kind: "derived"; icon: LucideIcon; label: string }
  /** One she picked: a glyph name, or an emoji character. */
  | { kind: "chosen"; name: string };

/**
 * Derived unless overridden — her call 2026-08-28.
 *
 * **The convention is kept as the starting point on purpose.** A tick on a
 * green box is read without being learned, and a callout that started blank
 * would need decorating by hand before it said anything at all. So the colour
 * still speaks first, and picking an icon is what stops it.
 */
export function resolveCalloutIcon(color: string | undefined, icon: string | undefined): CalloutIconChoice {
  if (icon === CALLOUT_ICON_NONE) return { kind: "none" };
  if (icon) return { kind: "chosen", name: icon };
  const derived = getCalloutIcon(color);
  if (!derived) return { kind: "none" };
  return { kind: "derived", icon: derived, label: getCalloutIconLabel(color) ?? "" };
}
