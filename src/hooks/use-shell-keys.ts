// The keys the window used to answer through the menu bar, put back.
//
// **Electron ships a File/Edit/View menu on every window, and `electron/main.js`
// removes it** — the app draws its own chrome, so a menu bar would be a strip
// of somebody else's furniture across the top. What went with it was not just
// the bar: the accelerators lived there too. The developer tools were
// deliberately kept on F12 and Ctrl+Shift+I; reload and fullscreen were not,
// and nothing on screen said so. Ctrl+R simply did nothing.
//
// **Here rather than back in the menu**, because the renderer is the half that
// knows what is unsaved and holds the project's claim — the main process would
// have to ask it both questions before it could safely reload. Doing it on
// this side also means it works the same under Tauri, under Electron, and in a
// browser tab, and needs nothing added to the shell contract.
//
// **Not in `constants/shortcuts.ts`, on purpose.** That registry is dispatched
// from `AppLayout`, which only exists once a project is open — reload would be
// dead on the start screen, which is one of the places somebody reaches for
// it. These are also the keys every desktop app already uses for this, so
// being rebindable would buy nothing worth the second listener. `Settings →
// Keyboard` names them, so that list is not claiming to be complete while
// leaving two keys out of it.
//
// **Zoom is not here.** Ctrl+= and Ctrl+- were on that menu too, but the app
// has its own text sizes in `Settings → Fonts and text`, and a second scaling
// mechanism stacked on the first is two ways of making text bigger that
// disagree about what 100% means.
import { useEffect } from "react";
import { flushAllSaves } from "../services/autosave";
import { releaseClaimNow } from "../services/project-claim";

/**
 * How long a reload waits for pending writes.
 *
 * The same two seconds the close path allows, and for the same reason: losing
 * the tail of one edit is bad, and a key that stops working because a write
 * wedged is worse.
 */
const FLUSH_TIMEOUT_MS = 2000;

function afterAtMost(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function useShellKeys(): void {
  useEffect(() => {
    // A second Ctrl+R while the first is still flushing joins it rather than
    // starting a second flush and racing two reloads.
    let reloading = false;

    async function reload(): Promise<void> {
      if (reloading) return;
      reloading = true;
      // **Ctrl+R lands mid-sentence.** Content edits are held ~300ms before
      // they reach disk (see services/autosave), and a reload is not a close —
      // no close-requested event fires and no unload handler runs — so nothing
      // else would flush them.
      await Promise.race([flushAllSaves(), afterAtMost(FLUSH_TIMEOUT_MS)]).catch(() => {});
      // **And the claim has to go, or the app meets its own leftovers.** A
      // project carries a marker saying somebody has it open; the page that
      // comes back from a reload is a fresh load that would read the marker
      // this one left and refuse to open the world. Closing already clears it
      // for exactly this reason.
      await releaseClaimNow();
      window.location.reload();
    }

    function toggleFullscreen(): void {
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      } else {
        void document.documentElement.requestFullscreen().catch(() => {});
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      // Something nearer the keypress already claimed it.
      if (event.defaultPrevented) return;

      const reloadKey =
        (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "r";
      const fullscreenKey =
        event.key === "F11" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
      if (!reloadKey && !fullscreenKey) return;

      event.preventDefault();
      if (reloadKey) void reload();
      else toggleFullscreen();
    }

    // Capture, because the editor sees keydown first and a page with the caret
    // in it is exactly where these get pressed.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);
}
