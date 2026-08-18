// The rail down the right of the start screen: the three projects she was in
// most recently, the two ways to get a project into the library that are not
// the New Project button, and the cog.
//
// The second heading was "Start Something", which named a mood rather than an
// errand — neither thing under it starts anything from scratch. Both point the
// app at a project that already exists, one as a folder and one as a file, and
// both end with it in the list on the left. So: add.
//
// Recents live here rather than in the middle because they are a shortcut, not
// the library — the grid beside this already holds every project including
// these three, and giving them the middle of the screen was the old design's
// mistake in a nicer typeface.
import { coverFor, coverGradient } from "../../services/project-covers";
import { timeAgo } from "../../services/relative-time";
import type { ListedWorld } from "../../services/world-scan";
import { SettingsButton } from "../shell/SettingsButton";

type StartRailProps = {
  recent: ListedWorld[];
  now: number;
  disabled: boolean;
  onOpen: (project: ListedWorld) => void;
  onOpenFolder: () => void;
  onImport: () => void;
};

export function StartRail({ recent, now, disabled, onOpen, onOpenFolder, onImport }: StartRailProps) {
  return (
    <aside className="start-rail">
      {recent.length > 0 && (
        <div>
          <p className="start-label start-rail-label">
            <span className="start-title">Recently Opened</span>
          </p>
          {recent.map((project) => (
            <button
              key={project.path}
              type="button"
              className="start-line"
              onClick={() => onOpen(project)}
              disabled={disabled}
              title={project.path}
            >
              <span className="start-chip" style={{ backgroundImage: coverGradient(coverFor(project)) }} />
              <span className="start-line-text">
                <b>{project.name}</b>
                <em>{timeAgo(project.lastOpenedAt, now)}</em>
              </span>
            </button>
          ))}
        </div>
      )}

      <div>
        <p className="start-label start-rail-label">
          <span className="start-title">Add a Project</span>
        </p>
        <button type="button" className="start-item" onClick={onOpenFolder} disabled={disabled}>
          <b>A folder on disk</b>
          <span>Open a project you already have, wherever it lives.</span>
        </button>
        <button type="button" className="start-item" onClick={onImport} disabled={disabled}>
          <b>Import</b>
          <span>Bring in a project from a .lk file.</span>
        </button>
      </div>

      <div className="start-rail-foot">
        <SettingsButton />
      </div>
    </aside>
  );
}
