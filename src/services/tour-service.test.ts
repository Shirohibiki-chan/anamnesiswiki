import { describe, expect, it } from "vitest";
import { TOUR_CARD_WIDTH, TOUR_STEPS, TOUR_VIEWPORT_MARGIN } from "../constants/tour";
import { availableSteps, dimPanels, highlightRect, placeCard, type Rect } from "./tour-service";

const VIEWPORT = { width: 1280, height: 800 };
const CARD = { width: TOUR_CARD_WIDTH, height: 200 };

/** The rail: a narrow column down the left, full height. */
const RAIL: Rect = { left: 0, top: 0, width: 80, height: 800 };
/** The tree: the wide column beside it. */
const TREE: Rect = { left: 80, top: 32, width: 260, height: 768 };
/** The right-hand panel. */
const PANEL: Rect = { left: 1000, top: 32, width: 280, height: 768 };
/** The page: the middle, which fills its column. */
const PAGE: Rect = { left: 340, top: 70, width: 660, height: 730 };

function covers(panels: Rect[], point: { x: number; y: number }): boolean {
  return panels.some(
    (panel) =>
      point.x >= panel.left &&
      point.x < panel.left + panel.width &&
      point.y >= panel.top &&
      point.y < panel.top + panel.height,
  );
}

describe("the highlight", () => {
  it("grows the element a little, and stays inside the window", () => {
    const hole = highlightRect(TREE, VIEWPORT);
    expect(hole.left).toBeLessThan(TREE.left);
    expect(hole.top).toBeLessThan(TREE.top);
    expect(hole.left + hole.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(hole.top + hole.height).toBeLessThanOrEqual(VIEWPORT.height);
  });

  it("does not run off the top-left corner for something already against it", () => {
    // The rail sits at 0,0 — padding it outwards would put the highlight at
    // negative coordinates and lose two of its edges off the window.
    const hole = highlightRect(RAIL, VIEWPORT);
    expect(hole.left).toBe(0);
    expect(hole.top).toBe(0);
  });
});

describe("the dimming", () => {
  const hole = highlightRect(TREE, VIEWPORT);
  const panels = dimPanels(hole, VIEWPORT);

  it("leaves the highlight clear and covers everything else", () => {
    expect(covers(panels, { x: TREE.left + 10, y: TREE.top + 10 })).toBe(false);
    // The four corners of the window, none of which is the tree.
    expect(covers(panels, { x: 1, y: 1 })).toBe(true);
    expect(covers(panels, { x: VIEWPORT.width - 1, y: 1 })).toBe(true);
    expect(covers(panels, { x: 1, y: VIEWPORT.height - 1 })).toBe(true);
    expect(covers(panels, { x: VIEWPORT.width - 1, y: VIEWPORT.height - 1 })).toBe(true);
  });

  it("never stacks two panels on one spot", () => {
    // Two translucent panels over each other are visibly darker than one, and
    // the seam shows as a line across the window.
    for (const x of [0, 40, 200, 700, 1279]) {
      for (const y of [0, 20, 400, 799]) {
        const over = panels.filter(
          (panel) => x >= panel.left && x < panel.left + panel.width && y >= panel.top && y < panel.top + panel.height,
        );
        expect(over.length, `${x},${y}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("drops a panel with no area rather than drawing an empty one", () => {
    const wholeWindow = { left: 0, top: 0, width: VIEWPORT.width, height: VIEWPORT.height };
    expect(dimPanels(wholeWindow, VIEWPORT)).toHaveLength(0);
  });
});

describe("placing the card", () => {
  it("puts it beside the thing it points at", () => {
    const right = placeCard(TREE, CARD, "right", VIEWPORT);
    expect(right.left).toBeGreaterThan(TREE.left + TREE.width);

    const left = placeCard(PANEL, CARD, "left", VIEWPORT);
    expect(left.left + CARD.width).toBeLessThan(PANEL.left);
  });

  it("puts it inside something that fills its column", () => {
    // The page has no beside — the columns either side of it are the two other
    // steps — so the card goes in the lower part of the page itself, clear of
    // the writing at the top.
    const inside = placeCard(PAGE, CARD, "inside", VIEWPORT);
    expect(inside.left).toBeGreaterThanOrEqual(PAGE.left);
    expect(inside.left + CARD.width).toBeLessThanOrEqual(PAGE.left + PAGE.width);
    expect(inside.top).toBeGreaterThan(PAGE.top + PAGE.height / 2);
  });

  it("slides back into a window too narrow to hold it beside", () => {
    const narrow = { width: 420, height: 600 };
    const at = placeCard({ left: 0, top: 0, width: 300, height: 600 }, CARD, "right", narrow);
    expect(at.left).toBeLessThanOrEqual(narrow.width - CARD.width - TOUR_VIEWPORT_MARGIN);
    expect(at.left).toBeGreaterThanOrEqual(TOUR_VIEWPORT_MARGIN);
  });

  it("pins a card taller than the window to the top rather than pushing it off", () => {
    const tall = { width: TOUR_CARD_WIDTH, height: 900 };
    const at = placeCard(TREE, tall, "right", VIEWPORT);
    expect(at.top).toBe(TOUR_VIEWPORT_MARGIN);
  });
});

describe("which steps there are", () => {
  it("drops a step whose element is not on screen", () => {
    // The right-hand panel can be closed, and a later phase can move a column.
    // Either way the tour must not draw a highlight round nothing.
    const present = new Set(["rail", "tree", "page"]);
    const steps = availableSteps(TOUR_STEPS, present);
    expect(steps.map((step) => step.id)).toEqual(["rail", "tree", "page"]);
  });

  it("keeps them in the order they were written", () => {
    const all = availableSteps(TOUR_STEPS, new Set(TOUR_STEPS.map((step) => step.anchor)));
    expect(all).toEqual(TOUR_STEPS);
  });

  it("has nothing to show when the window holds none of them", () => {
    expect(availableSteps(TOUR_STEPS, new Set())).toEqual([]);
  });
});
