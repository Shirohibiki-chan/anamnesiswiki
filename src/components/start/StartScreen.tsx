// The screen before a project is open. Rendered by StartupRouter when nothing
// is loaded yet.
//
// It was a heading, a list of the last eight projects and three buttons in a
// column. Phase 27 rebuilt it around the thing it is actually for: every
// project the app can find, shown as itself rather than as a line of text, with
// the ways of starting something new pushed to the side where they don't
// compete with the fifty projects that already exist.
//
// **One bright control.** Making a new project is the only thing on this screen
// that can't be undone by clicking somewhere else, and it's centred and filled
// while everything else is quiet. Opening a folder and importing are in the
// rail: real, reachable, and not shouting.
import { useState } from "react";
import { useUpdates } from "../../hooks/use-updates";
import { useStartActions } from "../../hooks/use-start-actions";
import { useWorldLibrary } from "../../hooks/use-world-library";
import { filterWorlds } from "../../services/world-scan";
import { ImportModal } from "../import/ImportModal";
import { ProjectGrid } from "./ProjectGrid";
import { StartRail } from "./StartRail";
import "./start.css";

/** How many of the most recently opened projects the rail carries. */
const RAIL_RECENT_COUNT = 3;

/**
 * The folder's own name, for listing the projects found inside a chosen folder.
 *
 * The folder name rather than the real one from `project.json`: reading every
 * candidate's project file to label three buttons is three more disk round
 * trips at the one moment she is waiting on a click, and a project's folder is
 * nearly always named after it. The full path is on the row and in the tooltip
 * either way.
 */
function folderNameOf(path: string): string {
  const segments = path.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

export function StartScreen() {
  const { worlds, isScanning, scannedAt } = useWorldLibrary();
  const { currentVersion } = useUpdates();
  const actions = useStartActions();

  const [query, setQuery] = useState("");
  const [isNaming, setIsNaming] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);

  const shown = filterWorlds(worlds, query);
  // Only ones she has actually opened, newest first. A project found by the
  // scan and never opened has no business in a list called "recently opened",
  // however recently its file changed.
  const recent = [...worlds]
    .filter((world) => world.lastOpenedAt !== null)
    .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
    .slice(0, RAIL_RECENT_COUNT);

  return (
    <main className="start">
      <div className="start-main">
        <header className="start-head">
          <div className="start-brand">
            Anamnesis
            {currentVersion && <small>{currentVersion}</small>}
          </div>

          {!isNaming ? (
            <button
              type="button"
              className="ui-btn ui-btn-lg ui-btn-primary start-new"
              onClick={() => setIsNaming(true)}
              disabled={actions.isBusy}
            >
              New Project
            </button>
          ) : (
            <form
              className="start-new-form"
              onSubmit={(event) => {
                event.preventDefault();
                void actions.createProject(newProjectName);
              }}
            >
              <input
                type="text"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="Project name"
                aria-label="Project name"
                autoFocus
                disabled={actions.isBusy}
              />
              <button type="submit" className="ui-btn ui-btn-primary" disabled={actions.isBusy}>
                Create
              </button>
              <button
                type="button"
                className="ui-btn"
                onClick={() => {
                  setIsNaming(false);
                  setNewProjectName("");
                  actions.dismissError();
                }}
                disabled={actions.isBusy}
              >
                Cancel
              </button>
            </form>
          )}

          <div className="start-tools">
            <input
              type="search"
              className="start-filter"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter…"
              aria-label="Filter projects"
            />
          </div>
        </header>

        <ProjectGrid
          projects={shown}
          isScanning={isScanning}
          isFiltered={query.trim().length > 0}
          now={scannedAt}
          disabled={actions.isBusy}
          onOpen={(project) => void actions.openListed(project.path, project.name)}
        />

        {actions.choices && (
          <div className="start-choices">
            <h2 className="start-title">That folder holds more than one project</h2>
            <ul>
              {actions.choices.map((path) => (
                <li key={path}>
                  <button
                    type="button"
                    onClick={() => void actions.openFound(path)}
                    disabled={actions.isBusy}
                    title={path}
                  >
                    {folderNameOf(path)}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="ui-link" onClick={actions.dismissChoices}>
              Never mind
            </button>
          </div>
        )}

        {actions.error && <p className="start-error">{actions.error}</p>}
      </div>

      <StartRail
        recent={recent}
        now={scannedAt}
        disabled={actions.isBusy}
        onOpen={(project) => void actions.openListed(project.path, project.name)}
        onOpenFolder={() => void actions.pickFolderToOpen()}
        onImport={() => setIsImportOpen(true)}
      />

      {isImportOpen && <ImportModal onClose={() => setIsImportOpen(false)} />}
    </main>
  );
}
