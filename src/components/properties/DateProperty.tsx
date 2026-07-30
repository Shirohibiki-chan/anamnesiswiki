// A free-text date-ish field — plain text rather than an HTML date picker,
// since worldbuilding dates are often fictional-calendar strings ("Year 872,
// Third Age") that a real date input can't represent. See docs/plan.md Phase 6.
type DatePropertyProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export function DateProperty({ label, value, placeholder, onChange }: DatePropertyProps) {
  return (
    <div className="property-field">
      <div className="property-field-label">{label}</div>
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
