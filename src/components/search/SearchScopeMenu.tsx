// What a search box is looking at, as a menu rather than a row of buttons.
//
// This started as three pills under the tree's field, which worked and looked
// cheap — *"i kind of hate the buttons. they feel unprofessional and lame? No
// idk i just thought they'd be inside a menu when you click into the search
// field."* Right, and the reason is that the pills were permanent furniture
// for a control almost nobody touches: three widgets occupying a row of the
// narrowest column in the app, every time you looked at it, to expose a choice
// you make once a month.
//
// A menu costs nothing when it's closed. It opens on clicking into an empty
// field — which is the same moment the pills were there to be noticed, so
// discovery is unchanged — and it's gone the instant you start typing, before
// it can sit on top of the results it would otherwise hide.
//
// Shared by the tree filter and the Ctrl-K palette, which is why the scopes
// are passed in: the tree has names and tags, the palette also has the text
// inside every page. The two have to look like the same control, because they
// *are* — a second design for "what am I searching" is how you end up with two
// answers to it.
import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { useClickOutside } from "../../hooks/use-click-outside";

export type SearchScope = {
  value: string;
  label: string;
  /** One line under the label. Says what it searches, not what it's called. */
  hint: string;
};

type SearchScopeMenuProps = {
  scopes: readonly SearchScope[];
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  /**
   * The element the menu belongs to — the field *and* the menu together, not
   * just the menu. Clicking the input it hangs off must not count as clicking
   * outside, or focusing the field would close the menu that focusing the
   * field just opened.
   */
  boundary: React.RefObject<HTMLElement | null>;
};

export function SearchScopeMenu({ scopes, value, onChange, onClose, boundary }: SearchScopeMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(boundary, onClose, true);

  // Arrow keys work without moving focus out of the search field: the caret
  // stays where you're typing, and the menu is driven from there. Listening on
  // the document rather than on the menu is what allows that — the menu never
  // holds focus, so a keydown handler on it would never fire.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const at = scopes.findIndex((scope) => scope.value === value);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        onChange(scopes[(at + 1) % scopes.length].value);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        onChange(scopes[at <= 0 ? scopes.length - 1 : at - 1].value);
      } else if (event.key === "Enter" || event.key === "Escape") {
        // Both close it, and neither is allowed through: Enter here means
        // "this scope, thanks", not "open the first result", and Escape means
        // this menu, not the dialog the menu is sitting in.
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }
    // Capture, so this runs before the palette's own Escape and Enter handling
    // on the input underneath.
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [scopes, value, onChange, onClose]);

  return (
    <div className="search-scope-menu" role="listbox" aria-label="What to search" ref={ref}>
      {scopes.map((scope) => (
        <button
          key={scope.value}
          type="button"
          role="option"
          aria-selected={scope.value === value}
          className={`search-scope-option${scope.value === value ? " search-scope-option-active" : ""}`}
          // Mousedown, not click: the search input has focus, and letting the
          // button take it first would fire the field's blur before the pick
          // landed. Same reason the palette's result rows do it.
          onMouseDown={(event) => {
            event.preventDefault();
            onChange(scope.value);
            onClose();
          }}
        >
          <Check size={12} className="search-scope-check" aria-hidden={scope.value !== value} />
          <span className="search-scope-text">
            <span className="search-scope-label">{scope.label}</span>
            <span className="search-scope-hint">{scope.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * The one thing that stays on screen after the menu closes, and only when it
 * has something to say: which scope you're in, when it isn't the default.
 *
 * Nothing is shown for the default scope. The placeholder already names it,
 * and a chip that always reads "All" is a permanent label for the absence of a
 * setting — the same furniture the pills were, in a smaller font.
 */
export function SearchScopeChip({ scopes, value, onClick }: { scopes: readonly SearchScope[]; value: string; onClick: () => void }) {
  if (value === scopes[0]?.value) return null;
  const scope = scopes.find((option) => option.value === value);
  if (!scope) return null;

  return (
    <button
      type="button"
      className="search-scope-chip"
      aria-label={`Searching ${scope.label.toLowerCase()} only — change what's searched`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {scope.label}
    </button>
  );
}
