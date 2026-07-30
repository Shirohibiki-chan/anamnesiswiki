// A single-line or multi-line free-text sidebar field. See docs/plan.md Phase 6.
type TextPropertyProps = {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
};

export function TextProperty({ label, value, placeholder, multiline, onChange }: TextPropertyProps) {
  return (
    <div className="property-field">
      <div className="property-field-label">{label}</div>
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
