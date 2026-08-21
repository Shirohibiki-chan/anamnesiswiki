// Real pages, for the start screen (Phase 27).
//
// Pure list arithmetic, kept out of the components because the awkward part
// isn't slicing an array — it's what the current page means when the list
// underneath it changes size, which is what a filter box does on every
// keystroke.

/**
 * How many pages a list of this size needs.
 *
 * An empty list is one page, not none. A screen with zero pages has nothing to
 * render its dots against and no page to be *on*, and every caller would need
 * to special-case it — where "one empty page" simply draws the empty state.
 */
export function pageCount(total: number, perPage: number): number {
  if (perPage < 1) return 1;
  return Math.max(1, Math.ceil(total / perPage));
}

/**
 * The page index that still exists after the list changed.
 *
 * This is the whole reason this file exists. Typing into the filter box on
 * page three of five leaves three pointing past the end, and a grid that
 * renders an empty page in that state looks broken — she typed and everything
 * vanished. Clamping lands her on the last page that has something on it.
 */
export function clampPage(index: number, total: number, perPage: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), pageCount(total, perPage) - 1);
}

/**
 * One page of items.
 *
 * **Whole items only, and a short last page.** A scroller can't land on a page
 * boundary, so its last page repeats cards you have already seen and its dots
 * lie about where you are — the reason this is pagination rather than a row
 * that slides. Four items over three-to-a-page is a page of three and a page
 * of one, never a page of three and a page of three that overlaps by two.
 */
export function pageOf<T>(items: readonly T[], perPage: number, index: number): T[] {
  if (perPage < 1) return [...items];
  const page = clampPage(index, items.length, perPage);
  const start = page * perPage;
  return items.slice(start, start + perPage);
}

/**
 * The page an item is on — which is how a resize stays where she was.
 *
 * The page size changes when the window does, so a stored *page number* means
 * a different set of projects at every window size, and dragging the corner
 * quietly walks the grid somewhere else. Remembering the first item on screen
 * and asking which page holds it now keeps that project on screen instead.
 */
export function pageContaining(itemIndex: number, perPage: number): number {
  if (perPage < 1 || !Number.isFinite(itemIndex)) return 0;
  return Math.max(0, Math.floor(itemIndex / perPage));
}

/**
 * How many cards fit across a row that divides itself into equal fractions.
 *
 * The other grids here lay a fixed-size tile onto a row and ask how many land;
 * this answers the opposite shape of question, for a row whose card is a
 * *share* of the width. Left to itself such a row has no natural column count,
 * so a fullscreen window stretches four cards into four letterboxed bands and
 * the narrowest window squeezes them taller than they are wide. Neither is a
 * size anybody chose.
 *
 * `target` is the width a card wants to be, not a width it will get: the count
 * is chosen so the cards land at or a little above it, and the leftover is
 * shared out rather than left at the end. `min` is a floor because two cards
 * beside each other still read as a row and one does not.
 */
export function fitAcross(width: number, target: number, gap: number, min: number): number {
  if (!Number.isFinite(width) || width <= 0 || target <= 0) return min;
  return Math.max(min, Math.floor((width + gap) / (target + gap)));
}
