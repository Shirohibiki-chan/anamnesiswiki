// Phase 28 — the world's own folder, zipped.
//
// **Its own component rather than a third branch of the markdown one.** The
// two markdown exports share a preview because they are the same errand with
// a different destination; this one is a different errand. It counts files
// rather than pages, its plan is asynchronous because it asks the disk rather
// than the store, and the thing worth saying about it — that nothing is
// converted — is the opposite of what the other two have to explain.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { describeSize } from "../../hooks/use-assets";
import { useDialogs } from "../../hooks/use-dialogs";
import { useProjectName } from "../../hooks/use-project";
import { useWorldZip } from "../../hooks/use-world-zip";
import type { ArchivePlan } from "../../services/world-archive";
import "./export.css";

type Status = "reading" | "preview" | "saving" | "done" | "error";

export function WorldZipModal({ onClose }: { onClose: () => void }) {
  const { pickWorldZipSavePath } = useDialogs();
  const { planZip, writeZip } = useWorldZip();
  const projectName = useProjectName();

  const [plan, setPlan] = useState<ArchivePlan | null>(null);
  const [status, setStatus] = useState<Status>("reading");
  const [error, setError] = useState<string | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const [missing, setMissing] = useState(0);

  // Unlike the other exports this one cannot be planned during render: the
  // answer is on disk. So the modal opens saying it is looking, which is also
  // honest about where the number comes from.
  useEffect(() => {
    let cancelled = false;
    void planZip()
      .then((result) => {
        if (cancelled) return;
        setPlan(result);
        setStatus("preview");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Couldn't read the project folder.");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once per opening
  }, []);

  async function handleExport() {
    if (!plan) return;
    setError(null);

    let path: string | null;
    try {
      path = await pickWorldZipSavePath(projectName ?? "World");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the save dialog.");
      return;
    }
    if (!path) return;

    setStatus("saving");
    try {
      const result = await writeZip(plan, path);
      setSavedTo(path);
      setMissing(result.missing);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong writing the file.");
      setStatus("error");
    }
  }

  return createPortal(
    <div className="ui-backdrop" onClick={status === "saving" ? undefined : onClose}>
      <div className="ui-modal ui-modal-lg export-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="export-modal-title">Export as JSON</h2>

        {status === "reading" && <p className="export-modal-summary">Looking at what's in the folder…</p>}

        {plan && (status === "preview" || status === "saving" || status === "error") && (
          <>
            <p className="export-modal-summary">
              {plan.fileCount} file{plan.fileCount === 1 ? "" : "s"} — {describeSize(plan.totalBytes)} before it's
              squashed — will be zipped up exactly as they sit in your project folder. Your writing is already JSON
              files on disk, so this is a copy of them rather than anything converted.
            </p>

            {plan.notes.length > 0 && (
              <div className="export-modal-lossy">
                <h3 className="ui-eyebrow">What's in it:</h3>
                <ul>
                  {plan.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {error && <p className="export-modal-error">{error}</p>}

            <div className="export-modal-actions">
              <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose} disabled={status === "saving"}>
                Cancel
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-primary"
                onClick={() => void handleExport()}
                disabled={status === "saving"}
              >
                {status === "saving" ? "Zipping…" : "Choose where to save"}
              </button>
            </div>
          </>
        )}

        {status === "error" && !plan && (
          <>
            <p className="export-modal-error">{error}</p>
            <div className="export-modal-actions">
              <button type="button" className="ui-btn ui-btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}

        {status === "done" && savedTo && (
          <>
            <p className="export-modal-summary">
              Exported. The file is at <code className="export-modal-path">{savedTo}</code> — unzip it anywhere and
              you have a working world back.
            </p>
            {missing > 0 && (
              <p className="export-modal-error">
                {missing} file{missing === 1 ? "" : "s"} couldn't be read and {missing === 1 ? "isn't" : "aren't"} in
                the zip. Everything else is.
              </p>
            )}
            <div className="export-modal-actions">
              <button type="button" className="ui-btn ui-btn-primary" onClick={onClose}>
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
