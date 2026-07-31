// The Projects section of the settings panel — where new and imported worlds
// get written. Exists because importing a `.lk` used to open a folder browser
// with no starting point, which lands wherever the OS was last: the Downloads
// folder you just took the `.lk` out of. Every import meant navigating back to
// Documents by hand. Now both paths read this folder and neither asks.
import { useAppSettings } from "../../hooks/use-app-settings";
import { useDialogs } from "../../hooks/use-dialogs";

export function ProjectsSettings() {
  const { projectsDir, isCustomProjectsDir, changeProjectsDir } = useAppSettings();
  const { pickFolder } = useDialogs();

  async function handleChange() {
    const picked = await pickFolder({
      title: "Choose where new projects are saved",
      // Start the browser in the folder it's already set to, rather than
      // wherever the OS happened to leave it — the whole point of this screen.
      defaultPath: projectsDir ?? undefined,
    });
    if (!picked) return;
    await changeProjectsDir(picked);
  }

  return (
    <div className="projects-settings">
      <p className="projects-settings-label">New and imported worlds are saved here</p>

      <p className="projects-settings-path">{projectsDir ?? "Finding your folder…"}</p>

      <p className="projects-settings-line">
        <button type="button" className="update-check-link" onClick={() => void handleChange()} disabled={!projectsDir}>
          Change folder
        </button>
        {isCustomProjectsDir && (
          <button type="button" className="update-check-link" onClick={() => void changeProjectsDir(null)}>
            Reset to default
          </button>
        )}
      </p>

      <p className="projects-settings-note">
        Worlds you already have stay exactly where they are — this only decides where the next one goes.
      </p>
    </div>
  );
}
