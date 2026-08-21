// The per-block menu: Title / No title, a colour row, Duplicate, Move up/down,
// Remove. Phase 18a. Positioning and portaling are the TreePopover wrapper's
// job, the same as every other menu in the app — see tree/ContextMenu.tsx,
// whose idiom this follows so two menus in the same window don't behave
// differently.
import { ArrowDown, ArrowUp, Copy, Palette, PencilLine, Trash2, Type } from "lucide-react";
import { COLOR_PALETTE } from "../../constants/palette";

type BlockMenuProps = {
  /** Whether the block is currently showing a title strip. */
  titleShown: boolean;
  color: string | undefined;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRename: () => void;
  onToggleTitle: () => void;
  onColor: (color: string | undefined) => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
};

export function BlockMenu({
  titleShown,
  color,
  canMoveUp,
  canMoveDown,
  onRename,
  onToggleTitle,
  onColor,
  onDuplicate,
  onMove,
  onRemove,
}: BlockMenuProps) {
  return (
    <div className="tree-context-menu block-menu">
      <button type="button" onClick={onRename}>
        <PencilLine size={13} /> Rename
      </button>
      <button type="button" onClick={onToggleTitle}>
        <Type size={13} /> {titleShown ? "No title" : "Show title"}
      </button>

      <div className="block-menu-separator" />

      <div className="block-menu-color-row">
        <span className="block-menu-color-label">
          <Palette size={13} /> Colour
        </span>
        <div className="block-menu-color-swatches">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`tree-color-swatch${(color ?? "default") === c.key ? " tree-color-swatch-active" : ""}`}
              style={c.hex ? { backgroundColor: c.hex } : undefined}
              title={c.name}
              onClick={() => onColor(c.hex ? c.key : undefined)}
            />
          ))}
        </div>
      </div>

      <div className="block-menu-separator" />

      <button type="button" onClick={onDuplicate}>
        <Copy size={13} /> Duplicate
      </button>
      <button type="button" disabled={!canMoveUp} onClick={() => onMove(-1)}>
        <ArrowUp size={13} /> Move up
      </button>
      <button type="button" disabled={!canMoveDown} onClick={() => onMove(1)}>
        <ArrowDown size={13} /> Move down
      </button>

      <div className="block-menu-separator" />

      {/* Removing a block hides a field; it never deletes what was typed into
          it. The wording says so, because "Delete" next to a property someone
          spent an hour filling in reads as the other thing. */}
      <button type="button" className="tree-context-menu-danger" onClick={onRemove}>
        <Trash2 size={13} /> Remove block
      </button>
    </div>
  );
}
