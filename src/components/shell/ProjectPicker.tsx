// First-launch screen — recent projects, "Open folder" (any location on
// disk), and "New project" (name only, created under the projects folder from
// Settings → Projects). Rendered by StartupRouter when no project is loaded yet.
import { useState } from "react";
import { useProject } from "../../hooks/use-project";
import { useAppSettings } from "../../hooks/use-app-settings";
import { useDialogs } from "../../hooks/use-dialogs";
import { ImportModal } from "../import/ImportModal";
import { SettingsButton } from "./SettingsButton";
import "./shell.css";

export function ProjectPicker() {
  const { loadProject, createProjectAt } = useProject();
  const { recentProjects, recordProjectOpened, forgetProject, getProjectsDir } = useAppSettings();
  const { pickFolder } = useDialogs();

  const [isBusy, setIsBusy] = useState(false);
  const [isCreatingOpen, setIsCreatingOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleOpenFolder() {
    const path = await pickFolder({ title: "Open an Anamnesis project" });
    if (!path) return;

    setIsBusy(true);
    const result = await loadProject(path).finally(() => setIsBusy(false));

    if (!result) {
      setError("That folder doesn't have an Anamnesis project in it, or its files couldn't be read. Try a different folder, or create a new one instead.");
      return;
    }
    setError(null);
    await recordProjectOpened(path, result.name);
  }

  async function handleOpenRecent(path: string, name: string) {
    setIsBusy(true);
    const result = await loadProject(path).finally(() => setIsBusy(false));

    if (!result) {
      setError(`Couldn't open "${name}" — it may have moved, been deleted, or its files may be damaged.`);
      await forgetProject(path);
      return;
    }
    setError(null);
    await recordProjectOpened(path, result.name);
  }

  async function handleCreateProject() {
    const trimmed = newProjectName.trim();
    if (!trimmed) {
      setError("Give your project a name.");
      return;
    }

    setIsBusy(true);
    let result: Awaited<ReturnType<typeof createProjectAt>>;
    try {
      const parentDir = await getProjectsDir();
      result = await createProjectAt(parentDir, trimmed);
    } catch {
      result = { ok: false, error: "Couldn't create the project folder. Check that the location is writable and try again." };
    } finally {
      setIsBusy(false);
    }

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    await recordProjectOpened(result.rootPath, trimmed);
  }

  return (
    <main className="project-picker">
      <div className="project-picker-intro">
        <h1 className="font-display">Anamnesis</h1>
        <p>Pick a project to open, or start a new one.</p>
      </div>

      {recentProjects.length > 0 && (
        <div className="project-picker-recent">
          <h2>Recent projects</h2>
          <ul>
            {recentProjects.map((p) => (
              <li key={p.path}>
                <button type="button" onClick={() => void handleOpenRecent(p.path, p.name)} disabled={isBusy}>
                  <span className="project-picker-recent-name">{p.name}</span>
                  <span className="project-picker-recent-path">{p.path}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="project-picker-actions">
        <button type="button" onClick={() => void handleOpenFolder()} disabled={isBusy}>
          Open folder
        </button>

        <button type="button" onClick={() => setIsImportOpen(true)} disabled={isBusy}>
          Import from LegendKeeper
        </button>

        {!isCreatingOpen ? (
          <button type="button" onClick={() => setIsCreatingOpen(true)} disabled={isBusy}>
            New project
          </button>
        ) : (
          <form
            className="project-picker-new-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateProject();
            }}
          >
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              autoFocus
              disabled={isBusy}
            />
            <button type="submit" disabled={isBusy}>
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingOpen(false);
                setNewProjectName("");
                setError(null);
              }}
              disabled={isBusy}
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {error && <p className="project-picker-error">{error}</p>}

      <div className="project-picker-settings">
        <SettingsButton variant="standalone" />
      </div>

      {isImportOpen && <ImportModal onClose={() => setIsImportOpen(false)} />}
    </main>
  );
}
