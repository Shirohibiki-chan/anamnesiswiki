// The Projects section of the settings panel — where new and imported projects
// get written. Exists because importing a `.lk` used to open a folder browser
// with no starting point, which lands wherever the OS was last: the Downloads
// folder you just took the `.lk` out of. Every import meant navigating back to
// Documents by hand. Now both paths read this folder and neither asks.
import { useAppSettings } from "../../hooks/use-app-settings";
import { useDialogs } from "../../hooks/use-dialogs";

export function ProjectsSettings() {
  const { projectsDir, isCustomProjectsDir, changeProjectsDir, prepareProjectsDir } = useAppSettings();
  const { pickFolder } = useDialogs();

  async function handleChange() {
    // Make the current folder before browsing from it — a native folder
    // browser can only start somewhere that exists, so a default nobody has
    // created yet drops you a level up to make it by hand.
    const startFrom = await prepareProjectsDir();
    const picked = await pickFolder({
      title: "Choose where new projects are saved",
      defaultPath: startFrom,
    });
    if (!picked) return;
    await changeProjectsDir(picked);
  }

  return (
    <div className="projects-settings">
      <p className="projects-settings-label">New and imported projects are saved here</p>

      <p className="projects-settings-path">{projectsDir ?? "Finding your folder…"}</p>

      <p className="projects-settings-line">
        <button type="button" className="ui-link" onClick={() => void handleChange()} disabled={!projectsDir}>
          Change folder
        </button>
        {isCustomProjectsDir && (
          <button type="button" className="ui-link" onClick={() => void changeProjectsDir(null)}>
            Reset to default
          </button>
        )}
      </p>

      <p className="projects-settings-note">
        Projects you already have stay exactly where they are — this only decides where the next one goes.
      </p>
    </div>
  );
}
