// The pinned projects, across the top of the start screen.
//
// This is the one thing on the screen that isn't in a box: the picture bleeds
// off the top with nothing containing it, its border runs up the sides and
// fades out with it, and the only hard edge it has is a coloured rule under the
// name. Everything else here sits in a box, and this deliberately doesn't.
//
// **Four to a page, and the page size is a constant rather than a measurement.**
// Every other grid on this screen measures its window and fits what it can;
// this one doesn't, because a card here is a fraction of the row rather than a
// fixed width — four across at any width — so there is nothing to measure. The
// pages are real pages either way: whole cards, a short last page rather than a
// repeated one, and dots that mean what they say.
//
// Its pagination is not the pages-or-scroll preference. That switch governs the
// grid below; a scrolling row can't land on a page boundary, so it was never on
// offer here.
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { PINS_PER_PAGE } from "../../constants/layout";
import { clampPage, pageCount } from "../../services/pagination";
import type { ListedWorld } from "../../services/world-scan";
import { PinnedCard } from "./PinnedCard";

type PinnedRowProps = {
  pinned: ListedWorld[];
  /** For the count beside the heading — "3 of 12". */
  total: number;
  now: number;
  disabled: boolean;
  onOpen: (project: ListedWorld) => void;
  onManage: () => void;
};

export function PinnedRow({ pinned, total, now, disabled, onOpen, onManage }: PinnedRowProps) {
  // The dashed tile rides at the end of the last page rather than living
  // outside the pages, so it occupies a card's worth of a page and the page
  // that holds it is one card shorter. Counting it here is what keeps that
  // true without every page having to know where it sits.
  const cards = pinned.length + 1;
  const pages = pageCount(cards, PINS_PER_PAGE);
  const [page, setPage] = useState(0);

  // Unpinning the last project on the last page leaves you on a page that no
  // longer exists, so the page in use is clamped on the way out rather than
  // stored clamped. Deriving it covers every route into that — the manage
  // window, a drive going away mid-session — without an effect racing the
  // render to correct state it can already see is wrong.
  const at = clampPage(page, cards, PINS_PER_PAGE);
  // Sliced by hand rather than with `pageOf`, which clamps the page against
  // the items it was handed. This row has one card more than it has projects,
  // so its last page can be a page `pinned` does not have — four pinned
  // projects fill page one and leave the dashed tile alone on page two — and
  // `pageOf` would answer that by handing back page one all over again.
  const visible = pinned.slice(at * PINS_PER_PAGE, (at + 1) * PINS_PER_PAGE);
  const showAddHere = at === pages - 1;

  return (
    <section className="start-pinned">
      <p className="start-label">
        <span className="start-title">Pinned</span>
        <span className="start-count">
          {pinned.length} of {total}
        </span>
        <span className="start-label-right">
          <button type="button" className="start-pill" onClick={onManage}>
            Manage pins
          </button>
        </span>
      </p>

      <div className="start-carousel">
        {/* Hidden rather than disabled at the ends. A dimmed chevron sitting on
            a glow over the artwork is a smudge on the picture; there is nothing
            to grey out here the way there is under a grid. */}
        {at > 0 && (
          <button
            type="button"
            className="start-carousel-nav start-carousel-prev"
            aria-label="Previous page of pinned projects"
            onClick={() => setPage(at - 1)}
          >
            <ChevronLeft size={19} />
          </button>
        )}
        {at < pages - 1 && (
          <button
            type="button"
            className="start-carousel-nav start-carousel-next"
            aria-label="Next page of pinned projects"
            onClick={() => setPage(at + 1)}
          >
            <ChevronRight size={19} />
          </button>
        )}

        <div className="start-carousel-row">
          {visible.map((project) => (
            <PinnedCard
              key={project.path}
              project={project}
              now={now}
              disabled={disabled}
              onOpen={() => onOpen(project)}
            />
          ))}

          {/* Permanent, and that is the point: a row that only appears once
              something is in it is a feature you have to already know about. */}
          {showAddHere && (
            <button type="button" className="start-addpin" onClick={onManage}>
              <Plus size={18} aria-hidden />
              {pinned.length === 0 ? "Pin a project" : "Pin another"}
            </button>
          )}
        </div>
      </div>

      {pages > 1 && (
        <div className="start-carousel-dots">
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              className="start-carousel-dot"
              aria-label={`Page ${index + 1} of pinned projects`}
              aria-current={index === at}
              onClick={() => setPage(index)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
