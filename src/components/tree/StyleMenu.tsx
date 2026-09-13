// The "Style name" submenu. Phase 30, step 2. Swaps into the popover the
// context menu was in, the way Move to and Sort sub-pages do — see SortMenu
// for why a second layer is avoided.
//
// **One field and the names already in use.** A style name is typed once and
// then wants choosing rather than retyping: a dashboard skin called
// `dashboard` on one page is the same skin on the next, and a misspelling is a
// page a snippet silently misses. So the names set anywhere in the world sit
// under the box as rows, the current one ticked, and the box is for a new one.
//
// The same menu serves a page (from its right-click menu) and a template (from
// the template's own view), because the question is the same in both places.
import { useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import { normaliseStyleClass } from "../../services/style-class";

type StyleMenuProps = {
  /** The name set here now, or undefined for none. */
  current: string | undefined;
  /** Every name in use across the world, for choosing rather than typing. */
  inUse: string[];
  /**
   * What the page inherits when it names nothing of its own — its template's
   * name, if that has one. Said in the menu, so clearing a page's own name
   * doesn't look like it did nothing.
   */
  inherited?: string;
  onSelect: (styleClass: string | undefined) => void;
  onBack: () => void;
};

export function StyleMenu({ current, inUse, inherited, onSelect, onBack }: StyleMenuProps) {
  const [draft, setDraft] = useState(current ?? "");
  const normalised = normaliseStyleClass(draft);
  // Say what the name will become when typing changed it — `Character Sheet`
  // saving as `character-sheet` should not be a surprise found in a snippet.
  const differs = normalised !== undefined && normalised !== draft.trim();
  const others = inUse.filter((name) => name !== current);

  function commit() {
    onSelect(normalised);
  }

  return (
    <div className="tree-context-menu tree-style-menu">
      <button type="button" className="tree-context-menu-back" onClick={onBack}>
        <ArrowLeft size={13} /> Style name
      </button>

      <div className="tree-style-field">
        <input
          className="tree-style-input"
          value={draft}
          placeholder="e.g. dashboard"
          autoFocus
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              e.stopPropagation();
              onBack();
            }
          }}
        />
        <p className="tree-style-hint">
          {differs ? (
            <>
              Saved as <code>{normalised}</code>
            </>
          ) : (
            <>
              A snippet reaches this page with <code>[data-style=&quot;{normalised ?? "name"}&quot;]</code>
            </>
          )}
        </p>
      </div>

      <button type="button" className="tree-style-apply" disabled={normalised === current} onClick={commit}>
        <Check size={13} /> {normalised ? `Use "${normalised}"` : "Save"}
      </button>

      {others.length > 0 && <div className="tree-context-menu-heading">Already in use</div>}
      {others.map((name) => (
        <button key={name} type="button" onClick={() => onSelect(name)}>
          {name}
        </button>
      ))}

      {current && (
        <button type="button" className="tree-style-clear" onClick={() => onSelect(undefined)}>
          <X size={13} /> {inherited ? `Clear — back to "${inherited}"` : "Clear the name"}
        </button>
      )}
    </div>
  );
}
