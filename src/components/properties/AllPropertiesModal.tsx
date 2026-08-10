// Phase 13 — one place that lists every property and every tag in the project,
// with what uses each. Taken from Obsidian's All Properties view and asked for
// 2026-08-08.
//
// The problem it solves only appears once a project is big: you can see the
// properties and tags on *this* page and nowhere the set you've actually
// accumulated, so `pov` and `POV` and `point-of-view` coexist for months. So
// two capitalisations are listed separately, sorted next to each other, and
// each says the other exists — but nothing merges them on its own. They're the
// user's words and she may well mean both.
//
// Renaming onto a name that already exists *is* the merge; there's no separate
// merge button, there's a sentence saying what's about to happen. See
// property-service.ts for the rules, which are where the care went.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Hash, Pencil, Tag, Trash2 } from "lucide-react";
import { getTemplateIcon } from "../../constants/icons";
import { COLOR_PALETTE } from "../../constants/palette";
import {
  CHIP_PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type CustomPropertySpec,
  type Node,
} from "../../constants/schema";
import { useDialogs } from "../../hooks/use-dialogs";
import { useProject, useProjectActions } from "../../hooks/use-project";
import { usePropertyIndex } from "../../hooks/use-property-index";
import type { OptionIndexEntry } from "../../services/property-service";
import { OptionChip } from "./SelectProperty";
import "./properties.css";
import "./all-properties.css";

// `default` is the "no colour" entry; a chip always has one, same as the picker
// in SelectProperty.
const CHIP_COLORS = COLOR_PALETTE.filter((color) => color.hex !== null);

type Mode = "properties" | "tags";

/** Both halves of the view render from this — see the two builders below. */
type Row = {
  label: string;
  nodeIds: string[];
  /** The line under the name: types, counts. */
  meta: string;
  /** Other spellings of the same name, if any. */
  variants: string[];
  /** False when every use of this name comes from a template. */
  canEdit: boolean;
  /** Shown instead of, or alongside, the buttons. */
  note: string | null;
  /** Chip properties get their option list underneath. */
  hasOptions: boolean;
  /** Status chips carry a dot; select and multi-select don't. */
  showDot: boolean;
};

