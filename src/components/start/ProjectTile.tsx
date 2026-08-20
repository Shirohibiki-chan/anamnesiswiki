// One project, as a cover or as a row — the same component either way, because
// they carry the same four facts and only the layout differs. Which one is
// drawn is the `data-view` on the grid around it, so switching views is a class
// change rather than a different tree of elements.
//
// The cover is a generated gradient until she sets one herself, in `assets/`
// (Phase 27). It has no label bar: the picture fades into the dark under the
// name, so a project wearing a real photograph isn't wearing a black stripe
// with it.
//
// **Sibling buttons, not one wrapping the tile.** A button can't nest inside a
// button, and setting a cover or filing the project into a group are real
// actions distinct from opening it — so this is a `<div>` frame holding
// `.project-tile-open`, which carries every pixel `.project-tile` itself used
// to (border, background, focus, disabled), beside the controls that are the
// whole reason the frame exists.
import { ImagePlus, X } from "lucide-react";
import { useProjectCoverUrl } from "../../hooks/use-project-cover";
import { coverFor, coverGradient } from "../../services/project-covers";
import { timeAgo } from "../../services/relative-time";
import { locationOf, type ListedWorld } from "../../services/world-scan";
import { ProjectTileMenu, type ProjectLibraryActions } from "./ProjectTileMenu";

type ProjectTileProps = {
  project: ListedWorld;
  library: ProjectLibraryActions;
  /** One timestamp for the whole grid, so forty tiles can't disagree about what "now" is. */
  now: number;
  disabled: boolean;
  onOpen: () => void;
  onSetCover: () => void;
  onRemoveCover: () => void;
  fileManagerName: string;
  onShowInFolder: () => void;
  onDuplicate: (name: string) => void;
};

export function ProjectTile({
  project,
  library,
  now,
  disabled,
  onOpen,
  onSetCover,
  onRemoveCover,
  fileManagerName,
  onShowInFolder,
  onDuplicate,
}: ProjectTileProps) {
  const when = timeAgo(project.activeAt || null, now);
  // Rendered in both views and hidden in one, rather than branched on: which
  // view is drawn is a class on the grid, and a component that reads it would
  // be the first thing here that has to know.
  const where = locationOf(project.path);
  const coverUrl = useProjectCoverUrl(project.path, project.coverImage);

  return (
    <div className="project-tile" title={project.path}>
      <button type="button" className="project-tile-open" onClick={onOpen} disabled={disabled}>
        <span
          className="project-tile-cover"
          style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : coverGradient(coverFor(project)) }}
        />
        <span className="project-tile-cap">
          <b>{project.name}</b>
          {/* The flag and the path are the same fact, so they share a line. It
              used to sit in a corner of its own, which on a row meant holding a
              column open on every project for a word almost none of them say.

              Two spans for the path and not one string: the head is allowed to be
              clipped and the tail is not, which is what keeps a narrow row saying
              which folder this is rather than trailing off partway through the
              word every project in that folder shares. */}
          {(where.tail || project.isOutsideProjectsFolder) && (
            <span className="project-tile-where">
              {project.isOutsideProjectsFolder && (
                <i className="project-tile-flag" title="Not in your projects folder">
                  Elsewhere
                </i>
              )}
              <span>{where.head}</span>
              <b>{where.tail}</b>
            </span>
          )}
          {when && <em>{when}</em>}
        </span>
      </button>

      {/* Grid view only — see start.css. A list row's thumbnail is a 44px
          chip, too small for a hit target of its own; in list view the same
          action is reached through the `⋯` menu instead. */}
      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-lg project-tile-cover-btn"
        aria-label={coverUrl ? "Remove cover" : "Set cover"}
        title={coverUrl ? "Remove cover" : "Set cover"}
        disabled={disabled}
        onClick={coverUrl ? onRemoveCover : onSetCover}
      >
        {coverUrl ? <X size={13} /> : <ImagePlus size={13} />}
      </button>

      {/* Both views — see ProjectTileMenu.tsx. In list it is the only control
          on the row, since a 44px thumbnail has nowhere to put the button
          above; in grid it sits beside that button and carries everything
          that isn't the cover. */}
      <ProjectTileMenu
        project={project}
        library={library}
        disabled={disabled}
        coverUrl={coverUrl}
        onSetCover={onSetCover}
        onRemoveCover={onRemoveCover}
        fileManagerName={fileManagerName}
        onShowInFolder={onShowInFolder}
        onDuplicate={onDuplicate}
      />
    </div>
  );
}
