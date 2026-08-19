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
 * How many tiles fit in the space there is.
 *
 * A page size that adapts is the one that keeps a page a *page*: a fixed
 * number is either more than fits, so the page itself scrolls and we're back
 * to the thing pages exist to avoid, or fewer, so a wide window pads the grid
 * with empty rows. Filling the area means the last row is always a full row
 * and the next page is always exactly one screen away.
 *
 * Geometry only, in pixels the caller measured. Nothing here reads the DOM,
 * which is what makes the awkward cases — a window too short for one row, a
 * grid measured before it has been laid out — testable rather than something
 * you find by resizing the app.
 */
export function fitPerPage(
  area: { width: number; height: number },
  tile: { minWidth: number; height: number; gap: number },
): number {
  const across = fitAlong(area.width, tile.minWidth, tile.gap);
  const down = fitAlong(area.height, tile.height, tile.gap);
  return across * down;
}

/** Half a pixel of slack, in pixels. See `fitAlong`. */
const EXACTLY = 0.5;

/**
 * Never zero. A window shorter than one row still has to show something, and a
 * page of one tile she has to scroll past is a better answer than a page of
 * none, which would render an empty grid over a list that isn't empty.
 */
function fitAlong(space: number, size: number, gap: number): number {
  if (!Number.isFinite(space) || !Number.isFinite(size) || size <= 0) return 1;
  // The gap sits *between* tiles, so n tiles carry n-1 gaps. Adding one gap to
  // both sides of the division is the whole correction.
  //
  // `EXACTLY` is what stops a grid of counted columns losing one. A picture
  // grid is four columns of whatever a quarter of the row comes to, so the
  // division lands *on* an integer by construction — and a tile measured a
  // fraction over, or a division that comes back 3.9999999999, floors to three
  // and drops a whole column. Measured happening: a 462px row of four 109.5px
  // tiles paged as three.
  //
  // Half a pixel, in pixels rather than as a share of a tile, because the
  // amount of slack that is safe is a property of the screen and not of how
  // big the tiles happen to be. A tile a whole pixel short of fitting still
  // does not fit.
  return Math.max(1, Math.floor((space + gap + EXACTLY) / (size + gap)));
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
