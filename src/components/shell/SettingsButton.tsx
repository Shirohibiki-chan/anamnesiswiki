// The cog. Owns whether the modal is open so both the start-up screen and the
// in-project top bar can drop one in without either of them tracking it.
import { useState } from "react";
import { Settings } from "lucide-react";
import { SettingsModal } from "./SettingsModal";

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* One look in both places it appears. It used to have a `variant` prop
          picking between a 28px top-bar button and a 32px standalone one on the
          start screen — two sizes for the same cog, which is exactly the kind
          of near-duplicate the shared icon button exists to end. */}
      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-lg"
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Settings size={16} />
      </button>
      {isOpen && <SettingsModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
