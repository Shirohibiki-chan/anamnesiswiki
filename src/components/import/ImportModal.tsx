// Phase 8 — bring a `.lk` export in as a brand-new project; Phase 20 — the
// same door for a folder of markdown, a zip of one, or a single note;
// 2026-09-30 — web pages, and a world's own backup. Four steps in one modal:
// pick where the world is coming from (or arrive with something already
// dropped on the window), preview what was found (tree + template counts + a
// plain-language list of anything that won't come across perfectly), pick a
// destination folder, then write it all to disk. See docs/lk-format.md for
// the `.lk` mapping and docs/handoff.md § Markdown import for the other.
//
// **A tile per source, named the way she thinks of it.** Obsidian and Folder
// run the same code, and so do Zip and the backup — but somebody with a vault
// looks for the word Obsidian, and somebody with a backup looks for the word
// backup. The tiles only choose which picker opens; what a file *is* is
// decided from its bytes in `use-import.ts`.
import { ArchiveRestore, CodeXml, FileArchive, FileText, Folder, Gem, ScrollText, Upload, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getTemplateIcon } from "../../constants/icons";
import { useAppSettings } from "../../hooks/use-app-settings";
import { useDialogs } from "../../hooks/use-dialogs";
import { useImport } from "../../hooks/use-import";
import { useImportDrop } from "../../hooks/use-import-drop";
import { useTemplates } from "../../hooks/use-templates";
import type { ImportFileKind } from "../../services/dialog-service";
import { isBackupPlan, type BackupPlan, type ImportPlan, type ImportPreviewNode } from "../../services/import-plan";
import type { ImportPick } from "../../services/import-source";
import "./import.css";

// `picking` is a state of its own rather than a flag because the OS file
// dialog is a window this app doesn't draw and can't see. Without it there is
// no difference on screen between the picker being open behind something and
// the button having done nothing at all — which is the complaint that put it
// here. It also stops a second click reaching a picker that is already up.
type Status = "idle" | "picking" | "parsing" | "preview" | "importing" | "error";

type ImportSource = { label: string; hint: string; Icon: LucideIcon; pick: "folder" | ImportFileKind };

const IMPORT_SOURCES: ImportSource[] = [
  { label: "LegendKeeper", hint: "A .lk export", Icon: ScrollText, pick: "lk" },
  { label: "Obsidian", hint: "A vault folder", Icon: Gem, pick: "folder" },
  { label: "Text & Markdown", hint: "A .md or .txt note", Icon: FileText, pick: "note" },
  { label: "HTML", hint: "A web page or a website", Icon: CodeXml, pick: "html" },
  { label: "Anamnesis Backup", hint: "An Export as JSON zip", Icon: ArchiveRestore, pick: "backup" },
  { label: "Folder", hint: "Notes or web pages", Icon: Folder, pick: "folder" },
  { label: "Zip", hint: "A zipped folder of either", Icon: FileArchive, pick: "zip" },
];

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function backupSummary(plan: BackupPlan): string {
  const parts = [plural(plan.pageCount, "page"), plural(plan.pictureCount, "picture")];
  if (plan.versionCount > 0) parts.push(plural(plan.versionCount, "earlier version"));
  return `A backup of an Anamnesis world — ${parts.join(", ")}. It comes back exactly as it was saved.`;
}

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
  progress: { phase: "images" | "copying" | "writing"; done: number; total: number } | null,
  imageCount: number,
  assetCount: number,
): string {
  if (!progress) {
    if (imageCount > 0) return `Getting ready — ${imageCount} picture${imageCount === 1 ? "" : "s"} to fetch.`;
    if (assetCount > 0) return `Getting ready — ${assetCount} picture${assetCount === 1 ? "" : "s"} to copy in.`;
    return "Getting ready…";
  }
  if (progress.phase === "images" && progress.total > 0) return `Fetching pictures — ${progress.done} of ${progress.total}.`;
  if (progress.phase === "copying" && progress.total > 0) return `Copying pictures — ${progress.done} of ${progress.total}.`;
  return "Writing your project to disk…";
}

