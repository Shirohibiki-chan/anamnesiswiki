// What a callout wears, and the kinds the menu offers. Phase 19.5, rewritten
// 2026-09-06.
//
// **The icon says what kind of box it is. The colour is only a colour.** It ran
// the other way until now: four colour families each implied an icon — green a
// tick, amber a caution, red a stop, blue a note — and a callout wearing any
// other colour, or none, wore nothing. Reported from use, and the objection is
// the right one: the rule is invisible, so what it produces on the page is some
// boxes carrying an icon and some not for no reason a reader can see, plus an
// icon that changes underneath you when you recolour a box. Neither half is
// something anybody asked for; both are gone.
//
// **The four conventions survive as kinds you pick**, which is what GitBook
// does with its hints and what she pointed at. Success, Warning and Danger are
// entries in the slash menu that make a callout already wearing the colour and
// the icon, so the same four boxes are still one gesture away — the difference
// is that choosing is visible and deriving was not.
//
// **Nothing new is stored.** A kind is a starting colour and a starting icon
// written onto the block's two existing props at the moment it is created, so
// a Warning is an Info callout that came out amber. That is also why recolouring
// one keeps its triangle: the icon is a value on the block, not a guess made
// from the colour every time it draws.
import {
  CircleAlert,
  CircleCheck,
  Info,
  Lock,
  MessageSquareQuote,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

/** The three block types. A kind below is one of these plus a starting look. */
export type CalloutVariant = "info" | "quote" | "secret";

/**
 * The icon a callout wears when it has not been given one of its own.
 *
 * Kebab Lucide names — the same values the icon picker stores, so a default and
 * a chosen icon travel through exactly one code path (`StoredIcon`) and a
 * default can be replaced by picking, or removed outright, without any of the
 * three states needing to know about the others.
 *
 * **Secret is in the table but never drawn**, because its lock is already on
 * screen in the label chip and two locks on one box is a stutter. It is here so
 * that a fourth type added later has an obvious place to say what it wears.
 */
export const CALLOUT_TYPE_ICONS: Record<CalloutVariant, string> = {
  info: "info",
  quote: "message-square-quote",
  secret: "lock",
};

/**
 * What a callout stores when it has been told to wear no icon at all.
 *
 * **"No icon" and "the usual icon" are two different answers**, and an empty
 * prop can only carry one of them. Empty is the default — the type's own — so
 * refusing one needs a value of its own. A sentinel rather than a second
 * boolean prop: BlockNote props are flat, and one field with three states
 * cannot disagree with itself the way two fields can.
 *
 * It is a word no glyph in the catalogue is called, and an emoji is a
 * character, so nothing she could actually pick collides with it.
 */
export const CALLOUT_ICON_NONE = "none";

/** What to draw on a callout, or null for one wearing nothing. */
export type CalloutIconChoice = {
  /** A glyph name or an emoji, for `StoredIcon`. */
  name: string;
  /** Hers rather than the type's, which is what the picker shows as selected. */
  chosen: boolean;
};

/** The icon this callout wears, once its type and her choice are both read. */
export function resolveCalloutIcon(variant: CalloutVariant, icon: string | undefined): CalloutIconChoice | null {
  if (icon === CALLOUT_ICON_NONE) return null;
  if (icon) return { name: icon, chosen: true };
  return { name: CALLOUT_TYPE_ICONS[variant], chosen: false };
}

/** One entry in the menu's Callouts group. */
export type CalloutKind = {
  title: string;
  subtext: string;
  aliases: string[];
  /** The block the entry makes. */
  type: "calloutInfo" | "calloutQuote" | "calloutSecret";
  /** A palette key written onto the new block, or empty for the type's own colour. */
  color: string;
  /** A glyph name written onto the new block, or empty for the type's own icon. */
  icon: string;
  /** Drawn in the menu itself. The same icon the block will wear. */
  menuIcon: LucideIcon;
};

/**
 * The six entries, in the order the menu shows them.
 *
 * **The three conventions sit between Info and Quote on purpose**: they are
 * variations on Info, and a menu that reads Info, Success, Warning, Danger,
 * Quote, Secret groups the boxes that differ only in what they are warning you
 * about. The colours are the palette's, not hexes — a callout made from one of
 * these recolours with the theme like every other coloured thing.
 */
export const CALLOUT_KINDS: CalloutKind[] = [
  {
    title: "Info",
    subtext: "Blue callout for intro or description text",
    aliases: ["info", "note", "callout"],
    type: "calloutInfo",
    color: "",
    icon: "",
    menuIcon: Info,
  },
  {
    title: "Success",
    subtext: "Green callout for something confirmed or settled",
    aliases: ["success", "confirm", "tick", "callout"],
    type: "calloutInfo",
    color: "emerald",
    icon: "circle-check",
    menuIcon: CircleCheck,
  },
  {
    title: "Warning",
    subtext: "Amber callout for something to be careful about",
    aliases: ["warning", "caution", "careful", "callout"],
    type: "calloutInfo",
    color: "amber",
    icon: "triangle-alert",
    menuIcon: TriangleAlert,
  },
  {
    title: "Danger",
    subtext: "Red callout for something that goes wrong",
    aliases: ["danger", "error", "stop", "callout"],
    type: "calloutInfo",
    color: "red",
    icon: "circle-alert",
    menuIcon: CircleAlert,
  },
  {
    title: "Quote",
    subtext: "Grey italic callout for character quotes",
    aliases: ["quote", "callout"],
    type: "calloutQuote",
    color: "",
    icon: "",
    menuIcon: MessageSquareQuote,
  },
  {
    title: "Secret",
    subtext: "Purple callout for admin-only content",
    aliases: ["secret", "hidden", "callout"],
    type: "calloutSecret",
    color: "",
    icon: "",
    menuIcon: Lock,
  },
];
