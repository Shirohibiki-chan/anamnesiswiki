// The rules for how wide the side panels are allowed to be. Kept out of the
// store and the drag handler so they're testable without a mouse — the bug
// this shape prevents is a stored width from an older version, or a
// hand-edited settings file, sizing a panel to something the window can't
// show and leaving no edge to drag it back by.
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

/**
 * All three draggable columns, in one record because they share one settings
 * key and one debounced write. The first two are the shell's; `rail` is the
 * start screen's, and the two screens never exist at once — which is why a
 * single store is enough and why each screen resets only what it shows.
 */
export type PanelWidths = {
  tree: number;
  properties: number;
  rail: number;
};

export const DEFAULT_PANEL_WIDTHS: PanelWidths = {
  tree: TREE_DEFAULT_WIDTH,
  properties: PROPERTIES_DEFAULT_WIDTH,
  rail: RAIL_DEFAULT_WIDTH,
};

/**
 * A width the layout can actually use. Rounded as well as clamped: a drag
 * reports fractional pixels, and a grid column that changes by a third of a
 * pixel per frame makes the text inside it shimmer.
 *
 * A non-finite input — NaN out of a bad parse, Infinity out of a hand-edited
 * file — falls back to the default rather than to the minimum, because the
 * default is the width the panel is known to work at.
 */
export function clampWidth(width: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(width)) return fallback;
  return Math.round(Math.min(Math.max(width, min), max));
}

export function clampTreeWidth(width: number): number {
  return clampWidth(width, TREE_MIN_WIDTH, TREE_MAX_WIDTH, TREE_DEFAULT_WIDTH);
}

export function clampPropertiesWidth(width: number): number {
  return clampWidth(width, PROPERTIES_MIN_WIDTH, PROPERTIES_MAX_WIDTH, PROPERTIES_DEFAULT_WIDTH);
}

export function clampRailWidth(width: number): number {
  return clampWidth(width, RAIL_MIN_WIDTH, RAIL_MAX_WIDTH, RAIL_DEFAULT_WIDTH);
}

/**
 * Whatever came back out of app-settings.json, reduced to widths we'd accept
 * today — the same treatment `parseOverrides` gives stored shortcuts, and for
 * the same reason. It's a plain JSON file that outlives any given version of
 * the app, and the limits above are free to move between versions.
 *
 * Each panel is read independently, so a file with one good value and one
 * missing keeps the good one.
 */
export function parsePanelWidths(raw: unknown): PanelWidths {
  if (typeof raw !== "object" || raw === null) return DEFAULT_PANEL_WIDTHS;
  const source = raw as Record<string, unknown>;
  return {
    tree: typeof source.tree === "number" ? clampTreeWidth(source.tree) : TREE_DEFAULT_WIDTH,
    properties:
      typeof source.properties === "number" ? clampPropertiesWidth(source.properties) : PROPERTIES_DEFAULT_WIDTH,
    rail: typeof source.rail === "number" ? clampRailWidth(source.rail) : RAIL_DEFAULT_WIDTH,
  };
}
