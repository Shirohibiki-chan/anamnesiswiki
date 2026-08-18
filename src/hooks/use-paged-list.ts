// Turns a long list into what the reader asked for: one page at a time, or all
// of it in one scroll. The switch is in Settings → Lists, and every grid long
// enough to need an answer reads it from here rather than deciding for itself.
//
// **The page size comes from the window, not from a number.** A fixed count is
// wrong at both ends — more than fits makes the page itself scroll, which is
// what pages are for avoiding, and fewer pads a wide window with empty rows.
//
// **What's remembered is the item, not the page number.** Page three means a
// different set of projects at every window size, so a stored page walks the
// grid somewhere else the moment the window is dragged. Storing the first item
// on screen and asking which page holds it now keeps that project in front of
// her instead.
import { useCallback, useMemo, useState, type RefObject } from "react";
import { clampPage, fitPerPage, pageContaining, pageCount, pageOf } from "../services/pagination";
import { useElementSize } from "./use-element-size";
import { useListPaging } from "./use-preferences";

export type PagedList<T, E extends HTMLElement> = {
  /** Goes on the element whose size decides how much fits. */
  ref: RefObject<E | null>;
  /** What to render right now — one page of it, or all of it. */
  visible: T[];
  /** False when the whole list is on screen, which is what the page controls key off. */
  isPaged: boolean;
  page: number;
  pages: number;
  goTo: (page: number) => void;
};

export function usePagedList<T, E extends HTMLElement = HTMLDivElement>(
  items: readonly T[],
  tile: { minWidth: number; height: number; gap: number },
): PagedList<T, E> {
  const [ref, size] = useElementSize<E>();
  const paging = useListPaging();
  // The *item* she is looking at, not the page it happens to be on. See above.
  const [anchor, setAnchor] = useState(0);

  const wantsPages = paging === "pages";
  // ResizeObserver reports nothing until the grid has been laid out once. One
  // page of everything is the right answer for that frame: the area clips what
  // does not fit, so nothing flashes, and the real size arrives immediately
  // after.
  const measured = size.width > 0 && size.height > 0;
  const perPage = wantsPages && measured ? fitPerPage(size, tile) : Math.max(items.length, 1);

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

  return { ref, visible, isPaged: wantsPages && pages > 1, page, pages, goTo };
}
