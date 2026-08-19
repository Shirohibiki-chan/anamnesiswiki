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
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
  //
  // The tile can be unmeasured too — see `useMeasuredPagedList`, where its size
  // is read off a real tile rather than declared. Same answer, and for the same
  // reason: a page of one tile while the first one is measured would be a
  // visible flicker, and it would measure a tile laid out on a grid of one.
  const measured = size.width > 0 && size.height > 0 && tile.minWidth > 0 && tile.height > 0;
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

/**
 * The same thing for a grid whose tile size the CSS decides.
 *
 * The projects grid can declare its tile because it has one: a cover is 190 by
 * 118 and `constants/layout.ts` says so in the same numbers the stylesheet lays
 * it out with. Neither picture grid works that way. Both are a counted number
 * of columns across whatever width they are given, both make the thumbnail a
 * square of that column, and both put a caption under it that grows with the
 * reader's text size. Writing those numbers down in TypeScript would mean
 * writing down a tile that is only correct in one panel at one text size.
 *
 * So it measures one instead. `tileRef` goes on the first tile in the grid; its
 * border box is what a tile actually occupies, which is the number the
 * arithmetic wants and the number no constant can honestly hold.
 *
 * The first frame renders the whole list rather than a page — see the note on
 * `measured` above. It has to: there is no tile to measure until something has
 * been laid out, and laying out a page of one would measure a tile from a grid
 * that has one item in it.
 */
export function useMeasuredPagedList<T, E extends HTMLElement = HTMLDivElement, Tile extends HTMLElement = HTMLLIElement>(
  items: readonly T[],
  /** The grid's `gap`, in pixels — the one number the CSS keeps to itself. */
  gap: number,
): PagedList<T, E> & { tileRef: RefObject<Tile | null> } {
  const [tileRef, tile] = useBoxSize<Tile>();
  const paged = usePagedList<T, E>(items, { minWidth: tile.width, height: tile.height, gap });
  return { ...paged, tileRef };
}

/**
 * An element's border box, to the fraction of a pixel.
 *
 * Not `useElementSize`, which reports the content box — right for the area a
 * grid gets to fill, wrong for a tile, whose padding and border take up room
 * on the row like everything else. Under-measuring a tile is the failure that
 * shows: it fits one more per row than exists, so the page overflows and the
 * bottom row is cut in half by the clip.
 */
function useBoxSize<T extends HTMLElement>(): [RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // No dependency array on purpose: the tile being watched is the *first* one
  // in the grid, and which element that is changes as pages turn. Re-attaching
  // each render is what keeps the observer pointed at whatever is there now.
  // Cheap, because the callback compares before it sets and React bails out of
  // a render when the size has not moved.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const box = el.getBoundingClientRect();
      setSize((current) => {
        // Unrounded. A grid of counted columns divides its row into four
        // fractional widths, and rounding one of those up is enough to make
        // four of them look like more than a row holds — see `EXACTLY` in
        // services/pagination.ts, which absorbs the other half of this.
        const { width, height } = box;
        return current.width === width && current.height === height ? current : { width, height };
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  });

  return [ref, size];
}
