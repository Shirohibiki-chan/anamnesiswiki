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
//
// **The moment this hook registers a close-requested listener at all, Tauri
// cancels the native close for every attempt and never puts it back** — from
// then on the only thing that can still close the window is this handler
// calling `destroy()` itself. That makes the `finally` below load-bearing:
// without it, anything that threw between `preventDefault()` and `destroy()`
// left the window uncloseable for the rest of the session, with nothing on
// screen to say why. That was the whole bug behind "the X does nothing" —
// found 2026-08-19 reading Tauri's own `on_window_event` (unconditional
// `prevent_close()` whenever a JS listener exists) and its JS wrapper (which
// only auto-destroys when the handler resolves *without* throwing).
import { useEffect } from "react";
import { closeWindow, destroyWindow, onWindowCloseRequested } from "../services/host-service";
import { flushAllSaves, hasPendingSaves } from "../services/autosave";

// If a write wedges, the window must still close — losing the tail of one
// edit is bad, an app that can't be quit is worse.
const FLUSH_TIMEOUT_MS = 2000;

export function useSaveOnExit(): void {
  useEffect(() => {
    // The flush currently in flight, if any. `flushSave` removes an entry
    // from autosave's own pending map *before* the write it describes has
    // reached disk (see its comment on why — a rename queued behind it needs
    // to plan against the old path only until this write actually lands), so
    // `hasPendingSaves()` alone has a gap: false the instant a blur-triggered
    // flush starts, true again only if a *new* edit lands while it's running.
    // Close checks this alongside `hasPendingSaves()` so a flush blur already
    // started is still waited on rather than read as "nothing to do".
    let inFlight: Promise<unknown> | null = null;

    function beginFlush(): Promise<unknown> {
      if (!inFlight) {
        inFlight = flushAllSaves().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    }

    function flushInBackground() {
      if (hasPendingSaves()) void beginFlush();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flushInBackground();
    }

    window.addEventListener("blur", flushInBackground);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let unlisten: (() => void) | undefined;
    let disposed = false;
    // The close currently being carried out, if any. A second attempt — a
    // second click, or the OS retrying — joins it rather than racing a second
    // `destroy()` against the first.
    //
    // **It is a promise rather than a boolean, and that is the fix.** It used
    // to be a `closing` flag that was set once and never cleared, so a close
    // that failed to actually take the window away left every later attempt
    // hitting `preventDefault()` and returning — the X dead for the rest of
    // the session, silently, which is what she reported on 2026-08-21.
    // Clearing this when the attempt settles means a failed close can simply
    // be retried by clicking again.
    let closeRun: Promise<void> | null = null;

    // `destroy()` can reject, and an exception escaping the close handler is
    // not recoverable on its own: Tauri cancels the native close whenever a JS
    // listener exists and only closes the window itself when the handler
    // resolves without throwing. So a rejection here means the window stays
    // open *and* nothing said why. Falling back to `close()` gives it a second
    // route out, and swallowing the failure lets the retry above work.
    async function takeTheWindowAway(): Promise<void> {
      try {
        await destroyWindow();
      } catch {
        try {
          await closeWindow();
        } catch {
          // Both routes refused. The attempt is over either way, and clearing
          // `closeRun` is what leaves the next click able to try again.
        }
      }
    }

    async function flushThenClose(): Promise<void> {
      try {
        await Promise.race([beginFlush(), new Promise((resolve) => setTimeout(resolve, FLUSH_TIMEOUT_MS))]);
      } finally {
        await takeTheWindowAway();
      }
    }

    // Rejects when the app is running outside Tauri (`pnpm dev` in a plain
    // browser, per CLAUDE.md's Commands section), where there's no window to
    // hook and the listeners above are all there is.
    void onWindowCloseRequested(async () => {
      // Nothing to save and nothing already closing: say yes, and the host
      // closes the window itself.
      if (!hasPendingSaves() && !inFlight && !closeRun) return true;

      if (!closeRun) {
        closeRun = flushThenClose().finally(() => {
          closeRun = null;
        });
      }
      await closeRun;
      // Answering no holds the close; flushThenClose has already taken the
      // window away itself by the time the writes are done.
      return false;
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
