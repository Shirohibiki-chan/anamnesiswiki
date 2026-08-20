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
//
// The rail drags on the shell's own handle rather than a second mechanism
// written for this screen. It is the same gesture on the same kind of edge, and
// the width is stored beside the shell's two — see `layout-service`.
import { useState } from "react";
import { useAppSettings } from "../../hooks/use-app-settings";
import { useDialogs } from "../../hooks/use-dialogs";
import { usePanelWidths, useRailWidthActions } from "../../hooks/use-panel-widths";
import { usePins } from "../../hooks/use-pins";
import { useProjectLibrary } from "../../hooks/use-project-library";
import { useFileManagerName } from "../../hooks/use-reveal";
import { useReleaseHistory } from "../../hooks/use-release-history";
import { useUpdates } from "../../hooks/use-updates";
import { useStartActions } from "../../hooks/use-start-actions";
import { useWorldLibrary } from "../../hooks/use-world-library";
import { scopeProjects, SCOPE_ALL, SCOPE_ARCHIVED, type LibraryScope } from "../../services/library-scope";
import { resolvePins, unpinned as unpinnedOf } from "../../services/pins";
import { filterWorlds } from "../../services/world-scan";
import { RAIL_MAX_WIDTH, RAIL_MIN_WIDTH } from "../../constants/layout";
import { ImportModal } from "../import/ImportModal";
import { ResizeHandle } from "../shell/ResizeHandle";
import { SettingsModal } from "../shell/SettingsModal";
import { ManagePinsDialog } from "./ManagePinsDialog";
import { PinnedRow } from "./PinnedRow";
import { ProjectFilters } from "./ProjectFilters";
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

/**
 * The library's heading, which names the chip that is on.
 *
 * A grid showing eleven of forty projects under a heading that says "All
 * Projects" reads as projects having gone missing. The heading is the one
 * place the screen can say "this is a shelf, not everything".
 */
function headingFor(scope: LibraryScope, groupName: string | undefined): string {
  if (scope === SCOPE_ARCHIVED) return "Archived";
  return groupName ?? "All Projects";
}

/**
 * What an empty grid says, which is three different things on this screen.
 *
 * The filter box answers first, because it is the one she is holding: a group
 * that looks empty while a query is on is not empty, and saying so would send
 * her to fix the wrong thing.
 */
function emptyMessageFor(scope: LibraryScope, query: string): string {
  if (query.trim().length > 0) return "No project here matches that.";
  if (scope === SCOPE_ARCHIVED) return "Nothing archived turned up — a project on a drive that isn't plugged in won't show here.";
  if (scope !== SCOPE_ALL) return "Nothing is in this group yet. Add a project to it from the ⋯ button on the project.";
  return "No projects yet — make one, or open a folder you already have.";
}

