// The per-block menu: Title / No title, a colour row, Duplicate, Move up/down,
// Remove. Phase 18a. Positioning and portaling are the TreePopover wrapper's
// job, the same as every other menu in the app — see tree/ContextMenu.tsx,
// whose idiom this follows so two menus in the same window don't behave
// differently.
import { ArrowDown, ArrowUp, Check, Copy, EyeOff, Grid2x2, PencilLine, Plus, Trash2, Type } from "lucide-react";
import { COLLECTION_SOURCES } from "../../constants/collection-sources";
import { METER_STYLES } from "../../constants/meter-styles";
import type { CollectionSource, MeterFace, MeterStyle } from "../../constants/schema";
import { ColorSwatches } from "./ColorSwatches";
import { MeterIcon } from "./IconPicker";

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
    /** The right-clicked reading's own colour, and how to set it. */
    meterColor?: string;
    onSetMeterColor?: (color: string | undefined) => void;
    face: MeterFace;
    segmented: boolean;
    onSetFace: (face: MeterFace) => void;
    onToggleSegments: () => void;
    /** Present only for the two counting shapes: what they are counted in. */
    pip?: string;
    onPickPip?: () => void;
  };
  /** Present only for a collection block: where it gets its pages. */
  collection?: {
    source: CollectionSource;
    onSetSource: (source: CollectionSource) => void;
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
  collection,
}: BlockMenuProps) {
  return (
    <div className="tree-context-menu block-menu">
      <button type="button" onClick={onRename}>
        <PencilLine size={13} /> Rename
      </button>
      <button type="button" onClick={onToggleTitle}>
        <Type size={13} /> {titleShown ? "No title" : "Show title"}
      </button>

      {collection && (
        <>
          <div className="block-menu-separator" />
          <div className="tree-context-menu-heading">Where these come from</div>
          {COLLECTION_SOURCES.map((option) => (
            <button
              key={option.key}
              type="button"
              className={collection.source === option.key ? "tree-context-menu-checked" : undefined}
              aria-pressed={collection.source === option.key}
              onClick={() => collection.onSetSource(option.key)}
            >
              <option.icon size={13} />
              <span className="block-source-label">
                {option.label}
                <small>{option.hint}</small>
              </span>
              {/* The current one says so. A picker that shows four options and
                  no answer makes you go back out and look at the block. */}
              {collection.source === option.key && <Check size={13} className="block-menu-trailing-check" />}
            </button>
          ))}
        </>
      )}

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

          {/* One reading's own colour, when the menu was opened on one. Four
              dials under a heading are four different things, and colouring
              them together is what the block's colour below is for; this is
              the other half. Clearing it hands the reading back to the
              block's. */}
          {meter.onSetMeterColor && (
            <>
              <div className="block-menu-separator" />
              <div className="tree-context-menu-heading">This meter's colour</div>
              <ColorSwatches value={meter.meterColor} onPick={meter.onSetMeterColor} />
            </>
          )}

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
          <button type="button" onClick={meter.onToggleSegments}>
            <Grid2x2 size={13} className={meter.segmented ? "" : "block-menu-unchecked"} /> Segmented
          </button>
          {/* Stars are only the default. A rating counted in acorns, skulls or
              coins is the same widget, and which symbol it uses is the thing
              that makes it belong to a world rather than to a review site. */}
          {meter.onPickPip && (
            <button type="button" onClick={meter.onPickPip}>
              <MeterIcon icon={meter.pip} size={13} /> Rating symbol
            </button>
          )}
          {/* What sits inside a dial. Three tiles rather than three rows,
              because they are three pictures of the same meter. */}
          <div className="block-menu-faces">
            {(["value", "icon", "both"] as MeterFace[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`block-menu-face${meter.face === option ? " block-menu-face-active" : ""}`}
                onClick={() => meter.onSetFace(option)}
              >
                {option === "value" ? "6/10" : option === "icon" ? "Icon" : "Both"}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="block-menu-separator" />

      <ColorSwatches value={color} onPick={onColor} />

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
