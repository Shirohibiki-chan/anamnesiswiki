// The rectangle a project wears on the start screen: its own picture once she
// has set one, and the generated gradient until then.
//
// **This exists because the decision was written out five times** — in the tall
// pin, the tile, the rail line, and twice inside the manage-pins dialog — each
// one repeating the same ternary and the same `useProjectCoverUrl` call. They
// never disagreed, but nothing stopped them: a change to how a cover is drawn
// (a fallback, a loading state, a second image source) had four files to find
// and no way to tell whether they had all been found.
//
// It takes the class name rather than owning one, because the four places size
// and mask this differently — a chip, a thumbnail, a tile cover and a masked
// artwork layer are the same picture in four shapes. What is shared is *which
// picture*, not how big it is.
import { useProjectCoverUrl } from "../../hooks/use-project-cover";
import { coverFor, coverGradient } from "../../services/project-covers";

type ProjectCoverArtProps = {
  project: { id: string | null; path: string; coverImage: string | null };
  /** The caller's own class — this component brings no styling of its own. */
  className: string;
};

export function ProjectCoverArt({ project, className }: ProjectCoverArtProps) {
  const coverUrl = useProjectCoverUrl(project.path, project.coverImage);

  return (
    <span
      className={className}
      style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : coverGradient(coverFor(project)) }}
    />
  );
}
