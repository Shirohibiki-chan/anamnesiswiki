// Reports node files that couldn't be read when the project loaded. A
// project folder is plain JSON the user syncs and can hand-edit, so a damaged
// file is a real possibility — the load skips it rather than failing, but
// skipping silently would be worse than the crash it replaced: pages would
// just quietly stop existing.
//
// **It comes back every launch, which is why it has two buttons** (2026-08-27).
// The × is "not now"; the other one is "this file is expected to be like
// this", which is the answer for a sync conflict copy somebody is keeping on
// purpose. Without it, a file that is never going to parse greets her every
// time she opens the world, and a warning nobody can turn off is a warning
// everybody learns to ignore.
import { AlertTriangle, BellOff, X } from "lucide-react";
import { useProject } from "../../hooks/use-project";

export function LoadWarning() {
  const { skippedFiles, dismissSkippedFiles, acknowledgeSkippedFiles } = useProject();
  if (skippedFiles.length === 0) return null;

  const count = skippedFiles.length;

  return (
    <div className="load-warning" role="status">
      <AlertTriangle size={14} className="load-warning-icon" />
      <div className="load-warning-body">
        <p className="load-warning-message">
          {count === 1 ? "1 page couldn't be opened" : `${count} pages couldn't be opened`} and {count === 1 ? "was" : "were"}{" "}
          left out. {count === 1 ? "Its file is" : "Their files are"} still on disk — nothing was deleted.
        </p>
        <ul className="load-warning-files">
          {skippedFiles.map((path) => (
            <li key={path}>{path}</li>
          ))}
        </ul>
      </div>
      {/* Two answers, because "not now" and "I know" are different things and
          this notice comes back every time the world opens. The quiet one is
          per file *and* per state: if one of these files changes, it speaks up
          again, so acknowledging a known-broken file cannot silence the next
          problem in it. See services/acknowledgements.ts. */}
      <div className="load-warning-actions">
        <button
          type="button"
          className="ui-btn ui-btn-secondary load-warning-quiet"
          onClick={() => void acknowledgeSkippedFiles()}
        >
          <BellOff size={13} />
          {count === 1 ? "I know about this one" : "I know about these"}
        </button>
        <button type="button" className="ui-icon-btn ui-icon-btn-sm" aria-label="Dismiss" onClick={dismissSkippedFiles}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
