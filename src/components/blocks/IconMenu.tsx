// What the `:` menu looks like: the picker's own grid, not a list. Phase 19.5.
//
// **The first version of this was BlockNote's default list renderer and it was
// wrong.** One icon per row, a name beside it, scrolled vertically — which is
// the right shape for a menu of *commands* and the wrong one for a menu of
// pictures. The app already had the right shape: `IconPicker` draws a grid of
// icon buttons under a heading per group, and that is what somebody hunting
// for a sword is actually reading. This renders the suggestion menu's items in
// that grid, with the same classes, so the two cannot drift apart.
//
// **The search box is the one thing the picker has and this does not**, and
// that is not an omission: what she types after the colon *is* the query, and
// BlockNote owns it. A second input inside a menu driven by the document would
// be two fields fighting over the same keystrokes. Clicking an icon still goes
// through the menu's own `onItemClick`, which is what removes the `:swo` from
// the writing before the icon lands.
import type { DefaultReactSuggestionItem, SuggestionMenuProps } from "@blocknote/react";

export function IconMenu({ items, selectedIndex, onItemClick }: SuggestionMenuProps<DefaultReactSuggestionItem>) {
  if (items.length === 0) return <div className="icon-menu icon-picker-empty">Nothing matches.</div>;

  // Grouped for the headings, but the index each button reports is its position
  // in the flat list — that is what `selectedIndex` counts, and the arrow keys
  // move through it.
  const groups: { name: string; entries: { item: DefaultReactSuggestionItem; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const name = item.group ?? "";
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.entries.push({ item, index });
    else groups.push({ name, entries: [{ item, index }] });
  });

  return (
    <div className="icon-menu">
      {groups.map((group) => (
        <div key={group.name}>
          {group.name && <div className="ui-eyebrow icon-picker-heading">{group.name}</div>}
          <div className="icon-picker-grid">
            {group.entries.map(({ item, index }) => (
              <button
                key={`${group.name}-${item.title}`}
                type="button"
                className={`icon-picker-option${index === selectedIndex ? " icon-picker-option-active" : ""}`}
                title={item.title}
                aria-label={item.title}
                // Keeps the caret in the writing, so the menu's own removal of
                // the query has something to work against.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onItemClick?.(item)}
              >
                {/* An emoji has no icon element — it *is* its title, so it is
                    drawn as the character rather than as a name. */}
                {item.icon ?? <span className="icon-as-text">{item.title}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
