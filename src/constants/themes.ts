// What the appearance panels in Settings offer. See docs/constants-and-theming.md.
import type { FontCategory } from "./font-library";

export type BuiltInTheme = {
  id: string;
  label: string;
  /** One line, shown under the name. Says what it is, not that it's nice. */
  note: string;
};

/**
 * The themes compiled into the app, as `[data-theme]` blocks in `src/index.css`.
 *
 * `dark` has no block of its own — the base token values *are* dark, and a
 * block restating them would be a second copy to keep in step. It's in this
 * list because it still needs a name and a row to click.
 *
 * Order is the picker's order, and it's a recommendation: the default first,
 * then the four other darks, then light. Deliberately not alphabetical — the
 * first row is what someone who never opens this screen ends up with.
 *
 * The darks are meant to be *different rooms*, not shades of the same one:
 * navy, neutral, warm brown, green, plum, and now a lit blue. The bar for
 * adding another is that it's recognisably somewhere else — a seventh grey
 * isn't a theme, it's a rounding error. Abyssal passes it on luminance as much
 * as hue; see the note above its block in `index.css`.
 */
export const BUILT_IN_THEMES: readonly BuiltInTheme[] = [
  { id: "midnight", label: "Midnight", note: "deep navy and teal, rounded type" },
  { id: "dark", label: "Anamnesis Dark", note: "near-black and teal — the original" },
  { id: "ember", label: "Ember", note: "warm charcoal, copper and lamplight" },
  { id: "grove", label: "Grove", note: "deep forest green, old gold" },
  { id: "nightbloom", label: "Nightbloom", note: "dark plum, orchid and cyan" },
  { id: "abyssal", label: "Abyssal", note: "deep ocean blue, cyan and violet" },
  { id: "daylight", label: "Daylight", note: "light background, dark text" },
];

/**
 * Her pick, on seeing the first three: *"the midnight theme is BiS as far as
 * what you did add, so make that default."* It also sets three fonts, so this
 * one line changes the app's default typeface as well as its colours.
 *
 * Only affects someone who has never chosen — a saved `themeId` wins, so
 * anyone already on `dark` stays on `dark`.
 */
export const DEFAULT_THEME_ID = "midnight";

export type FontSlotKey = "display" | "ui" | "prose" | "mono";

export type FontSlot = {
  key: FontSlotKey;
  /** The CSS custom property this slot writes. */
  token: string;
  label: string;
  hint: string;
  /**
   * Which library categories this slot puts **first**. Ordering only, as of
   * 2026-08-30 — every slot offers every family.
   *
   * It used to be a filter, so Monospace was reachable from the Code slot and
   * nowhere else, and Interface withheld Handwriting on the grounds that a menu
   * set in Gloria Hallelujah is unreadable. It is, and that was still the wrong
   * call: it is the app deciding what she is allowed to want, on the one screen
   * that exists for her to decide what she wants. Her words on finding it —
   * *why are we gatekeeping fonts*. A bad pick here costs one more pick.
   *
   * What was worth keeping is the *order*: Interface opens on Sans-serif and
   * Code on Monospace, because that is what those slots are usually for. See
   * `fontChoicesFor` in hooks/use-theme.ts.
   */
  cats: readonly FontCategory[];
  /** A line of the user's own kind of prose, for judging the face by. */
  specimen: string;
};

export const FONT_SLOTS: readonly FontSlot[] = [
  {
    key: "display",
    token: "--font-display",
    label: "Titles",
    hint: "page and folder names",
    cats: ["display", "serif", "sans", "hand"],
    specimen: "The Shattered Coast",
  },
  {
    key: "ui",
    token: "--font-ui",
    label: "Interface",
    hint: "menus, buttons and labels",
    cats: ["sans", "serif"],
    specimen: "Properties · Tags · Linked pages",
  },
  {
    key: "prose",
    token: "--font-prose",
    label: "Writing",
    hint: "the text on your pages",
    cats: ["serif", "sans", "hand"],
    specimen: "She'd been told the sword remembers, and had never once believed it.",
  },
  {
    key: "mono",
    token: "--font-mono",
    label: "Code",
    hint: "keyboard shortcuts and file paths",
    cats: ["mono"],
    specimen: "Ctrl+K — Documents/Anamnesis/",
  },
];

/**
 * Text-size multiplier bounds. The floor isn't 0.5 because the app has 11px
 * text in it and half of that is a smudge; the ceiling isn't 2 because the
 * properties panel is a fixed 300px column and its labels start wrapping
 * mid-word well before then. Phase 14's resizable sidebars would raise it.
 */
export const TEXT_SCALE_MIN = 0.85;
export const TEXT_SCALE_MAX = 1.4;
export const TEXT_SCALE_STEP = 0.05;
export const DEFAULT_TEXT_SCALE = 1;

/**
 * The writing gets its own multiplier and a wider floor. The UI's 0.85 floor
 * exists because the app has 11px labels in it and 9px is a smudge; the page
 * body is bigger than that, so it can come down further before it stops being
 * readable — and coming down is the direction she wanted (*"the contents are
 * generally too large"*). The ceiling is where the reading column starts
 * holding six words a line.
 *
 * **Both bounds moved on 2026-08-30 because the base did.** The page body went
 * from 16px to 15 (`--fs-content` in index.css), and leaving 0.7 and 1.4 alone
 * would have silently shortened the slider at both ends — the smallest
 * available would have gone from 11.2px to 10.5, and the largest from 22.4 to
 * 21. 0.75 and 1.5 on a 15px base land on the same 11.25 and 22.5. Changing
 * what 100% means is a decision about the default, not about the range.
 */
export const CONTENT_SCALE_MIN = 0.75;
export const CONTENT_SCALE_MAX = 1.5;
export const DEFAULT_CONTENT_SCALE = 1;
