// Every project the app can find, as covers or as rows, a page at a time or in
// one scroll.
//
// The measured element is the area the tiles sit in, not the page — that is
// what makes the page size the honest one. It clips rather than scrolls while
// paged, so a page is exactly what fits and the arithmetic in `usePagedList`
// can't be contradicted by a scrollbar appearing.
import { LayoutGrid, Rows3 } from "lucide-react";
import {
  PROJECT_ROW_HEIGHT,
  PROJECT_ROW_MIN_WIDTH,
  PROJECT_TILE_GAP,
  PROJECT_TILE_HEIGHT,
  PROJECT_TILE_MIN_WIDTH,
} from "../../constants/layout";
import { usePagedList } from "../../hooks/use-paged-list";
import { useProjectSort, useProjectView, usePreferenceActions } from "../../hooks/use-preferences";
import { sortWorlds, type ListedWorld } from "../../services/world-scan";
import { PageNav } from "../shell/PageNav";
import { ProjectTile } from "./ProjectTile";
import { SortPill } from "./SortPill";

type ProjectGridProps = {
  projects: ListedWorld[];
  /** True while the first scan is still running, so an empty list isn't reported as none. */
  isScanning: boolean;
  /** Whether a filter is on, which changes what "nothing here" means. */
  isFiltered: boolean;
  /** One timestamp for the whole grid — see useWorldLibrary's `scannedAt`. */
  now: number;
  disabled: boolean;
  onOpen: (project: ListedWorld) => void;
  onSetCover: (project: ListedWorld) => void;
  onRemoveCover: (project: ListedWorld) => void;
};

export function ProjectGrid({ projects, isScanning, isFiltered, now, disabled, onOpen, onSetCover, onRemoveCover }: ProjectGridProps) {
  const view = useProjectView();
  const sort = useProjectSort();
  const { setProjectView, setProjectSort } = usePreferenceActions();

  // Sorted here rather than where the list is built, because the order is a
  // question about this screen and the answer lives in her preferences — the
  // list itself is the same list however it is read. Filtering happens first,
  // upstream, and the two commute: sorting a filtered list and filtering a
  // sorted one give the same page.
  const ordered = sortWorlds(projects, sort);

  // A row is shorter than a cover, so the same window holds more of them —
  // which is the reason the list view exists and the reason the page size has
  // to be told which one is on screen. A row's width is the whole area, and a
  // minimum wider than any window is how you say that in the same arithmetic:
  // one column, however wide the window gets, no special case in the service.
  const tile =
    view === "grid"
      ? { minWidth: PROJECT_TILE_MIN_WIDTH, height: PROJECT_TILE_HEIGHT, gap: PROJECT_TILE_GAP }
      : { minWidth: PROJECT_ROW_MIN_WIDTH, height: PROJECT_ROW_HEIGHT, gap: PROJECT_TILE_GAP };

  const { ref, visible, isPaged, page, pages, goTo } = usePagedList(ordered, tile);

  return (
    <section className="start-all">
      <p className="start-label">
        <span className="start-title">All Projects</span>
        {!isScanning && <span className="start-count">{projects.length}</span>}
        <span className="start-label-right">
          <SortPill
            value={sort}
            onChange={(next) => {
              setProjectSort(next);
              // Back to the first page. The page count has not changed, so
              // page three is still a valid page — of an entirely different
              // set of projects. Re-sorting is asking to look again, and
              // looking again starts at the start.
              goTo(0);
            }}
          />
          <span className="start-views" role="group" aria-label="How to show projects">
            <button
              type="button"
              className="start-view"
              aria-label="Covers"
              aria-pressed={view === "grid"}
              onClick={() => setProjectView("grid")}
            >
              <LayoutGrid size={13} />
            </button>
            <button
              type="button"
              className="start-view"
              aria-label="Rows"
              aria-pressed={view === "list"}
              onClick={() => setProjectView("list")}
            >
              <Rows3 size={13} />
            </button>
          </span>
        </span>
      </p>

      <div className="start-area" data-view={view} data-paged={isPaged} ref={ref}>
        {isScanning ? (
          <p className="start-empty">Looking for your projects…</p>
        ) : projects.length === 0 ? (
          <p className="start-empty">
            {isFiltered ? "No project here matches that." : "No projects yet — make one, or open a folder you already have."}
          </p>
        ) : (
          <div className="start-tiles">
            {visible.map((project) => (
              <ProjectTile
                key={project.path}
                project={project}
                now={now}
                disabled={disabled}
                onOpen={() => onOpen(project)}
                onSetCover={() => onSetCover(project)}
                onRemoveCover={() => onRemoveCover(project)}
              />
            ))}
          </div>
        )}
      </div>

      {isPaged && <PageNav page={page} pages={pages} goTo={goTo} label="Pages of projects" />}
    </section>
  );
}
