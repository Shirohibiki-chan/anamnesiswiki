import { describe, expect, it } from "vitest";
import {
  CENTER_MIN_WIDTH,
  PROPERTIES_DEFAULT_WIDTH,
  PROPERTIES_MAX_WIDTH,
  PROPERTIES_MIN_WIDTH,
  RAIL_DEFAULT_WIDTH,
  RAIL_MAX_WIDTH,
  RAIL_MIN_WIDTH,
  TREE_DEFAULT_WIDTH,
  TREE_MAX_WIDTH,
  TREE_MIN_WIDTH,
} from "../constants/layout";
import {
  clampPropertiesWidth,
  clampRailWidth,
  clampTreeWidth,
  clampWidth,
  DEFAULT_PANEL_WIDTHS,
  fitPanelWidths,
  planPanelDrag,
  parsePanelWidths,
} from "./layout-service";

describe("clampWidth", () => {
  it("leaves a usable width alone", () => {
    expect(clampWidth(300, 180, 520, 260)).toBe(300);
  });

  it("holds the panel at its limits", () => {
    expect(clampWidth(10, 180, 520, 260)).toBe(180);
    expect(clampWidth(9000, 180, 520, 260)).toBe(520);
  });

  // A grid column that changes by a third of a pixel per frame makes the text
  // inside it shimmer, and a drag reports fractional pixels.
  it("rounds to whole pixels", () => {
    expect(clampWidth(301.4, 180, 520, 260)).toBe(301);
    expect(clampWidth(301.6, 180, 520, 260)).toBe(302);
  });

  // The default, not the minimum: it's the width the panel is known to work at.
  it("falls back to the default for a width that isn't a number at all", () => {
    expect(clampWidth(Number.NaN, 180, 520, 260)).toBe(260);
    expect(clampWidth(Number.POSITIVE_INFINITY, 180, 520, 260)).toBe(260);
  });
});

describe("clampTreeWidth / clampPropertiesWidth / clampRailWidth", () => {
  it("applies each panel's own limits", () => {
    expect(clampTreeWidth(0)).toBe(TREE_MIN_WIDTH);
    expect(clampTreeWidth(9000)).toBe(TREE_MAX_WIDTH);
    expect(clampPropertiesWidth(0)).toBe(PROPERTIES_MIN_WIDTH);
    expect(clampPropertiesWidth(9000)).toBe(PROPERTIES_MAX_WIDTH);
    expect(clampRailWidth(0)).toBe(RAIL_MIN_WIDTH);
    expect(clampRailWidth(9000)).toBe(RAIL_MAX_WIDTH);
  });

  // Nobody's window should change shape on upgrade — the shell's two from
  // before Phase 14, and the rail from before it could be dragged at all.
  it("leaves the previously fixed widths untouched", () => {
    expect(clampTreeWidth(TREE_DEFAULT_WIDTH)).toBe(TREE_DEFAULT_WIDTH);
    expect(clampPropertiesWidth(PROPERTIES_DEFAULT_WIDTH)).toBe(PROPERTIES_DEFAULT_WIDTH);
    expect(clampRailWidth(RAIL_DEFAULT_WIDTH)).toBe(RAIL_DEFAULT_WIDTH);
  });
});

describe("parsePanelWidths", () => {
  it("takes a well-formed record", () => {
    expect(parsePanelWidths({ tree: 300, properties: 400, rail: 280 })).toEqual({
      tree: 300,
      properties: 400,
      rail: 280,
    });
  });

  it("falls back for anything that isn't an object", () => {
    expect(parsePanelWidths(undefined)).toEqual(DEFAULT_PANEL_WIDTHS);
    expect(parsePanelWidths(null)).toEqual(DEFAULT_PANEL_WIDTHS);
    expect(parsePanelWidths("260px")).toEqual(DEFAULT_PANEL_WIDTHS);
  });

  it("keeps the good part of a half-written file", () => {
    expect(parsePanelWidths({ tree: 340 })).toEqual({
      tree: 340,
      properties: PROPERTIES_DEFAULT_WIDTH,
      rail: RAIL_DEFAULT_WIDTH,
    });
    expect(parsePanelWidths({ properties: "wide" })).toEqual(DEFAULT_PANEL_WIDTHS);
  });

  // Every settings file written before the rail could be dragged is this case,
  // so it is the upgrade path rather than a malformed-input test.
  it("gives the rail its default when the file predates it", () => {
    expect(parsePanelWidths({ tree: 300, properties: 400 }).rail).toBe(RAIL_DEFAULT_WIDTH);
  });

  // The limits are free to move between versions, so a width that was legal
  // when it was written may not be now.
  it("pulls a width written by an older version back inside today's limits", () => {
    expect(parsePanelWidths({ tree: 40, properties: 4000, rail: 4000 })).toEqual({
      tree: TREE_MIN_WIDTH,
      properties: PROPERTIES_MAX_WIDTH,
      rail: RAIL_MAX_WIDTH,
    });
  });
});

