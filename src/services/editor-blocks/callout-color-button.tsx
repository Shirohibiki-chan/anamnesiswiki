// The colour dot on a callout, and the swatches behind it. Phase 19.5.
//
// **In the corner of the block rather than in a menu.** Every other colour in
// the app is picked from a dot you can see — a tree row's, a sidebar block's —
// and a callout is the one coloured thing with no dot at all. It stays hidden
// until the pointer is over the callout, so a page being read is a page of
// callouts and not a page of buttons.
//
// **Its own swatches rather than `ColorSwatches`.** That component is a
// component: it reads saved colours and the live-preview store through hooks,
// and this file is under `services/`, which may not import upward. What it
// needs from it is the palette, and the palette is a constant. The one thing
// deliberately not copied is the system colour picker — a callout takes a
// colour with a name, so that a theme can retune it later.
import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { COLOR_PALETTE, getPaletteHex } from "../../constants/palette";

type CalloutColorButtonProps = {
  /** The stored palette key, or empty for the type's own colour. */
  value: string;
  onPick: (color: string) => void;
};

export function CalloutColorButton({ value, onPick }: CalloutColorButtonProps) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const hex = getPaletteHex(value);

  // Clicking anywhere else puts the swatches away. On `mousedown` rather than
  // `click`, because the buttons in here cancel their own mousedown to keep the
  // caret where it was — so focus never moves and a blur handler would never
  // fire. Only while it is open, so a page of callouts is not a page of
  // listeners.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as globalThis.Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <span className="editor-callout-color" ref={box}>
      <button
        type="button"
        className="editor-callout-color-dot"
        aria-label="Colour of this callout"
        title="Colour of this callout"
        style={hex ? { background: hex } : undefined}
        // Stops the click reaching the editor, which would move the caret out
        // of whatever she was writing and into this block.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((was) => !was)}
      />
      {open && (
        <span className="editor-callout-swatches">
          {/* Three rows of eight — the palette's own shape, light over mid over
              deep, so a hue is a column and a weight is a row. "Default" is
              pulled out of it below rather than sitting in the grid as a
              colourless circle among colours. */}
          <span className="editor-callout-swatch-grid">
            {COLOR_PALETTE.filter((color) => color.hex).map((color) => (
              <button
                key={color.key}
                type="button"
                className="editor-callout-swatch"
                aria-label={color.name}
                title={color.name}
                style={{ background: color.hex ?? undefined }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(color.key);
                  setOpen(false);
                }}
              >
                {color.key === value && <Check size={11} />}
              </button>
            ))}
          </span>
          <button
            type="button"
            className="editor-callout-swatch-clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              // Back to the colour the *type* has — which is a real answer, not
              // an absence, and is why this says what it does rather than
              // "none".
              onPick("");
              setOpen(false);
            }}
          >
            <X size={11} /> The usual colour
          </button>
        </span>
      )}
    </span>
  );
}
