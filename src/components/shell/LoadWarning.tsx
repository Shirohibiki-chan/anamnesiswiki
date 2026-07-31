// Reports node files that couldn't be read when the project loaded. A
// project folder is plain JSON the user syncs and can hand-edit, so a damaged
// file is a real possibility — the load skips it rather than failing, but
// skipping silently would be worse than the crash it replaced: pages would
// just quietly stop existing.
import { AlertTriangle, X } from "lucide-react";
import { useProject } from "../../hooks/use-project";

export function LoadWarning() {
  const { skippedFiles, dismissSkippedFiles } = useProject();
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
      <button type="button" className="load-warning-dismiss" aria-label="Dismiss" onClick={dismissSkippedFiles}>
        <X size={13} />
      </button>
    </div>
  );
}
