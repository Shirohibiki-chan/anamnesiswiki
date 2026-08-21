// Keeps Tab inside whichever dialog is on top. Phase-independent fix, 2026-08-21.
//
// The popovers got this in `TreePopover`, which is one shared wrapper. The
// dialogs have no such wrapper — ten components each portal their own
// `div.ui-backdrop` — so this traps at the document instead of asking ten
// files to remember. It also means a dialog added later is covered without
// anyone thinking about it, which is the failure mode that produced this
// situation in the first place.
//
// **It only handles Tab.** Escape is deliberately left alone: several dialogs
// already own it and mean different things by it — Settings clears its search
// box before it closes itself — and a document-level handler would flatten
// that. Focus-on-open is likewise left to the dialogs, most of which already
// autofocus the field somebody came to type in.
import { useEffect } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Traps Tab within the topmost open dialog.
 *
 * Topmost is the *last* `.ui-backdrop` in the document, which is the one
 * rendered most recently — a confirm raised from inside Settings sits after
 * it, and Tab belongs to the confirm while it is up.
 *
 * Anything hidden is skipped rather than trusted: a dialog can hold a
 * collapsed section or an off-screen list, and wrapping onto something nobody
 * can see reads as the key doing nothing.
 */
export function useDialogFocusTrap(): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || event.defaultPrevented) return;

      const backdrops = document.querySelectorAll<HTMLElement>(".ui-backdrop");
      const dialog = backdrops[backdrops.length - 1];
      if (!dialog) return;

      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;

      const at = items.indexOf(document.activeElement as HTMLElement);
      const last = items.length - 1;

      // Focus outside the dialog entirely — which is where it starts, since
      // opening one does not move it — is treated as "before the first item",
      // so the next Tab lands inside rather than continuing through the page
      // behind.
      if (at === -1) {
        event.preventDefault();
        items[event.shiftKey ? last : 0].focus();
        return;
      }

      if (!event.shiftKey && at === last) {
        event.preventDefault();
        items[0].focus();
      } else if (event.shiftKey && at === 0) {
        event.preventDefault();
        items[last].focus();
      }
    }

    // Capture, so a dialog that stops propagation on its own container cannot
    // accidentally opt out of being trapped.
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
