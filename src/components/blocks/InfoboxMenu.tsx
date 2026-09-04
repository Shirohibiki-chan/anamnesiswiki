// The infobox's own menu: colour, how wide it is, where it sits, duplicate and
// remove. Phase 19.5. See docs/plan.md.
//
// **A frame is not a block, and this is not `BlockMenu`.** The two look alike
// and answer different questions — a block's menu renames it, hides its title,
// moves it up and down its list — none of which an infobox has. What they do
// share is the colour row, which is a component both call.
//
// **The width pair is an either/or, not two toggles.** Auto-adapt is "be as
// wide as what you hold", fixed is "be the width I set"; a box cannot be both,
// so they are drawn as one choice with a tick on the answer, the way the
// collection sources are.
import { Check, Copy, Maximize2, Scaling, Trash2, AlignCenter, AlignLeft, WrapText } from "lucide-react";
import { ColorSwatches } from "./ColorSwatches";

type InfoboxMenuProps = {
  /** The editor block's id — what the live colour preview recolours. */
  editorBlockId: string;
  color: string;
  autoWidth: boolean;
  centred: boolean;
  /** "left", "right", or empty — which side the writing goes round. */
  wrap: string;
  /** Already the whole column, so "Full width" has nothing to do. */
  isFullWidth: boolean;
  onColor: (color: string | undefined) => void;
  onAutoWidth: (auto: boolean) => void;
  onFullWidth: () => void;
  onCentred: (centred: boolean) => void;
  /** The side to sit on, or empty to stop wrapping and take a line of its own. */
  onWrap: (side: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

export function InfoboxMenu({
  editorBlockId,
  color,
  autoWidth,
  centred,
  wrap,
  isFullWidth,
  onColor,
  onAutoWidth,
  onFullWidth,
  onCentred,
  onWrap,
  onDuplicate,
  onRemove,
}: InfoboxMenuProps) {
  return (
    <div className="tree-context-menu block-menu">
      {/* At the top, where her screenshots of the reference have it. Picking a
          colour leaves the menu open, the same as a block's — it is something
          you do two or three times in a row while watching the frame change. */}
      <ColorSwatches value={color || undefined} onPick={onColor} previewTarget={editorBlockId} />

      <div className="block-menu-separator" />
      <div className="tree-context-menu-heading">Width</div>
      <button
        type="button"
        className={autoWidth ? "tree-context-menu-checked" : undefined}
        aria-pressed={autoWidth}
        onClick={() => onAutoWidth(true)}
      >
        <Scaling size={13} />
        <span className="block-source-label">
          Auto-adapt
          <small>As wide as what it holds</small>
        </span>
        {autoWidth && <Check size={13} className="block-menu-trailing-check" />}
      </button>
      <button
        type="button"
        className={!autoWidth ? "tree-context-menu-checked" : undefined}
        aria-pressed={!autoWidth}
        onClick={() => onAutoWidth(false)}
      >
        <Maximize2 size={13} />
        <span className="block-source-label">
          Fixed
          <small>The width you drag it to</small>
        </span>
        {!autoWidth && <Check size={13} className="block-menu-trailing-check" />}
      </button>

      <div className="block-menu-separator" />
      <div className="tree-context-menu-heading">Layout</div>
      {/* Disabled rather than hidden when it would do nothing: a menu whose
          items come and go is a menu you have to re-read every time. */}
      <button type="button" disabled={isFullWidth && !autoWidth} onClick={onFullWidth}>
        <Maximize2 size={13} /> Full width
      </button>
      <button
        type="button"
        className={centred ? "tree-context-menu-checked" : undefined}
        aria-pressed={centred}
        onClick={() => onCentred(!centred)}
      >
        {centred ? <AlignLeft size={13} /> : <AlignCenter size={13} />}
        {centred ? "Align left" : "Align centre"}
      </button>
      {/* **Both sides, and clicking the one that is on turns it off** — the
          same shape as Align centre above it, and the only way back to a frame
          that takes a line of its own without going through Full width. */}
      {(["left", "right"] as const).map((side) => (
        <button
          key={side}
          type="button"
          className={wrap === side ? "tree-context-menu-checked" : undefined}
          aria-pressed={wrap === side}
          onClick={() => onWrap(wrap === side ? "" : side)}
        >
          <WrapText size={13} />
          <span className="block-source-label">
            Wrap {side}
            <small>{wrap === side ? "The writing goes round it" : `Sits ${side}, writing beside it`}</small>
          </span>
          {wrap === side && <Check size={13} className="block-menu-trailing-check" />}
        </button>
      ))}

      <div className="block-menu-separator" />

      <button type="button" onClick={onDuplicate}>
        <Copy size={13} />
        <span className="block-source-label">
          Duplicate
          {/* The one thing about it worth saying out loud: a frame holds
              pointers, so the copy is given copies of the blocks rather than
              the same ones. Without this it looks as though editing one would
              edit both. */}
          <small>With copies of the blocks in it</small>
        </span>
      </button>

      <div className="block-menu-separator" />

      <button type="button" className="tree-context-menu-danger" onClick={onRemove}>
        <Trash2 size={13} />
        <span className="block-source-label">
          Remove infobox
          {/* BlockNote's own handle already offers "Delete", which does the same
              thing and says nothing about what happens to the blocks. Nothing
              is lost here, and the frame is the only part that goes. */}
          <small>The blocks in it go back to the sidebar</small>
        </span>
      </button>
    </div>
  );
}
