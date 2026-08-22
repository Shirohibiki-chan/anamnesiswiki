// Node-coloring palette — data, not UI tokens. Keep in sync with the
// --color-palette-* custom properties in src/index.css. See
// docs/constants-and-theming.md §Node coloring and cascade.
export type PaletteColor = {
  key: string;
  name: string;
  hex: string | null;
};

/**
 * The named colours, in three rows of the same eight hues.
 *
 * **Eleven pastels was the whole palette until 2026-08-21**, and her
 * comparison against the reference was that it offered more, offered bolder
 * ones, and let her type a colour of her own. All three were fair. The rows go
 * light / mid / deep so a hue can be found by column and a weight by row,
 * rather than by hunting through one line of similar pastels.
 */
export const COLOR_PALETTE: PaletteColor[] = [
  { key: "default", name: "Default", hex: null },

  { key: "teal", name: "Teal", hex: "#5eead4" },
  { key: "sky", name: "Sky", hex: "#7dd3fc" },
  { key: "indigo", name: "Indigo", hex: "#a5b4fc" },
  { key: "purple", name: "Purple", hex: "#c4b5fd" },
  { key: "rose", name: "Rose", hex: "#fda4af" },
  { key: "red", name: "Red", hex: "#fca5a5" },
  { key: "orange", name: "Orange", hex: "#fdba74" },
  { key: "amber", name: "Amber", hex: "#fcd34d" },

  { key: "emerald", name: "Emerald", hex: "#34d399" },
  { key: "cyan", name: "Cyan", hex: "#22d3ee" },
  { key: "blue", name: "Blue", hex: "#60a5fa" },
  { key: "violet", name: "Violet", hex: "#a78bfa" },
  { key: "fuchsia", name: "Fuchsia", hex: "#e879f9" },
  { key: "pink", name: "Pink", hex: "#f472b6" },
  { key: "coral", name: "Coral", hex: "#fb7185" },
  { key: "sage", name: "Sage", hex: "#86efac" },

  { key: "pine", name: "Pine", hex: "#0f766e" },
  { key: "ocean", name: "Ocean", hex: "#0369a1" },
  { key: "navy", name: "Navy", hex: "#3730a3" },
  { key: "plum", name: "Plum", hex: "#7e22ce" },
  { key: "wine", name: "Wine", hex: "#9f1239" },
  { key: "rust", name: "Rust", hex: "#c2410c" },
  { key: "bronze", name: "Bronze", hex: "#a16207" },
  { key: "gray", name: "Gray", hex: "#a1a1aa" },
];

/**
 * The hex a stored colour resolves to.
 *
 * **A stored value may be a hex outright**, not just a palette key: the
 * pickers let her choose any colour, and one she mixed herself has no name to
 * be looked up by. Palette keys are still preferred wherever a name exists,
 * because those follow the theme and a raw hex cannot.
 */
export function getPaletteHex(key: string | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("#")) return isHexColor(key) ? key : null;
  return COLOR_PALETTE.find((c) => c.key === key)?.hex ?? null;
}

/** Whether a string is a colour we would be willing to write to disk. */
export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

/**
 * The colours a pie chart's slices take when nobody has picked one.
 *
 * **A chart needs as many colours as it has slices, and a block only has one.**
 * Every other meter draws in the block's colour, or its own reading's, and that
 * is right when each reading is its own shape. Slices of one circle are the
 * exception: eight wedges in one accent is a solid disc, so an unpicked slice
 * takes the next colour along this list instead. Picking one on the reading
 * still wins, the way it does everywhere else.
 *
 * Chosen for separation rather than harmony — neighbours in the list are what
 * end up next to each other on the chart, so consecutive entries never share a
 * hue, and no two are close enough to be confused across a legend.
 */
export const SLICE_COLORS: string[] = [
  "teal",
  "amber",
  "indigo",
  "coral",
  "sage",
  "violet",
  "orange",
  "cyan",
  "pink",
  "blue",
  "bronze",
  "gray",
];

/** The default colour for the slice in position `index`, as a hex. */
export function sliceColorAt(index: number): string {
  return getPaletteHex(SLICE_COLORS[index % SLICE_COLORS.length]) ?? "#a1a1aa";
}

/**
 * Black or white, whichever can be read on top of this colour.
 *
 * A pie's slices carry their own labels, and the palette runs from `#fcd34d`
 * to `#3730a3` — one text colour cannot sit on both. Relative luminance by the
 * WCAG formula, with the threshold nudged above the usual 0.179 because these
 * labels are small and dark-on-pastel is the more comfortable half of the range.
 */
export function readableTextOn(hex: string): string {
  if (!isHexColor(hex)) return "#ffffff";
  const digits = hex.trim().slice(1);
  const channel = (index: number) => {
    const value = parseInt(digits.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.35 ? "#11111a" : "#ffffff";
}
