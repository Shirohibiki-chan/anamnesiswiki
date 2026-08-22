// The colour control: one short row, and a "+" that opens the rest in place.
// Phase 18c.
//
// **A row, not a grid.** It was the whole palette inline, and a menu carrying
// two of those — one for the meter, one for the block — was taller than the
// window. The reference shows six colours and a plus for a reason, and this is
// that reason: the common answer is one of a handful, and everything else can
// afford a second click.
//
// **The rest opens inside the menu, not in a popover over it.** A popover
// inside a popover reads as a click outside the first one, which closed the
// whole menu the instant anything in the second was clicked — so picking from
// the full palette appeared to do nothing at all. Swapping the contents in
// place is also what the tree's own menu does for "Set color".
//
// **Nothing here closes anything.** Picking a colour is something you do two
// or three times in a row while looking at the result.
//
// A named colour is stored by name so it follows the theme; a colour mixed in
// the system picker is stored as its hex, because it has no name to look up.
import { useState } from "react";
import { ChevronLeft, Plus, X } from "lucide-react";
import { COLOR_PALETTE, isHexColor } from "../../constants/palette";

/** The six offered without a second click. */
const QUICK_KEYS = ["teal", "sky", "indigo", "purple", "rose", "amber"];

type ColorSwatchesProps = {
  /** The stored value: a palette key, a hex, or nothing. */
  value: string | undefined;
  onPick: (value: string | undefined) => void;
};

export function ColorSwatches({ value, onPick }: ColorSwatchesProps) {
  const [showAll, setShowAll] = useState(false);

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

  function swatch(color: (typeof named)[number]) {
    return (
      <button
        key={color.key}
        type="button"
        className={`color-swatch${value === color.key ? " color-swatch-active" : ""}`}
        style={{ backgroundColor: color.hex as string }}
        title={color.name}
        aria-label={color.name}
        aria-pressed={value === color.key}
        onClick={() => onPick(color.key)}
      />
    );
  }

  const custom = (
    <label
      className={`color-swatch color-swatch-custom${value && isHexColor(value) ? " color-swatch-active" : ""}`}
      style={value && isHexColor(value) ? { backgroundColor: value } : undefined}
      title="Pick any colour"
    >
      {!(value && isHexColor(value)) && <Plus size={14} />}
      {/* The input fills its label and is invisible, so the whole tile is the
          target and the browser still opens the system dialog on a real
          click — which is all a colour input needs to do. */}
      <input
        type="color"
        aria-label="Pick any colour"
        value={value && isHexColor(value) ? value : "#8b5cf6"}
        onChange={(e) => onPick(e.target.value)}
      />
    </label>
  );

  if (showAll) {
    return (
      <div className="color-swatch-all">
        <button type="button" className="color-swatch-back" onClick={() => setShowAll(false)}>
          <ChevronLeft size={13} /> Fewer colours
        </button>
        <div className="color-swatch-grid">
          {named.map((color) => swatch(color))}
          {custom}
        </div>
      </div>
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
        <X size={14} />
      </button>

      {quick.map((color) => swatch(color))}

      <button
        type="button"
        className={`color-swatch color-swatch-more${elsewhereHex ? " color-swatch-carrying" : ""}`}
        style={elsewhereHex ? { backgroundColor: elsewhereHex } : undefined}
        title="More colours"
        aria-label="More colours"
        onClick={() => setShowAll(true)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
