// Owns whether the shortcut list is up, and the two keys that raise it.
//
// **A listener of its own, beside `useShellKeys` rather than inside
// `useGlobalShortcuts`.** The one-listener rule in that hook is about the
// rebindable table — nine actions read out of a store, where two features
// quietly claiming one combination is a real risk. These two keys are neither
// rebindable nor a project's: like reload and fullscreen they belong to the
// window, they work on the start screen as well as inside a world, and the
// list they open is mostly a list of what the *other* listener answers.
import { useCallback, useEffect, useState } from "react";
import { isTextEntryTarget, opensShortcutSheet } from "../services/shortcut-service";
import { useShortcutStore } from "../state/shortcut-store";

export function useShortcutSheet(): { isOpen: boolean; close: () => void } {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      // Settings is waiting for a key to record. F1 is a legal binding, and
      // pressing it on the way to being recorded should not also open this.
      if (useShortcutStore.getState().isRecording) return;
      if (!opensShortcutSheet(event, isTextEntryTarget(event.target))) return;

      // A dialog is already up. Stacking the sheet on top of Settings or the
      // search palette puts two backdrops in the window and hands Tab to this
      // one, which is not what the person pressing it was in the middle of.
      // Closing this one from its own key is fine and is handled below.
      if (!isOpen && document.querySelector(".ui-backdrop")) return;

      event.preventDefault();
      // The same key closes it. Somebody who opens a list with `?` and then
      // presses `?` again has asked for it to go away, and hunting for Escape
      // to undo a keypress is the kind of small friction this screen exists to
      // remove.
      setIsOpen((open) => !open);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return { isOpen, close };
}
