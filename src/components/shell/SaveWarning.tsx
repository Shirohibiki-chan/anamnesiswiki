// Reports writes that failed. Deliberately louder than LoadWarning: a file
// that couldn't be *read* is a page the user can see is missing, but a file
// that couldn't be *written* looks exactly like a file that saved fine — the
// text is still on screen, and the last successful save already flashed
// "Saved". Nothing else in the app would ever tell them.
import { AlertTriangle, X } from "lucide-react";
import { useProjectActions, useSaveErrors } from "../../hooks/use-project";

export function SaveWarning() {
  const saveErrors = useSaveErrors();
  const { dismissSaveErrors } = useProjectActions();
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
      </div>
      <button type="button" className="ui-icon-btn ui-icon-btn-sm" aria-label="Dismiss" onClick={dismissSaveErrors}>
        <X size={13} />
      </button>
    </div>
  );
}
