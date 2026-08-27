// The rules for how wide the side panels are allowed to be. Kept out of the
// store and the drag handler so they're testable without a mouse — the bug
// this shape prevents is a stored width from an older version, or a
// hand-edited settings file, sizing a panel to something the window can't
// show and leaving no edge to drag it back by.
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

/**
 * What both panels should be after one of them is dragged.
 *
 * **The panel being dragged gets what was asked for, and the other one gives
 * way.** The first version of this capped the drag at whatever room was going
 * spare, which meant the panel dragged *first* took everything and the second
 * one could not move at all — drag the sidebar out, then try the properties
 * panel, and nothing happens. A drag that is silently ignored is worse than a
 * drag that moves something.
 *
 * The opposite panel is pushed no further than its own minimum, and the page
 * keeps `CENTER_MIN_WIDTH` throughout: those two are the walls, and between
 * them the pointer decides. So the two panels cannot both be at their maximum
 * on a window with no room for both — the last thing asked for is the one that
 * gets it, which is what direct manipulation means.
 *
 * An unmeasured container leaves the other panel alone and clamps only against
 * the fixed maximum, because nothing is known yet about what the window can
 * afford.
 */
export function planPanelDrag(
  containerWidth: number,
  widths: { tree: number; properties: number },
  edge: "tree" | "properties",
  requested: number,
  isPropertiesOpen: boolean,
): { tree: number; properties: number } {
  const ownMin = edge === "tree" ? TREE_MIN_WIDTH : PROPERTIES_MIN_WIDTH;
  const ownMax = edge === "tree" ? TREE_MAX_WIDTH : PROPERTIES_MAX_WIDTH;
  const otherMin = edge === "tree" ? PROPERTIES_MIN_WIDTH : TREE_MIN_WIDTH;
  const other = edge === "tree" ? (isPropertiesOpen ? widths.properties : 0) : widths.tree;
  const otherFloor = edge === "tree" && !isPropertiesOpen ? 0 : otherMin;

  const measured = Number.isFinite(containerWidth) && containerWidth > 0;
  const ceiling = measured
    ? Math.max(ownMin, Math.min(ownMax, Math.round(containerWidth - CENTER_MIN_WIDTH - otherFloor)))
    : ownMax;
  const own = Math.max(ownMin, Math.min(ceiling, Math.round(requested)));

  // Only as much as the drag actually needs: a panel that was already narrow
  // enough is left exactly where its owner put it.
  const room = measured ? containerWidth - CENTER_MIN_WIDTH - own : Infinity;
  const nextOther = Math.max(otherFloor, Math.min(other, Math.round(room)));

  return edge === "tree"
    ? { tree: own, properties: isPropertiesOpen ? nextOther : widths.properties }
    : { tree: nextOther, properties: own };
}

/**
 * The widths to actually render, which are not always the widths that were
 * chosen.
 *
 * **Both panels give way together, in proportion.** A window narrower than the
 * sum of the two panels plus the page has to take the difference from
 * somewhere, and taking it from one panel would make which one an arbitrary
 * decision that looks like a bug. Neither goes below its own minimum.
 *
 * The stored widths are untouched: this is what the grid and the drag handles
 * are given, so the two agree with each other, and the moment the window is
 * wide enough again both panels are back where they were put.
 */
export function fitPanelWidths(
  containerWidth: number,
  widths: { tree: number; properties: number },
  isPropertiesOpen: boolean,
): { tree: number; properties: number } {
  const properties = isPropertiesOpen ? widths.properties : 0;
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return { tree: widths.tree, properties };

  const available = containerWidth - CENTER_MIN_WIDTH;
  const wanted = widths.tree + properties;
  if (wanted <= available) return { tree: widths.tree, properties };

  const scale = available / wanted;
  return {
    tree: Math.max(TREE_MIN_WIDTH, Math.round(widths.tree * scale)),
    properties: isPropertiesOpen ? Math.max(PROPERTIES_MIN_WIDTH, Math.round(properties * scale)) : 0,
  };
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
