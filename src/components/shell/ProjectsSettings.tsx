// The Projects section of the settings panel — where new and imported projects
// get written. Exists because importing a `.lk` used to open a folder browser
// with no starting point, which lands wherever the OS was last: the Downloads
// folder you just took the `.lk` out of. Every import meant navigating back to
// Documents by hand. Now both paths read this folder and neither asks.
import { useAppSettings } from "../../hooks/use-app-settings";
import { useDialogs } from "../../hooks/use-dialogs";

export function ProjectsSettings() {
  const { projectsDir, isCustomProjectsDir, changeProjectsDir, prepareProjectsDir } = useAppSettings();
  const { pickFolder, showNotice } = useDialogs();

  async function handleChange() {
    // Make the current folder before browsing from it — a native folder
    // browser can only start somewhere that exists, so a default nobody has
    // created yet drops you a level up to make it by hand.
    let picked: string | null;
    try {
      const startFrom = await prepareProjectsDir();
      picked = await pickFolder({
        title: "Choose where new projects are saved",
        defaultPath: startFrom,
      });
    } catch (e) {
      // Nowhere on this panel to put an error line, and a folder browser
      // that silently does nothing is the failure worth naming.
      showNotice(e instanceof Error ? e.message : "Couldn't open the folder picker.");
      return;
    }
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
