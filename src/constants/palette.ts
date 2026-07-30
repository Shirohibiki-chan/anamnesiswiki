// Node-coloring palette — data, not UI tokens. Keep in sync with the
// --color-palette-* custom properties in src/index.css. See
// docs/constants-and-theming.md §Node coloring and cascade.
export type PaletteColor = {
  key: string;
  name: string;
  hex: string | null;
};

export const COLOR_PALETTE: PaletteColor[] = [
  { key: "default", name: "Default", hex: null },
  { key: "teal", name: "Teal", hex: "#5eead4" },
  { key: "sky", name: "Sky", hex: "#7dd3fc" },
  { key: "purple", name: "Purple", hex: "#c4b5fd" },
  { key: "rose", name: "Rose", hex: "#fda4af" },
  { key: "amber", name: "Amber", hex: "#fcd34d" },
  { key: "sage", name: "Sage", hex: "#86efac" },
  { key: "orange", name: "Orange", hex: "#fdba74" },
  { key: "indigo", name: "Indigo", hex: "#a5b4fc" },
  { key: "red", name: "Red", hex: "#fca5a5" },
  { key: "gray", name: "Gray", hex: "#a1a1aa" },
];

export function getPaletteHex(key: string | undefined): string | null {
  if (!key) return null;
  return COLOR_PALETTE.find((c) => c.key === key)?.hex ?? null;
}
