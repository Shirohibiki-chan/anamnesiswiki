import { describe, expect, it } from "vitest";
import {
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
