// The cog. Owns whether the modal is open so both the start-up screen and the
// in-project top bar can drop one in without either of them tracking it.
import { useState } from "react";
import { Settings } from "lucide-react";
import { SettingsModal } from "./SettingsModal";

type SettingsButtonProps = {
  /** The rail's button shape instead of the bare cog. Given rather than
      detected because the two places this appears are the rail and the start
      screen, and only one of them has a rail to match. */
  className?: string;
  /** The word under the icon, where there is somewhere to put one. Absent on
      the start screen, where the cog stands alone. */
  label?: string;
  /** Told when the dialog closes, for a screen that has to catch up with what
      was done in it — the start screen's library, since Getting started can
      make a project while the grid behind it is not looking. */
  onClose?: () => void;
};

export function SettingsButton({ className, label, onClose }: SettingsButtonProps = {}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* One look in both places it appears. It used to have a `variant` prop
          picking between a 28px top-bar button and a 32px standalone one on the
          start screen — two sizes for the same cog, which is exactly the kind
          of near-duplicate the shared icon button exists to end. */}
      <button
        type="button"
        className={className ?? "ui-icon-btn ui-icon-btn-lg"}
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Settings size={16} />
        {label && <span>{label}</span>}
      </button>
      {isOpen && (
        <SettingsModal
          onClose={() => {
            setIsOpen(false);
            onClose?.();
          }}
        />
      )}
    </>
  );
}
