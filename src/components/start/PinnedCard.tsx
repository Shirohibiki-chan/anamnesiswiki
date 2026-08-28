// One pinned project, as a tall card with nothing containing it.
//
// Four layers, and each one is doing a job the others can't:
//
// - the artwork, masked so it fades out towards the top instead of ending;
// - an edge, masked identically, which is how the border runs up the sides and
//   disappears with the picture rather than drawing a lid across it;
// - a scrim under the caption, so a real photograph later can't take the name
//   with it;
// - a rule along the bottom in the project's own colours, which is the card's
//   one hard edge and the only thing marking where it stops.
import { coverFor } from "../../services/project-covers";
import { timeAgo } from "../../services/relative-time";
import type { ListedWorld } from "../../services/world-scan";
import { ProjectCoverArt } from "./ProjectCoverArt";

type PinnedCardProps = {
  project: ListedWorld;
  now: number;
  disabled: boolean;
  onOpen: () => void;
};

export function PinnedCard({ project, now, disabled, onOpen }: PinnedCardProps) {
  const cover = coverFor(project);
  const when = timeAgo(project.activeAt || null, now);

  return (
    <button type="button" className="start-pin" onClick={onOpen} disabled={disabled} title={project.path}>
      {/* The rule below always reads the generated palette, picture or not —
          it's a quiet accent line, not a claim about a photo's own colours,
          and extracting those is a different feature nobody's asked for. */}
      <ProjectCoverArt project={project} className="start-pin-art" />
      <span className="start-pin-edge" />
      <span className="start-pin-scrim" />
      {/* The two ends of the cover read left to right, so the rule is the same
          gradient turned flat — the card's colours said once more, quietly. */}
      <span className="start-pin-rule" style={{ backgroundImage: `linear-gradient(90deg, ${cover.from}, ${cover.to})` }} />
      {project.isOutsideProjectsFolder && (
        <span className="start-pin-flag" title="Not in your projects folder">
          Elsewhere
        </span>
      )}
      <span className="start-pin-cap">
        <b>{project.name}</b>
        {when && <em>{when}</em>}
      </span>
    </button>
  );
}
