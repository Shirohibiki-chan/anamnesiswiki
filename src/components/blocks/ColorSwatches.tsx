// The colour row: every named colour, plus one you mix yourself. Phase 18c.
//
// Split out of the two menus that were each drawing their own, and rebuilt
// after her comparison against the reference — which offered more colours,
// bolder ones, and a way to pick any colour at all. A named colour is stored
// by name so it follows the theme; a mixed one is stored as its hex, because
// it has no name to be looked up by.
import { Plus, X } from "lucide-react";
import { COLOR_PALETTE, isHexColor } from "../../constants/palette";

type ColorSwatchesProps = {
  /** The stored value: a palette key, a hex, or nothing. */
  value: string | undefined;
  onPick: (value: string | undefined) => void;
};

export function ColorSwatches({ value, onPick }: ColorSwatchesProps) {
  const custom = value && isHexColor(value) ? value : undefined;
  const named = COLOR_PALETTE.filter((color) => color.hex);

  return (
    <div className="color-swatches">
      {/* Clearing sits with the colours rather than as a row of its own —
          "no colour" is one of the answers to "which colour". */}
      <button
        type="button"
        className={`color-swatch color-swatch-none${value ? "" : " color-swatch-active"}`}
        title="No colour"
        aria-label="No colour"
        aria-pressed={!value}
        onClick={() => onPick(undefined)}
      >
        <X size={11} />
      </button>

      {named.map((color) => (
        <button
          key={color.key}
          type="button"
          className={`color-swatch${value === color.key ? " color-swatch-active" : ""}`}
          style={{ backgroundColor: color.hex ?? undefined }}
          title={color.name}
          aria-label={color.name}
          aria-pressed={value === color.key}
          onClick={() => onPick(color.key)}
        />
      ))}

      {/* A real colour input, which is the OS's own picker — no wheel of our
          own to build, and nothing fetched to draw it. */}
      <label
        className={`color-swatch color-swatch-custom${custom ? " color-swatch-active" : ""}`}
        style={custom ? { backgroundColor: custom } : undefined}
        title={custom ? `Custom ${custom}` : "Pick any colour"}
      >
        {!custom && <Plus size={11} />}
        <input
          type="color"
          value={custom ?? "#8b5cf6"}
          aria-label="Pick any colour"
          onChange={(e) => onPick(e.target.value)}
        />
      </label>
    </div>
  );
}
