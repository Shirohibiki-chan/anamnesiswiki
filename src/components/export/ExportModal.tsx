// Phase 9 — write a LegendKeeper `.lk` file. Deliberately not the checkbox
// tree the original plan sketched: LegendKeeper's own `.lk` export takes no
// options at all (no subpage toggle, no image toggle — confirmed against a
// live account), so what's exported is decided before this opens, by what was
// right-clicked. This shows what's about to happen, names anything that won't
// survive the trip, and asks where to put the file.
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogs } from "../../hooks/use-dialogs";
import { useLkExport } from "../../hooks/use-lk-export";
import { useProjectName } from "../../hooks/use-project";
import "./export.css";

type Status = "preview" | "saving" | "done" | "error";

export function ExportModal({ rootIds, onClose }: { rootIds: string[]; onClose: () => void }) {
  const { pickLkSavePath } = useDialogs();
  const { planExport, writeExport } = useLkExport();
  const projectName = useProjectName();

  // Built once per opening: it's a pure conversion of a snapshot, and
  // rebuilding it on every render would re-mint every id in the file.
  const plan = useMemo(() => planExport(rootIds), [rootIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const [status, setStatus] = useState<Status>("preview");
  const [error, setError] = useState<string | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);

  async function handleExport() {
    if (!plan) return;
    const path = await pickLkSavePath(projectName ?? "Export");
    if (!path) return;

    setStatus("saving");
    setError(null);
    try {
      await writeExport(plan, path);
      setSavedTo(path);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong writing the file.");
      setStatus("error");
    }
  }

  return createPortal(
    <div className="export-modal-backdrop" onClick={status === "saving" ? undefined : onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="export-modal-title">Export to LegendKeeper</h2>

        {!plan && <p className="export-modal-error">There's nothing to export.</p>}

        {plan && status !== "done" && (
          <>
            <p className="export-modal-summary">
              {plan.pageCount} page{plan.pageCount === 1 ? "" : "s"} will be written to a LegendKeeper <code>.lk</code>{" "}
              file — everything you picked, and everything filed underneath it. LegendKeeper's own export works the same
              way; there's no way to leave the sub-pages behind.
            </p>

            {plan.lossyNotes.length > 0 && (
              <div className="export-modal-lossy">
                <h3>A few things won't come across:</h3>
                <ul>
                  {plan.lossyNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {error && <p className="export-modal-error">{error}</p>}

            <div className="export-modal-actions">
              <button type="button" className="export-modal-cancel" onClick={onClose} disabled={status === "saving"}>
                Cancel
              </button>
              <button
                type="button"
                className="export-modal-confirm"
                onClick={() => void handleExport()}
                disabled={status === "saving"}
              >
                {status === "saving" ? "Writing…" : "Choose where to save"}
              </button>
            </div>
          </>
        )}

        {status === "done" && (
          <>
            <p className="export-modal-summary">
              Exported. The file is at <code className="export-modal-path">{savedTo}</code>, ready to import into
              LegendKeeper.
            </p>
            <div className="export-modal-actions">
              <button type="button" className="export-modal-confirm" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
