// Phase 28 — saving one page template as a file somebody can be sent.
//
// **The one export in the phase with a switch, and the switch is the point.**
// A template carries its pictures (her call, 2026-08-14) so a skeleton with
// images in it can be shared whole — and turns them off (her call, same day)
// so a skeleton can stay a small file when the pictures aren't what it is
// for. Both produce the same format, a bundle whose asset list may be empty,
// so whoever opens it never has to know which they were handed.
//
// **The size is shown next to the switch because the size is the whole reason
// the switch exists.** A checkbox offering to make a file smaller, without
// saying by how much, is a decision nobody can make.
import { useState } from "react";
import { createPortal } from "react-dom";
import { describeSize } from "../../hooks/use-assets";
import { useDialogs } from "../../hooks/use-dialogs";
import { usePageTemplateFile, type PageTemplatePlan } from "../../hooks/use-page-template-file";
import "./export.css";

type Status = "preview" | "saving" | "done" | "error";

export function PageTemplateModal({ plan, onClose }: { plan: PageTemplatePlan; onClose: () => void }) {
  const { pickPageTemplateSavePath } = useDialogs();
  const { writeTemplate } = usePageTemplateFile();

  // On by default, unlike the `.lk` export's picture switch. That one is off
  // because carrying pictures there turns a tiny file into an enormous one for
  // a format that cannot really hold them; here they are what a template of a
  // character sheet is half made of, and leaving them out is the exception.
  const [withPictures, setWithPictures] = useState(true);
  const [status, setStatus] = useState<Status>("preview");
  const [error, setError] = useState<string | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const [missing, setMissing] = useState(0);

  async function handleSave() {
    setError(null);
    let path: string | null;
    try {
      path = await pickPageTemplateSavePath(plan.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the save dialog.");
      return;
    }
    if (!path) return;

    setStatus("saving");
    try {
      const result = await writeTemplate(plan, path, withPictures);
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
        <h2 className="export-modal-title">Save “{plan.name}” as a file</h2>

        {status !== "done" && (
          <>
            <p className="export-modal-summary">
              {plan.pages} page{plan.pages === 1 ? "" : "s"} — the template and everything inside it — written to one
              file you can send to somebody. They open it from their own Templates panel and it lands in their world,
              leaving yours alone.
            </p>

            {plan.pictures.length > 0 && (
              <label className="export-modal-pictures">
                <input
                  type="checkbox"
                  checked={withPictures}
                  onChange={(event) => setWithPictures(event.target.checked)}
                  disabled={status === "saving"}
                />
                <span>
                  <strong>
                    Include {plan.pictures.length} picture{plan.pictures.length === 1 ? "" : "s"}
                  </strong>
                  <span className="export-modal-pictures-note">
                    {withPictures
                      ? `Adds about ${describeSize(plan.pictureBytes)} before the file is squashed. Without them the template still arrives — the pictures just aren't in it.`
                      : `The template will be tiny. Turn this on to add about ${describeSize(plan.pictureBytes)} and send the pictures too.`}
                  </span>
                </span>
              </label>
            )}

            {error && <p className="export-modal-error">{error}</p>}

            <div className="export-modal-actions">
              <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose} disabled={status === "saving"}>
                Cancel
              </button>
              <button type="button" className="ui-btn ui-btn-primary" onClick={() => void handleSave()} disabled={status === "saving"}>
                {status === "saving" ? "Saving…" : "Choose where to save"}
              </button>
            </div>
          </>
        )}

        {status === "done" && savedTo && (
          <>
            <p className="export-modal-summary">
              Saved. The file is at <code className="export-modal-path">{savedTo}</code>.
            </p>
            {missing > 0 && (
              <p className="export-modal-error">
                {missing} picture{missing === 1 ? "" : "s"} couldn't be read and {missing === 1 ? "isn't" : "aren't"}{" "}
                in the file. The template itself is all there.
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
