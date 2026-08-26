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
 * How many things go on a page.
 *
 * **This used to be "however many fit the window", and that was a mistake she
 * named on 2026-08-20**: her window held eight projects, which is not a page,
 * it is a shelf. The reasoning behind fitting was that a page which scrolls is
 * "back to the thing pages exist to avoid" — and that conflated two different
 * things. What she asked for was *no infinite scroll*; what got built was *no
 * scrolling at all*. Those are extremely different, and only the first one was
 * ever the requirement.
 *
 * So a page is a count, and scrolling within one is fine and expected. The
 * count is hers because the right answer depends on the monitor and on what
 * she is doing, which is exactly the shape of thing that gets a setting rather
 * than a compromise everybody lives with — the same argument muted covers and
 * the paging switch itself already won.
 *
 * **20 is the floor, not the middle.** The options only go up: the failure
 * being fixed is a page that was too small, and offering to make it smaller
 * again would be putting the bug back in as a choice.
 */
export const LIST_PAGE_SIZES = [20, 40, 60, 100] as const;
export type ListPageSize = (typeof LIST_PAGE_SIZES)[number];

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

/**
 * What order the start screen lists projects in.
 *
 * Lives beside `projectView` for the same reason: its control is on the screen
 * it changes rather than in settings, and it still has to survive closing the
 * app. What each one actually compares is in `sortWorlds` — this is only the
 * set of answers and what to call them.
 *
 * **`active` is the default and stays the default.** It is the one order that
 * needs no upkeep to be right (her call, 2026-08-14): it runs on the last
 * thing that happened to a project, whichever of opening it and changing it
 * came later. The other three exist because a default, however good, is not an
 * answer to "where is the one I have not touched since spring".
 */
export const PROJECT_SORTS = ["active", "oldest", "name", "name-desc"] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

/**
 * The menu's wording. Not "Last active" and "Alphabetical": the pill shows
 * whichever of these is on, so each one has to read as a statement about the
 * list underneath it rather than as the name of a field.
 */
export const PROJECT_SORT_LABELS: Record<ProjectSort, string> = {
  active: "Newest first",
  oldest: "Oldest first",
  name: "Name A–Z",
  "name-desc": "Name Z–A",
};

/**
 * How many mixed colours are kept. Phase 18c.
 *
 * A row of them, the way the reference does it — enough that the two or three
 * a world actually uses are always to hand, few enough that the row stays a
 * row. Oldest falls off the end when a new one arrives.
 */
export const MAX_SAVED_COLORS = 8;

export type Preferences = {
  treeDoubleClick: TreeDoubleClickAction;
  listPaging: ListPagingMode;
  listPageSize: ListPageSize;
  projectView: ProjectView;
  projectSort: ProjectSort;
  /**
   * Colours mixed in the system picker, kept so they can be used again.
   *
   * **In preferences rather than in a project**, because a colour she mixed is
   * hers rather than the world's — the same hex should be one click away on a
   * page, a block and a meter, in whichever project is open. Stored as hexes,
   * since a mixed colour has no palette name to be looked up by.
   */
  savedColors: string[];
  /**
   * Whether the app reports which features get used.
   *
   * **On by default, and told about rather than assumed** — her call
   * 2026-08-26. Off-by-default analytics measures almost nothing and is not
   * worth having; on-by-default with no notice collects from people who never
   * agreed. So the pair below is the answer: this starts true, and
   * `analyticsNoticeSeen` guarantees nobody is reported on before being shown
   * what is collected and where this switch is.
   *
   * What it can carry is fixed in `constants/analytics.ts`: feature names,
   * never anything written in the app.
   */
  analytics: boolean;
  /**
   * Whether the one-time notice explaining the above has been shown.
   *
   * Separate from `analytics` because they answer different questions, and
   * collapsing them loses the difference between "turned it off" and "has not
   * been asked yet". **Nothing is sent while this is false**, whatever
   * `analytics` says — which is what makes on-by-default honest rather than
   * quiet.
   */
  analyticsNoticeSeen: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  treeDoubleClick: "expand",
  listPaging: "pages",
  listPageSize: 20,
  projectView: "grid",
  projectSort: "active",
  savedColors: [],
  analytics: true,
  analyticsNoticeSeen: false,
};

/**
 * The saved list with one colour on the front of it.
 *
 * Most-recent-first and de-duplicated, so re-picking a colour already saved
 * moves it back to the front rather than filling the row with itself. Pure,
 * and here rather than in the store, because "which colours are kept" is a
 * rule and the store's job is only to write the answer down.
 */
export function withSavedColor(saved: string[], color: string): string[] {
  const cleaned = color.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(cleaned)) return saved;
  return [cleaned, ...saved.filter((existing) => existing.toLowerCase() !== cleaned)].slice(0, MAX_SAVED_COLORS);
}

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
  const listPageSize = source.listPageSize;
  const projectView = source.projectView;
  const projectSort = source.projectSort;
  const savedColors = source.savedColors;
  return {
    treeDoubleClick: TREE_DOUBLE_CLICK_ACTIONS.includes(treeDoubleClick as TreeDoubleClickAction)
      ? (treeDoubleClick as TreeDoubleClickAction)
      : DEFAULT_PREFERENCES.treeDoubleClick,
    listPaging: LIST_PAGING_MODES.includes(listPaging as ListPagingMode)
      ? (listPaging as ListPagingMode)
      : DEFAULT_PREFERENCES.listPaging,
    // Membership rather than a range check, deliberately: a number that is not
    // one of the offered sizes has no control that can show it, so a
    // hand-edited 37 would sit in the file being obeyed by a settings panel
    // that shows 20 selected.
    listPageSize: LIST_PAGE_SIZES.includes(listPageSize as ListPageSize)
      ? (listPageSize as ListPageSize)
      : DEFAULT_PREFERENCES.listPageSize,
    projectView: PROJECT_VIEWS.includes(projectView as ProjectView)
      ? (projectView as ProjectView)
      : DEFAULT_PREFERENCES.projectView,
    projectSort: PROJECT_SORTS.includes(projectSort as ProjectSort)
      ? (projectSort as ProjectSort)
      : DEFAULT_PREFERENCES.projectSort,
    // Filtered rather than trusted: this file outlives any version of the app,
    // and a hand-edited entry that isn't a hex would be handed to a style
    // attribute otherwise.
    savedColors: Array.isArray(savedColors)
      ? savedColors
          .filter((entry): entry is string => typeof entry === "string" && /^#[0-9a-f]{6}$/i.test(entry))
          .map((entry) => entry.toLowerCase())
          .slice(0, MAX_SAVED_COLORS)
      : DEFAULT_PREFERENCES.savedColors,
    // Only a real boolean counts. A settings file written before these existed
    // has neither, and both then take their default — which for the notice
    // means an existing installation is shown it once, exactly like a new one.
    // That is the intent rather than an accident of parsing: nobody who has
    // been running this app should start being reported on without being told.
    analytics: typeof source.analytics === "boolean" ? source.analytics : DEFAULT_PREFERENCES.analytics,
    analyticsNoticeSeen:
      typeof source.analyticsNoticeSeen === "boolean"
        ? source.analyticsNoticeSeen
        : DEFAULT_PREFERENCES.analyticsNoticeSeen,
  };
}
