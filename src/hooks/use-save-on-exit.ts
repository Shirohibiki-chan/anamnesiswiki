// Forces any debounced write to land before the app can go away. See
// services/autosave.ts — content edits are held ~300ms before they hit disk,
// which is invisible while the app is running and is straightforwardly lost
// work if the process ends inside that window.
//
// Two independent nets, because neither one covers everything:
//   - blur/visibilitychange catches alt-tabbing away, the machine sleeping,
//     and the moment before most deliberate window closes. Cheap, and it uses
//     only plain web APIs.
//   - Tauri's close-requested event catches the actual window close, which
//     tears the webview down without any DOM unload event firing reliably.
import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { flushAllSaves, hasPendingSaves } from "../services/autosave";

// If a write wedges, the window must still close — losing the tail of one
// edit is bad, an app that can't be quit is worse.
const FLUSH_TIMEOUT_MS = 2000;

export function useSaveOnExit(): void {
  useEffect(() => {
    function flushInBackground() {
      if (hasPendingSaves()) void flushAllSaves();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flushInBackground();
    }

    window.addEventListener("blur", flushInBackground);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let unlisten: (() => void) | undefined;
    let disposed = false;

    // Rejects when the app is running outside Tauri (`pnpm dev` in a plain
    // browser, per CLAUDE.md's Commands section), where there's no window to
    // hook and the listeners above are all there is.
    void getCurrentWindow()
      .onCloseRequested(async (event) => {
        if (!hasPendingSaves()) return;
        event.preventDefault();
        await Promise.race([flushAllSaves(), new Promise((resolve) => setTimeout(resolve, FLUSH_TIMEOUT_MS))]);
        await getCurrentWindow().destroy();
      })
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch(() => {
        // Not running under Tauri — nothing to hook.
      });

    return () => {
      disposed = true;
      unlisten?.();
      window.removeEventListener("blur", flushInBackground);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
