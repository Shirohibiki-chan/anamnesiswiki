// The Updates section of the settings panel, reachable from the cog on both
// the start-up screen and the in-project top bar. Installing replaces the
// running program and restarts it, so `useUpdates` flushes pending saves
// first — that flush is what makes it safe to reach this mid-project.
import { useUpdates } from "../../hooks/use-updates";

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function UpdateCheck() {
  const { state, currentVersion, check, install, restart, dismiss, viewReleaseNotes } = useUpdates();

  return (
    <div className="update-check">
      {state.phase === "idle" && (
        <p className="update-check-line">
          {currentVersion && <span className="update-check-version">Anamnesis {currentVersion}</span>}
          <button type="button" className="ui-link" onClick={() => void check()}>
            Check for updates
          </button>
        </p>
      )}

      {state.phase === "checking" && <p className="update-check-line">Checking for updates…</p>}

      {state.phase === "up-to-date" && (
        <p className="update-check-line">
          <span className="update-check-version">
            You're on the latest version{currentVersion ? ` (${currentVersion})` : ""}.
          </span>
          <button type="button" className="ui-link" onClick={dismiss}>
            OK
          </button>
        </p>
      )}

      {state.phase === "available" && (
        <div className="update-check-card">
          <p className="update-check-headline">Anamnesis {state.update.version} is available.</p>
          {/* One paragraph, not the whole release body — see
              services/release-notes.ts. The rest of it is a click away, and
              reads properly there. */}
          {state.update.notes && <p className="update-check-notes">{state.update.notes}</p>}
          <p className="update-check-notes-more">
            <button type="button" className="ui-link" onClick={() => void viewReleaseNotes()}>
              See everything in this release
            </button>
          </p>
          <p className="update-check-reassurance">Your projects aren't touched — updating only replaces the app itself.</p>
          <div className="update-check-buttons">
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => void install(state.update)}>
              Download and install
            </button>
            <button type="button" className="ui-btn ui-btn-secondary" onClick={dismiss}>
              Not now
            </button>
          </div>
        </div>
      )}

      {state.phase === "downloading" && (
        <div className="update-check-card">
          <p className="update-check-headline">Downloading Anamnesis {state.update.version}…</p>
          <div
            className="update-check-progress"
            role="progressbar"
            aria-label="Update download progress"
            aria-valuemin={0}
            aria-valuemax={state.progress.total ?? undefined}
            aria-valuenow={state.progress.received}
          >
            <div
              className="update-check-progress-fill"
              style={
                // Without a declared total there's no percentage to show, so
                // the bar fills fully and the byte count below carries the
                // actual signal of progress.
                state.progress.total
                  ? { width: `${Math.min(100, (state.progress.received / state.progress.total) * 100)}%` }
                  : { width: "100%", opacity: 0.4 }
              }
            />
          </div>
          <p className="update-check-notes">
            {formatSize(state.progress.received)}
            {state.progress.total ? ` of ${formatSize(state.progress.total)}` : ""}
          </p>
        </div>
      )}

      {state.phase === "ready" && (
        <div className="update-check-card">
          <p className="update-check-headline">Update installed.</p>
          <p className="update-check-notes">Restart Anamnesis to start using it.</p>
          <div className="update-check-buttons">
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => void restart()}>
              Restart now
            </button>
          </div>
        </div>
      )}

      {state.phase === "error" && (
        <div className="update-check-card">
          <p className="update-check-notes">{state.message}</p>
          <div className="update-check-buttons">
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => void check()}>
              Try again
            </button>
            <button type="button" className="ui-btn ui-btn-secondary" onClick={dismiss}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
