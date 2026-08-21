// A free-text date-ish field — plain text rather than an HTML date picker,
// since worldbuilding dates are often fictional-calendar strings ("Year 872,
// Third Age") that a real date input can't represent. See docs/plan.md Phase 6.
// `onRemove` is only passed for Phase 7's per-page custom properties.
import { X } from "lucide-react";

type DatePropertyProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
};

export function DateProperty({ label, value, placeholder, onChange, onRemove }: DatePropertyProps) {
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
      <input
        type="text"
        className="property-value-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
