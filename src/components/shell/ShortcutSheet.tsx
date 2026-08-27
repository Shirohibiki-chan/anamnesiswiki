// Every shortcut on one screen, raised with `?`.
//
// **Nothing in the app could show you your own keys.** Every shortcut is
// rebindable, which is the accessibility feature it was built as — and the
// cost of it is that there is no fixed list anybody could learn from a manual,
// because yours may not be mine. Settings → Keyboard can change them one at a
// time; it is a screen for editing, not for looking something up mid-sentence.
//
// So this reads the same store the listener does. A key you rebound yesterday
// is what this shows today, and a shortcut added to the registry appears here
// without anyone remembering to add it.
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { FIXED_KEYS, SHEET_KEYS } from "../../constants/shortcuts";
import { useShortcutSettings } from "../../hooks/use-shortcuts";

export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const { rows, modifierName } = useShortcutSettings();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus lands on the close button rather than nowhere: the dialog has no
  // field to type into, and Tab from a body-focused page walks the window
  // behind this one instead of the dialog in front of it.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return createPortal(
    <div className="ui-backdrop" onMouseDown={onClose}>
      <div
        className="ui-modal ui-modal-lg shortcut-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-sheet-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          onClose();
        }}
      >
        <header className="shortcut-sheet-header">
          <h2 id="shortcut-sheet-title" className="shortcut-sheet-title">
            Keyboard shortcuts
          </h2>
          <button ref={closeRef} type="button" className="ui-icon-btn ui-icon-btn-lg" aria-label="Close" onClick={onClose}>
            <X size={15} />
          </button>
        </header>

        <div className="shortcut-sheet-body">
          <h3 className="shortcut-sheet-group">Yours</h3>
          <ul className="shortcut-sheet-list">
            {rows.map((row) => (
              <li key={row.action} className="shortcut-sheet-row">
                <span className="shortcut-sheet-label">{row.label}</span>
                <kbd className="shortcut-sheet-keys">{row.keys}</kbd>
              </li>
            ))}
          </ul>

          {/* Separate, and named for why they're separate. A row you can't
              change sitting in the same list as eight you can is a row that
              reads as broken the first time somebody tries. */}
          <h3 className="shortcut-sheet-group">Fixed — these can't be changed</h3>
          <ul className="shortcut-sheet-list">
            {FIXED_KEYS.map((fixed) => (
              <li key={fixed.key} className="shortcut-sheet-row">
                <span className="shortcut-sheet-label">{fixed.what}</span>
                <kbd className="shortcut-sheet-keys">{fixed.mod ? `${modifierName}+${fixed.key}` : fixed.key}</kbd>
              </li>
            ))}
          </ul>
        </div>

        <p className="shortcut-sheet-footnote">
          Everything in the first list can be changed in Settings → Keyboard. <kbd>{SHEET_KEYS.question}</kbd> opens
          this and closes it again, and <kbd>{SHEET_KEYS.function}</kbd> does the same while you're writing, where a
          question mark is just a question mark.
        </p>
      </div>
    </div>,
    document.body,
  );
}
