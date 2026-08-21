// A numeric sidebar field (Phase 13). Stores a real number in
// `properties[key]`, not a numeric string, so anything later wanting to sort
// or total a column doesn't have to guess.
//
// Deliberately not `<input type="number">`: its spinners are a control nobody
// asked for, and a controlled numeric input fights the user mid-type — "-",
// "1.", and "1e" are all unparseable states you have to pass through to reach
// a valid one. So the input holds a text draft and the store holds whatever
// that draft currently parses to, with the draft only re-synced from the
// outside when it stops agreeing with the stored value. Text that never
// parses (someone typing "lots") stays visible but stores nothing, rather
// than being erased from under them.
import { useState } from "react";
import { X } from "lucide-react";

type NumberPropertyProps = {
  label: string;
  value: number | undefined;
  placeholder?: string;
  onChange: (value: number | undefined) => void;
  onRemove?: () => void;
};

function parseDraft(draft: string): number | undefined {
  const trimmed = draft.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function NumberProperty({ label, value, placeholder, onChange, onRemove }: NumberPropertyProps) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));

  // React's "adjust state when a prop changes" pattern, not an effect — an
  // effect here re-renders a second time on every keystroke and the lint rule
  // says so. The guard is what keeps typing intact: the value coming back in
  // is almost always this component's own last keystroke, and rewriting the
  // draft from it would turn "1." into "1" under the cursor. Only a value
  // that genuinely disagrees with what's on screen (an undo, or switching to
  // another page) replaces it.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (parseDraft(draft) !== value) setDraft(value === undefined ? "" : String(value));
  }

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
        inputMode="decimal"
        className="property-value-input"
        value={draft}
        placeholder={placeholder ?? "0"}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(parseDraft(e.target.value));
        }}
      />
    </div>
  );
}
