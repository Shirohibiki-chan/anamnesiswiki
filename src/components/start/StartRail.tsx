// The rail down the right of the start screen: the three projects she was in
// most recently, the three ways to get a project into the library that are not
// the New Project button, what's new in the last few versions, and the cog.
//
// The second heading was "Start Something", which named a mood rather than an
// errand. What every entry under it has in common is where it ends — with a
// project in the list on the left — rather than where it starts, and two of
// the three point the app at one that already exists. So: add.
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
import { FolderOpen } from "lucide-react";
import { describeFolderLocation } from "../../services/app-settings-service";
import { timeAgo } from "../../services/relative-time";
import type { ShownRelease } from "../../hooks/use-release-history";
import type { ListedWorld } from "../../services/world-scan";
import { SettingsButton } from "../shell/SettingsButton";
import { ProjectCoverArt } from "./ProjectCoverArt";

/**
 * One row. Its own component rather than the inline JSX `.map` used to
 * render, because `useProjectCoverUrl` is a hook — calling one from inside a
 * `.map` callback breaks the rule that hooks run at a component's own top
 * level, not inside a loop.
 */
function RecentRow({
  project,
  now,
  disabled,
  onOpen,
}: {
  project: ListedWorld;
  now: number;
  disabled: boolean;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="start-line" onClick={onOpen} disabled={disabled} title={project.path}>
      <ProjectCoverArt project={project} className="start-chip" />
      <span className="start-line-text">
        <b>{project.name}</b>
        {project.selectedName && <span className="start-line-page">{project.selectedName}</span>}
        <em>{timeAgo(project.lastOpenedAt, now)}</em>
      </span>
    </button>
  );
}

type StartRailProps = {
  recent: ListedWorld[];
  releases: ShownRelease[];
  now: number;
  disabled: boolean;
  onOpen: (project: ListedWorld) => void;
  onStartFromTemplate: () => void;
  onOpenFolder: () => void;
  onImport: () => void;
  /** Which version was clicked, so Settings can open on that one specifically. */
  onOpenReleases: (version: string) => void;
  /** Null until read off disk at startup — see StartScreen. */
  projectsDir: string | null;
  onOpenProjectsFolder: () => void;
};

export function StartRail({
  recent,
  releases,
  now,
  disabled,
  onOpen,
  onStartFromTemplate,
  onOpenFolder,
  onImport,
  onOpenReleases,
  projectsDir,
  onOpenProjectsFolder,
}: StartRailProps) {
  return (
    <aside className="start-rail">
      {recent.length > 0 && (
        <div>
          <p className="start-label start-rail-label">
            <span className="start-title">Recently Opened</span>
          </p>
          {recent.map((project) => (
            <RecentRow key={project.path} project={project} now={now} disabled={disabled} onOpen={() => onOpen(project)} />
          ))}
        </div>
      )}

      <div>
        <p className="start-label start-rail-label">
          <span className="start-title">Add a Project</span>
        </p>
        {/* First of the three, matching the order the section was designed in.
            It is also the only one that makes something out of nothing, which
            is what the heading says this section is for — the two below it
            bring in a project that already exists. */}
        <button type="button" className="start-item" onClick={onStartFromTemplate} disabled={disabled}>
          <b>Start from a template</b>
          <span>A folder setup, ready to build in. Yours, or one you were sent.</span>
        </button>
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
        {projectsDir && (
          <button
            type="button"
            className="start-line start-projects-folder"
            onClick={onOpenProjectsFolder}
            disabled={disabled}
            title={projectsDir}
          >
            <FolderOpen size={14} className="start-projects-folder-icon" />
            <span className="start-line-text">
              <b>{describeFolderLocation(projectsDir)}</b>
            </span>
          </button>
        )}
        <SettingsButton />
      </div>
    </aside>
  );
}