function plural(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

/** The other spellings of each name, keyed by exact spelling. */
function variantMap(labels: string[]): Map<string, string[]> {
  const byLowered = new Map<string, string[]>();
  for (const label of labels) {
    const lowered = label.toLowerCase();
    byLowered.set(lowered, [...(byLowered.get(lowered) ?? []), label]);
  }
  return new Map(
    labels.map((label) => [label, (byLowered.get(label.toLowerCase()) ?? []).filter((other) => other !== label)]),
  );
}

export function AllPropertiesModal({ onClose }: { onClose: () => void }) {
  const { nodes } = useProject();
  const { selectNode } = useProjectActions();
  const { confirmDestructive } = useDialogs();
  const index = usePropertyIndex();

  const [mode, setMode] = useState<Mode>("properties");
  const [filter, setFilter] = useState("");
  const [openLabel, setOpenLabel] = useState<string | null>(null);

  // Escape closes it. The modal has a filter box and a list of buttons, so
  // there's no single element to hang a key handler on that's always focused.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const propertyRows: Row[] = useMemo(() => {
    const variants = variantMap(index.properties.map((entry) => entry.label));
    return index.properties.map((entry) => {
      const types = entry.types.map((type: CustomPropertySpec["type"]) => PROPERTY_TYPE_LABELS[type]).join(" / ");
      return {
        label: entry.label,
        nodeIds: entry.nodeIds,
        meta: `${types} · ${plural(entry.nodeIds.length, "page")} · ${entry.filledCount} filled in`,
        variants: variants.get(entry.label) ?? [],
        canEdit: entry.fromCustom,
        note: !entry.fromCustom
          ? "This one comes from a template, so it's the same on every page of that kind and can't be changed here."
          : entry.fromTemplate
            ? "Some pages get this from a template — those keep the name they have."
            : null,
        hasOptions: entry.types.some((type) => CHIP_PROPERTY_TYPES.includes(type)),
        showDot: entry.types.includes("status"),
      };
    });
  }, [index.properties]);

  const tagRows: Row[] = useMemo(() => {
    const variants = variantMap(index.tags.map((entry) => entry.label));
    return index.tags.map((entry) => ({
      label: entry.label,
      nodeIds: entry.nodeIds,
      meta: plural(entry.nodeIds.length, "page"),
      variants: variants.get(entry.label) ?? [],
      canEdit: true,
      note: null,
      hasOptions: false,
      showDot: false,
    }));
  }, [index.tags]);

  const rows = mode === "properties" ? propertyRows : tagRows;
  const needle = filter.trim().toLowerCase();
  const visible = needle ? rows.filter((row) => row.label.toLowerCase().includes(needle)) : rows;

  function previewRename(label: string, newLabel: string): string | null {
    if (mode === "tags") {
      const plan = index.previewTagRename(label, newLabel);
      if (plan.merged === 0) return null;
      return `${plural(plan.merged, "page")} already ${plan.merged === 1 ? "uses" : "use"} “${newLabel}”, so the two become one tag there.`;
    }
    const plan = index.previewPropertyRename(label, newLabel);
    const parts: string[] = [];
    if (plan.merged > 0) {
      parts.push(
        `${plural(plan.merged, "page")} already ${plan.merged === 1 ? "has" : "have"} a “${newLabel}”, and only one of the two was filled in, so they become one field there.`,
      );
    }
    if (plan.kept > 0) {
      parts.push(
        `${plural(plan.kept, "page")} ${plan.kept === 1 ? "has" : "have"} both filled in — nothing is thrown away, so ${plan.kept === 1 ? "that page" : "those pages"} will show two fields called “${newLabel}” for you to sort out.`,
      );
    }
    if (plan.templateClash > 0) {
      parts.push(
        `${plural(plan.templateClash, "page")} already ${plan.templateClash === 1 ? "gets" : "get"} a “${newLabel}” from its template, which can't be merged into yet — ${plan.templateClash === 1 ? "that page" : "those pages"} will show two fields with that name.`,
      );
    }
    return parts.length > 0 ? parts.join(" ") : null;
  }

  function applyRename(label: string, newLabel: string) {
    if (mode === "tags") index.renameTag(label, newLabel);
    else index.renameProperty(label, newLabel);
    setOpenLabel(newLabel);
  }

  async function handleDelete(row: Row) {
    if (mode === "tags") {
      const message = `Remove the tag “${row.label}” from ${plural(row.nodeIds.length, "page")}? You can undo this.`;
      if (!(await confirmDestructive(message))) return;
      index.deleteTag(row.label);
      setOpenLabel(null);
      return;
    }

    // Naming how many actually have something written in is the difference
    // between "delete this field from 12 pages" — which sounds tidy — and
    // knowing that nine of them lose a paragraph.
    const { pages, filled } = index.previewPropertyDelete(row.label);
    const warning =
      filled > 0
        ? ` ${plural(filled, "page")} ${filled === 1 ? "has" : "have"} something written in, and that goes too.`
        : "";
    const message = `Delete the property “${row.label}” from ${plural(pages, "page")}?${warning} You can undo this.`;

    if (!(await confirmDestructive(message))) return;
    index.deleteProperty(row.label);
    setOpenLabel(null);
  }

  async function handleDeleteOption(propertyLabel: string, optionLabel: string) {
    const { pages, used } = index.previewOptionDelete(propertyLabel, optionLabel);
    const warning =
      used > 0
        ? ` ${plural(used, "page")} ${used === 1 ? "has" : "have"} it picked, and that choice is cleared.`
        : "";
    const message = `Remove the value “${optionLabel}” from “${propertyLabel}” on ${plural(pages, "page")}?${warning} You can undo this.`;
    if (!(await confirmDestructive(message))) return;
    index.deleteOption(propertyLabel, optionLabel);
  }

  function jumpTo(nodeId: string) {
    selectNode(nodeId);
    onClose();
  }

  // Only the open row's options are wanted, and only when it's a chip field.
  const openRow = visible.find((row) => row.label === openLabel);
  const openOptions = openRow?.hasOptions ? index.optionsFor(openRow.label) : [];

  return createPortal(
    <div className="ui-backdrop" onMouseDown={onClose}>
      <div className="ui-modal ui-modal-xl all-properties" onMouseDown={(e) => e.stopPropagation()}>
        <header className="all-properties-header">
          <h2 className="all-properties-title">All properties &amp; tags</h2>
          <p className="all-properties-blurb">
            Everything this world uses, and how much of it. Renaming or deleting here changes every page at once — and
            every one of those can be undone.
          </p>
        </header>

        <div className="all-properties-toolbar">
          <div className="all-properties-modes">
            <button
              type="button"
              className={`all-properties-mode${mode === "properties" ? " all-properties-mode-active" : ""}`}
              onClick={() => {
                setMode("properties");
                setOpenLabel(null);
              }}
            >
              <Tag size={13} /> Properties <span className="all-properties-count">{propertyRows.length}</span>
            </button>
            <button
              type="button"
              className={`all-properties-mode${mode === "tags" ? " all-properties-mode-active" : ""}`}
              onClick={() => {
                setMode("tags");
                setOpenLabel(null);
              }}
            >
              <Hash size={13} /> Tags <span className="all-properties-count">{tagRows.length}</span>
            </button>
          </div>
          <input
            type="text"
            className="all-properties-filter"
            placeholder="Filter this list"
            value={filter}
            autoFocus
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {visible.length === 0 ? (
          <p className="all-properties-empty">
            {rows.length === 0
              ? mode === "properties"
                ? "No properties yet. Add one from the panel on the right of any page."
                : "No tags yet. Add one from the Tags field at the bottom of any page's panel."
              : `Nothing here matches “${filter.trim()}”.`}
          </p>
        ) : (
          <ul className="all-properties-list">
            {visible.map((row) => (
              <IndexRow
                key={row.label}
                row={row}
                mode={mode}
                nodes={nodes}
                isOpen={openLabel === row.label}
                onToggle={() => setOpenLabel(openLabel === row.label ? null : row.label)}
                onPreviewRename={previewRename}
                onRename={applyRename}
                onDelete={() => void handleDelete(row)}
                onJump={jumpTo}
                options={row.label === openLabel ? openOptions : []}
                onRenameOption={index.renameOption}
                onRecolourOption={index.recolourOption}
                onDeleteOption={(optionLabel) => void handleDeleteOption(row.label, optionLabel)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}

function IndexRow({
  row,
  mode,
  nodes,
  isOpen,
  onToggle,
  onPreviewRename,
  onRename,
  onDelete,
  onJump,
  options,
  onRenameOption,
  onRecolourOption,
  onDeleteOption,
}: {
  row: Row;
  mode: Mode;
  nodes: Record<string, Node>;
  isOpen: boolean;
  onToggle: () => void;
  onPreviewRename: (label: string, newLabel: string) => string | null;
  onRename: (label: string, newLabel: string) => void;
  onDelete: () => void;
  onJump: (nodeId: string) => void;
  options: OptionIndexEntry[];
  onRenameOption: (propertyLabel: string, optionLabel: string, newLabel: string) => void;
  onRecolourOption: (propertyLabel: string, optionLabel: string, color: string) => void;
  onDeleteOption: (optionLabel: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  // The sentence describing a merge, once it's been shown. Its presence is
  // also what makes the second press the one that commits — a rename that
  // quietly absorbs another name shouldn't happen on the same click that
  // reveals it's about to.
  const [warning, setWarning] = useState<string | null>(null);

  const pages = row.nodeIds.map((id) => nodes[id]).filter((node): node is Node => Boolean(node));
  pages.sort((a, b) => a.name.localeCompare(b.name));

  function startRename() {
    setDraft(row.label);
    setWarning(null);
  }

  function cancelRename() {
    setDraft(null);
    setWarning(null);
  }

  function submitRename() {
    const next = (draft ?? "").trim();
    if (!next || next === row.label) return cancelRename();
    if (!warning) {
      const found = onPreviewRename(row.label, next);
      if (found) return setWarning(found);
    }
    onRename(row.label, next);
    cancelRename();
  }

  return (
    <li className={`all-properties-row${isOpen ? " all-properties-row-open" : ""}`}>
      <button type="button" className="all-properties-summary" onClick={onToggle}>
        <ChevronRight size={13} className="all-properties-chevron" />
        <span className="all-properties-name">
          {mode === "tags" && <span className="all-properties-hash">#</span>}
          {row.label}
        </span>
        {row.variants.length > 0 && (
          <span className="all-properties-variant" title="The same name with different capitals is a separate one">
            also {row.variants.map((variant) => `“${variant}”`).join(", ")}
          </span>
        )}
        <span className="all-properties-meta">{row.meta}</span>
      </button>

      {isOpen && (
        <div className="all-properties-detail">
          {draft === null ? (
            <div className="all-properties-actions">
              {row.canEdit && (
                <>
                  <button type="button" className="ui-btn ui-btn-secondary" onClick={startRename}>
                    Rename everywhere
                  </button>
                  <button type="button" className="ui-btn ui-btn-danger" onClick={onDelete}>
                    Delete everywhere
                  </button>
                </>
              )}
              {row.note && <p className="all-properties-note">{row.note}</p>}
            </div>
          ) : (
            <form
              className="all-properties-rename"
              onSubmit={(e) => {
                e.preventDefault();
                submitRename();
              }}
            >
              <input
                type="text"
                className="all-properties-rename-input"
                value={draft}
                autoFocus
                onChange={(e) => {
                  setDraft(e.target.value);
                  setWarning(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
              />
              <button type="button" className="ui-btn ui-btn-secondary" onClick={cancelRename}>
                Cancel
              </button>
              <button type="submit" className="ui-btn ui-btn-primary">
                {warning ? "Rename anyway" : "Rename"}
              </button>
              {warning && <p className="all-properties-warning">{warning}</p>}
            </form>
          )}

          {options.length > 0 && (
            <div className="all-properties-options">
              <div className="ui-eyebrow">Values</div>
              {options.map((option) => (
                <OptionRow
                  key={option.label}
                  option={option}
                  showDot={row.showDot}
                  siblings={options.map((other) => other.label)}
                  onRename={(next) => onRenameOption(row.label, option.label, next)}
                  onRecolour={(color) => onRecolourOption(row.label, option.label, color)}
                  onDelete={() => onDeleteOption(option.label)}
                />
              ))}
            </div>
          )}

          <ul className="all-properties-pages">
            {pages.map((node) => {
              const Icon = getTemplateIcon(node.templateKey);
              return (
                <li key={node.id}>
                  <button type="button" className="all-properties-page" onClick={() => onJump(node.id)}>
                    {/* getTemplateIcon reads a fixed lookup table, so a given
                        templateKey yields the same component reference every
                        render and this never remounts. */}
                    <Icon size={13} className="all-properties-page-icon" />
                    {node.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

/**
 * One value of a chip property, across the whole project.
 *
 * Grouped by the value's name rather than its id, because two pages that
 * invented the same value separately have two ids — which is the mess this row
 * exists to let the user tidy up. Renaming one onto another merges them, and
 * that merge is safe in a way a property's isn't: the value moves onto the
 * survivor, so nothing is left pointing at an option that's gone.
 */
function OptionRow({
  option,
  showDot,
  siblings,
  onRename,
  onRecolour,
  onDelete,
}: {
  option: OptionIndexEntry;
  showDot: boolean;
  siblings: string[];
  onRename: (newLabel: string) => void;
  onRecolour: (color: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(option.label);
  const [warning, setWarning] = useState<string | null>(null);

  function submit() {
    const next = draft.trim();
    if (!next || next === option.label) {
      setIsEditing(false);
      return;
    }
    // The one case worth a second press: the name is already in use, so this
    // is a merge rather than a rename, and the two chips become one.
    if (!warning && siblings.includes(next)) {
      setWarning(`“${next}” already exists, so the two become one value. Pages using either end up on “${next}”.`);
      return;
    }
    onRename(next);
    setIsEditing(false);
    setWarning(null);
  }

  return (
    <div className="all-properties-option">
      <div className="all-properties-option-head">
        {isEditing ? (
          <input
            type="text"
            className="all-properties-rename-input"
            value={draft}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setDraft(e.target.value);
              setWarning(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setIsEditing(false);
                setWarning(null);
              }
            }}
          />
        ) : (
          <OptionChip option={{ id: option.label, label: option.label, color: option.color }} showDot={showDot} />
        )}

        <span className="all-properties-meta">
          on {plural(option.offeredCount, "page")} · {option.usedCount} using it
        </span>

        {isEditing ? (
          <>
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
            <button type="button" className="ui-btn ui-btn-primary" onClick={submit}>
              {warning ? "Merge" : "Rename"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="ui-icon-btn ui-icon-btn-sm"
              aria-label={`Rename ${option.label}`}
              onClick={() => {
                setDraft(option.label);
                setIsEditing(true);
              }}
            >
              <Pencil size={11} />
            </button>
            <button
              type="button"
              className="ui-icon-btn ui-icon-btn-sm"
              aria-label={`Remove ${option.label}`}
              onClick={onDelete}
            >
              <Trash2 size={11} />
            </button>
          </>
        )}
      </div>

      {/* Recolouring is left immediate rather than behind the pencil: it's the
          one edit here with nothing to confirm, and undo covers a misclick. */}
      <div className="property-option-colors">
        {CHIP_COLORS.map((color) => (
          <button
            key={color.key}
            type="button"
            className={`property-option-color${color.key === option.color ? " property-option-color-active" : ""}`}
            style={{ backgroundColor: color.hex ?? undefined }}
            title={`${color.name} — everywhere`}
            aria-label={color.name}
            onClick={() => onRecolour(color.key)}
          />
        ))}
      </div>

      {warning && <p className="all-properties-warning">{warning}</p>}
    </div>
  );
}
