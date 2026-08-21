// The per-block menu: Title / No title, a colour row, Duplicate, Move up/down,
// Remove. Phase 18a. Positioning and portaling are the TreePopover wrapper's
// job, the same as every other menu in the app — see tree/ContextMenu.tsx,
// whose idiom this follows so two menus in the same window don't behave
// differently.
import { ArrowDown, ArrowUp, Check, Copy, EyeOff, Palette, PencilLine, Plus, Trash2, Type } from "lucide-react";
import { METER_STYLES } from "../../constants/meter-styles";
import { COLOR_PALETTE } from "../../constants/palette";
import type { MeterStyle } from "../../constants/schema";

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
  /**
   * Deleting the field itself. Present for any property block — a template's
   * fields included, since the page is a copy — and absent for the other block
   * kinds, which have nothing behind them to delete.
   */
  onDeleteProperty?: () => void;
  /**
   * A meter block's own three entries. Present only for `meter`, the same way
   * `onDeleteProperty` is present only for `property` — this menu is the one
   * place a block's settings live, and a second menu on a block would be a
   * second place to look for them.
   */
  meter?: {
    style: MeterStyle;
    textShown: boolean;
    maxShown: boolean;
    onSetStyle: (style: MeterStyle) => void;
    onAdd: () => void;
    onToggleText: () => void;
    onToggleMax: () => void;
    /**
     * The reading the menu was opened on, when it was opened by right-clicking
     * one. Absent when the menu came from the `⋯` button, which belongs to the
     * whole block and can't know which meter was meant.
     */
    onDuplicateMeter?: () => void;
    onRemoveMeter?: () => void;
  };
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
  onDeleteProperty,
  meter,
}: BlockMenuProps) {
  return (
    <div className="tree-context-menu block-menu">
      <button type="button" onClick={onRename}>
        <PencilLine size={13} /> Rename
      </button>
      <button type="button" onClick={onToggleTitle}>
        <Type size={13} /> {titleShown ? "No title" : "Show title"}
      </button>

      {meter && (
        <>
          <div className="block-menu-separator" />
          {/* The shape as a grid of six rather than a list, which is what the
              reference shows and what a picture-picker wants to be: they
              differ by how they look, so they are chosen by looking. */}
          <div className="block-menu-shapes">
            {METER_STYLES.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`block-menu-shape${meter.style === option.key ? " block-menu-shape-active" : ""}`}
                title={`${option.label} — ${option.hint}`}
                aria-label={option.label}
                aria-pressed={meter.style === option.key}
                onClick={() => meter.onSetStyle(option.key)}
              >
                <option.icon size={15} />
                <small>{option.label}</small>
              </button>
            ))}
          </div>

          <div className="block-menu-separator" />
          <button type="button" onClick={meter.onAdd}>
            <Plus size={13} /> Add meter
          </button>
          {meter.onDuplicateMeter && (
            <button type="button" onClick={meter.onDuplicateMeter}>
              <Copy size={13} /> Duplicate meter
            </button>
          )}
          {meter.onRemoveMeter && (
            <button type="button" className="tree-context-menu-danger" onClick={meter.onRemoveMeter}>
              <Trash2 size={13} /> Delete meter
            </button>
          )}
          {/* Ticked rather than worded as the opposite action, because these
              are states rather than commands — "Hide text" beside a meter that
              is already hiding it reads as a question. */}
          <button type="button" onClick={meter.onToggleText}>
            <Check size={13} className={meter.textShown ? "" : "block-menu-unchecked"} /> Show text
          </button>
          <button type="button" onClick={meter.onToggleMax}>
            <Check size={13} className={meter.maxShown ? "" : "block-menu-unchecked"} /> Show max
          </button>
        </>
      )}

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

      {/* Two different things, deliberately worded apart. Removing a block
          takes it off the panel and keeps whatever was typed into it, so it
          can be added back from Add Block. Deleting the property throws the
          value away. Offering only one of them was the bug: Phase 18a moved
          removal into this menu and left nothing anywhere that could delete a
          property she had added. */}
      <button type="button" onClick={onRemove}>
        <EyeOff size={13} /> Remove block
      </button>
      {onDeleteProperty && (
        <button type="button" className="tree-context-menu-danger" onClick={onDeleteProperty}>
          <Trash2 size={13} /> Delete property
        </button>
      )}
    </div>
  );
}
