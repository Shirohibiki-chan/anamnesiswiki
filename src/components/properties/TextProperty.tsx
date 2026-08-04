// A single-line or multi-line free-text sidebar field. See docs/plan.md Phase 6.
// `onRemove` is only passed for Phase 7's per-page custom properties — a
// template's own fields aren't removable.
import { X } from "lucide-react";

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
      <div className="property-field-label-row">
        <div className="ui-eyebrow property-field-label">{label}</div>
        {onRemove && (
          <button type="button" className="ui-inline-remove" aria-label={`Remove ${label}`} onClick={onRemove}>
            <X size={11} />
          </button>
        )}
      </div>
      {multiline ? (
        <textarea
          className="property-value-textarea"
          value={value}
          placeholder={placeholder}
          rows={3}
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
