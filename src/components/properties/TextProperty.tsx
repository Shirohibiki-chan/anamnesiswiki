// A single-line or multi-line free-text sidebar field. See docs/plan.md Phase 6.
// `onRemove` is only passed for Phase 7's per-page custom properties — a
// template's own fields aren't removable.
import { X } from "lucide-react";
import { GrowTextarea } from "./GrowTextarea";

type TextPropertyProps = {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  onRemove?: () => void;
};

export function TextProperty({ label, value, placeholder, multiline, onChange, onRemove }: TextPropertyProps) {
  return (
    <div className="property-field">
      {/* Phase 18a: the block's own title strip replaces this when the
          field is rendered as a block, so an empty label means the shell
          already drew one — or the user chose No title. */}
      {label && (
        <div className="property-field-label-row">
          <div className="ui-eyebrow property-field-label">{label}</div>
          {onRemove && (
            <button type="button" className="ui-inline-remove" aria-label={`Remove ${label}`} onClick={onRemove}>
              <X size={11} />
            </button>
          )}
        </div>
      )}
      {multiline ? (
        <GrowTextarea
          className="property-value-textarea"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className="property-value-input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
