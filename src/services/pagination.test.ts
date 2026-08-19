import { describe, expect, it } from "vitest";
import { clampPage, fitPerPage, pageContaining, pageCount, pageOf } from "./pagination";

const ITEMS = ["a", "b", "c", "d", "e", "f", "g"];

describe("pageCount", () => {
  it("counts the pages a list needs", () => {
    expect(pageCount(7, 4)).toBe(2);
    expect(pageCount(8, 4)).toBe(2);
    expect(pageCount(9, 4)).toBe(3);
  });

  it("calls an empty list one page rather than none", () => {
    // Zero pages leaves nothing to be on and nothing to draw dots against, and
    // every caller having to special-case it is worse than one empty page.
    expect(pageCount(0, 4)).toBe(1);
  });
});

describe("pageOf", () => {
  it("returns whole items, with a short last page", () => {
    expect(pageOf(ITEMS, 4, 0)).toEqual(["a", "b", "c", "d"]);
    expect(pageOf(ITEMS, 4, 1)).toEqual(["e", "f", "g"]);
  });

  it("never repeats an item to fill the last page out", () => {
    // A sliding row does exactly this, which is what makes its dots lie.
    const seen = [...pageOf(ITEMS, 4, 0), ...pageOf(ITEMS, 4, 1)];
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toEqual(ITEMS);
  });

  it("gives the last page when asked for one past the end", () => {
    expect(pageOf(ITEMS, 4, 9)).toEqual(["e", "f", "g"]);
  });

  it("gives the first page when asked for a negative one", () => {
    expect(pageOf(ITEMS, 4, -3)).toEqual(["a", "b", "c", "d"]);
  });

  it("returns nothing for an empty list rather than throwing", () => {
    expect(pageOf([], 4, 0)).toEqual([]);
  });

  it("does not mutate the list it was handed", () => {
    const items = [...ITEMS];
    pageOf(items, 4, 1);
    expect(items).toEqual(ITEMS);
  });
});

describe("clampPage", () => {
  it("keeps a page that still exists", () => {
    expect(clampPage(1, 7, 4)).toBe(1);
  });

  it("pulls back to the last page when the list shrinks under it", () => {
    // The filter box, on every keystroke: she was on page 3 of 5, typed two
    // letters, and there is now one page. Without this the grid renders empty
    // and it looks like typing deleted her projects.
    expect(clampPage(2, 3, 4)).toBe(0);
  });

  it("lands on the one empty page when everything is filtered out", () => {
    expect(clampPage(4, 0, 4)).toBe(0);
  });

  it("refuses a negative or nonsense page", () => {
    expect(clampPage(-2, 7, 4)).toBe(0);
    expect(clampPage(Number.NaN, 7, 4)).toBe(0);
    expect(clampPage(1.7, 7, 4)).toBe(1);
  });
});

describe("fitPerPage", () => {
  // A tile 200 wide and 260 tall with 16 between them.
  const TILE = { minWidth: 200, height: 260, gap: 16 };

  it("fills the space it is given", () => {
    // 3 across: 200 + 16 + 200 + 16 + 200 = 632. 2 down: 260 + 16 + 260 = 536.
    expect(fitPerPage({ width: 660, height: 560 }, TILE)).toBe(6);
  });

  it("counts the gaps between tiles, not after the last one", () => {
    // Exactly three tiles and the two gaps between them, to the pixel — the
    // off-by-one that shows up as a permanently missing column.
    expect(fitPerPage({ width: 632, height: 260 }, TILE)).toBe(3);
    expect(fitPerPage({ width: 631, height: 260 }, TILE)).toBe(2);
  });

  it("keeps every column of a grid that counts its own columns", () => {
    // The picture grids divide the row into four, so the tile width is
    // whatever a quarter of it comes to and the fit lands exactly on 4. This
    // is the measured case: a 462px row, four 109.5px tiles, 8px gaps — which
    // floored to three columns and paged 53 pictures as eighteen pages of
    // three.
    expect(fitPerPage({ width: 462, height: 376 }, { minWidth: 109.5, height: 143.19, gap: 8 })).toBe(8);
  });

  it("does not round a tile that genuinely does not fit into one that does", () => {
    // The slack is half a pixel, so a tile a whole pixel short stays out.
    expect(fitPerPage({ width: 631, height: 260 }, TILE)).toBe(2);
    expect(fitPerPage({ width: 631.6, height: 260 }, TILE)).toBe(3);
  });

  it("grows the page when the window grows, which is the point", () => {
    const small = fitPerPage({ width: 660, height: 560 }, TILE);
    const large = fitPerPage({ width: 1400, height: 900 }, TILE);
    expect(large).toBeGreaterThan(small);
  });

  it("still shows a tile in a window too small for one", () => {
    // A page of nothing would render an empty grid over a list that isn't
    // empty. One tile she has to scroll past is the better failure.
    expect(fitPerPage({ width: 40, height: 40 }, TILE)).toBe(1);
  });

  it("survives being asked before the grid has been laid out", () => {
    // ResizeObserver reports 0 x 0 on the first frame.
    expect(fitPerPage({ width: 0, height: 0 }, TILE)).toBe(1);
    expect(fitPerPage({ width: Number.NaN, height: 560 }, TILE)).toBeGreaterThanOrEqual(1);
  });
});

describe("pageContaining", () => {
  it("finds the page an item is on", () => {
    expect(pageContaining(0, 6)).toBe(0);
    expect(pageContaining(5, 6)).toBe(0);
    expect(pageContaining(6, 6)).toBe(1);
    expect(pageContaining(13, 6)).toBe(2);
  });

  it("keeps the same project on screen when the page size changes", () => {
    // The window widens from a 6-tile page to a 12-tile one while she is
    // looking at the 15th project. Page 2 of the old size and page 1 of the
    // new one both hold it; a remembered page *number* would have moved her.
    const item = 14;
    expect(pageContaining(item, 6)).toBe(2);
    expect(pageContaining(item, 12)).toBe(1);
  });

  it("answers zero for nonsense rather than throwing", () => {
    expect(pageContaining(4, 0)).toBe(0);
    expect(pageContaining(-3, 6)).toBe(0);
    expect(pageContaining(Number.NaN, 6)).toBe(0);
  });
});
