// The cog. Owns whether the modal is open so both the start-up screen and the
// in-project top bar can drop one in without either of them tracking it.
import { useState } from "react";
import { Settings } from "lucide-react";
import { SettingsModal } from "./SettingsModal";

type SettingsButtonProps = {
  // The top bar's icon buttons share a look; the start-up screen has no such
  // strip, so it gets its own quieter treatment.
  variant?: "top-bar" | "standalone";
};

export function SettingsButton({ variant = "top-bar" }: SettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={variant === "top-bar" ? "top-bar-icon-button" : "settings-standalone-button"}
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
