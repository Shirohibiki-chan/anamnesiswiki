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
import { useCallback, useState } from "react";
import { ChevronLeft, Plus, X } from "lucide-react";
import { COLOR_PALETTE, isHexColor } from "../../constants/palette";
import { useColorActions, useSavedColors } from "../../hooks/use-preferences";

/** The six offered without a second click. */
const QUICK_KEYS = ["teal", "sky", "indigo", "purple", "rose", "amber"];

type ColorSwatchesProps = {
  /** The stored value: a palette key, a hex, or nothing. */
  value: string | undefined;
  onPick: (value: string | undefined) => void;
};

export function ColorSwatches({ value, onPick }: ColorSwatchesProps) {
  const [showAll, setShowAll] = useState(false);
  const savedColors = useSavedColors();
  const { saveColor, forgetColor } = useColorActions();

  // **The colour input is read on `change`, never on `input`.** A colour input
  // fires while the pointer moves around the system dialog, and React's
  // `onChange` is that live event — so one drag through the purples wrote a
  // hundred colours to the block, a hundred entries to the undo history and a
  // hundred saves to disk. That is both the lag and the row of eight
  // near-identical purples. `change` fires once, when the dialog is done.
  const commitOnly = useCallback(
    (input: HTMLInputElement | null) => {
      if (!input) return;
      const commit = () => {
        onPick(input.value);
        // Kept the moment it is used, rather than behind a "save" nobody would
        // press. Re-picking one already saved moves it to the front.
        saveColor(input.value);
      };
      input.addEventListener("change", commit);
      return () => input.removeEventListener("change", commit);
    },
    [onPick, saveColor],
  );

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

  // **Keeps its plus whatever it is wearing.** This tile is the way to the
  // system picker, and a tile that swaps its plus for a colour stops looking
  // like the way to anything.
  const custom = (
    <label className="color-swatch color-swatch-custom" title="Mix a colour">
      <Plus size={14} />
      {/* The input fills its label and is invisible, so the whole tile is the
          target and the browser still opens the system dialog on a real
          click — which is all a colour input needs to do. */}
      <input
        ref={commitOnly}
        type="color"
        aria-label="Mix a colour"
        defaultValue={value && isHexColor(value) ? value : "#8b5cf6"}
      />
    </label>
  );

  // The colours she has mixed, usable anywhere a colour is chosen. Each can be
  // dropped from the row by the × that appears on it, which is the only way
  // out of a list that would otherwise only ever grow.
  const saved = savedColors.map((hex) => (
    <span key={hex} className="color-swatch-saved">
      <button
        type="button"
        className={`color-swatch${value === hex ? " color-swatch-active" : ""}`}
        style={{ backgroundColor: hex }}
        title={hex}
        aria-label={hex}
        aria-pressed={value === hex}
        onClick={() => onPick(hex)}
      />
      <button
        type="button"
        className="color-swatch-forget"
        title={`Forget ${hex}`}
        aria-label={`Forget ${hex}`}
        onClick={() => forgetColor(hex)}
      >
        <X size={9} />
      </button>
    </span>
  ));

  if (showAll) {
    return (
      <div className="color-swatch-all">
        <button type="button" className="color-swatch-back" onClick={() => setShowAll(false)}>
          <ChevronLeft size={13} /> Fewer colours
        </button>
        <div className="color-swatch-grid">{named.map((color) => swatch(color))}</div>

        {/* Mixed colours sit apart from the named ones: these are hers, they
            follow her between projects, and one of them can be thrown away —
            none of which is true of the palette above. */}
        <div className="color-swatch-mine">
          {saved}
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