export function StartScreen() {
  const { worlds, heldElsewhere, isScanning, scannedAt, refreshWorlds } = useWorldLibrary();
  const { currentVersion } = useUpdates();
  const { releases } = useReleaseHistory();
  const { newProjectsDir } = useAppSettings();
  const actions = useStartActions();
  const { confirmDestructive } = useDialogs();
  const fileManagerName = useFileManagerName();
  const widths = usePanelWidths();
  const { setRailWidth, resetRailWidth } = useRailWidthActions();

  const [query, setQuery] = useState("");
  const [isNaming, setIsNaming] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isManagingPins, setIsManagingPins] = useState(false);
  // The version to open on, or null when the panel isn't open at all — one
  // piece of state rather than a boolean plus a version, so there's no way
  // for the two to say different things about whether it's open.
  const [openReleaseVersion, setOpenReleaseVersion] = useState<string | null>(null);

  const library = useProjectLibrary(worlds);

  const { pins, isLoaded: pinsLoaded, pin, unpin, reorder } = usePins(worlds);
  // Resolved against every project rather than against the filtered list: the
  // filter box is for finding one project in the grid, and a pinned row that
  // emptied itself as she typed would be answering a question she did not ask.
  // Minus anything archived: a project folded away has no business sitting in
  // the loudest row on the screen, and the pin itself is kept rather than
  // dropped, so bringing it back brings its place back with it.
  const pinned = resolvePins(pins, worlds).filter((project) => !library.isArchived(project));

  // Scope first, then the filter box. They commute, and this order is the one
  // that matches the sentence the screen makes: the chips say which shelf, the
  // box searches the shelf you are looking at.
  const scoped = scopeProjects(worlds, library.scope, { groups: library.groups, archived: library.archived });
  const shown = filterWorlds(scoped, query);
  const activeGroup = library.groups.find((group) => group.id === library.scope);
  // Every project by id, so a fork can be shown against the name of the one it
  // came from. Built from the whole library rather than from what the grid is
  // showing: a fork whose original sits in another group, or in the archive,
  // was still copied from it.
  const forkNames = new Map(worlds.filter((world) => world.id).map((world) => [world.id as string, world.name]));
  // Only ones she has actually opened, newest first. A project found by the
  // scan and never opened has no business in a list called "recently opened",
  // however recently its file changed.
  const recent = [...worlds]
    .filter((world) => world.lastOpenedAt !== null)
    .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
    .slice(0, RAIL_RECENT_COUNT);

  // Asked before the group goes, because a group is filing rather than
  // storage and the difference is worth saying out loud once: nothing in it is
  // deleted, and there is no undo on this screen to lean on if she reads it
  // the other way.
  async function confirmGroupDelete(id: string) {
    const group = library.groups.find((candidate) => candidate.id === id);
    if (!group) return;
    const ok = await confirmDestructive(
      `Delete the group "${group.name}"? The projects in it stay exactly where they are.`,
    );
    if (ok) library.deleteGroup(id);
  }

  return (
    <main className="start" style={{ "--rail-w": `${widths.rail}px` } as React.CSSProperties}>
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

        {/* Held back until the settings file has been read, so the row does
            not flash its empty state on every start. */}
        {pinsLoaded && library.isLoaded && !isScanning && (
          <PinnedRow
            pinned={pinned}
            total={worlds.length}
            now={scannedAt}
            disabled={actions.isBusy}
            onOpen={(project) => void actions.openListed(project.path, project.name)}
            onManage={() => setIsManagingPins(true)}
          />
        )}

        <ProjectGrid
          projects={shown}
          heading={headingFor(library.scope, activeGroup?.name)}
          emptyMessage={emptyMessageFor(library.scope, query)}
          filters={
            <ProjectFilters
              groups={library.groups}
              archivedCount={library.archived.length}
              scope={library.scope}
              onScope={library.setScope}
              onCreateGroup={library.createGroup}
              onRenameGroup={library.renameGroup}
              onDeleteGroup={(id) => void confirmGroupDelete(id)}
            />
          }
          library={{
            groups: library.groups,
            groupIdsOf: (project) => library.groupsOf(project).map((group) => group.id),
            isArchived: library.isArchived,
            onToggleGroup: (project, groupId) => library.toggleGroupMember(groupId, project),
            onCreateGroup: (project, name) => library.createGroup(name, project),
            onArchive: library.archive,
            onUnarchive: library.unarchive,
          }}
          isScanning={isScanning}
          now={scannedAt}
          disabled={actions.isBusy}
          onOpen={(project) => void actions.openListed(project.path, project.name)}
          onSetCover={(project) =>
            void actions.setProjectCover(project).then((changed) => {
              if (changed) void refreshWorlds();
            })
          }
          fileManagerName={fileManagerName}
          onShowInFolder={(project) => void actions.showProjectInFolder(project)}
          forkNames={forkNames}
          heldElsewhere={heldElsewhere}
          onDuplicate={(project, name) =>
            void actions.duplicateProject(project, name).then((made) => {
              if (made) void refreshWorlds();
            })
          }
          onRemoveCover={(project) =>
            void actions.removeProjectCover(project).then((changed) => {
              if (changed) void refreshWorlds();
            })
          }
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

      <ResizeHandle
        edge="rail"
        label="Rail width"
        width={widths.rail}
        min={RAIL_MIN_WIDTH}
        max={RAIL_MAX_WIDTH}
        onResize={setRailWidth}
        onReset={resetRailWidth}
      />

      <StartRail
        recent={recent}
        releases={releases}
        now={scannedAt}
        disabled={actions.isBusy}
        onOpen={(project) => void actions.openListed(project.path, project.name)}
        onOpenFolder={() => void actions.pickFolderToOpen()}
        onImport={() => setIsImportOpen(true)}
        onOpenReleases={setOpenReleaseVersion}
        projectsDir={newProjectsDir}
        onOpenProjectsFolder={() => void actions.openProjectsFolder()}
      />

      {isImportOpen && <ImportModal onClose={() => setIsImportOpen(false)} />}

      {/* Not routed through SettingsButton in the rail's foot: that one
          always opens to Theme, and a release row's job is to land on Patch
          Notes specifically, so this owns its own trigger and its own
          instance of the same dialog rather than teaching the cog a second
          opinion about where it opens. */}
      {openReleaseVersion !== null && (
        <SettingsModal
          initialTab="patch-notes"
          initialVersion={openReleaseVersion}
          onClose={() => setOpenReleaseVersion(null)}
        />
      )}

      {isManagingPins && (
        <ManagePinsDialog
          pinned={pinned}
          unpinned={unpinnedOf(pins, worlds)}
          now={scannedAt}
          onPin={pin}
          onUnpin={unpin}
          onReorder={reorder}
          onClose={() => setIsManagingPins(false)}
        />
      )}
    </main>
  );
}
