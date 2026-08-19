// One project, as a cover or as a row — the same component either way, because
// they carry the same four facts and only the layout differs. Which one is
// drawn is the `data-view` on the grid around it, so switching views is a class
// change rather than a different tree of elements.
//
// The cover is a generated gradient until covers you set yourself exist. It has
// no label bar: the picture fades into the dark under the name, so a project
// wearing a real photograph later won't be wearing a black stripe with it.
import { coverFor, coverGradient } from "../../services/project-covers";
import { timeAgo } from "../../services/relative-time";
import { locationOf, type ListedWorld } from "../../services/world-scan";

type ProjectTileProps = {
  project: ListedWorld;
  /** One timestamp for the whole grid, so forty tiles can't disagree about what "now" is. */
  now: number;
  disabled: boolean;
  onOpen: () => void;
};

export function ProjectTile({ project, now, disabled, onOpen }: ProjectTileProps) {
  const when = timeAgo(project.activeAt || null, now);
  // Rendered in both views and hidden in one, rather than branched on: which
  // view is drawn is a class on the grid, and a component that reads it would
  // be the first thing here that has to know.
  const where = locationOf(project.path);

  return (
    <button
      type="button"
      className="project-tile"
      onClick={onOpen}
      disabled={disabled}
      // The full path is worth having and not worth three wrapped lines on
      // every tile.
      title={project.path}
    >
      <span className="project-tile-cover" style={{ backgroundImage: coverGradient(coverFor(project)) }} />
      {project.isOutsideProjectsFolder && (
        <span className="project-tile-flag" title="Not in your projects folder">
          Elsewhere
        </span>
      )}
      <span className="project-tile-cap">
        <b>{project.name}</b>
        {/* Two spans and not one string: the head is allowed to be clipped and
            the tail is not, which is what keeps a narrow row saying which
            folder this is rather than trailing off partway through the word
            every project in that folder shares. */}
        {where.tail && (
          <span className="project-tile-where">
            <span>{where.head}</span>
            <b>{where.tail}</b>
          </span>
        )}
        {when && <em>{when}</em>}
      </span>
    </button>
  );
}
