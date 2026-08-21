// Turns a long list into what the reader asked for: one page at a time, or all
// of it in one scroll. Both answers are in Settings → Lists, and every grid
// long enough to need one reads it from here rather than deciding for itself.
//
// **A page is a count she picked, and a page may scroll.** It used to be
// "however many fit the window", which made her window hold eight projects —
// and the reasoning behind that (a page which scrolls is back to the thing
// pages exist to avoid) confused two different requirements. "No infinite
// scroll" and "no scrolling at all" are not the same thing, and only the first
// one was ever asked for. See `LIST_PAGE_SIZES` in `preferences-service.ts`.
//
// Fitting is also what made this hook complicated: it had to measure the area,
// and for the picture grids it had to measure a *tile* too, because a picture
// tile is a share of a column rather than a fixed size. A count needs neither,
// so both are gone along with `fitPerPage` — the grids now say what they are
// showing and nothing has to agree with the stylesheet about pixels.
//
// **What's remembered is the item, not the page number.** Kept from the
// measured version, and still right: the page size can change under her — she
// can change it — and a stored page number would then mean a different set of
// projects. Storing the first item on screen and asking which page holds it
// now keeps that project in front of her instead.
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { clampPage, pageContaining, pageCount, pageOf } from "../services/pagination";
import { useListPageSize, useListPaging } from "./use-preferences";

export type PagedList<T, E extends HTMLElement> = {
  /**
   * Goes on the element that scrolls, so turning the page can put her back at
   * the top of it. Nothing is measured through it; the area's size stopped
   * mattering when a page stopped being however much fits in one.
   */
  ref: RefObject<E | null>;
  /** What to render right now — one page of it, or all of it. */
  visible: T[];
  /** False when the whole list is on screen, which is what the page controls key off. */
  isPaged: boolean;
  page: number;
  pages: number;
  goTo: (page: number) => void;
};

export function usePagedList<T, E extends HTMLElement = HTMLDivElement>(items: readonly T[]): PagedList<T, E> {
  const ref = useRef<E | null>(null);
  const paging = useListPaging();
  const pageSize = useListPageSize();
  // The *item* she is looking at, not the page it happens to be on. See above.
  const [anchor, setAnchor] = useState(0);

  const wantsPages = paging === "pages";
  const perPage = wantsPages ? pageSize : Math.max(items.length, 1);

  const page = clampPage(pageContaining(anchor, perPage), items.length, perPage);
  const pages = pageCount(items.length, perPage);

  const visible = useMemo(
    () => (wantsPages ? pageOf(items, perPage, page) : [...items]),
    [wantsPages, items, perPage, page],
  );

  const goTo = useCallback(
    (next: number) => setAnchor(clampPage(next, items.length, perPage) * perPage),
    [items.length, perPage],
  );

  // **Back to the top of the page whenever the page changes**, which only
  // became a thing that can be wrong when a page stopped being exactly what
  // fits: scrolled to the bottom of page one, "next page" used to be a
  // guaranteed no-op on the scroll position and is now a jump into the middle
  // of page two. Measured doing exactly that before this existed.
  //
  // On `page` rather than inside `goTo`, so the other way it changes is
  // covered too — typing in a filter box can clamp her from page five to page
  // one, and landing there halfway down is the same fault with a different
  // cause.
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [page]);

  return { ref, visible, isPaged: wantsPages && pages > 1, page, pages, goTo };
}
