// Phase 9 — write a LegendKeeper `.lk` file. Deliberately not the checkbox
// tree the original plan sketched: LegendKeeper's own `.lk` export takes no
// options at all (no subpage toggle, no image toggle — confirmed against a
// live account), so what's exported is decided before this opens, by what was
// right-clicked. This shows what's about to happen, names anything that won't
// survive the trip, and asks where to put the file.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { describeSize } from "../../hooks/use-assets";
import { useDialogs } from "../../hooks/use-dialogs";
import { useLkExport } from "../../hooks/use-lk-export";
import { useProjectName } from "../../hooks/use-project";
import "./export.css";

type Status = "preview" | "saving" | "done" | "error";

/**
 * How much bigger a picture gets when it's written into the file as text.
 * Base64 encodes three bytes as four, and gzip won't win it back on a PNG or a
 * JPEG that's already compressed — so this is close to the truth rather than a
 * worst case, and it's better she sees the real number before ticking the box.
 */
const BASE64_OVERHEAD = 4 / 3;

export function ExportModal({ rootIds, onClose }: { rootIds: string[]; onClose: () => void }) {
  const { pickLkSavePath } = useDialogs();
  const { planExport, sizeOfLocalPictures, loadLocalPictures, writeExport } = useLkExport();
  const projectName = useProjectName();

  // Built once per opening: it's a pure conversion of a snapshot, and
  // rebuilding it on every render would re-mint every id in the file.
  const plan = useMemo(() => planExport(rootIds), [rootIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const [status, setStatus] = useState<Status>("preview");
  const [error, setError] = useState<string | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);

  // Off by default. The pictures that need it are hers alone, so this can't
  // silently turn a 50KB file into a 60MB one on an export she didn't think
  // twice about.
  const [carryPictures, setCarryPictures] = useState(false);
  const [pictureBytes, setPictureBytes] = useState<number | null>(null);

  const localPictures = plan?.localAssetFiles ?? [];

  // The picture note stops being true the moment she ticks the box, so it's
  // added to the list rather than living in it.
  const notes = [...(plan?.lossyNotes ?? []), ...(!carryPictures && plan?.localPictureNote ? [plan.localPictureNote] : [])];

  useEffect(() => {
    if (localPictures.length === 0) return;
    let cancelled = false;
    void sizeOfLocalPictures(localPictures).then((bytes) => {
      if (!cancelled) setPictureBytes(bytes);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the plan is built once per opening, so this list is stable
  }, [plan]);

  async function handleExport() {
    if (!plan) return;
    setError(null);
    // Same shape as the import modal: the save dialog is a native window
    // whose failure would otherwise reject into a discarded promise.
    let path: string | null;
    try {
      path = await pickLkSavePath(projectName ?? "Export");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the save dialog.");
      return;
    }
    if (!path) return;

    setStatus("saving");
    try {
      // Built a second time when the pictures are coming along, because the
      // first pass is what discovered which ones were needed. Everything else
      // about the file is the same conversion of the same snapshot.
      let finalPlan = plan;
      if (carryPictures && localPictures.length > 0) {
        finalPlan = planExport(rootIds, await loadLocalPictures(localPictures)) ?? plan;
      }
      await writeExport(finalPlan, path);
      setSavedTo(path);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong writing the file.");
      setStatus("error");
    }
  }

  return createPortal(
    <div className="ui-backdrop" onClick={status === "saving" ? undefined : onClose}>
      <div className="ui-modal ui-modal-lg export-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="export-modal-title">Export to LegendKeeper</h2>

        {!plan && <p className="export-modal-error">There's nothing to export.</p>}

        {plan && status !== "done" && (
          <>
            <p className="export-modal-summary">
              {plan.pageCount} page{plan.pageCount === 1 ? "" : "s"} will be written to a LegendKeeper <code>.lk</code>{" "}
              file — everything you picked, and everything filed underneath it. LegendKeeper's own export works the same
              way; there's no way to leave the sub-pages behind.
            </p>

            {localPictures.length > 0 && (
              <label className="export-modal-pictures">
                <input
                  type="checkbox"
                  checked={carryPictures}
                  onChange={(event) => setCarryPictures(event.target.checked)}
                  disabled={status === "saving"}
                />
                <span>
                  <strong>
                    Carry {localPictures.length} picture{localPictures.length === 1 ? "" : "s"} from your computer
                    inside the file
                  </strong>
                  <span className="export-modal-pictures-note">
                    {pictureBytes === null
                      ? "Working out how big that would be…"
                      : `Adds about ${describeSize(pictureBytes * BASE64_OVERHEAD)} to a file that's otherwise tiny. Without this they're left out — LegendKeeper files normally only hold addresses of pictures on their servers, not the pictures.`}
                  </span>
                </span>
              </label>
            )}

            {notes.length > 0 && (
              <div className="export-modal-lossy">
                <h3 className="ui-eyebrow">A few things won't come across:</h3>
                <ul>
                  {notes.map((note) => (
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

        {status === "done" && (
          <>
            <p className="export-modal-summary">
              Exported. The file is at <code className="export-modal-path">{savedTo}</code>, ready to import into
              LegendKeeper.
            </p>
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
