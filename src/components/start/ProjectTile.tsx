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
// **Two buttons, not one wrapping the tile.** A button can't nest inside a
// button, and the hover control for setting or removing a cover is a real
// action distinct from opening the project — so this is a `<div>` frame
// holding two sibling buttons: `.project-tile-open`, which carries every
// pixel `.project-tile` itself used to (border, background, focus, disabled),
// and a small corner button that's the whole reason the frame exists.
import { useRef, useState } from "react";
import { ImagePlus, MoreHorizontal, X } from "lucide-react";
import { useClickOutside } from "../../hooks/use-click-outside";
import { useProjectCoverUrl } from "../../hooks/use-project-cover";
import { coverFor, coverGradient } from "../../services/project-covers";
import { timeAgo } from "../../services/relative-time";
import { locationOf, type ListedWorld } from "../../services/world-scan";

type ProjectTileProps = {
  project: ListedWorld;
  /** One timestamp for the whole grid, so forty tiles can't disagree about what "now" is. */
  now: number;
  disabled: boolean;
  onOpen: () => void;
  onSetCover: () => void;
  onRemoveCover: () => void;
};

export function ProjectTile({ project, now, disabled, onOpen, onSetCover, onRemoveCover }: ProjectTileProps) {
  const when = timeAgo(project.activeAt || null, now);
  // Rendered in both views and hidden in one, rather than branched on: which
  // view is drawn is a class on the grid, and a component that reads it would
  // be the first thing here that has to know.
  const where = locationOf(project.path);
  const coverUrl = useProjectCoverUrl(project.path, project.coverImage);

  // List view's own way to set a cover — see `.project-tile-menu-btn` in
  // start.css for why this exists apart from the grid's corner button rather
  // than that button just becoming a menu everywhere: a list thumbnail is 44px,
  // too small to grow a hover button of its own, so the trigger lives beside
  // the row instead of on the picture.
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuBoundary = useRef<HTMLDivElement>(null);
  useClickOutside(menuBoundary, () => setIsMenuOpen(false), isMenuOpen);

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
          chip, too small for a hit target of its own; list view gets the
          same action through the `⋯` menu below instead. */}
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

      {/* List view only — see start.css. Same two actions the grid's corner
          button carries, reached through a menu instead of a hover button
          because there's no picture here big enough to put one on. */}
      <div className="project-tile-menu" ref={menuBoundary}>
        <button
          type="button"
          className="ui-icon-btn project-tile-menu-btn"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-label="Project actions"
          title="Project actions"
          disabled={disabled}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <MoreHorizontal size={14} />
        </button>
        {isMenuOpen && (
          <div className="project-tile-menu-list" role="menu">
            <button
              type="button"
              role="menuitem"
              className="project-tile-menu-item"
              onClick={() => {
                setIsMenuOpen(false);
                (coverUrl ? onRemoveCover : onSetCover)();
              }}
            >
              {coverUrl ? <X size={13} /> : <ImagePlus size={13} />}
              {coverUrl ? "Remove cover" : "Set cover"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
