// One window-level keydown listener for the whole app. A single listener,
// rather than one per shortcut, so the order things are checked in is visible
// and two features can't quietly both claim a key.
import { useEffect } from "react";
import { EDITOR_SCOPED_ACTIONS, SHORTCUT_ACTIONS, type ShortcutAction } from "../constants/shortcuts";
import { useShortcutStore } from "../state/shortcut-store";
import { isTextEntryTarget, matchesBinding } from "../services/shortcut-service";

export type GlobalShortcutHandlers = {
  onSearch: () => void;
  onAllProperties: () => void;
  onNewPage: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onNavigateHome: () => void;
};

/**
 * Callers must pass handlers that keep their identity between renders (a
 * `useCallback` with no dependencies is the usual shape). The shell re-renders
 * on every keystroke into a page, and a fresh function each time would tear
 * the listener down and rebuild it that often.
 */
export function useGlobalShortcuts({
  onSearch,
  onAllProperties,
  onNewPage,
  onSave,
  onUndo,
  onRedo,
  onNavigateBack,
  onNavigateForward,
  onNavigateHome,
}: GlobalShortcutHandlers): void {
  useEffect(() => {
    const handlers: Record<ShortcutAction, () => void> = {
      search: onSearch,
      allProperties: onAllProperties,
      newPage: onNewPage,
      save: onSave,
      undo: onUndo,
      redo: onRedo,
      navigateBack: onNavigateBack,
      navigateForward: onNavigateForward,
      navigateHome: onNavigateHome,
    };

    function handleKeyDown(event: KeyboardEvent) {
      // Read at the keypress rather than closed over, so rebinding takes
      // effect immediately and the listener doesn't have to be rebuilt every
      // time a binding changes.
      const { bindings, isRecording } = useShortcutStore.getState();

      // The settings screen is waiting for a key. Pressing the one that
      // currently opens search shouldn't open search on the way to being
      // recorded as something else.
      if (isRecording) return;

      // Answered once per keypress rather than per action, since most
      // keypresses are someone typing and this walks up the DOM.
      const inText = isTextEntryTarget(event.target);

      for (const action of SHORTCUT_ACTIONS) {
        if (!matchesBinding(event, bindings[action])) continue;
        // Undo and redo share Ctrl+Z/Ctrl+Y with the editor. `continue`, not
        // `return`: the key goes back to whatever else wants it — the editor's
        // own undo, or the plain text-box undo in a rename field — rather than
        // being swallowed here. Nothing else is bound to these, so the loop
        // just runs out.
        if (EDITOR_SCOPED_ACTIONS.has(action) && inText) continue;
        // Claims the keypress from the browser as well as from the page —
        // Ctrl+S would otherwise open the webview's own save dialog. See
        // docs/handoff.md §Shortcuts for the one this can't take back.
        event.preventDefault();
        handlers[action]();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearch, onAllProperties, onNewPage, onSave, onUndo, onRedo, onNavigateBack, onNavigateForward, onNavigateHome]);
}
