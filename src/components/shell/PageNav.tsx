// The arrows under a grid that comes in pages — the projects on the start
// screen, the pictures in the Assets tab, the pictures in the picker.
//
// It lived inside `ProjectGrid` until a second grid needed it, which is the
// point at which two copies of a control start drifting apart. Nothing here is
// specific to what is being paged: it takes the numbers `usePagedList` hands
// back and calls `goTo`.
//
// **A component rather than another `ui-` class**, which controls.css is
// otherwise careful not to do — because this one isn't a look. It is markup
// with keyboard-reachable buttons in it, and the surfaces that use it would
// each be writing the same eleven elements to get the class on.
//
// **The dots turn into a counter when there are too many of them.** A dot is a
// 26px target and eight of them is wider than the sidebar; past that, and past
// the point where anyone would count them, "4 / 30" is both narrower and the
// more useful sentence. See MAX_PAGE_DOTS.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MAX_PAGE_DOTS } from "../../constants/layout";

type PageNavProps = {
  /** Zero-based, the way `usePagedList` reports it. */
  page: number;
  pages: number;
  goTo: (page: number) => void;
  /** Names the control for a screen reader: "Pages of projects". */
  label: string;
  /** False where a row of dots has nowhere to fit — the 180px sidebar. */
  dots?: boolean;
};

export function PageNav({ page, pages, goTo, label, dots = true }: PageNavProps) {
  const showDots = dots && pages <= MAX_PAGE_DOTS;

  return (
    <nav className="ui-pages" aria-label={label}>
      <button
        type="button"
        className="ui-page-arrow"
        aria-label="Previous page"
        disabled={page === 0}
        onClick={() => goTo(page - 1)}
      >
        <ChevronLeft size={17} />
      </button>

      {showDots ? (
        <span className="ui-page-dots">
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              className="ui-page-dot"
              aria-label={`Page ${index + 1} of ${pages}`}
              aria-current={index === page}
              onClick={() => goTo(index)}
            />
          ))}
        </span>
      ) : (
        // Not a button: every page is still reachable from the arrows, and a
        // row of thirty dots was the thing being avoided. `aria-live` so the
        // number is announced when an arrow moves it rather than only when
        // focus happens to land here.
        <span className="ui-page-count" aria-live="polite">
          {page + 1} / {pages}
        </span>
      )}

      <button
        type="button"
        className="ui-page-arrow"
        aria-label="Next page"
        disabled={page === pages - 1}
        onClick={() => goTo(page + 1)}
      >
        <ChevronRight size={17} />
      </button>
    </nav>
  );
}
