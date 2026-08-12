// Chip-style tag editor, add-on-enter, plus a picker over every tag in the
// project. Used for the fixed Tags section every non-folder node gets at the
// bottom of the properties panel (bound to Node.tags — see docs/plan.md Phase
// 6 and templates.ts's PROPERTY_SCHEMAS comment on why tags aren't a
// per-template property).
//
// The picker is Phase 16's, and it's a spelling problem before it's a
// convenience one: typing every tag by hand is how one page ends up tagged
// "seafaring", another "Seafaring" and a third "sea-faring", after which no
// filter finds all three. Being able to see what already exists is what stops
// that, so the list is the whole project's rather than this page's.
//
// Built in SelectProperty's idiom on purpose — same popover, same search box,
// same tick column — because they're the same gesture in the same panel and
// two pickers that behaved differently would be two things to learn.
import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { TagIndexEntry } from "../../hooks/use-property-index";
import { TreePopover } from "../tree/TreePopover";

type TagsPropertyProps = {
  label: string;
  tags: string[];
  /** Every tag in the project, alphabetically. See hooks/use-property-index.ts. */
  allTags: TagIndexEntry[];
  onChange: (tags: string[]) => void;
};

export function TagsProperty({ label, tags, allTags, onChange }: TagsPropertyProps) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const visible = trimmed
    ? allTags.filter((entry) => entry.label.toLowerCase().includes(trimmed.toLowerCase()))
    : allTags;

  // A tag that exists somewhere in the project under a different capitalisation
  // is the thing this picker is for, so typing it adopts that spelling instead
  // of minting a second one. Only an exact-match-free query offers to create.
  const existing = allTags.find((entry) => entry.label.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length > 0 && !existing;

  function close() {
    setAnchorRect(null);
    setQuery("");
  }

  function add(tag: string) {
    if (!tags.includes(tag)) onChange([...tags, tag]);
    setQuery("");
  }

  function toggle(tag: string) {
    if (tags.includes(tag)) {
      onChange(tags.filter((existingTag) => existingTag !== tag));
      return;
    }
    add(tag);
  }

  return (
    <div className="property-field">
      <div className="ui-eyebrow property-field-label">{label}</div>
      <input
        type="text"
        className="property-field-input"
        placeholder="Add tag + enter"
        onKeyDown={(e) => {
          const value = e.currentTarget.value.trim();
          if (e.key === "Enter" && value) {
            if (!tags.includes(value)) onChange([...tags, value]);
            e.currentTarget.value = "";
          }
        }}
      />
      {/* The list is always rendered, even with nothing in it, because the +
          lives in it — on a page with no tags yet the picker is the only way to
          see what the rest of the project already uses, which is exactly the
          page that needs it most. */}
      <div className="property-tag-list">
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className="property-tag-chip">
            {tag}
            <button
              type="button"
              className="ui-inline-remove"
              aria-label={`Remove tag ${tag}`}
              onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <button
          type="button"
          className="property-tag-add"
          aria-label="Pick from the project's tags"
          title="Pick from the project's tags"
          onClick={(e) => setAnchorRect(e.currentTarget.getBoundingClientRect())}
        >
          <Plus size={11} />
        </button>
      </div>

      {anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={close} className="property-select-popover">
          <input
            className="property-select-search"
            autoFocus
            value={query}
            placeholder={allTags.length > 0 ? "Find or create a tag…" : "Type to create the first one…"}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                // The spelling already in the project wins over the one just
                // typed — that's the whole point of the list being here.
                if (existing) add(existing.label);
                else if (canCreate) add(trimmed);
              }
              if (e.key === "Escape") close();
            }}
          />
          <div className="property-select-options">
            {visible.map((entry) => (
              <div key={entry.label} className="property-select-row">
                <button type="button" className="property-select-row-pick" onClick={() => toggle(entry.label)}>
                  <span className="property-select-row-check">{tags.includes(entry.label) && <Check size={12} />}</span>
                  <span className="property-tag-picker-label">{entry.label}</span>
                  {/* How many pages carry it — the difference between a tag
                      that's part of the world's structure and one typed once. */}
                  <span className="property-tag-picker-count">{entry.nodeIds.length}</span>
                </button>
              </div>
            ))}
            {canCreate && (
              <button type="button" className="property-select-create" onClick={() => add(trimmed)}>
                <Plus size={12} /> Create <strong>{trimmed}</strong>
              </button>
            )}
            {visible.length === 0 && !canCreate && <p className="property-select-none">No tags yet.</p>}
          </div>
        </TreePopover>
      )}
    </div>
  );
}
