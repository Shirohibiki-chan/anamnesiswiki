// Alternate names for a page. Phase 18b.
//
// Small block, disproportionate reach: an alias is an edge into the same index
// everything else in this phase reads. `[[Val]]` resolves to Valera Jiang
// through it, search matches on it and says which alias hit, and a mention
// written as an alias counts as a mention of the page.
//
// Built in TagsProperty's idiom — chips, add on Enter — because it is the same
// gesture in the same panel, and two chip editors that behaved differently
// would be two things to learn.
import { useState } from "react";
import { X } from "lucide-react";

type AliasBlockProps = {
  aliases: string[];
  pageName: string;
  onChange: (aliases: string[]) => void;
};

export function AliasBlock({ aliases, pageName, onChange }: AliasBlockProps) {
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    // An alias equal to the page's own name is not an alternate name, and one
    // already in the list is a duplicate row that resolves identically.
    const clash =
      trimmed.toLowerCase() === pageName.toLowerCase() ||
      aliases.some((alias) => alias.toLowerCase() === trimmed.toLowerCase());
    if (!clash) onChange([...aliases, trimmed]);
    setDraft("");
  }

  return (
    <div className="block-alias">
      <div className="block-alias-chips">
        {aliases.map((alias) => (
          <span key={alias} className="block-collection-tag">
            {alias}
            <button
              type="button"
              className="ui-inline-remove"
              aria-label={`Remove alias ${alias}`}
              onClick={() => onChange(aliases.filter((a) => a !== alias))}
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <input
        className="property-field-input"
        placeholder="Another name + enter"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
      />
    </div>
  );
}
