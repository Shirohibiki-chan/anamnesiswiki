// Phase 1.5 — publish the world as a folder of web pages.
//
// **The same errand as the Markdown modal, with one more thing to say.** Say
// what is about to happen, name what stays behind and what changes on the
// way, ask where it goes — and then, because a folder of HTML is only useful
// once it is somewhere people can reach, say where it can be put for free.
// That last part is prose rather than a button: uploading is a thing she does
// with the host's own page, and the app has nothing to do there.
//
// **No options.** What is left out is decided by what she marked hidden, and
// what goes in is decided by which menu she opened this from — a page's row
// publishes that page and everything under it, the project row publishes the
// world. A checkbox tree here would be a second way of saying "not this one",
// and the first way is the one the reader will never see through.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogs } from "../../hooks/use-dialogs";
import { useProjectName } from "../../hooks/use-project";
import { useSiteExport } from "../../hooks/use-site-export";
import type { SitePlan, SiteTheme } from "../../services/site-plan";
import "./export.css";

type Status = "preview" | "saving" | "done" | "error";

export function WebsiteExportModal({ rootIds, onClose }: { rootIds: string[]; onClose: () => void }) {
  const { pickFolder, showFolder, previewSite, fileManagerName } = useDialogs();
  const { readTheme, plan, write } = useSiteExport();
  const projectName = useProjectName();

  // The theme is read once the modal opens rather than at click time, so the
  // fonts have usually arrived by the time she has read the summary. Until
  // then the plan is built without them — the page count is the same either
  // way, and the note about typefaces corrects itself when they land.
  const [theme, setTheme] = useState<SiteTheme | null>(null);
  useEffect(() => {
    let live = true;
    void readTheme().then((read) => {
      if (live) setTheme(read);
    });
    return () => {
      live = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const site = useMemo<SitePlan | null>(() => plan(rootIds, theme ?? { tokens: {}, fonts: [] }), [rootIds, theme]); // eslint-disable-line react-hooks/exhaustive-deps
  const [status, setStatus] = useState<Status>("preview");
  const [error, setError] = useState<string | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const [missing, setMissing] = useState(0);

  async function handleExport() {
    if (!site) return;
    setError(null);

    let destination: string | null;
    try {
      destination = await pickFolder({ title: "Where should the website's folder go?" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the picker.");
      return;
    }
    if (!destination) return;

    setStatus("saving");
    try {
      const result = await write(site, destination);
      setSavedTo(result.path);
      setMissing(result.missing.length);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong writing it.");
      setStatus("error");
    }
  }

  return createPortal(
    <div className="ui-backdrop" onClick={status === "saving" ? undefined : onClose}>
      <div className="ui-modal ui-modal-lg export-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="export-modal-title">Publish as a website</h2>

        {!site && <p className="export-modal-error">There's nothing to publish.</p>}

        {site && status !== "done" && (
          <>
            <p className="export-modal-summary">
              {site.pageCount} page{site.pageCount === 1 ? "" : "s"} will be written as a folder of web pages — one page each, the whole tree
              down the side, and a search box. It looks the way {projectName ?? "your world"} looks here, and anyone with the link can read
              it without installing anything.
            </p>

            {site.notes.length > 0 && (
              <div className="export-modal-lossy">
                <h3 className="ui-eyebrow">Before you put it online:</h3>
                <ul>
                  {site.notes.map((note) => (
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
                disabled={status === "saving" || !theme}
              >
                {status === "saving" ? "Writing…" : theme ? "Choose where to save" : "Reading your theme…"}
              </button>
            </div>
          </>
        )}

        {status === "done" && savedTo && (
          <>
            <p className="export-modal-summary">
              Published. The folder is at <code className="export-modal-path">{savedTo}</code>. Open it to read it here, then put the
              whole folder online: drop it onto Netlify or Cloudflare Pages, or push it to a GitHub Pages repository — all three are free and
              give you a link to hand out. Publishing again writes a new folder, so upload that one in its place.
            </p>
            {missing > 0 && (
              <p className="export-modal-error">
                {missing} picture{missing === 1 ? "" : "s"} couldn't be read and {missing === 1 ? "is" : "are"} missing from the site.
                Everything else is there.
              </p>
            )}
            <div className="export-modal-actions">
              <button type="button" className="ui-btn ui-btn-secondary" onClick={() => void showFolder(savedTo)}>
                Show in {fileManagerName()}
              </button>
              <button type="button" className="ui-btn ui-btn-secondary" onClick={() => void previewSite(savedTo)}>
                Open in browser
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
