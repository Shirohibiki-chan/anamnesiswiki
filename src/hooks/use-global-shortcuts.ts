// One window-level keydown listener for the whole app. A single listener,
// rather than one per shortcut, so the order things are checked in is visible
// and two features can't quietly both claim a key.
import { useEffect } from "react";
import { SHORTCUT_KEYS } from "../constants/shortcuts";

export type GlobalShortcutHandlers = {
  onSearch: () => void;
};

/**
 * Callers must pass handlers that keep their identity between renders (a
 * `useCallback` with no dependencies is the usual shape). The shell re-renders
 * on every keystroke into a page, and a fresh function each time would tear
 * the listener down and rebuild it that often.
 */
export function useGlobalShortcuts({ onSearch }: GlobalShortcutHandlers): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Alt is excluded rather than ignored: BlockNote's own shortcuts are
      // Mod-Alt combinations, and matching on Mod alone would swallow them.
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;

      if (event.key.toLowerCase() === SHORTCUT_KEYS.search) {
        event.preventDefault();
        onSearch();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearch]);
}
