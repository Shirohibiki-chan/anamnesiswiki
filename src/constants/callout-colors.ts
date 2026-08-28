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
