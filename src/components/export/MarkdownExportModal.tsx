// Phase 28 — write the world out as markdown, either as a folder or as one
// file.
//
// **One component for both, because they are the same errand with a different
// destination.** Say what is about to happen, name anything that changes on
// the way, ask where it goes. Splitting them would mean two copies of the
// preview, the notes list, the error handling and the done panel, differing
// only in three sentences — and the sentences are the part that should differ.
//
// What is *different* from the `.lk` export beside it is that neither of these
// has options. That one offers a picture switch because the format cannot hold
// pictures and the file would otherwise be enormous; a markdown folder simply
// takes them, and a single file simply cannot.
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogs } from "../../hooks/use-dialogs";
import { useMarkdownExport } from "../../hooks/use-markdown-export";
import { useProjectName } from "../../hooks/use-project";
import "./export.css";

type Status = "preview" | "saving" | "done" | "error";

export function MarkdownExportModal({ rootIds, single, onClose }: { rootIds: string[]; single: boolean; onClose: () => void }) {
  const { pickFolder, pickSingleMarkdownSavePath, showFolder, fileManagerName } = useDialogs();
  const { planVault, writeVault, planSingleFile, writeSingleFile } = useMarkdownExport();
  const projectName = useProjectName();

  // Built once per opening: it is a pure conversion of a snapshot, and
  // rebuilding it on every render would redo the whole world on each keystroke
  // behind the modal.
  const plan = useMemo(() => (single ? planSingleFile(rootIds) : planVault(rootIds)), [rootIds, single]); // eslint-disable-line react-hooks/exhaustive-deps
  const [status, setStatus] = useState<Status>("preview");
  const [error, setError] = useState<string | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const [missing, setMissing] = useState(0);

  async function handleExport() {
    if (!plan) return;
    setError(null);

    // Same shape as the other two modals: the picker is a native window whose
    // failure would otherwise reject into a discarded promise.
    let destination: string | null;
    try {
      destination = single ? await pickSingleMarkdownSavePath(projectName ?? "Export") : await pickFolder({ title: "Where should the folder go?" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the picker.");
      return;
    }
    if (!destination) return;

    setStatus("saving");
    try {
      if (single && "text" in plan) {
        await writeSingleFile(plan, destination);
        setSavedTo(destination);
      } else if (!single && "files" in plan) {
        const result = await writeVault(plan, destination);
        setSavedTo(result.path);
        setMissing(result.missing.length);
      }
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong writing it.");
      setStatus("error");
    }
  }

  return createPortal(
    <div className="ui-backdrop" onClick={status === "saving" ? undefined : onClose}>
      <div className="ui-modal ui-modal-lg export-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="export-modal-title">{single ? "Export as one Markdown file" : "Export as Markdown"}</h2>

        {!plan && <p className="export-modal-error">There's nothing to export.</p>}

        {plan && status !== "done" && (
          <>
            <p className="export-modal-summary">
              {single ? (
                <>
                  {plan.pageCount} page{plan.pageCount === 1 ? "" : "s"} will be written into a single <code>.md</code>{" "}
                  file, each one a heading, nested as deeply as it sits in your tree. It's for handing somebody the
                  whole world to read in one scroll — links between pages jump down the document rather than opening
                  anything.
                </>
              ) : (
                <>
                  {plan.pageCount} page{plan.pageCount === 1 ? "" : "s"} will be written as a folder of <code>.md</code>{" "}
                  files, one file per page, with pages kept inside folders the way they are here. It opens as an
                  Obsidian vault, and every other program that reads markdown can read it too.
                </>
              )}
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
              Exported. {single ? "The file is at" : "The folder is at"} <code className="export-modal-path">{savedTo}</code>
              {single ? " — open it in anything that reads markdown." : " — open that folder as a vault in Obsidian, or read the files anywhere."}
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