// 2026-08-27. The page in the middle holds a minimum, so the two panels cannot
// both be dragged to their fixed maximums on a small window — and the drag has
// to stop where the layout stops, or the handle walks away from the edge it is
// dragging. That happened, and it is what these cover.
describe("planPanelDrag", () => {
  const roomy = 1600;
  const tight = 1258; // The window this was reported on.

  it("gives the panel what was asked for when there is room", () => {
    expect(planPanelDrag(roomy, { tree: 260, properties: 300 }, "tree", 400, true)).toEqual({
      tree: 400,
      properties: 300,
    });
  });

  // The bug: the panel dragged first took everything, and the second one could
  // not move at all. Dragging has to move what is being dragged.
  it("pushes the other panel out of the way rather than refusing the drag", () => {
    const afterFirst = planPanelDrag(tight, { tree: 260, properties: 300 }, "tree", 900, true);
    expect(afterFirst.tree).toBe(TREE_MAX_WIDTH);

    const afterSecond = planPanelDrag(tight, afterFirst, "properties", 900, true);
    expect(afterSecond.properties).toBe(PROPERTIES_MAX_WIDTH);
    expect(afterSecond.tree).toBeLessThan(TREE_MAX_WIDTH);
    expect(afterSecond.tree + afterSecond.properties).toBe(tight - CENTER_MIN_WIDTH);
  });

  it("never pushes the other panel below its own minimum", () => {
    const next = planPanelDrag(900, { tree: 400, properties: 300 }, "properties", 900, true);
    expect(next.tree).toBe(TREE_MIN_WIDTH);
    expect(next.properties).toBe(900 - CENTER_MIN_WIDTH - TREE_MIN_WIDTH);
  });

  it("leaves the other panel alone when the drag does not need its room", () => {
    expect(planPanelDrag(tight, { tree: 500, properties: 300 }, "tree", 200, true)).toEqual({
      tree: 200,
      properties: 300,
    });
  });

  it("keeps the page's minimum whatever is dragged", () => {
    const next = planPanelDrag(tight, { tree: 260, properties: 300 }, "tree", 5000, true);
    expect(next.tree + next.properties).toBeLessThanOrEqual(tight - CENTER_MIN_WIDTH);
  });

  it("gives the tree the closed panel's room when the properties panel is shut", () => {
    // 1000 - 420 leaves 580 for the tree, so its own maximum is what stops it
    // rather than the page — which is the point: with nothing on the right,
    // the room is the tree's to take.
    const next = planPanelDrag(1000, { tree: 260, properties: 300 }, "tree", 900, false);
    expect(next.tree).toBe(TREE_MAX_WIDTH);
    // The closed panel's stored width is not touched by a drag it isn't in.
    expect(next.properties).toBe(300);
  });

  it("clamps to the fixed maximum before the container has been measured", () => {
    expect(planPanelDrag(0, { tree: 260, properties: 300 }, "tree", 5000, true).tree).toBe(TREE_MAX_WIDTH);
  });
});

describe("fitPanelWidths", () => {
  it("leaves both alone when they fit", () => {
    expect(fitPanelWidths(1600, { tree: 400, properties: 400 }, true)).toEqual({ tree: 400, properties: 400 });
  });

  it("shrinks both in proportion rather than picking one", () => {
    // 900 wide, 420 for the page, 480 to share between two panels that want 1080.
    const fitted = fitPanelWidths(900, { tree: TREE_MAX_WIDTH, properties: PROPERTIES_MAX_WIDTH }, true);
    expect(fitted.tree + fitted.properties).toBeLessThanOrEqual(900 - CENTER_MIN_WIDTH);
    expect(fitted.tree).toBeLessThan(TREE_MAX_WIDTH);
    expect(fitted.properties).toBeLessThan(PROPERTIES_MAX_WIDTH);
    // In proportion: the wider one stays the wider one.
    expect(fitted.properties).toBeGreaterThan(fitted.tree);
  });

  it("holds each panel at its own minimum however small the window", () => {
    const fitted = fitPanelWidths(500, { tree: TREE_MAX_WIDTH, properties: PROPERTIES_MAX_WIDTH }, true);
    expect(fitted.tree).toBe(TREE_MIN_WIDTH);
    expect(fitted.properties).toBe(PROPERTIES_MIN_WIDTH);
  });

  it("gives the tree the whole width when the properties panel is closed", () => {
    expect(fitPanelWidths(900, { tree: 400, properties: 560 }, false)).toEqual({ tree: 400, properties: 0 });
  });

  it("changes nothing before the container has been measured", () => {
    expect(fitPanelWidths(0, { tree: 520, properties: 560 }, true)).toEqual({ tree: 520, properties: 560 });
  });
});

