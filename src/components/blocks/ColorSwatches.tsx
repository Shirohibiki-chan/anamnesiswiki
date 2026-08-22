// The colour control: one short row, and a "+" that opens the rest.
// Phase 18c.
//
// **A row, not a grid.** It was the whole palette inline, and a menu carrying
// two of those — one for the meter, one for the block — was taller than the
// window. The reference shows six colours and a plus for a reason, and this is
// that reason: the common answer is one of a handful, and everything else can
// afford a second click.
//
// A named colour is stored by name so it follows the theme; a colour mixed in
// the system picker is stored as its hex, because it has no name to look up.
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { COLOR_PALETTE, isHexColor } from "../../constants/palette";
import { TreePopover } from "../tree/TreePopover";

/** The six offered without a second click — one of each family, lightest row. */
const QUICK_KEYS = ["teal", "sky", "indigo", "purple", "rose", "amber"];

type ColorSwatchesProps = {
  /** The stored value: a palette key, a hex, or nothing. */
  value: string | undefined;
  onPick: (value: string | undefined) => void;
};

export function ColorSwatches({ value, onPick }: ColorSwatchesProps) {
  const [moreRect, setMoreRect] = useState<DOMRect | null>(null);

  const named = COLOR_PALETTE.filter((color) => color.hex);
  const quick = QUICK_KEYS.map((key) => named.find((color) => color.key === key)).filter(
    (color): color is (typeof named)[number] => !!color,
  );
  // Whatever is currently chosen, when it isn't one of the six. It rides on the
  // "+" tile so the row always shows the answer it is holding.
  const elsewhere = value && !QUICK_KEYS.includes(value) ? value : undefined;
  const elsewhereHex = elsewhere
    ? isHexColor(elsewhere)
      ? elsewhere
      : (named.find((color) => color.key === elsewhere)?.hex ?? undefined)
    : undefined;

  function swatch(key: string, hex: string, title: string) {
    return (
      <button
        key={key}
        type="button"
        className={`color-swatch${value === key ? " color-swatch-active" : ""}`}
        style={{ backgroundColor: hex }}
        title={title}
        aria-label={title}
        aria-pressed={value === key}
        onClick={() => onPick(key)}
      />
    );
  }

  return (
    <div className="color-swatch-row">
      {/* Clearing sits with the colours: "no colour" is one of the answers to
          "which colour", not a separate errand. */}
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

      {quick.map((color) => swatch(color.key, color.hex as string, color.name))}

      <button
        type="button"
        className={`color-swatch color-swatch-more${elsewhere ? " color-swatch-active" : ""}`}
        style={elsewhereHex ? { backgroundColor: elsewhereHex } : undefined}
        title="More colours"
        aria-label="More colours"
        onClick={(e) => setMoreRect(e.currentTarget.getBoundingClientRect())}
      >
        {!elsewhereHex && <Plus size={11} />}
      </button>

      {moreRect && (
        <TreePopover anchorRect={moreRect} onClose={() => setMoreRect(null)}>
          <div className="color-swatch-grid">
            {named.map((color) => (
              <button
                key={color.key}
                type="button"
                className={`color-swatch${value === color.key ? " color-swatch-active" : ""}`}
                style={{ backgroundColor: color.hex as string }}
                title={color.name}
                aria-label={color.name}
                aria-pressed={value === color.key}
                onClick={() => {
                  onPick(color.key);
                  setMoreRect(null);
                }}
              />
            ))}

            {/* A real colour input, which is the OS's own picker — no wheel of
                our own to build, and nothing fetched to draw it. */}
            <label
              className={`color-swatch color-swatch-custom${value && isHexColor(value) ? " color-swatch-active" : ""}`}
              style={value && isHexColor(value) ? { backgroundColor: value } : undefined}
              title="Pick any colour"
            >
              {!(value && isHexColor(value)) && <Plus size={11} />}
              <input
                type="color"
                value={value && isHexColor(value) ? value : "#8b5cf6"}
                aria-label="Pick any colour"
                onChange={(e) => onPick(e.target.value)}
              />
            </label>
          </div>
        </TreePopover>
      )}
    </div>
  );
}
