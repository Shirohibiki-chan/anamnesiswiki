// Popover content shown when a tree row's color dot is clicked. 10 preset
// swatches plus a clear/default X. See docs/glossary.md §Color Cascade.
// Positioning/portaling is handled by the TreePopover wrapper around this.
import { X } from "lucide-react";
import { COLOR_PALETTE } from "../../constants/palette";

type ColorPickerProps = {
  ownColor: string | undefined;
  showInheritedHint: boolean;
  onSelect: (colorKey: string | undefined) => void;
};

export function ColorPicker({ ownColor, showInheritedHint, onSelect }: ColorPickerProps) {
  return (
    <div className="tree-color-picker">
      {showInheritedHint && !ownColor && <div className="tree-color-picker-hint">Inheriting from parent</div>}
      <div className="tree-color-picker-grid">
        {COLOR_PALETTE.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`tree-color-swatch${ownColor === c.key ? " tree-color-swatch-active" : ""}`}
            style={c.hex ? { backgroundColor: c.hex } : undefined}
            title={c.name}
            onClick={() => onSelect(c.hex ? c.key : undefined)}
          >
            {!c.hex && <X size={12} />}
          </button>
        ))}
      </div>
    </div>
  );
}
