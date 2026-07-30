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
      <div className="property-field-label-row">
        <div className="property-field-label">{label}</div>
        {onRemove && (
          <button type="button" className="property-field-remove" aria-label={`Remove ${label}`} onClick={onRemove}>
            <X size={11} />
          </button>
        )}
      </div>
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
