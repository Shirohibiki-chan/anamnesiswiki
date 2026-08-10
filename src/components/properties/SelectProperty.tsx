// Select / multi-select / status — one component, three types (Phase 13).
// They differ in exactly two ways: how many values can be held at once, and
// whether the chip carries a status dot. Everything else — the option list,
// the picker, renaming and recolouring — is the same machinery, which is why
// splitting them into three files would have meant maintaining one thing in
// three places.
//
// Options are created by typing, Notion-style, rather than being declared up
// front in the add-property form. The alternative wants a list of values
// defined before you can record a single one, which is a form to fill in
// before you're allowed to write — the opposite of what this sidebar is for.
//
// Colour is a palette *key*, and the chip is a tint of it (`${hex}26`) behind
// ordinary `--color-text-primary` text — the same trick FolderView uses. It
// matters: the palette is a set of pastels chosen against dark themes, so
// colouring the *text* with one would fail the contrast floor in
// docs/handoff.md the moment anyone switched to Daylight. Tint carries the
// colour, the theme's own token carries the legibility.
import { useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { COLOR_PALETTE, getPaletteHex } from "../../constants/palette";
import type { PropertyOption } from "../../constants/schema";
import { TreePopover } from "../tree/TreePopover";

// `default` is the "no colour" entry and a chip always has one, so the
// rotation skips it.
const CHIP_COLORS = COLOR_PALETTE.filter((color) => color.hex !== null);

type SelectPropertyProps = {
  label: string;
  type: "select" | "multiselect" | "status";
  options: PropertyOption[];
  // Always an array here, whatever the type — the panel converts to and from
  // the single-value shape on disk so this component has one code path.
  value: string[];
  onChange: (optionIds: string[]) => void;
  onOptionsChange: (options: PropertyOption[]) => void;
  onRemoveOption: (optionId: string) => void;
  onRemove?: () => void;
};

export function SelectProperty({
  label,
  type,
  options,
  value,
  onChange,
  onOptionsChange,
  onRemoveOption,
  onRemove,
}: SelectPropertyProps) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const isMulti = type === "multiselect";
  const showDot = type === "status";
  const selected = value.map((id) => options.find((option) => option.id === id)).filter((o): o is PropertyOption => !!o);

  const trimmed = query.trim();
  const visible = trimmed
    ? options.filter((option) => option.label.toLowerCase().includes(trimmed.toLowerCase()))
    : options;
  const canCreate = trimmed.length > 0 && !options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase());

  function close() {
    setAnchorRect(null);
    setQuery("");
    setEditingId(null);
  }

  function toggle(optionId: string) {
    if (isMulti) {
      onChange(value.includes(optionId) ? value.filter((id) => id !== optionId) : [...value, optionId]);
      setQuery("");
      return;
    }
    // Picking the value that's already set clears it — otherwise a
    // single-select is a one-way door and "actually, never mind" needs a
    // separate control.
    onChange(value.includes(optionId) ? [] : [optionId]);
    close();
  }

  function create() {
    const option: PropertyOption = {
      id: crypto.randomUUID(),
      label: trimmed,
      color: CHIP_COLORS[options.length % CHIP_COLORS.length].key,
    };
    onOptionsChange([...options, option]);
    onChange(isMulti ? [...value, option.id] : [option.id]);
    setQuery("");
    if (!isMulti) close();
  }

  const editing = editingId ? options.find((option) => option.id === editingId) : undefined;

  return (
    <div className="property-field">
      <div className="property-field-label-row">
        <div className="ui-eyebrow property-field-label">{label}</div>
        {onRemove && (
          <button type="button" className="ui-inline-remove" aria-label={`Remove ${label}`} onClick={onRemove}>
            <X size={11} />
          </button>
        )}
      </div>

      <button
        type="button"
        className="property-select-trigger"
        onClick={(e) => setAnchorRect(e.currentTarget.getBoundingClientRect())}
      >
        {selected.length > 0 ? (
          <span className="property-select-chips">
            {selected.map((option) => (
              <OptionChip key={option.id} option={option} showDot={showDot} />
            ))}
          </span>
        ) : (
          <span className="property-select-empty">Empty</span>
        )}
        <ChevronDown size={12} className="property-select-caret" />
      </button>

      {anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={close} className="property-select-popover">
          {editing ? (
            <OptionEditor
              option={editing}
              onChange={(patch) =>
                onOptionsChange(options.map((o) => (o.id === editing.id ? { ...o, ...patch } : o)))
              }
              onDelete={() => {
                onRemoveOption(editing.id);
                setEditingId(null);
              }}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <>
              <input
                className="property-select-search"
                autoFocus
                value={query}
                placeholder={options.length > 0 ? "Find or create…" : "Type to create the first one…"}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCreate) {
                    e.preventDefault();
                    create();
                  }
                  if (e.key === "Escape") close();
                }}
              />
              <div className="property-select-options">
                {visible.map((option) => (
                  <div key={option.id} className="property-select-row">
                    <button type="button" className="property-select-row-pick" onClick={() => toggle(option.id)}>
                      <span className="property-select-row-check">
                        {value.includes(option.id) && <Check size={12} />}
                      </span>
                      <OptionChip option={option} showDot={showDot} />
                    </button>
                    <button
                      type="button"
                      className="ui-icon-btn ui-icon-btn-sm"
                      aria-label={`Edit ${option.label}`}
                      onClick={() => setEditingId(option.id)}
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                ))}
                {canCreate && (
                  <button type="button" className="property-select-create" onClick={create}>
                    <Plus size={12} /> Create <strong>{trimmed}</strong>
                  </button>
                )}
                {visible.length === 0 && !canCreate && <p className="property-select-none">No options yet.</p>}
              </div>
            </>
          )}
        </TreePopover>
      )}
    </div>
  );
}

function OptionChip({ option, showDot }: { option: PropertyOption; showDot: boolean }) {
  const hex = getPaletteHex(option.color);
  return (
    <span
      className="property-select-chip"
      style={hex ? { backgroundColor: `${hex}26`, borderColor: `${hex}59` } : undefined}
    >
      {showDot && <span className="property-select-dot" style={hex ? { backgroundColor: hex } : undefined} />}
      {option.label}
    </span>
  );
}

type OptionEditorProps = {
  option: PropertyOption;
  onChange: (patch: Partial<PropertyOption>) => void;
  onDelete: () => void;
  onDone: () => void;
};

function OptionEditor({ option, onChange, onDelete, onDone }: OptionEditorProps) {
  return (
    <div className="property-option-editor">
      <input
        className="property-select-search"
        autoFocus
        value={option.label}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => onChange({ label: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") onDone();
        }}
      />
      <div className="property-option-colors">
        {CHIP_COLORS.map((color) => (
          <button
            key={color.key}
            type="button"
            className={`property-option-color${color.key === option.color ? " property-option-color-active" : ""}`}
            style={{ backgroundColor: color.hex ?? undefined }}
            title={color.name}
            aria-label={color.name}
            onClick={() => onChange({ color: color.key })}
          />
        ))}
      </div>
      <div className="property-option-editor-actions">
        <button type="button" className="property-option-delete" onClick={onDelete}>
          <Trash2 size={11} /> Delete
        </button>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
