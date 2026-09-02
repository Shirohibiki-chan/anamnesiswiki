// The `/` menu, drawn by us. Phase 19.5.
//
// **BlockNote's own menu left stale group headings behind.** Reported with a
// screenshot on 2026-09-02: typing `/colum` showed BASIC BLOCKS and three
// PAGE BLOCKS headings above two items. Measured rather than guessed — the menu
// was handed exactly two items, both in one group, and still drew four
// headings. Its renderer keys headings by group name and items by title, and
// something in that reconciliation leaves the previous query's headings in the
// DOM.
//
// **So this replaces it, rather than patching around it.** It is presentational
// only: the controller still finds the items, tracks the selection and handles
// the keyboard — this decides what that looks like. Which also means the `/`
// menu now wears the same frame as every other menu in the app instead of the
// library's own.
import { Fragment, useEffect, useRef } from "react";
import type { DefaultReactSuggestionItem, SuggestionMenuProps } from "@blocknote/react";
import "../tree/tree.css";
import "./page.css";

export function PageSlashMenu({
  items,
  selectedIndex,
  onItemClick,
}: SuggestionMenuProps<DefaultReactSuggestionItem>) {
  const selected = useRef<HTMLButtonElement>(null);

  // The arrow keys move the selection without moving the mouse, so the menu has
  // to follow it — a highlighted item below the fold is one nobody can see.
  useEffect(() => {
    selected.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // **The id and the item ids are BlockNote's, and they are kept on purpose.**
  // The editor points `aria-activedescendant` at `bn-suggestion-menu-item-<n>`
  // while the arrow keys move through the list, and the app's own tests find
  // the menu by `#bn-suggestion-menu`. Replacing the component is not a reason
  // to rename what other things already address.
  if (items.length === 0) {
    return (
      <div id="bn-suggestion-menu" className="tree-context-menu block-add-menu page-slash-menu" role="listbox">
        <p className="page-slash-empty">Nothing by that name.</p>
      </div>
    );
  }

  return (
    <div id="bn-suggestion-menu" className="tree-context-menu block-add-menu page-slash-menu" role="listbox">
      {items.map((item, at) => {
        // A heading when the group changes, which is the same rule BlockNote's
        // own menu uses — the difference is that it is read off the list rather
        // than carried in a variable, so this render cannot inherit anything
        // from the last one.
        const heading = item.group && item.group !== items[at - 1]?.group ? item.group : null;
        const isSelected = at === selectedIndex;

        return (
          // Keyed by position rather than by title: two entries can share a
          // name across groups, and a duplicate key is where the bug this file
          // exists for most likely lives.
          <Fragment key={`${item.group}-${item.title}-${at}`}>
            {heading && <div className="tree-context-menu-heading">{heading}</div>}
            <button
              type="button"
              id={`bn-suggestion-menu-item-${at}`}
              role="option"
              aria-selected={isSelected}
              ref={isSelected ? selected : undefined}
              // **`bn-suggestion-menu-item` stays on it**, even though nothing
              // of ours reads it: it is the hook the app's own tests use to
              // find an option, and dropping it would break every scenario that
              // picks something from this menu for no gain.
              className={`bn-suggestion-menu-item page-slash-item${isSelected ? " page-slash-item-selected" : ""}`}
              // `onMouseDown` rather than `onClick`: the editor still holds the
              // caret, and a click that lands after a blur inserts the block
              // somewhere nobody asked for.
              onMouseDown={(event) => {
                event.preventDefault();
                onItemClick?.(item);
              }}
            >
              {item.icon}
              <span className="page-slash-text">
                <span className="page-slash-title">{item.title}</span>
                {item.subtext && <span className="page-slash-subtext">{item.subtext}</span>}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
