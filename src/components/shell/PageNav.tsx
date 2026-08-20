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
//
// **The counter is where the jump controls live, and the dots deliberately
// have none.** Her ask, 2026-08-20: a way to the very front, to the very back,
// and to a page she names. All three are already true of a row of dots — every
// page in it is one click away, including the first and the last — so putting
// two more arrows and a text box beside eight dots would be furniture for
// something the dots already do. Past the dots there is no way to leap at all,
// which is exactly where this belongs.
import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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
      {!showDots && (
        <button
          type="button"
          className="ui-page-arrow"
          aria-label="First page"
          title="First page"
          disabled={page === 0}
          onClick={() => goTo(0)}
        >
          <ChevronsLeft size={17} />
        </button>
      )}

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
        <PageJump page={page} pages={pages} goTo={goTo} />
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

      {!showDots && (
        <button
          type="button"
          className="ui-page-arrow"
          aria-label="Last page"
          title="Last page"
          disabled={page === pages - 1}
          onClick={() => goTo(pages - 1)}
        >
          <ChevronsRight size={17} />
        </button>
      )}
    </nav>
  );
}

/**
 * "4 / 30", where the 4 is a box she can type in.
 *
 * **A real text box rather than a number she clicks to edit.** Click-to-edit
 * has to be discovered, and the whole reason this exists is that thirty pages
 * of pictures had no way through them but the arrows. A box that looks like a
 * box says what it is without anyone explaining it.
 *
 * `type="text"` with a numeric keypad hint, not `type="number"`: the spinner
 * arrows are a second, tinier pair of the buttons already either side of this,
 * and at this size they'd be the two smallest hit targets on the screen.
 */
function PageJump({ page, pages, goTo }: { page: number; pages: number; goTo: (page: number) => void }) {
  const [draft, setDraft] = useState(() => String(page + 1));
  const [shownPage, setShownPage] = useState(page);

  // The number belongs to the page, not to the box. An arrow, a resized
  // window or a re-sorted grid all move the page underneath it, and a box
  // still showing what she typed last would be lying about where she is.
  //
  // Adjusted during the render that brings the new page rather than in an
  // effect — React's own answer for state that follows a prop. An effect would
  // paint the stale number first and correct it after, and it would take the
  // focus out of the box on the way past.
  if (shownPage !== page) {
    setShownPage(page);
    setDraft(String(page + 1));
  }

  function commit() {
    const wanted = Number.parseInt(draft, 10);
    // Anything that isn't a number puts the box back rather than arguing with
    // her about it, and a number past the end lands on the end — page 90 of 30
    // means "the back", which is where the button beside it goes too.
    if (Number.isNaN(wanted)) {
      setDraft(String(page + 1));
      return;
    }
    const clamped = Math.min(Math.max(wanted, 1), pages);
    setDraft(String(clamped));
    goTo(clamped - 1);
  }

  return (
    <form
      className="ui-page-jump"
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      <input
        type="text"
        inputMode="numeric"
        className="ui-page-input"
        value={draft}
        // The whole sentence, because the box shows only half of it and this
        // control can sit in a dialog where "4" on its own says nothing.
        aria-label={`Page ${page + 1} of ${pages}. Type a page number and press Enter.`}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
        onFocus={(event) => event.currentTarget.select()}
        // Committed on the way out as well as on Enter: she typed a number
        // meaning to go there, and clicking off it is not a change of mind.
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          // The picker this can sit inside closes on Escape, and putting a
          // mistyped number back is the nearer of the two meanings here.
          event.stopPropagation();
          setDraft(String(page + 1));
          event.currentTarget.blur();
        }}
      />
      {/* `aria-live` on the total rather than the box: the box announces itself
          when it has focus, and this is what carries the change when an arrow
          moved the page instead. */}
      <span className="ui-page-total" aria-live="polite">
        / {pages}
      </span>
    </form>
  );
}
