// The tree's colour picker. Phase 3, rebuilt on the shared swatch grid in
// Phase 18c so a page and a block are coloured from the same control — she
// noticed the two disagreeing about how many colours exist.
import { ColorSwatches } from "../blocks/ColorSwatches";

type ColorPickerProps = {
  /** The page's own colour, which may be a palette key or a hex. */
  ownColor: string | undefined;
  /** Whether this page is only showing a colour it inherited from a parent. */
  showInheritedHint: boolean;
  onSelect: (color: string | undefined) => void;
};

export function ColorPicker({ ownColor, showInheritedHint, onSelect }: ColorPickerProps) {
  return (
    <div className="tree-color-picker">
      <ColorSwatches value={ownColor} onPick={onSelect} />
      {showInheritedHint && !ownColor && (
        <p className="tree-color-inherited">Currently taking its colour from a folder above it.</p>
      )}
    </div>
  );
}
