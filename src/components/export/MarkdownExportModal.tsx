// Phase 28 — write the world out as a folder of markdown.
//
// Deliberately the same shape as `ExportModal.tsx` beside it: say what is
// about to happen, name anything that changes on the way, ask where it goes.
// What is *different* is that this one has no options at all. The `.lk` export
// offers a picture switch because that format cannot hold pictures and the
// file would otherwise be enormous; a vault copies them in because a folder of
// markdown pointing back at a project folder is not a way out of anything.
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogs } from "../../hooks/use-dialogs";
import { useMarkdownExport } from "../../hooks/use-markdown-export";
import "./export.css";

type Status = "preview" | "saving" | "done" | "error";

export function MarkdownExportModal({ rootIds, onClose }: { rootIds: string[]; onClose: () => void }) {
  const { pickFolder, showFolder, fileManagerName } = useDialogs();
  const { planVault, writeVault } = useMarkdownExport();

  // Built once per opening: it is a pure conversion of a snapshot, and
  // rebuilding it on every render would redo the whole world on each keystroke
  // behind the modal.
  const plan = useMemo(() => planVault(rootIds), [rootIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const [status, setStatus] = useState<Status>("preview");
  const [error, setError] = useState<string | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const [missing, setMissing] = useState(0);

  async function handleExport() {
    if (!plan) return;
    setError(null);

    // Same shape as the other two modals: the picker is a native window whose
    // failure would otherwise reject into a discarded promise.
    let parent: string | null;
    try {
      parent = await pickFolder({ title: "Where should the folder go?" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the folder picker.");
      return;
    }
    if (!parent) return;

    setStatus("saving");
    try {
      const result = await writeVault(plan, parent);
      setSavedTo(result.path);
      setMissing(result.missing.length);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong writing the folder.");
      setStatus("error");
    }
  }

  return createPortal(
    <div className="ui-backdrop" onClick={status === "saving" ? undefined : onClose}>
      <div className="ui-modal ui-modal-lg export-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="export-modal-title">Export as Markdown</h2>

        {!plan && <p className="export-modal-error">There's nothing to export.</p>}

        {plan && status !== "done" && (
          <>
            <p className="export-modal-summary">
              {plan.pageCount} page{plan.pageCount === 1 ? "" : "s"} will be written as a folder of{" "}
              <code>.md</code> files, one file per page, with pages kept inside folders the way they are here. It
              opens as an Obsidian vault, and every other program that reads markdown can read it too.
            </p>

            {plan.notes.length > 0 && (
              <div className="export-modal-lossy">
                <h3 className="ui-eyebrow">What changes on the way:</h3>
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
                {status === "saving" ? "Writing…" : "Choose where to save"}
              </button>
            </div>
          </>
        )}

        {status === "done" && savedTo && (
          <>
            <p className="export-modal-summary">
              Exported. The folder is at <code className="export-modal-path">{savedTo}</code> — open that folder as a
              vault in Obsidian, or read the files anywhere.
            </p>
            {/* Named rather than counted away: a picture that would not read is
                a page missing its picture over there, and she is the only one
                who can go and look at why. */}
            {missing > 0 && (
              <p className="export-modal-error">
                {missing} picture{missing === 1 ? "" : "s"} couldn't be read and {missing === 1 ? "is" : "are"} missing
                from the folder. Everything else is there.
              </p>
            )}
            <div className="export-modal-actions">
              <button type="button" className="ui-btn ui-btn-secondary" onClick={() => void showFolder(savedTo)}>
                Show in {fileManagerName()}
              </button>
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
