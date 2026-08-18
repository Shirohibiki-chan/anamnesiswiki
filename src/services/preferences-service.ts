// How the app behaves, as opposed to how it looks — the appearance settings
// have their own home in theme-store. Same treatment as the panel widths next
// door: the rules live out here as plain functions so they're testable without
// a settings file, and the store only holds the answer.
//
// App-level, not per-project, for the reason every other preference is: one
// person, one screen, several worlds. A habit about double-clicking doesn't
// change because a different project is open.

/**
 * What a double-click on a tree row does.
 *
 * `expand` is the default and the one every file manager has: double-click
 * opens the thing. react-arborist's own default is the other one, which is why
 * renaming got the gesture first — the tree was taking the library's answer
 * rather than making a choice.
 *
 * `rename` stays available because it *was* the behaviour, it was the
 * behaviour for long enough to be in someone's fingers, and a swap you can't
 * undo is a worse trade than a setting nobody opens.
 */
export const TREE_DOUBLE_CLICK_ACTIONS = ["expand", "rename"] as const;
export type TreeDoubleClickAction = (typeof TREE_DOUBLE_CLICK_ACTIONS)[number];

/**
 * Whether a long grid of things is broken into pages, or is one endless scroll.
 *
 * Pages are the default and her preference (2026-08-18), and the switch exists
 * because the other one is a real way to work rather than a mistake: scrolling
 * wins when you are skimming for something you would know on sight and could
 * not have named.
 *
 * App-level and not per-grid on purpose. It reads as one habit rather than
 * several — the projects on the start screen and the pictures in the asset
 * picker are the same question asked twice — and a switch that had to be found
 * and set separately in each place would mostly be found in neither.
 */
export const LIST_PAGING_MODES = ["pages", "scroll"] as const;
export type ListPagingMode = (typeof LIST_PAGING_MODES)[number];

/**
 * Covers or rows, on the start screen.
 *
 * Not in the settings dialog: the control is a pair of icons on the screen
 * it changes, which is where you are when you want it. It lives here anyway
 * because it has to survive closing the app — the same reasoning as the panel
 * widths, and the same disappointment if it didn't.
 */
export const PROJECT_VIEWS = ["grid", "list"] as const;
export type ProjectView = (typeof PROJECT_VIEWS)[number];

export type Preferences = {
  treeDoubleClick: TreeDoubleClickAction;
  listPaging: ListPagingMode;
  projectView: ProjectView;
};

export const DEFAULT_PREFERENCES: Preferences = {
  treeDoubleClick: "expand",
  listPaging: "pages",
  projectView: "grid",
};

/**
 * Whatever came back out of app-settings.json, reduced to preferences we'd
 * accept today. Same shape and same reasoning as `parsePanelWidths`: it's an
 * ordinary JSON file that outlives any given version of the app, and a value
 * this version has never heard of has to land on a default rather than on
 * screen.
 *
 * Each field is read independently, so a file holding one good value and one
 * piece of nonsense keeps the good one.
 */
export function parsePreferences(raw: unknown): Preferences {
  if (typeof raw !== "object" || raw === null) return DEFAULT_PREFERENCES;
  const source = raw as Record<string, unknown>;
  const treeDoubleClick = source.treeDoubleClick;
  const listPaging = source.listPaging;
  const projectView = source.projectView;
  return {
    treeDoubleClick: TREE_DOUBLE_CLICK_ACTIONS.includes(treeDoubleClick as TreeDoubleClickAction)
      ? (treeDoubleClick as TreeDoubleClickAction)
      : DEFAULT_PREFERENCES.treeDoubleClick,
    listPaging: LIST_PAGING_MODES.includes(listPaging as ListPagingMode)
      ? (listPaging as ListPagingMode)
      : DEFAULT_PREFERENCES.listPaging,
    projectView: PROJECT_VIEWS.includes(projectView as ProjectView)
      ? (projectView as ProjectView)
      : DEFAULT_PREFERENCES.projectView,
  };
}
