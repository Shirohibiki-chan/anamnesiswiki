// Chip-style tag editor, add-on-enter. Used for the fixed Tags section every
// non-folder node gets at the bottom of the properties panel (bound to
// Node.tags — see docs/plan.md Phase 6 and templates.ts's PROPERTY_SCHEMAS
// comment on why tags aren't a per-template property).
import { X } from "lucide-react";

type TagsPropertyProps = {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
};

export function TagsProperty({ label, tags, onChange }: TagsPropertyProps) {
  return (
    <div className="property-field">
      <div className="property-field-label">{label}</div>
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
      {tags.length > 0 && (
        <div className="property-tag-list">
          {tags.map((tag, i) => (
            <span key={`${tag}-${i}`} className="property-tag-chip">
              {tag}
              <button
                type="button"
                className="property-tag-remove"
                aria-label={`Remove tag ${tag}`}
                onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
