// Reports writes that failed. Deliberately louder than LoadWarning: a file
// that couldn't be *read* is a page the user can see is missing, but a file
// that couldn't be *written* looks exactly like a file that saved fine — the
// text is still on screen, and the last successful save already flashed
// "Saved". Nothing else in the app would ever tell them.
import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useProjectActions, useSaveErrors } from "../../hooks/use-project";
import { SettingsModal } from "./SettingsModal";

export function SaveWarning() {
  const saveErrors = useSaveErrors();
  const { dismissSaveErrors } = useProjectActions();
  // The bug report, from where somebody is when something has just gone
  // wrong. Settings → Report a Bug was the only way in, and somebody who has
  // just watched a save fail is not in Settings.
  const [reporting, setReporting] = useState(false);
  if (saveErrors.length === 0) return null;

  return (
    <div className="save-warning" role="alert">
      <AlertTriangle size={14} className="save-warning-icon" />
      <div className="save-warning-body">
        <p className="save-warning-message">
          {saveErrors.length === 1 ? "A change couldn't be saved to disk." : "Some changes couldn't be saved to disk."}{" "}
          Your work is still here on screen — copy anything you can't afford to lose before closing the app.
        </p>
        <ul className="save-warning-reasons">
          {saveErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
        <p className="save-warning-message">
          If this keeps happening,{" "}
          <button type="button" className="ui-link" onClick={() => setReporting(true)}>
            Report a Bug
          </button>
          .
        </p>
      </div>
      {reporting && <SettingsModal initialTab="report" onClose={() => setReporting(false)} />}
      <button type="button" className="ui-icon-btn ui-icon-btn-sm" aria-label="Dismiss" onClick={dismissSaveErrors}>
        <X size={13} />
      </button>
    </div>
  );
}
