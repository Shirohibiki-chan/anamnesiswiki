import { describe, expect, it } from "vitest";
import { clampPage, fitAcross, pageContaining, pageCount, pageOf } from "./pagination";

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

describe("fitAcross", () => {
  // The pinned row's numbers, so these read as window sizes rather than as
  // arithmetic. A 1280 window leaves the row 1016 wide; fullscreen on a 2560
  // monitor leaves it 2296; the narrowest window the app allows leaves it 636.
  const TARGET = 245;
  const GAP = 12;
  const MIN = 2;
  const across = (width: number) => fitAcross(width, TARGET, GAP, MIN);
  const cardWidth = (width: number, n: number) => (width - (n - 1) * GAP) / n;

  it("keeps four across at the window the row was drawn at", () => {
    expect(across(1016)).toBe(4);
    expect(cardWidth(1016, 4)).toBe(245);
  });

  it("adds columns instead of stretching the cards on a wide window", () => {
    // The bug this exists for: four cards across a fullscreen 2560 monitor
    // were 565 wide against a card drawn at 245, which is a letterboxed band
    // rather than a cover.
    expect(across(2296)).toBe(9);
    expect(cardWidth(2296, 9)).toBeCloseTo(244.4, 1);
  });

  it("drops to two rather than standing the cards on end", () => {
    // The other end of the same bug: at the app's minimum window four across
    // made a 150-wide card against a 208-tall one, taller than it is wide.
    expect(across(636)).toBe(2);
    expect(cardWidth(636, 2)).toBe(312);
  });

  // The rule used to be "never below target", and it was that rule which cost
  // her the fourth pin: a row 8px short of four 245s gave three at 328 rather
  // than four at 243. A card may now come in a little under instead.
  it("never lands a card more than a hair under what it asked to be", () => {
    for (let width = 400; width <= 4000; width += 7) {
      const n = across(width);
      if (n > MIN) expect(cardWidth(width, n)).toBeGreaterThanOrEqual(TARGET * 0.98);
    }
  });

  // The other half, and the one that actually bites: overshoot has no bound of
  // its own — it is whatever the leftover comes to — so it is what the count
  // has to be chosen against.
  it("never inflates a card far past what it asked to be", () => {
    for (let width = 400; width <= 4000; width += 7) {
      const n = across(width);
      if (n > MIN) expect(cardWidth(width, n)).toBeLessThan(TARGET * 1.35);
    }
  });

  // The regression itself. 245 is what a card measures at four across on a
  // 1280 window, so that window sat on exactly 4.000 cards — and moving the
  // start screen's scrollbar onto the whole column took 8px off it.
  it("keeps four across at the drawn width once a scrollbar takes its bite", () => {
    expect(across(1016)).toBe(4);
    expect(across(1016 - 8)).toBe(4);
    expect(cardWidth(1016 - 8, 4)).toBe(243);
  });

  it("only ever grows the count as the window grows", () => {
    let last = 0;
    for (let width = 300; width <= 4000; width += 3) {
      const n = across(width);
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
  });

  it("holds the floor when the row is too narrow for even two", () => {
    expect(across(300)).toBe(MIN);
    expect(across(1)).toBe(MIN);
  });

  it("answers the floor for a row that has not been measured", () => {
    // A ResizeObserver reports nothing until the row has been laid out once,
    // and the component has its own answer for that frame — this only has to
    // avoid dividing by it.
    expect(across(0)).toBe(MIN);
    expect(across(-40)).toBe(MIN);
    expect(across(Number.NaN)).toBe(MIN);
    expect(fitAcross(1016, 0, GAP, MIN)).toBe(MIN);
  });
});