export function ImportModal({ onClose, initialPick }: { onClose: () => void; initialPick?: ImportPick }) {
  const { pickImportFile, pickFolder } = useDialogs();
  const { parseImport, importProject, restoreBackup } = useImport();
  const { recordProjectOpened, projectsDir, prepareNewProjectsDir } = useAppSettings();
  const { getLabel } = useTemplates();

  // Opened with something already dropped on the window, it starts reading
  // rather than at its buttons.
  const [status, setStatus] = useState<Status>(initialPick ? "parsing" : "idle");
  const [plan, setPlan] = useState<ImportPlan | BackupPlan | null>(null);
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Set only when this one import is going somewhere other than the folder in
  // Settings. Deliberately not written back to the setting: overriding the
  // destination once shouldn't silently move where everything lands from now on.
  const [destinationOverride, setDestinationOverride] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ phase: "images" | "copying" | "writing"; done: number; total: number } | null>(null);

  const destination = destinationOverride ?? projectsDir;

  // Reading what was picked, whichever way it arrived. One try around it so
  // every way this can fail ends on a line she can read.
  const readPick = useCallback(
    async (pick: ImportPick) => {
      setStatus("parsing");
      try {
        const result = await parseImport(pick);
        setPlan(result);
        setProjectName(result.projectName);
        setStatus("preview");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't read that.");
        setStatus("error");
      }
    },
    [parseImport],
  );

  // The pick the modal opened with, read once. The status is already
  // `parsing` from the first render, so nothing is set until the read lands.
  useEffect(() => {
    if (!initialPick) return;
    let stale = false;
    parseImport(initialPick).then(
      (result) => {
        if (stale) return;
        setPlan(result);
        setProjectName(result.projectName);
        setStatus("preview");
      },
      (e: unknown) => {
        if (stale) return;
        setError(e instanceof Error ? e.message : "Couldn't read that.");
        setStatus("error");
      },
    );
    return () => {
      stale = true;
    };
  }, [initialPick, parseImport]);

  // A drop while the modal is waiting at its buttons reads the same way a
  // picker's answer does. Off once something is being read or written, so a
  // second drop cannot replace a plan halfway through.
  const { dragging } = useImportDrop(readPick, status === "idle" || status === "error");

  // One try around both halves on purpose. Opening the picker was outside it
  // before, and the click handler discards this promise — so a picker that
  // failed to open threw into nothing: no dialog, no message, no clue. Every
  // way this can fail now ends on a line she can read.
  async function handlePick(source: ImportSource["pick"]) {
    setError(null);
    setStatus("picking");
    const kind = source === "folder" ? "folder" : "file";
    let path: string | null;
    try {
      path = source === "folder" ? await pickFolder({ title: "Choose a folder to import" }) : await pickImportFile(source);
    } catch (e) {
      setError(`Couldn't open the ${kind} picker${e instanceof Error && e.message ? ` — ${e.message}` : "."}`);
      setStatus("error");
      return;
    }
    if (!path) {
      setStatus("idle");
      return;
    }
    await readPick({ kind, path });
  }

  async function handleChangeDestination() {
    try {
      const startFrom = destinationOverride ?? (await prepareNewProjectsDir());
      const picked = await pickFolder({
        title: "Choose where to save this imported project",
        defaultPath: startFrom,
      });
      if (!picked) return;
      setDestinationOverride(picked);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the folder picker.");
    }
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
    const parentDir = destinationOverride ?? (await prepareNewProjectsDir());

    setStatus("importing");
    setProgress(null);
    setError(null);
    // A failed write partway through would otherwise leave the modal stuck on
    // "Importing your project" with no error and no way back.
    let result: Awaited<ReturnType<typeof importProject>>;
    try {
      result = isBackupPlan(plan)
        ? await restoreBackup(parentDir, trimmedName, plan, (done, total) => setProgress({ phase: "writing", done, total }))
        : await importProject(parentDir, trimmedName, plan, setProgress);
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

  // Closing the modal while the OS picker is up would strand it: the dialog
  // stays on screen with nothing behind it left to receive the answer.
  const isBusy = status === "picking" || status === "parsing" || status === "importing";

  return createPortal(
    <div className="ui-backdrop" onClick={isBusy ? undefined : onClose}>
      <div className="ui-modal ui-modal-lg import-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="import-modal-title">Import a Project</h2>

        {(status === "idle" || status === "picking" || status === "parsing" || status === "error") && (
          <div className="import-modal-pick">
            <p>Where is your world coming from?</p>
            {error && <p className="import-modal-error">{error}</p>}
            <div className="import-modal-sources">
              {IMPORT_SOURCES.map(({ label, hint, Icon, pick }) => (
                <button
                  key={label}
                  type="button"
                  className="import-modal-source"
                  onClick={() => void handlePick(pick)}
                  disabled={isBusy}
                >
                  <Icon size={18} className="import-modal-source-icon" aria-hidden />
                  <span className="import-modal-source-text">
                    <b>{label}</b>
                    <span>{hint}</span>
                  </span>
                </button>
              ))}
            </div>
            {/* The drop works anywhere on the window; this box is what says so.
                A click on it is the everything-picker, for somebody who has the
                file and doesn't know which tile it is. */}
            <button
              type="button"
              className={`import-modal-drop${dragging ? " is-dragging" : ""}`}
              onClick={() => void handlePick("any")}
              disabled={isBusy}
            >
              <Upload size={20} aria-hidden />
              <span>{dragging ? "Let go to import it" : "Drop a file or folder here, or click to choose one"}</span>
            </button>
            {/* The picker is an OS window this app doesn't draw, so when it
                opens behind the app there is nothing on screen to say so. This
                line is the only thing that can. */}
            {status === "picking" && (
              <p className="import-modal-progress-note">
                The file picker is open. If you can't see it, it may be behind this window — check your taskbar.
              </p>
            )}
            {/* The button's own label was the only sign anything was happening,
                and unpacking a large project holds the window still while it
                runs — so it read as nothing having happened at all. */}
            {status === "parsing" && (
              <p className="import-modal-progress-note">
                Reading your notes. A big world takes a few seconds, and the window may sit still while it does.
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

            {isBackupPlan(plan) ? (
              <p className="import-modal-summary">{backupSummary(plan)}</p>
            ) : (
              <>
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
              </>
            )}

            {!isBackupPlan(plan) && plan.lossyNotes.length > 0 && (
              <div className="import-modal-lossy">
                <h3 className="ui-eyebrow">A few things won't come across perfectly:</h3>
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
                className="ui-link import-modal-destination-change"
                onClick={() => void handleChangeDestination()}
                disabled={!destination}
              >
                Change
              </button>
            </p>

            {error && <p className="import-modal-error">{error}</p>}

            <div className="import-modal-actions">
              <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="ui-btn ui-btn-primary" onClick={() => void handleConfirm()}>
                Import
              </button>
            </div>
          </div>
        )}

        {status === "importing" && (
          <div className="import-modal-pick">
            <p>
              {plan && isBackupPlan(plan)
                ? progress && progress.total > 0
                  ? `Restoring your world — ${progress.done} of ${progress.total} files.`
                  : "Restoring your world…"
                : progressHeadline(progress, plan?.pendingImages.length ?? 0, plan?.assets.length ?? 0)}
            </p>
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
            {/* Only a `.lk` fetches anything; a vault's pictures are files
                beside the notes and never leave the machine. */}
            {plan && !isBackupPlan(plan) && plan.pendingImages.length > 0 && (
              <p className="import-modal-progress-note">
                Pictures are stored on the servers of whatever you exported from, so this part needs the internet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
