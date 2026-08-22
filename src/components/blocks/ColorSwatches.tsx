// The colour control: one short row, and a "+" that opens the rest.
// Phase 18c.
//
// **A row, not a grid.** It was the whole palette inline, and a menu carrying
// two of those — one for the meter, one for the block — was taller than the
// window. The reference shows six colours and a plus for a reason, and this is
// that reason: the common answer is one of a handful, and everything else can
// afford a second click.
//
// **Nothing here closes anything.** Picking a colour is something you do two
// or three times in a row while looking at the result, so neither this row nor
// the menu holding it gets out of the way after one click.
//
// A named colour is stored by name so it follows the theme; a colour mixed in
// the system picker is stored as its hex, because it has no name to look up.
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { COLOR_PALETTE, isHexColor } from "../../constants/palette";
import { TreePopover } from "../tree/TreePopover";

/** The six offered without a second click. */
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

  // What the "+" is wearing. A colour chosen from the full palette or mixed in
  // the system picker has nowhere in the row to show itself, so it rides on the
  // plus — which stays a plus, because that tile is still the way to the rest.
  const elsewhere = value && !QUICK_KEYS.includes(value) ? value : undefined;
  const elsewhereHex = elsewhere
    ? isHexColor(elsewhere)
      ? elsewhere
      : (named.find((color) => color.key === elsewhere)?.hex ?? undefined)
    : undefined;

  function swatch(color: (typeof named)[number], onClose?: () => void) {
    return (
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
          onClose?.();
        }}
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
        <X size={12} />
      </button>

      {quick.map((color) => swatch(color))}

      <button
        type="button"
        className={`color-swatch color-swatch-more${elsewhereHex ? " color-swatch-carrying" : ""}`}
        style={elsewhereHex ? { backgroundColor: elsewhereHex } : undefined}
        title="More colours"
        aria-label="More colours"
        onClick={(e) => setMoreRect(e.currentTarget.getBoundingClientRect())}
      >
        <Plus size={12} />
      </button>

      {moreRect && (
        <TreePopover anchorRect={moreRect} onClose={() => setMoreRect(null)}>
          <div className="color-swatch-grid">
            {named.map((color) => swatch(color))}

            {/* The system's own picker, as one more tile. A bare colour input
                *is* a swatch — wrapping one in a label with the input hidden
                underneath looked the same and didn't open on click. */}
            <input
              type="color"
              className={`color-swatch color-swatch-custom${value && isHexColor(value) ? " color-swatch-active" : ""}`}
              title="Pick any colour"
              aria-label="Pick any colour"
              value={value && isHexColor(value) ? value : "#8b5cf6"}
              onChange={(e) => onPick(e.target.value)}
            />
          </div>
        </TreePopover>
      )}
    </div>
  );
}
