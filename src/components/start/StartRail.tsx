// The rail down the right of the start screen: the three projects she was in
// most recently, the two ways to get a project into the library that are not
// the New Project button, what's new in the last few versions, and the cog.
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
//
// **New Releases sits last, deliberately quieter than Add a Project above
// it** (her call): patch notes matter less than the ways into the app, so
// this reuses the plain `start-line` row rather than the accent-bordered
// `start-item` treatment, the same distinction Recently Opened already draws.
import { coverFor, coverGradient } from "../../services/project-covers";
import { timeAgo } from "../../services/relative-time";
import type { ShownRelease } from "../../hooks/use-release-history";
import type { ListedWorld } from "../../services/world-scan";
import { SettingsButton } from "../shell/SettingsButton";

type StartRailProps = {
  recent: ListedWorld[];
  releases: ShownRelease[];
  now: number;
  disabled: boolean;
  onOpen: (project: ListedWorld) => void;
  onOpenFolder: () => void;
  onImport: () => void;
  /** Which version was clicked, so Settings can open on that one specifically. */
  onOpenReleases: (version: string) => void;
};

export function StartRail({
  recent,
  releases,
  now,
  disabled,
  onOpen,
  onOpenFolder,
  onImport,
  onOpenReleases,
}: StartRailProps) {
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

      {releases.length > 0 && (
        <div>
          <p className="start-label start-rail-label">
            <span className="start-title">New Releases</span>
          </p>
          {releases.map((release, index) => (
            <button
              key={release.version}
              type="button"
              className="start-line"
              onClick={() => onOpenReleases(release.version)}
              disabled={disabled}
            >
              <span className="start-line-text">
                <span className="start-release-line">
                  <b>{release.version}</b>
                  {/* Newest only — three unmarked version numbers read as a
                      list with no order, not as "here's what's new". Outside
                      the version's own ellipsis rather than inside it, so a
                      narrow rail clips the number before it ever reaches the
                      tag. */}
                  {index === 0 && <span className="start-release-new">New</span>}
                </span>
                {release.date && <em>{release.date}</em>}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="start-rail-foot">
        <SettingsButton />
      </div>
    </aside>
  );
}
