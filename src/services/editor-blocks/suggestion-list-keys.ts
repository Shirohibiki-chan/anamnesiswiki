// Ctrl-N / Ctrl-P through the editor's own suggestion menus — the slash menu,
// the @ mentions, and the wikilink picker.
//
// The other two lists in the app (the quick switcher, the settings search) own
// their highlight and just move an index. This one doesn't: BlockNote's
// `SuggestionMenuController` holds the selected index in its own state and
// listens for the arrow keys itself, on a capture-phase listener it attaches to
// the editor element only while a menu is showing. Reaching into that state
// would mean reaching into a library's internals, which is the one thing
// CLAUDE.md says not to do to BlockNote.
//
// So this translates instead of reimplementing: it swallows the Ctrl combo and
// dispatches the arrow key BlockNote is already waiting for. That keeps one
// definition of what "next item" does, and it can't drift from the arrows
// because it *is* the arrows.
import { listStepForKey } from "../list-keys";

/**
 * The class BlockNote puts on the menu it renders. Presence in the DOM is what
 * tells us a menu is open, and it has to be checked: without it a Ctrl-N in
 * ordinary prose would send an ArrowDown into the document and move the caret
 * a line instead of doing nothing.
 */
const SUGGESTION_MENU_SELECTOR = ".bn-suggestion-menu";

/**
 * Structural rather than `KeyboardEvent`, so the same function takes a native
 * event and React's synthetic one. A service may not import React (CLAUDE.md's
 * layer order), and the caller is a hook handing over whichever of the two the
 * element it's attached to produces.
 */
export type SuggestionKeyEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
  preventDefault: () => void;
  stopPropagation: () => void;
};

/**
 * Returns true when the keypress was handled, so the caller knows to stop.
 *
 * The event has to be **stopped** as well as prevented: `Ctrl-N` is bound to
 * "new page" on the window, and a suggestion list you walk with it would leave
 * a trail of untitled pages behind.
 */
export function handleSuggestionListKeys(event: SuggestionKeyEvent): boolean {
  const step = listStepForKey(event);
  // Only the Ctrl form. The arrows already reach BlockNote on their own, and
  // intercepting them here would mean dispatching a copy of an event that was
  // going to arrive anyway.
  if (!step || !event.ctrlKey) return false;
  if (!document.querySelector(SUGGESTION_MENU_SELECTOR)) return false;

  event.preventDefault();
  event.stopPropagation();

  // Dispatched on whatever had focus, which is inside the editor element —
  // so BlockNote's own capture listener on that element sees it on the way
  // down, exactly as it would a real arrow key.
  const target = event.target;
  if (!(target instanceof HTMLElement)) return true;
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: step === "next" ? "ArrowDown" : "ArrowUp",
      bubbles: true,
      cancelable: true,
    }),
  );
  return true;
}
