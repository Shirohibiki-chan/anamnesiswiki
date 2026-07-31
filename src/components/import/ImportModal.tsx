// Phase 8 — bring a LegendKeeper `.lk` export in as a brand-new project. Four
// steps in one modal: pick the file, preview what was found (tree + inferred
// template counts + a plain-language list of anything that won't come across
// perfectly), pick a destination folder, then write it all to disk. See
// docs/lk-format.md for the field mapping this preview reflects.
import { useState } from "react";
import { createPortal } from "react-dom";
import { getTemplateIcon } from "../../constants/icons";
import { useAppSettings } from "../../hooks/use-app-settings";
import { useDialogs } from "../../hooks/use-dialogs";
import { useLkImport } from "../../hooks/use-lk-import";
import { useTemplates } from "../../hooks/use-templates";
import type { ImportPlan, ImportPreviewNode } from "../../services/lk-import";
import "./import.css";

type Status = "idle" | "parsing" | "preview" | "importing" | "error";

function pluralizeLabel(label: string, count: number): string {
  if (count === 1) return label;
  return label === "Species" ? label : `${label}s`;
}

function ImportPreviewRow({ node, depth }: { node: ImportPreviewNode; depth: number }) {
  const Icon = getTemplateIcon(node.templateKey);
  return (
    <div className="import-modal-tree-node">
      <div className="import-modal-tree-row" style={{ paddingLeft: `${depth * 1.125}rem` }}>
        {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon reads a fixed lookup table, so it returns the same stable component reference for a given templateKey every render */}
        <Icon size={13} className="import-modal-tree-icon" />
        <span>{node.name}</span>
      </div>
      {node.children.map((child) => (
        <ImportPreviewRow key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

// What the importing screen says. Counts rather than a mood: "this can take a
// little while" was the whole of it before, and a minute of that with no
// number moving is indistinguishable from the app having died.
function progressHeadline(
  progress: { phase: "images" | "writing"; done: number; total: number } | null,
  imageCount: number,
): string {
  if (!progress) {
    return imageCount > 0 ? `Getting ready — ${imageCount} picture${imageCount === 1 ? "" : "s"} to fetch.` : "Getting ready…";
  }
  if (progress.phase === "images") {
    if (progress.total === 0) return "Writing your world to disk…";
    return `Fetching pictures — ${progress.done} of ${progress.total}.`;
  }
  return "Writing your world to disk…";
}

export function ImportModal({ onClose }: { onClose: () => void }) {
  const { pickLkFile, pickFolder } = useDialogs();
  const { parseLkFile, importLkProject } = useLkImport();
  const { recordProjectOpened, projectsDir, prepareProjectsDir } = useAppSettings();
  const { getLabel } = useTemplates();

  const [status, setStatus] = useState<Status>("idle");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Set only when this one import is going somewhere other than the folder in
  // Settings. Deliberately not written back to the setting: overriding the
  // destination once shouldn't silently move where everything lands from now on.
  const [destinationOverride, setDestinationOverride] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ phase: "images" | "writing"; done: number; total: number } | null>(null);

  const destination = destinationOverride ?? projectsDir;

  async function handlePickFile() {
    const path = await pickLkFile();
    if (!path) return;
    setStatus("parsing");
    setError(null);
    try {
      const result = await parseLkFile(path);
      setPlan(result);
      setProjectName(result.projectName);
      setStatus("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
      setStatus("error");
    }
  }

  async function handleChangeDestination() {
    const startFrom = destinationOverride ?? (await prepareProjectsDir());
    const picked = await pickFolder({
      title: "Choose where to save this imported project",
      defaultPath: startFrom,
    });
    if (!picked) return;
    setDestinationOverride(picked);
  }

  async function handleConfirm() {
    if (!plan) return;
    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setError("Give your project a name.");
      return;
    }
    // No folder browser here any more — it opened with no starting point,
    // which meant it opened in whatever folder the .lk was just picked from.
    // The destination comes from Settings, and "Change" below overrides it.
    // Makes the folder if it isn't there — otherwise a fresh install's very
    // first action can be an import into a Documents\Anamnesis nobody created.
    const parentDir = destinationOverride ?? (await prepareProjectsDir());

    setStatus("importing");
    setProgress(null);
    setError(null);
    // A failed write partway through would otherwise leave the modal stuck on
    // "Importing your world" with no error and no way back.
    let result: Awaited<ReturnType<typeof importLkProject>>;
    try {
      result = await importLkProject(parentDir, trimmedName, plan, setProgress);
    } catch (e) {
      result = { ok: false, error: e instanceof Error ? e.message : "Something went wrong writing the project to disk." };
    }
    if (!result.ok) {
      setError(result.error);
      setStatus("preview");
      return;
    }
    await recordProjectOpened(result.rootPath, trimmedName);
    onClose();
  }

  const isBusy = status === "parsing" || status === "importing";

  return createPortal(
    <div className="import-modal-backdrop" onClick={isBusy ? undefined : onClose}>
      <div className="import-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="import-modal-title">Import from LegendKeeper</h2>

        {(status === "idle" || status === "parsing" || status === "error") && (
          <div className="import-modal-pick">
            <p>Bring in your pages, tabs, and cross-references from a LegendKeeper .lk export.</p>
            {error && <p className="import-modal-error">{error}</p>}
            <button type="button" onClick={() => void handlePickFile()} disabled={status === "parsing"}>
              {status === "parsing" ? "Reading file…" : "Choose a .lk file"}
            </button>
            {/* The button's own label was the only sign anything was happening,
                and unpacking a large world holds the window still while it
                runs — so it read as nothing having happened at all. */}
            {status === "parsing" && (
              <p className="import-modal-progress-note">
                Unpacking your world. A big one takes a few seconds, and the window may sit still while it does.
              </p>
            )}
          </div>
        )}

        {status === "preview" && plan && (
          <div className="import-modal-preview">
            <label className="import-modal-name-field">
              Project name
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            </label>

            <p className="import-modal-summary">
              {plan.totalResources} page{plan.totalResources === 1 ? "" : "s"} found —{" "}
              {Object.entries(plan.templateCounts)
                .map(([key, count]) => `${count} ${pluralizeLabel(getLabel(key), count ?? 0)}`)
                .join(", ")}
            </p>

            <div className="import-modal-tree">
              {plan.preview.map((node) => (
                <ImportPreviewRow key={node.id} node={node} depth={0} />
              ))}
            </div>

            {plan.lossyNotes.length > 0 && (
              <div className="import-modal-lossy">
                <h3>A few things won't come across perfectly:</h3>
                <ul>
                  {plan.lossyNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="import-modal-destination">
              Saving to <span className="import-modal-destination-path">{destination ?? "…"}</span>
              <button
                type="button"
                className="import-modal-destination-change"
                onClick={() => void handleChangeDestination()}
                disabled={!destination}
              >
                Change
              </button>
            </p>

            {error && <p className="import-modal-error">{error}</p>}

            <div className="import-modal-actions">
              <button type="button" className="import-modal-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="import-modal-confirm" onClick={() => void handleConfirm()}>
                Import
              </button>
            </div>
          </div>
        )}

        {status === "importing" && (
          <div className="import-modal-pick">
            <p>{progressHeadline(progress, plan?.pendingImages.length ?? 0)}</p>
            {progress && progress.total > 0 && (
              <div
                className="import-modal-progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.done}
              >
                <div
                  className="import-modal-progress-fill"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
            )}
            <p className="import-modal-progress-note">Pictures come from LegendKeeper's servers, so this needs the internet.</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
