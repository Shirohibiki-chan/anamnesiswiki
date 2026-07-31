// The app's settings surface. Currently one section; it exists as a real
// container rather than a one-off update dialog because more will land here.
// Portaled to document.body for the same reason ConfirmDialog is — it has to
// paint above the tree's stacking contexts.
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ShortcutSettings } from "./ShortcutSettings";
import { UpdateCheck } from "./UpdateCheck";

type SettingsModalProps = {
  onClose: () => void;
};

export function SettingsModal({ onClose }: SettingsModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="settings-backdrop" onClick={onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-header">
          <h2 id="settings-title" className="settings-title">
            Settings
          </h2>
          <button type="button" className="settings-close" aria-label="Close settings" onClick={onClose} autoFocus>
            <X size={15} />
          </button>
        </header>

        <section className="settings-section">
          <h3 className="settings-section-title">Keyboard</h3>
          <ShortcutSettings />
        </section>

        <section className="settings-section">
          <h3 className="settings-section-title">Updates</h3>
          <UpdateCheck />
        </section>
      </div>
    </div>,
    document.body,
  );
}
