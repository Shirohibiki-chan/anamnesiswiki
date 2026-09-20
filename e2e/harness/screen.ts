// The vocabulary a scenario is written in: find a page, open it, read what is
// on screen. Everything here takes the window `launchApp` handed back.
//
// **Why helpers rather than selectors in each scenario.** The app has almost no
// test hooks in its markup — sixteen `data-setting` attributes and little else
// — so driving it means CSS classes, and a class renamed during ordinary work
// would otherwise break every scenario separately and mysteriously. Kept here,
// it breaks one file loudly. The class names below are the only ones this
// harness knows; adding a scenario should not add another.
//
// **Nothing here reaches past the window into the app's state.** A helper that
// called a store directly would pass while the thing on screen was broken,
// which is the entire failure mode this harness exists to catch.
import { deflateSync } from "node:zlib";
import type { Locator, Page } from "playwright-core";

const TREE_ROW = ".tree-row";
const TREE_ROW_NAME = ".tree-row-name";
const TREE_ROW_TOGGLE = ".tree-row-toggle";
const TREE_SEARCH_INPUT = ".tree-search-input";
const SIDEBAR_PANEL_HEAD = ".tree-panel-head";
const LEFT_RAIL = ".left-rail";
const PAGE_CONTROLS = ".page-controls";
const TREE_PROJECT_HEADER = ".tree-project-header";
const PROPERTIES_HEAD = ".app-layout-properties-head";
const TITLE_BAR = ".title-bar";
const TITLE_BAR_NAME = ".title-bar-name";
const TITLE_BAR_CONTROLS = ".title-bar-controls";
const PROJECT_NAME = ".tree-project-header-name";
const BREADCRUMB_ITEM = ".page-title-breadcrumb-item";
const BLOCK_PANEL = ".block-panel";
const BLOCK_SHELL = ".block-shell";
// Phase 19.5: a block drawn in the middle of the writing rather than in the
// sidebar. It is the same markup inside — same `.block-shell`, same title — so
// every selector below has to say which of the two it means.
const PAGE_BLOCK = ".page-block";
// Phase 19.5: a framed group of the page's blocks. `.page-infobox` is the
// BlockNote block; `.infobox` is the frame the app draws inside it.
const INFOBOX = ".infobox";
const BLOCK_FRAME = ".block-frame";
const PAGE_INFOBOX = ".page-infobox";
const PAGE_CONTENTS = ".page-contents";
const AUTO_LINK_GROUP = ".auto-link-group";
const COLUMN_ROW = ".node-pageColumns";
const COLUMN_DIVIDER = ".column-divider";
const BLOCK_ADD_MENU = ".block-add-menu";
const BLOCK_MENU = ".block-menu";
const MENU_HEADING = ".tree-context-menu-heading";
const BLOCK_TITLE = ".block-title";
const CAPTURE_BOX = ".block-capture";
const CAPTURE_TEXT = ".block-capture-text";
const CAPTURE_DESTINATION = ".block-capture-destination";
const CAPTURE_SAVED = ".block-capture-saved";
const QUICK_CAPTURE_DIALOG = ".quick-capture-dialog";
// Phase 24: one page’s relationships, opened over the page. The button that
// opens it lives on the page title; everything else only exists while it is up.
const GRAPH_BUTTON = ".page-title-graph-button";
const GRAPH = ".page-graph";
const GRAPH_NODE = ".page-graph-node";
const GRAPH_NODE_NAME = ".page-graph-node-name";
const GRAPH_NODE_FOCUS = ".page-graph-node-focus";
const GRAPH_EDGES_CANVAS = ".page-graph-edges-canvas";
const GRAPH_PREVIEW = ".page-graph-preview";
const GRAPH_PREVIEW_NAME = ".page-graph-preview-name";
const GRAPH_EDGE_LABEL = ".page-graph-edge-label";
// The shortcuts strip above the tree, and one tile in it.
const BOOKMARKS_RAIL = ".bookmarks-rail";
const BOOKMARK_TILE = ".bookmark-tile";
// Phase 24 step 2: the controls above the graph, and the filter menu.
const GRAPH_TOOL = ".graph-tool";
const GRAPH_COUNT = ".graph-count";
const GRAPH_MENU = ".graph-menu";
const GRAPH_MENU_ADD = ".graph-menu-add";
const GRAPH_FILTER_ROW = ".graph-filter-row";
// Phase 24 step 3: the rail button, and the graph heading that says which of
// the two graphs is up.
const GRAPH_HEADING = ".page-graph-heading";
const GRAPH_SCENE = ".page-graph-scene";
const GRAPH_STAGE = ".page-graph-stage";
// Phase 25: the storyline canvas, and the landing a blank page offers its
// kinds from — which is how a page becomes a storyline. The whole landing,
// since 2026-09-17: the special kinds (a storyline, a board) are cards in a
// section of their own above the templates' grid.
const NEW_PAGE_GRID = ".new-page-landing";
const STORYLINE = ".storyline";
const STORYLINE_BAR = ".storyline-bar";
const STORYLINE_ADD_MENU = ".storyline-bar-add-menu";
const STORYLINE_NODE = ".storyline-node";
const STORYLINE_NODE_BODY = ".storyline-node-body";
const STORYLINE_NODE_NAME = ".storyline-node-name";
const STORYLINE_NODE_INPUT = ".storyline-node-input";
const STORYLINE_NODE_SUMMARY = ".storyline-node-summary";
const STORYLINE_NODE_SUMMARY_INPUT = ".storyline-node-summary-input";
const STORYLINE_NODE_OPEN = ".storyline-node-open";
const STORYLINE_HANDLE = ".storyline-node-handle";
const STORYLINE_EDGE = ".storyline-edge";
const STORYLINE_MENU = ".storyline-menu";
const STORYLINE_MENU_CAST = ".storyline-menu-cast";
const STORYLINE_NODE_RESIZE = ".storyline-node-resize";
const STORYLINE_NODE_NAME_TEXT = ".storyline-node-name";
const STORYLINE_REFUSAL = ".storyline-refusal";
// Phase 25 step 2: the annotations.
const STORYLINE_NOTE = ".storyline-note";
const STORYLINE_NOTE_INPUT = ".storyline-note-input";
const STORYLINE_NOTE_LINK = ".storyline-note-link";
const STORYLINE_NOTE_BROKEN = ".storyline-note-broken";
const STORYLINE_BAND = ".storyline-band";
const STORYLINE_BAND_LABEL = ".storyline-band-label";
const STORYLINE_BAND_INPUT = ".storyline-band-input";
const STORYLINE_STAGE = ".storyline-stage";
// Phase 25 step 3: the picker, and who is in a scene.
const STORYLINE_PICKER = ".storyline-picker";
const STORYLINE_PICKER_ROW = ".storyline-picker-row";
const STORYLINE_PICKER_NAME = ".storyline-picker-name";
const STORYLINE_PICKER_EMPTY = ".storyline-picker-empty";
const STORYLINE_CAST_DOT = ".storyline-cast-dot";
const EDITOR = ".editor-shell .bn-editor";
const EDITOR_MENTION = ".editor-mention";
// Phase 19.5: the `#` on a chip that goes to one block rather than to the top
// of a page, the controls that appear beside a block on hover, and the mark on
// a block a link has just been followed to.
const EDITOR_MENTION_SPOT = ".editor-mention-spot";
const EDITOR_BLOCK = ".bn-block-outer";
const BLOCK_SIDE_MENU = ".bn-side-menu";
const EDITOR_BLOCK_MENU = ".bn-drag-handle-menu";
const BLOCK_ARRIVAL = ".block-anchor-arrival";
const EDITOR_INLINE_ICON = ".editor-inline-icon";
const ICON_PICKER = ".icon-picker";
const SUGGESTION_MENU = "#bn-suggestion-menu";
// Phase 23: a page drawn as a database.
const DATABASE_VIEW = ".database-view";
const DATABASE_TABLE = ".database-table";
const DATABASE_ROW_NAME = ".database-name";
const DATABASE_META = ".database-meta";
// Every layout draws a section heading with the same chip, so one selector
// covers the table's heading rows and the boards', cards' and lists' headings.
const DATABASE_GROUP_LABEL = ".database-group-heading .database-chip, .database-group-row .database-chip";
const DATABASE_TOOL = ".database-tool";
const DATABASE_MENU = ".database-menu";
const DATABASE_DIRECTION = ".database-direction";
const TREE_CONTEXT_MENU = ".tree-context-menu";
const DATABASE_CARD = ".database-card";
const DATABASE_BOARD_COLUMN = ".database-board-column";
const DATABASE_LIST_ROW = ".database-list-row";
const DATABASE_LAYOUT_ITEM = ".database-layout-item";
const FORMATTING_BAR = ".bn-formatting-toolbar";

/**
 * Whatever names the thing currently in the middle of the window.
 *
 * **Two selectors because there are two kinds of page.** A folder gets
 * `FolderView`, which draws its own heading and has no breadcrumb or tabs;
 * everything else gets `PageTitle`. Knowing that is the harness's job — a
 * scenario asking "what is open" should not have to know which template it
 * clicked on.
 */
const PAGE_TITLE = ".page-title-name, .folder-view-name";

/** How long to wait on anything the app has to do disk work for. */
const WAIT_MS = 20_000;

/**
 * Resolves once a world is open and its tree has drawn.
 *
 * **The first row, not the panel.** `.tree-panel` is on screen while the
 * project is still being read off disk, so waiting for it proves only that the
 * shell rendered — which is true even when loading a world has failed and left
 * the tree empty.
 */
export async function waitForWorld(window: Page): Promise<void> {
  await window.locator(TREE_ROW).first().waitFor({ state: "visible", timeout: WAIT_MS });
}

/** The open world's name, as the tree header shows it. */
export async function projectName(window: Page): Promise<string> {
  return normalize(await window.locator(PROJECT_NAME).first().innerText());
}

/**
 * The rows currently drawn in the tree, top to bottom.
 *
 * **This is what is on screen, not what is in the world.** The tree is
 * virtualised — react-arborist renders the visible strip and a little either
 * side — so a world of three hundred pages answers this with a few dozen names.
 * A scenario counting pages wants `world.pages`; one asking what someone can
 * see wants this.
 */
export async function visibleTreeRows(window: Page): Promise<string[]> {
  const names = await window.locator(TREE_ROW_NAME).allInnerTexts();
  return names.map(normalize);
}

/**
 * Chooses one of the sidebar's three panels from the rail. Phase 21.
 *
 * By the name on the button, which is its `aria-label` — the rail is icons
 * only, so there is no text to click and the label is the whole contract.
 */
export async function openRailPanel(window: Page, label: string): Promise<void> {
  await window.getByRole("button", { name: label, exact: true }).first().click();
  await window.waitForTimeout(300);
}

/**
 * The name written over the panel the sidebar is showing, or `null` when it is
 * showing the tree — which heads itself with the world's name instead. Phase 21.
 */
export async function sidebarPanelName(window: Page): Promise<string | null> {
  const head = window.locator(SIDEBAR_PANEL_HEAD);
  if ((await head.count()) === 0) return null;
  return normalize(await head.first().innerText());
}

/**
 * The window's title bar, as the page sees it.
 *
 * **It reads the bar, its buttons, and the panels that used to impersonate one.**
 * Until 2026-09-05 there was no title bar: the rail, the sidebar's header, the
 * bar above the page and an invented band on the properties panel were each made
 * a drag region, which is why `strays` is here — every one of them being an
 * ordinary panel again is half of what replaced them, and it is the half nothing
 * on screen would show. The bar above the page has since been removed outright;
 * the page's own floating controls stand in its place in that list.
 *
 * `spans` is the bar reaching both edges of the window, since a title bar with a
 * seam in it is the defect this replaced. `buttons` is how many controls it
 * draws and `buttonsDrag` whether any of them forgot to opt out of the drag
 * region — a window button that moves the window instead of closing it is the
 * failure this file exists to catch. `titleRight` is the right edge of the bar's
 * own text, which must stay clear of the buttons.
 *
 * **The system's overlay is gone**, so there is nothing here reading
 * `--window-controls-w` or `navigator.windowControlsOverlay` any more. Those
 * measured the size of somebody else's buttons; ours are elements, and an
 * element can simply be looked at.
 */
export async function titleBand(window: Page): Promise<{
  buttons: number;
  buttonsDrag: number;
  dragging: boolean;
  height: number;
  spans: boolean;
  strays: string[];
  titleRight: number;
  buttonsLeft: number;
  width: number;
}> {
  return window.evaluate(
    ([bar, title, controls, ...former]) => {
      const drags = (element: Element | null) => {
        if (!element) return false;
        return getComputedStyle(element).getPropertyValue("-webkit-app-region").trim() === "drag";
      };
      const box = document.querySelector(bar)?.getBoundingClientRect();
      const name = document.querySelector(title)?.getBoundingClientRect();
      const buttons = [...document.querySelectorAll(`${controls} button`)];
      return {
        buttons: buttons.length,
        buttonsDrag: buttons.filter(drags).length,
        dragging: drags(document.querySelector(bar)),
        height: Math.round(box?.height ?? 0),
        spans: Math.round(box?.left ?? -1) === 0 && Math.round(box?.width ?? 0) === window.innerWidth,
        strays: former.filter((selector) => drags(document.querySelector(selector))),
        titleRight: Math.round(name?.right ?? 0),
        buttonsLeft: Math.round(
          buttons.reduce((near, button) => Math.min(near, button.getBoundingClientRect().left), window.innerWidth),
        ),
        width: window.innerWidth,
      };
    },
    [TITLE_BAR, TITLE_BAR_NAME, TITLE_BAR_CONTROLS, LEFT_RAIL, PAGE_CONTROLS, TREE_PROJECT_HEADER, PROPERTIES_HEAD],
  );
}

/**
 * A tree row by its exact name.
 *
 * Exact after whitespace is collapsed, which matters more than it sounds:
 * one of the generated hard cases is named with leading and trailing spaces on
 * purpose, and the browser has already normalised those away by the time
 * anything can read the row. Matching loosely instead would make
 * `"Duplicate Name"` match `"Duplicate Name (2)"` if the app ever put the
 * storage suffix on screen, which is a bug this harness should catch rather
 * than paper over.
 */
export function treeRow(window: Page, name: string): Locator {
  return window.locator(TREE_ROW).filter({ has: window.getByText(name, { exact: true }) });
}

/**
 * Types into the tree's search box and waits for the tree to settle.
 *
 * **This is how a person finds a page in a world this size, and it is also the
 * only reliable way for a scenario to reach one.** A row four hundred pages
 * down does not exist in the page at all until it is scrolled to, so there is
 * nothing to click and nothing to scroll into view; filtering brings it into
 * being. That the helper leans on a real feature is a bonus rather than the
 * reason — but it does mean a broken search shows up here first.
 */
export async function searchTree(window: Page, text: string): Promise<void> {
  const input = window.locator(TREE_SEARCH_INPUT);
  await input.fill(text);
  await window.locator(TREE_ROW).first().waitFor({ state: "visible", timeout: WAIT_MS });
}

/** Empties the search box, putting the whole tree back. */
export async function clearTreeSearch(window: Page): Promise<void> {
  await window.locator(TREE_SEARCH_INPUT).fill("");
  await window.locator(TREE_ROW).first().waitFor({ state: "visible", timeout: WAIT_MS });
}

/**
 * Finds a page by name, clicks it, and waits until it is the one on screen.
 *
 * Leaves the search box empty afterwards, so a scenario that opens two pages in
 * a row does not have to remember to tidy up between them. Clicking is a single
 * click on purpose: a row selects on click and selection is what puts a page in
 * the middle of the window (`onSelect` in `TreePanel.tsx`). Double-clicking
 * would be testing the `treeDoubleClick` preference instead.
 */
export async function openPage(window: Page, name: string): Promise<void> {
  await searchTree(window, name);
  await treeRow(window, name).first().click();
  await waitForPageTitle(window, name);
  await clearTreeSearch(window);
}

/**
 * Opens the first page whose name contains the given text, and says what it
 * opened.
 *
 * **For the pages whose names a scenario cannot know in advance.** The
 * generator builds its nine-level chain out of randomly picked place names, so
 * "the ninth level down" is findable by the part that is fixed and only
 * nameable once it is on screen. Reading the name back off the row before
 * clicking is what lets the caller then assert the app opened the page it was
 * asked for, rather than merely opening something.
 */
export async function openFirstMatch(window: Page, text: string): Promise<string> {
  await searchTree(window, text);
  const row = window.locator(TREE_ROW).filter({ hasText: text }).first();
  const name = normalize(await row.locator(TREE_ROW_NAME).innerText());
  await row.click();
  await waitForPageTitle(window, name);
  await clearTreeSearch(window);
  return name;
}

/** Expands a row without opening it, by clicking its chevron rather than its name. */
export async function expandRow(window: Page, name: string): Promise<void> {
  await treeRow(window, name).first().locator(TREE_ROW_TOGGLE).click();
}

/** The title of the page currently open. */
export async function pageTitle(window: Page): Promise<string> {
  return normalize(await window.locator(PAGE_TITLE).first().innerText());
}

/** Waits until the page on screen is the one named. */
export async function waitForPageTitle(window: Page, name: string): Promise<void> {
  // Asked of the heading's own text rather than through a locator filter,
  // because the title sits *in* `.page-title-name` rather than in a child of
  // it, and Playwright's `has:` looks for a descendant.
  await window.waitForFunction(
    ({ selector, wanted }) => {
      const heading = document.querySelector(selector);
      if (!heading) return false;
      return (heading.textContent ?? "").replace(/\s+/g, " ").trim() === wanted;
    },
    { selector: PAGE_TITLE, wanted: normalize(name) },
    { timeout: WAIT_MS },
  );
}

/**
 * The breadcrumb above the open page, ancestors first.
 *
 * **Includes the page itself**, which is the last entry — the breadcrumb draws
 * the current page as its own final crumb rather than stopping at the parent.
 */
export async function breadcrumb(window: Page): Promise<string[]> {
  const crumbs = await window.locator(BREADCRUMB_ITEM).allInnerTexts();
  return crumbs.map(normalize).filter(Boolean);
}

/** The rail's back button, at its foot since the bar above the page was removed. */
export async function goBack(window: Page): Promise<void> {
  await window.getByRole("button", { name: "Back", exact: true }).click();
}

/** The rail's forward button. */
export async function goForward(window: Page): Promise<void> {
  await window.getByRole("button", { name: "Forward", exact: true }).click();
}

/**
 * The headings down the right-hand panel, top to bottom.
 *
 * **A block with its title turned off is not in this list**, because it has no
 * heading on screen to read. That is the honest answer to "what does the panel
 * say" and the reason a scenario about ordering should use blocks that keep
 * their titles.
 */
export async function panelBlockTitles(window: Page): Promise<string[]> {
  // `textContent`, not `innerText`: the heading is a `.ui-eyebrow`, which is
  // uppercased in CSS, and `innerText` would hand back the transformed text —
  // which no longer matches the block's own aria-label that `openBlockMenu`
  // takes. One spelling for both, and it is the one in the markup.
  //
  // **Rooted at the panel as of Phase 19.5, and that is not tidying.** A block
  // in the page body draws the same `.block-shell`, so the unrooted selector
  // started counting blocks that had been moved *out* of the sidebar as though
  // they were still in it — which is the exact thing every scenario using this
  // helper is asking about.
  const titles = await window.locator(`${BLOCK_PANEL} ${BLOCK_SHELL} ${BLOCK_TITLE}`).allTextContents();
  return titles.map(normalize);
}

/** The blocks drawn in the page's writing, top to bottom. Phase 19.5. */
export async function pageBlockTitles(window: Page): Promise<string[]> {
  const titles = await window.locator(`${PAGE_BLOCK} ${BLOCK_TITLE}`).allTextContents();
  return titles.map(normalize);
}

/** How many blocks the page's writing is holding, titled or not. */
export async function pageBlockCount(window: Page): Promise<number> {
  return window.locator(PAGE_BLOCK).count();
}

/** How many infoboxes the open page is showing. Phase 19.5. */
export async function infoboxCount(window: Page): Promise<number> {
  return window.locator(INFOBOX).count();
}

/** The blocks grouped inside the page's first infobox, top to bottom. */
export async function infoboxBlockTitles(window: Page): Promise<string[]> {
  const titles = await window.locator(`${INFOBOX} ${BLOCK_TITLE}`).allTextContents();
  return titles.map(normalize);
}

/**
 * The lanes of the page's first row of columns, left to right. Phase 19.5.
 *
 * **Positions and widths rather than a screenshot**, because the question a
 * scenario asks about columns is "are these side by side, and how is the room
 * split" — both of which are numbers. The text comes along so the same call can
 * answer which lane something was typed into.
 */
export async function columnLanes(window: Page, row = 0): Promise<{ x: number; width: number; text: string }[]> {
  return window.evaluate(
    ([selector, at]) => {
      const group = document.querySelectorAll(selector as string)[at as number]?.nextElementSibling;
      return [...(group?.children ?? [])].map((lane) => {
        const box = lane.getBoundingClientRect();
        return { x: Math.round(box.x), width: Math.round(box.width), text: (lane as HTMLElement).innerText.trim() };
      });
    },
    [COLUMN_ROW, row] as [string, number],
  );
}

/** Clicks into one lane, to write in it. */
export async function clickColumnLane(window: Page, at: number, row = 0): Promise<void> {
  await window.locator(`${COLUMN_ROW} + .bn-block-group`).nth(row).locator("> .bn-block-outer").nth(at).click();
  await window.waitForTimeout(200);
}

/** How many rows of columns the open page is showing. */
export async function columnRowCount(window: Page): Promise<number> {
  return window.locator(COLUMN_ROW).count();
}

/**
 * The page's infobox measured against the lane of columns it is sitting in.
 * Phase 19.5.
 *
 * **Both halves, because "outside the row" has two readings and they need
 * telling apart.** `lane` is structural — which lane of the row actually holds
 * the frame, or `null` for none of them — and the two widths are what the eye
 * sees. A frame that has escaped its lane and one that is merely drawn wider
 * than its lane look identical, so a scenario that asked only one of these
 * would pass on half the bug.
 */
export async function infoboxInLane(
  window: Page,
  row = 0,
): Promise<{ lane: number | null; frameWidth: number; laneWidth: number }> {
  return window.evaluate(
    ([rowSel, frameSel, at]) => {
      const group = document.querySelectorAll(rowSel as string)[at as number]?.nextElementSibling;
      const frame = document.querySelector(frameSel as string);
      if (!group || !frame) return { lane: null, frameWidth: 0, laneWidth: 0 };
      const holding = [...group.children].findIndex((child) => child.contains(frame));
      return {
        lane: holding === -1 ? null : holding,
        frameWidth: Math.round(frame.getBoundingClientRect().width),
        laneWidth: holding === -1 ? 0 : Math.round(group.children[holding].getBoundingClientRect().width),
      };
    },
    [COLUMN_ROW, PAGE_INFOBOX, row] as [string, string, number],
  );
}

/**
 * Drags the divider after lane `at` until that lane is `ratio` of the row.
 *
 * A real press, move and release: the divider takes pointer capture on the way
 * down, and the whole point of the control is what happens between.
 */
export async function dragColumnDivider(window: Page, at: number, ratio: number): Promise<void> {
  const lanes = await columnLanes(window);
  const handle = await window.locator(COLUMN_DIVIDER).nth(at).boundingBox();
  if (!handle || lanes.length < at + 2) throw new Error("no divider to drag");
  const span = lanes[at + 1].x + lanes[at + 1].width - lanes[at].x;
  const y = handle.y + handle.height / 2;
  await window.mouse.move(handle.x + handle.width / 2, y);
  await window.mouse.down();
  await window.mouse.move(lanes[at].x + span * ratio, y, { steps: 10 });
  await window.mouse.up();
  await window.waitForTimeout(400);
}

/** Removes one lane through its own control, which keeps the writing. */
export async function removeColumnLane(window: Page, at: number, row = 0): Promise<void> {
  await window.locator(`${COLUMN_ROW} + .bn-block-group`).nth(row).locator("> .bn-block-outer").nth(at).hover();
  await window.getByLabel("Remove this column").nth(at).click();
  await window.waitForTimeout(600);
}

/** The row's own controls: another lane, or back to ordinary paragraphs. */
export async function addColumnLane(window: Page, row = 0): Promise<void> {
  await window.locator(COLUMN_ROW).nth(row).hover();
  await window.getByTitle("Add a column").nth(row).click();
  await window.waitForTimeout(600);
}

export async function ungroupColumns(window: Page, row = 0): Promise<void> {
  await window.locator(COLUMN_ROW).nth(row).hover();
  await window.getByTitle("Put this back to ordinary paragraphs").nth(row).click();
  await window.waitForTimeout(600);
}

/** Puts the keyboard on a column divider, for the arrow keys. */
export async function focusColumnDivider(window: Page, at: number): Promise<void> {
  await window.locator(COLUMN_ROW).first().hover();
  await window.locator(COLUMN_DIVIDER).nth(at).focus();
}

/** Adds a block to the right-hand panel, by the name on its menu item. */
export async function addBlockToPanel(window: Page, label: string): Promise<void> {
  await window.getByRole("button", { name: "Add Block", exact: true }).click();
  await window.getByRole("button", { name: label, exact: true }).first().click();
}

/** Adds a block to the page's first infobox, by the name on its menu item. */
export async function addBlockToInfobox(window: Page, label: string): Promise<void> {
  await openInfoboxAddMenu(window);
  await window.getByRole("button", { name: label, exact: true }).first().click();
}

/**
 * Opens one infobox's own `⋯` menu — the frame's, not that of any block in it.
 * Phase 19.5.
 */
export async function openInfoboxMenu(window: Page, at = 0): Promise<void> {
  await window.locator(INFOBOX).nth(at).hover();
  await window.locator(INFOBOX).nth(at).locator(".infobox-menu-trigger").click();
  await window.waitForTimeout(300);
}

/**
 * Where an infobox sits across the writing column: how much empty space is on
 * each side of it, as a fraction of the column.
 *
 * The honest way to ask whether a frame is centred — a class name would say
 * what the app *meant*, and this says what it did.
 */
export async function infoboxGaps(window: Page, at = 0): Promise<{ left: number; right: number }> {
  const frame = await window.locator(INFOBOX).nth(at).boundingBox();
  const row = await window.locator(PAGE_INFOBOX).nth(at).boundingBox();
  if (!frame || !row || row.width === 0) return { left: 0, right: 0 };
  return {
    left: (frame.x - row.x) / row.width,
    right: (row.x + row.width - (frame.x + frame.width)) / row.width,
  };
}

/**
 * Picks a block up by its grip and holds it `by` pixels lower, without letting
 * go — so a scenario can look at what a block being dragged actually looks
 * like. `drop` finishes the gesture.
 *
 * Rooted where the caller says, because a block in an infobox and a block in
 * the panel are dragged by the same-looking handle in two different lists.
 */
export async function pickUpBlock(window: Page, where: "panel" | "infobox", at: number, by: number): Promise<void> {
  const root = where === "panel" ? BLOCK_PANEL : INFOBOX;
  const shell = window.locator(`${root} ${BLOCK_SHELL}`).nth(at);
  await shell.hover();
  await window.waitForTimeout(200);
  const grip = await shell.locator(".block-grip").boundingBox();
  if (!grip) throw new Error("no grip to take hold of");
  await window.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await window.mouse.down();
  await window.mouse.move(grip.x + grip.width / 2, grip.y + by, { steps: 12 });
  await window.waitForTimeout(400);
}

export async function dropBlock(window: Page): Promise<void> {
  await window.mouse.up();
  await window.waitForTimeout(600);
}

/**
 * The block currently being dragged: how tall it is drawn, and whether anything
 * is scaling it.
 *
 * **The scale is the thing worth asking about.** dnd-kit's full transform
 * stretches the dragged item to the shape of the slot it is over, which in a
 * panel of blocks of wildly different heights blows a picture up to twice its
 * size — see BlockShell.
 */
export async function draggedBlockShape(window: Page): Promise<{ height: number; scaled: boolean } | null> {
  return window.evaluate(() => {
    const dragged = [...document.querySelectorAll<HTMLElement>(".block-shell")].find(
      (shell) => shell.style.opacity === "0.4",
    );
    if (!dragged) return null;
    return { height: Math.round(dragged.getBoundingClientRect().height), scaled: dragged.style.transform.includes("scale") };
  });
}

/**
 * The pages the "Link Page Names" dialog is offering, with how many times each
 * is written on the page. Phase 19.5.
 */
export async function autoLinkOffers(window: Page): Promise<string[]> {
  return (await window.locator(`${AUTO_LINK_GROUP} label`).allTextContents()).map(normalize);
}

/**
 * Unticks one of those pages, by name.
 *
 * **Matched against the name element, never the whole row.** Each row also
 * carries the sentences the name was found in, and those sentences name other
 * pages — a `hasText` on the row unticked whichever row happened to *mention*
 * the name first, which is a test that silently checks the wrong thing.
 */
export async function untickAutoLink(window: Page, pageName: string): Promise<void> {
  const row = window
    .locator(AUTO_LINK_GROUP)
    .filter({ has: window.locator(".auto-link-page-name", { hasText: new RegExp(`^${pageName}$`) }) });
  await row.first().locator("input").uncheck();
}

/**
 * Picks something out of the infobox's own menu by name. Phase 19.5.
 *
 * The menu closes on the click, the same as it does for a person.
 */
export async function pickInfoboxMenuItem(window: Page, label: string): Promise<void> {
  await openInfoboxMenu(window);
  await window.locator(`${BLOCK_MENU} button`).filter({ hasText: label }).first().click();
  await window.waitForTimeout(400);
}

/**
 * Where a frame sits and what the writing after it does. Phase 19.5.
 *
 * **One measurement, taken inside the page**, because the question is about two
 * elements at once: the frame's box, and the shape of the first line of the
 * paragraph after it. `lines` is how many lines that paragraph takes, which is
 * the plainest evidence that the writing is going round something.
 */
export async function textAroundInfobox(
  window: Page,
): Promise<{ frameLeft: number; frameRight: number; columnLeft: number; columnRight: number; lineRight: number; lineLeft: number; lines: number } | null> {
  return window.evaluate(
    ({ frameSel, editorSel }) => {
      const frame = document.querySelector(frameSel);
      const block = frame?.closest(".bn-block-outer");
      const after = block?.nextElementSibling?.querySelector(".bn-block-content");
      const editor = document.querySelector(editorSel);
      if (!frame || !after || !editor) return null;
      const range = document.createRange();
      range.selectNodeContents(after);
      const lines = Array.from(range.getClientRects()).filter((rect) => rect.width > 0);
      if (lines.length === 0) return null;
      const box = frame.getBoundingClientRect();
      const column = editor.getBoundingClientRect();
      const style = getComputedStyle(editor);
      return {
        frameLeft: Math.round(box.left),
        frameRight: Math.round(box.right),
        columnLeft: Math.round(column.left + parseFloat(style.paddingLeft || "0")),
        columnRight: Math.round(column.right - parseFloat(style.paddingRight || "0")),
        lineLeft: Math.round(lines[0].left),
        lineRight: Math.round(lines[0].right),
        lines: lines.length,
      };
    },
    { frameSel: INFOBOX, editorSel: EDITOR },
  );
}

/** The rows of the page's contents block, top to bottom. Phase 19.5. */
export async function contentsRows(window: Page): Promise<string[]> {
  return (await window.locator(`${PAGE_CONTENTS} button`).allTextContents()).map(normalize);
}

/**
 * Opens a block's own menu — the one on the handle beside it — and reads what
 * it offers, top to bottom. Phase 19.5.
 *
 * **Read rather than clicked.** The item this was written for copies a link,
 * and copying in the app suite would overwrite whatever the person running the
 * tests had on their clipboard; docs/handoff.md forbids the same thing for
 * Ctrl+C. What a scenario can check is that it is offered.
 */
export async function editorBlockMenuItems(window: Page, at: number): Promise<string[]> {
  const block = window.locator(`${EDITOR} ${EDITOR_BLOCK}`).nth(at);
  await block.waitFor({ state: "visible", timeout: WAIT_MS });
  await block.hover();
  await window.locator(`${BLOCK_SIDE_MENU} button`).last().click();
  const menu = window.locator(EDITOR_BLOCK_MENU).first();
  await menu.waitFor({ state: "visible", timeout: WAIT_MS });
  const items = (await menu.locator("[role='menuitem'], button").allTextContents()).map(normalize);
  await window.keyboard.press("Escape");
  return items.filter((item) => item.length > 0);
}

/** How many of the page's links go to a spot on a page rather than to a page. */
export async function spotLinkCount(window: Page): Promise<number> {
  return window.locator(`${EDITOR} ${EDITOR_MENTION_SPOT}`).count();
}

/**
 * Clicks a link in the writing by the words it reads as. Phase 19.5.
 *
 * The one helper here that deliberately clicks inside the editor — see
 * `typeInEditor`, which avoids it for exactly this reason.
 */
export async function followPageLink(window: Page, text: string): Promise<void> {
  const chip = window.locator(EDITOR_MENTION).filter({ hasText: text }).first();
  await chip.waitFor({ state: "visible", timeout: WAIT_MS });
  await chip.click();
}

/**
 * The words of the block a link has just landed on, or null if nothing on
 * screen is marked. Phase 19.5.
 *
 * **Read through the mark rather than off it.** The mark is a box drawn over
 * the block and holds no words of its own — see BlockAnchor.tsx — so this asks
 * what is underneath it, which is also the only question worth asking: a mark
 * sitting over the wrong paragraph would pass any test of its own contents.
 *
 * **Read straight after following the link**, with nothing waited for in
 * between: it takes itself off after a couple of seconds.
 */
export async function arrivedBlockText(window: Page): Promise<string | null> {
  // **The block is found by matching rectangles, not by asking what is under a
  // point.** `elementFromPoint` answers null for anything outside the window,
  // so a mark on a block below the fold reads as no mark at all — which is how
  // this passed here and failed on CI, where the window is a different shape.
  //
  // **Measured and matched in one call, inside the page.** The mark moves while
  // the page is still scrolling, so a rectangle fetched in one call and asked
  // about in the next can name the paragraph above it.
  const readMarkedBlock = () =>
    window.evaluate((mark: string) => {
      const box = document.querySelector(mark);
      if (!box) return null;
      const over = box.getBoundingClientRect();
      // No size yet: it is drawn a frame before it is measured and placed.
      if (over.width === 0) return null;
      let best: Element | null = null;
      let closest = Infinity;
      for (const block of document.querySelectorAll(".bn-editor [data-id]")) {
        const rect = block.getBoundingClientRect();
        const gap = Math.abs(rect.top - over.top) + Math.abs(rect.left - over.left) + Math.abs(rect.height - over.height);
        if (gap < closest) {
          closest = gap;
          best = block;
        }
      }
      // The mark is drawn *as* a block's rectangle, so the one it belongs to is
      // an exact match give or take a rounding error. Anything else means it is
      // sitting over nothing, which is worth reporting as nothing.
      return closest <= 4 ? (best?.textContent ?? null) : null;
    }, BLOCK_ARRIVAL);

  // **Polled, because the mark takes itself off after a couple of seconds** —
  // a slow machine can spend most of that window getting here, which is how a
  // single sample failed on CI rather than on anything the app did.
  const deadline = Date.now() + 1500;
  for (;;) {
    const found = await readMarkedBlock();
    if (found !== null) return normalize(found);
    if (Date.now() > deadline) return null;
    await window.waitForTimeout(50);
  }
}

/**
 * Whether a block is marked at all, whatever it is sitting over. Phase 19.5.
 *
 * Its own helper so a scenario can tell "nothing was marked" apart from "the
 * wrong block was marked" — the two look identical through `arrivedBlockText`,
 * and they are different bugs.
 */
export async function arrivalMarkShown(window: Page): Promise<boolean> {
  const deadline = Date.now() + 1500;
  for (;;) {
    if ((await window.locator(BLOCK_ARRIVAL).count()) > 0) return true;
    if (Date.now() > deadline) return false;
    await window.waitForTimeout(50);
  }
}

/**
 * Whether a block with these words is inside the window as it stands.
 *
 * What "scrolled to it" means from outside: the page moved far enough that the
 * thing being linked to is somewhere a person could read it.
 */
export async function blockInView(window: Page, text: string): Promise<boolean> {
  const block = window.locator(`${EDITOR} ${EDITOR_BLOCK}`).filter({ hasText: text }).first();
  if ((await block.count()) === 0) return false;
  // **Asked of the page rather than of Playwright.** `viewportSize()` is null
  // for a window the harness did not size itself, which is every Electron
  // window here — and a helper reading it would answer "no" to everything.
  const height = await window.evaluate(() => window.innerHeight);
  if (!height) return false;
  // Given a moment, because the scroll that brings a block into view is
  // animated and a slow machine takes longer over it than a fast one.
  const deadline = Date.now() + 1500;
  for (;;) {
    const box = await block.boundingBox();
    if (box && box.y >= 0 && box.y + box.height <= height) return true;
    if (Date.now() > deadline) return false;
    await window.waitForTimeout(50);
  }
}

/** The icons in the picker's Recent row, newest first. Phase 19.5. */
export async function recentIcons(window: Page): Promise<string[]> {
  const buttons = await window.locator(".icon-picker-recent button").all();
  return Promise.all(buttons.map(async (button) => (await button.getAttribute("aria-label")) ?? ""));
}

/** What one infobox's text block is holding. */
export async function infoboxText(window: Page, at = 0): Promise<string> {
  return window.locator(INFOBOX).nth(at).locator("textarea").first().inputValue();
}

/** The section headings in the infobox's own Add Block menu, top to bottom. */
export async function infoboxAddHeadings(window: Page): Promise<string[]> {
  await openInfoboxAddMenu(window);
  const headings = await window.locator(`${BLOCK_ADD_MENU} ${MENU_HEADING}`).allTextContents();
  await closeMenu(window);
  return headings.map(normalize);
}

/**
 * The fields that menu is still offering — the page's own properties that no
 * block is showing yet.
 *
 * Read as "everything after the Properties heading" rather than by a class of
 * its own, because that is what the menu means by the section: the heading and
 * the run of buttons under it, with nothing marking where it ends.
 */
export async function propertiesOfferedByInfobox(window: Page): Promise<string[]> {
  await openInfoboxAddMenu(window);
  const offered = await window.locator(BLOCK_ADD_MENU).first().evaluate((menu, heading) => {
    const rows = [...menu.children];
    const at = rows.findIndex((row) => row.matches(heading) && row.textContent?.trim() === "Properties");
    if (at === -1) return [];
    return rows
      .slice(at + 1)
      .filter((row) => row.tagName === "BUTTON")
      .map((row) => row.textContent?.trim() ?? "")
      .filter((label) => label !== "+ New property");
  }, MENU_HEADING);
  await closeMenu(window);
  return offered;
}

async function openInfoboxAddMenu(window: Page): Promise<void> {
  await window.locator(".infobox-add").first().click();
  await window.waitForTimeout(300);
}

async function closeMenu(window: Page): Promise<void> {
  await window.keyboard.press("Escape");
  await window.waitForTimeout(200);
}

/**
 * How much of the writing column a block in the page is taking, 0 to 1.
 * Phase 19.5.
 *
 * A ratio rather than a pixel width, because the column itself depends on the
 * window and on how wide the two panels beside it have been dragged — the
 * question a scenario is asking is "half the page", never "364 pixels".
 */
export async function pageBlockWidthRatio(window: Page): Promise<number> {
  return widthRatio(window, BLOCK_FRAME, PAGE_BLOCK);
}

/** The same, for the page's first infobox. */
export async function infoboxWidthRatio(window: Page): Promise<number> {
  return widthRatio(window, INFOBOX, PAGE_INFOBOX);
}

async function widthRatio(window: Page, box: string, column: string): Promise<number> {
  const inner = await window.locator(box).first().boundingBox();
  const outer = await window.locator(column).first().boundingBox();
  if (!inner || !outer || outer.width === 0) throw new Error(`nothing to measure at ${box}`);
  return inner.width / outer.width;
}

/**
 * Drags one edge of a block in the page until it is `ratio` of the column
 * wide. Phase 19.5.
 *
 * **A real press, move and release rather than a synthetic event**, because
 * that is the whole feature: the handle takes pointer capture on the way down
 * and the block is redrawn on every move. `side` is which edge to take hold
 * of — the left one is mirrored, so both widen the block away from the page.
 */
export async function dragBlockEdge(
  window: Page,
  side: "left" | "right",
  ratio: number,
  box: string = BLOCK_FRAME,
): Promise<void> {
  const frame = window.locator(box).first();
  await frame.hover();
  const handle = await window.locator(`${box} .block-width-${side}`).first().boundingBox();
  const start = await frame.boundingBox();
  const column = await window.locator(box === INFOBOX ? PAGE_INFOBOX : PAGE_BLOCK).first().boundingBox();
  if (!handle || !start || !column) throw new Error("no width handle to drag");

  // How far the pointer has to travel is the difference between the width the
  // block has and the width it is wanted at — and the left handle travels the
  // other way for the same result, which is the mirroring being exercised.
  const y = handle.y + handle.height / 2;
  const from = handle.x + handle.width / 2;
  const grown = column.width * ratio - start.width;
  const target = side === "right" ? from + grown : from - grown;
  await window.mouse.move(from, y);
  await window.mouse.down();
  await window.mouse.move(target, y, { steps: 10 });
  await window.mouse.up();
  await window.waitForTimeout(400);
}

/** The same, for the page's first infobox. */
export async function dragInfoboxEdge(window: Page, side: "left" | "right", ratio: number): Promise<void> {
  await dragBlockEdge(window, side, ratio, INFOBOX);
}

/**
 * Puts the keyboard on one of a block's width handles, for the arrow keys and
 * Home. Phase 19.5 — dragging must not be the only way to set a width.
 */
export async function focusBlockWidthHandle(window: Page, side: "left" | "right"): Promise<void> {
  await window.locator(BLOCK_FRAME).first().hover();
  await window.locator(`${BLOCK_FRAME} .block-width-${side}`).first().focus();
}

/**
 * Opens one sidebar block's `⋯` menu, named by the heading the block is showing.
 *
 * By label rather than by class, for the reason `openSettings` gives: the
 * button is already labelled for screen readers, so this hook cannot rot
 * without the accessibility rotting with it.
 *
 * **Rooted at the panel, the same way `panelBlockTitles` is and for the same
 * reason.** A block in the writing draws the same shell with the same label, so
 * an unrooted lookup takes whichever the DOM holds first — which since Phase
 * 19.5 is the one in the page. `openPageBlockMenu` is the other half.
 */
export async function openBlockMenu(window: Page, title: string): Promise<void> {
  await window.locator(BLOCK_PANEL).getByLabel(`${title} block options`, { exact: true }).first().click();
}

/**
 * Opens the `⋯` menu of a block drawn in the *writing*, named by its heading.
 *
 * Separate from `openBlockMenu` because the two can be showing the same
 * heading at once — a picture block in the page and the sidebar's own are both
 * called Image — and an unrooted lookup would take whichever the DOM happens to
 * hold first. Phase 19.5.
 */
export async function openPageBlockMenu(window: Page, title: string): Promise<void> {
  await window.locator(PAGE_BLOCK).getByLabel(`${title} block options`, { exact: true }).first().click();
}

/** What the open block menu is offering, top to bottom. */
export async function blockMenuItems(window: Page): Promise<string[]> {
  return (await window.locator(`${BLOCK_MENU} button`).allTextContents()).map(normalize);
}

/**
 * Clicks into the open page's writing area and types, one key at a time.
 *
 * **Typed rather than filled, always.** Everything interesting about the editor
 * is keystroke-driven — the `/` menu, `@` mentions, the `[[` link trigger — and
 * setting the text in one go produces the same characters with none of the
 * behaviour, which is a scenario that passes while the feature is dead.
 */
export async function typeInEditor(window: Page, text: string): Promise<void> {
  const editor = window.locator(EDITOR).first();
  await editor.waitFor({ state: "visible", timeout: WAIT_MS });
  // **Never click the middle of the editor.** Playwright's default is the
  // centre of the element, and the centre of a page is prose — including any
  // link chips in it, which navigate when clicked. A scenario that wrote a link
  // and then typed again would silently be typing on a different page. The top
  // corner is text or padding whatever the page holds; Ctrl+End then puts the
  // cursor after everything, which is where someone adding a line would be.
  await editor.click({ position: { x: 8, y: 8 } });
  await window.keyboard.press("Control+End");
  await window.keyboard.type(text, { delay: 20 });
}

/**
 * Types at the **start of a line** in the open page.
 *
 * **Its own helper because a `/` only means a command at the start of one** —
 * see `slash-trigger.ts` — so a scenario about the command menu has to be sure
 * it is really there.
 *
 * It gets there with `Home` rather than by making a new line, and that is worth
 * knowing: **pressing `Enter` from here does not add a block.** Measured
 * 2026-08-28, and not chased down, because a scenario built on a keystroke that
 * silently does nothing passes or fails for reasons unrelated to what it is
 * testing. `Home` moves the caret to the front of whatever line it is already
 * on, which is the state under test, and it works.
 */
export async function typeAtLineStartInEditor(window: Page, text: string): Promise<void> {
  await typeInEditor(window, "");
  await window.keyboard.press("Home");
  await window.keyboard.type(text, { delay: 20 });
}

/** Whether the bold/italic strip is on screen right now, floating or fixed. */
export async function formattingBarShown(window: Page): Promise<boolean> {
  return (await window.locator(FORMATTING_BAR).count()) > 0;
}

/**
 * The formatting bar's button groups, in order, as the page has actually laid
 * them out.
 *
 * **`shown` and `rule` are both computed rather than inferred**, because the
 * thing worth checking is precisely that CSS reached the right answer: a group
 * whose buttons all hid themselves must leave the layout, and the hairline
 * between groups must fall only where a *visible* group follows another one.
 * The bar's contents change with the selection — a picture and a paragraph get
 * different strips — so a scenario that counted dividers would be right for one
 * selection and wrong for the next.
 */
export async function formattingBarGroups(window: Page): Promise<{ buttons: number; shown: boolean; rule: boolean }[]> {
  return window.evaluate(() =>
    [...document.querySelectorAll(".editor-toolbar-group")].map((group) => ({
      buttons: group.childElementCount,
      shown: getComputedStyle(group).display !== "none",
      rule: parseFloat(getComputedStyle(group).borderLeftWidth) > 0,
    })),
  );
}

/**
 * How many icons are sitting in the open page's writing.
 *
 * A count rather than a list, because an icon has no text to read back — what a
 * scenario can check is that one arrived, or that a colon somewhere did not
 * quietly put one there.
 */
export async function inlineIconCount(window: Page): Promise<number> {
  return window.locator(EDITOR_INLINE_ICON).count();
}

/** Whether the icon picker — tabs, search box and grid — is on screen right now. */
export async function iconPickerOpen(window: Page): Promise<boolean> {
  return (await window.locator(ICON_PICKER).count()) > 0;
}

/** Types into the icon picker's own search box, which is where its filtering lives. */
export async function searchIcons(window: Page, text: string): Promise<void> {
  await window.getByPlaceholder("Search icons").fill(text);
}

/** Chooses an icon out of the picker's grid by its name. */
export async function pickIcon(window: Page, name: string): Promise<void> {
  await window.getByLabel(name, { exact: true }).first().click();
}

/** Whether the `/` (or `@`, or `[[`) suggestion menu is on screen right now. */
export async function suggestionMenuOpen(window: Page): Promise<boolean> {
  return (await window.locator(SUGGESTION_MENU).count()) > 0;
}

/**
 * Where the suggestion menu is, against the window it has to fit in.
 *
 * **The reason this exists is that "the menu is open" was the only thing any
 * scenario could say about it**, and a menu hanging off the bottom of the
 * window is open, correct and unusable. Everything here is in window
 * coordinates so a scenario can assert the box is really on screen.
 */
export async function suggestionMenuBox(
  window: Page,
): Promise<{ top: number; bottom: number; height: number; windowHeight: number } | null> {
  return window.evaluate((selector) => {
    const menu = document.querySelector(selector);
    if (!menu) return null;
    // The wrapper is what floating-ui positions and sizes; the menu fills it.
    const box = (menu.parentElement ?? menu).getBoundingClientRect();
    return {
      top: Math.round(box.top),
      bottom: Math.round(box.bottom),
      height: Math.round(box.height),
      windowHeight: globalThis.innerHeight,
    };
  }, SUGGESTION_MENU);
}

/** The options the suggestion menu is currently offering, top to bottom. */
export async function suggestionMenuItems(window: Page): Promise<string[]> {
  // **`innerText`, not `textContent`.** An option is a title and a line of
  // explanation in two elements; `textContent` runs them together into
  // `IconA picture in a sentence`, which matches nothing anybody would name.
  // `innerText` puts the line break in and `normalize` turns it into a space.
  const parts = window.locator(`${SUGGESTION_MENU} .bn-suggestion-menu-item`);
  const count = await parts.count();
  const items: string[] = [];
  for (let i = 0; i < count; i += 1) items.push(normalize(await parts.nth(i).innerText()));
  return items;
}

/**
 * Chooses the suggestion-menu option whose label is exactly `label`.
 *
 * **`.bn-suggestion-menu-item` is not one element per option.** Measured
 * 2026-09-01: the shadcn menu puts that class on the option's outer row *and*
 * on its icon, its title and its subtext, so one option is four matches and
 * two of them have no text at all. Matching on the text and taking the last
 * hit lands on the innermost element of the right option, which is inside the
 * row that handles the click.
 *
 * The symptom when a scenario picks the wrong element is not an error: the
 * menu closes, nothing is inserted, and it fails several lines later on a
 * count.
 *
 * Exact rather than substring, because these lists really do hold a `sword`
 * and a `swords`, and picking whichever came first would test nothing. An
 * option with a subtext reads as its title, a space, then the subtext.
 */
export async function pickSuggestion(window: Page, label: string): Promise<void> {
  const parts = window.locator(`${SUGGESTION_MENU} .bn-suggestion-menu-item`);
  await parts.first().waitFor({ state: "visible", timeout: WAIT_MS });
  const count = await parts.count();
  let found = -1;
  for (let i = 0; i < count; i += 1) {
    // See `suggestionMenuItems` on why this is `innerText`.
    const text = normalize(await parts.nth(i).innerText());
    if (text === label || text.startsWith(`${label} `)) found = i;
  }
  if (found < 0) {
    throw new Error(`No suggestion called "${label}". The menu offered: ${(await suggestionMenuItems(window)).join(", ")}`);
  }
  await parts.nth(found).click();
}

/** Everything written in the open page's editor, as one run of text. */
export async function editorText(window: Page): Promise<string> {
  return normalize((await window.locator(EDITOR).first().textContent()) ?? "");
}

/** The page links written into the open page, in the order they appear in it. */
export async function editorMentions(window: Page): Promise<string[]> {
  const chips = await window.locator(EDITOR_MENTION).allTextContents();
  return chips.map(normalize);
}

/**
 * Opens the settings dialog and waits for it.
 *
 * By role and label rather than by class, unlike everything above it: the cog
 * and the rail are already labelled for screen readers, and a test hook that
 * is the accessibility name cannot rot without the accessibility rotting with
 * it.
 */
export async function openSettings(window: Page): Promise<void> {
  await window.getByLabel("Settings", { exact: true }).first().click();
  await window.getByRole("dialog").waitFor({ state: "visible", timeout: WAIT_MS });
}

/** Switches to one of the sections down the left of the settings dialog. */
export async function openSettingsSection(window: Page, name: string): Promise<void> {
  await window.getByRole("tab", { name, exact: true }).click();
}

/** Collapses runs of whitespace, the way the browser already has by render time. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Whether the page on screen is being shown as a database. */
export async function hasDatabase(window: Page): Promise<boolean> {
  return (await window.locator(DATABASE_VIEW).count()) > 0;
}

/**
 * The table's column headings, left to right.
 *
 * Read off the header row rather than derived from a template, because the
 * whole question a table answers is which properties it decided to show — a
 * scenario that computed the expected list the same way the app does would
 * agree with a bug.
 */
export async function databaseColumns(window: Page): Promise<string[]> {
  const headings = await window.locator(`${DATABASE_TABLE} thead th`).allInnerTexts();
  return headings.map((heading) => normalize(heading));
}

/** The names of the pages the table is showing as rows, in the order drawn. */
export async function databaseRowNames(window: Page): Promise<string[]> {
  const names = await window.locator(`${DATABASE_TABLE} ${DATABASE_ROW_NAME}`).allInnerTexts();
  return names.map((name) => normalize(name));
}

/** Clicks a row's name, which is the way from a table into a page. */
export async function openDatabaseRow(window: Page, name: string): Promise<void> {
  await window.locator(DATABASE_ROW_NAME).filter({ hasText: name }).first().click();
  await waitForPageTitle(window, name);
}

/**
 * The line above the table saying how many pages it is showing.
 *
 * Worth reading rather than counting rows, because it is the only thing that
 * distinguishes a filter hiding six pages from a folder that holds three.
 */
export async function databaseCount(window: Page): Promise<string> {
  return normalize(await window.locator(DATABASE_META).innerText());
}

/**
 * Opens one of the settings menus above a table: "columns", "filter", "sort"
 * or "group".
 *
 * By attribute rather than by the button's name, because a setting that is
 * doing something wears a count — the Filter button is called "Filter 1" the
 * moment it has a filter on it — and the label is uppercased by CSS besides.
 */
export async function openDatabaseMenu(window: Page, tool: string): Promise<void> {
  await window.locator(`${DATABASE_TOOL}[data-tool="${tool}"]`).click();
  await window.locator(DATABASE_MENU).first().waitFor({ state: "visible", timeout: WAIT_MS });
}

/**
 * Presses a database menu's own button again, which is how a menu is closed
 * by the hand that opened it, and waits for it to be gone.
 */
export async function closeDatabaseMenuFromItsButton(window: Page, tool: string): Promise<void> {
  await window.locator(`${DATABASE_TOOL}[data-tool="${tool}"]`).click();
  await window.locator(DATABASE_MENU).waitFor({ state: "detached", timeout: WAIT_MS });
}

/** Turns a database's first sort round, A–Z to Z–A or back. */
export async function flipDatabaseSort(window: Page): Promise<void> {
  await window.locator(DATABASE_DIRECTION).first().click();
}

/** The section headings a grouped table is showing, in the order drawn. */
export async function databaseGroupLabels(window: Page): Promise<string[]> {
  const labels = await window.locator(DATABASE_GROUP_LABEL).allInnerTexts();
  return labels.map((label) => normalize(label));
}

/**
 * One editable cell of a database, by its column and its row.
 *
 * Found by the label the cell carries for a screen reader — "Rank for Kalla
 * Reyes" — which is the same thing that makes the grid usable without a mouse,
 * so a scenario that could not find it would be reporting a real problem.
 */
export function databaseCellField(window: Page, columnLabel: string, rowName: string): Locator {
  return window.getByLabel(`${columnLabel} for ${rowName}`);
}

/** Switches a database to one of its four layouts, by the name in the menu. */
export async function pickDatabaseLayout(window: Page, name: string): Promise<void> {
  await openDatabaseMenu(window, "layout");
  await window.locator(DATABASE_LAYOUT_ITEM).filter({ hasText: name }).first().click();
  await window.keyboard.press("Escape");
  await window.locator(DATABASE_MENU).first().waitFor({ state: "hidden", timeout: WAIT_MS });
}

/** The names on a cards layout, in the order drawn. */
export async function databaseCardNames(window: Page): Promise<string[]> {
  const names = await window.locator(`${DATABASE_CARD} .database-card-name`).allInnerTexts();
  return names.map((name) => normalize(name));
}

/** The names on a list layout, in the order drawn. */
export async function databaseListNames(window: Page): Promise<string[]> {
  const names = await window.locator(`${DATABASE_LIST_ROW} .database-list-name`).allInnerTexts();
  return names.map((name) => normalize(name));
}

/** A board's column headings, in the order drawn. */
export async function databaseBoardColumns(window: Page): Promise<string[]> {
  const labels = await window.locator(`${DATABASE_BOARD_COLUMN} .database-group-heading .database-chip`).allInnerTexts();
  return labels.map((label) => normalize(label));
}

/** The names of the cards sitting in one of a board's columns. */
export async function databaseBoardCards(window: Page, columnLabel: string): Promise<string[]> {
  const column = window.locator(DATABASE_BOARD_COLUMN).filter({ hasText: columnLabel }).first();
  const names = await column.locator(".database-card-name").allInnerTexts();
  return names.map((name) => normalize(name));
}

/**
 * Drags a board card into another column.
 *
 * **Dispatched rather than mimed with the mouse.** HTML5 drag and drop is not
 * driven by plain mouse events, so moving the pointer across the screen would
 * prove nothing about whether a real drag lands — the events and the
 * `DataTransfer` they carry are the actual contract between the card and the
 * column.
 */
export async function dragDatabaseCard(window: Page, cardName: string, intoColumn: string): Promise<void> {
  const card = window.locator(".database-board-card").filter({ hasText: cardName }).first();
  const column = window.locator(DATABASE_BOARD_COLUMN).filter({ hasText: intoColumn }).first();

  const dataTransfer = await window.evaluateHandle(() => new DataTransfer());
  await card.dispatchEvent("dragstart", { dataTransfer });
  await column.dispatchEvent("dragover", { dataTransfer });
  await column.dispatchEvent("drop", { dataTransfer });
}

/** Right-clicks a tree row and returns once its menu is up. */
export async function openTreeRowMenu(window: Page, rowName: string): Promise<void> {
  await searchTree(window, rowName);
  await treeRow(window, rowName).first().click({ button: "right" });
  await window.locator(TREE_CONTEXT_MENU).first().waitFor({ state: "visible", timeout: WAIT_MS });
}

/** The labels the open row menu is offering, so a missing item is a real absence. */
export async function treeMenuItems(window: Page): Promise<string[]> {
  const labels = await window.locator(`${TREE_CONTEXT_MENU} button`).allInnerTexts();
  return labels.map((label) => normalize(label));
}

/**
 * Shows a page as a database, in one of the four layouts.
 *
 * Here rather than in each scenario because the route changed shape once
 * already: it was a flat "Turn into a table" while Table was the only layout
 * and became a submenu at step 4, which broke every scenario that knew the old
 * wording. One place to change is the whole reason this file exists.
 */
export async function turnIntoDatabase(window: Page, rowName: string, layout = "Table"): Promise<void> {
  await openTreeRowMenu(window, rowName);
  // Scoped to the menu, because the layout names are not unique on screen: the
  // toolbar above an open database wears the name of the layout it is showing,
  // so a bare "Table" matches two things the moment one is open behind the tree.
  const menu = window.locator(TREE_CONTEXT_MENU).first();
  await menu.getByRole("button", { name: "Turn Into", exact: true }).click();
  await menu.getByRole("button", { name: layout, exact: true }).click();
}

/** Puts a database back to being an ordinary page. */
export async function stopShowingAsDatabase(window: Page, rowName: string): Promise<void> {
  await openTreeRowMenu(window, rowName);
  await window.locator(TREE_CONTEXT_MENU).first().getByRole("button", { name: "Stop Showing as a Database" }).click();
}

/**
 * Opens a folder's graph from its own card, which is the only way in there — a
 * folder has no title row to carry the button every other page uses.
 */
export async function openFolderGraph(window: Page): Promise<void> {
  await window.getByRole("button", { name: "See Connections" }).click();
  await window.locator(GRAPH).waitFor({ state: "visible", timeout: WAIT_MS });
  await waitForGraphSettled(window);
}

/** Opens the graph from the button beside the open page’s name. */
export async function openPageGraph(window: Page): Promise<void> {
  await window.locator(GRAPH_BUTTON).first().click();
  await window.locator(GRAPH).waitFor({ state: "visible", timeout: WAIT_MS });
  await waitForGraphSettled(window);
}

/**
 * Opens the whole-universe graph from the rail, which is the other of the two
 * doors — see docs/shipped.md Phase 24 step 3.
 */
export async function openWorldGraph(window: Page): Promise<void> {
  await window.locator(LEFT_RAIL).getByRole("button", { name: "Graph", exact: true }).click();
  await window.locator(GRAPH).waitFor({ state: "visible", timeout: WAIT_MS });
  await waitForGraphSettled(window);
}

/**
 * Waits for the picture to be the one the controls currently ask for.
 *
 * The layout is worked out off the window's thread since the big-world pass,
 * and the last picture stays up meanwhile — so a read straight after a
 * control changed would read the old one. Every helper that reads the graph
 * goes through this first.
 */
export async function waitForGraphSettled(window: Page): Promise<void> {
  await window.locator(`${GRAPH_SCENE}[data-settled="true"]`).first().waitFor({ state: "attached", timeout: WAIT_MS });
}

/** What the graph calls itself, which says which of the two is up. */
export async function graphHeading(window: Page): Promise<string> {
  return normalize(await window.locator(GRAPH_HEADING).first().innerText());
}

/** Whether the picture is far enough out that names are being held back. */
export async function graphNamesAreQuiet(window: Page): Promise<boolean> {
  await waitForGraphSettled(window);
  const scene = window.locator(GRAPH_SCENE).first();
  return (await scene.getAttribute("class"))?.includes("page-graph-scene-small") ?? false;
}

/** Whether the graph is over the page right now. */
export async function graphIsOpen(window: Page): Promise<boolean> {
  return (await window.locator(GRAPH).count()) > 0;
}

/** Closes it with the key, which is the route a scenario should prefer testing. */
export async function closePageGraph(window: Page): Promise<void> {
  await window.keyboard.press("Escape");
  await window.locator(GRAPH).waitFor({ state: "detached", timeout: WAIT_MS });
}

/**
 * Every page drawn on the graph, the focused one included.
 *
 * **Read off the node's own title rather than the label under it**, because
 * past a certain zoom that label is not drawn at all — see GRAPH_NAME_ZOOM. The
 * title is what the node carries whether or not its name is currently written
 * out, and it is what a hover shows, so this answers "which pages are on the
 * graph" at every zoom rather than only at the readable ones.
 *
 * **It is not that the text would come back empty.** An element that is not
 * rendered returns its `textContent` from `innerText`, by the HTML spec, so
 * reading the label would keep working and quietly stop meaning what it says.
 * That is the more dangerous of the two failures, and it is why the question
 * "is it written on screen" belongs to `graphWrittenNames`, which asks about
 * boxes rather than about text.
 */
export async function graphNodeNames(window: Page): Promise<string[]> {
  await waitForGraphSettled(window);
  const titles = await window.locator(GRAPH_NODE).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("title") ?? ""),
  );
  return titles.map((name) => normalize(name));
}

/**
 * Zooms the graph out by rolling the wheel over it, which is the only route to
 * the far-out picture — the fit never starts below the size names are readable
 * at, and a world would have to be several times the test world's before it
 * did. One notch is deliberately small (see GRAPH_ZOOM_SENSITIVITY), so this
 * takes a number of them.
 */
export async function zoomGraphOut(window: Page, notches = 4): Promise<void> {
  await wheelOverGraph(window, notches, 300);
}

/**
 * Zooms in with the pointer held on one page, which is what the wheel is
 * meant to zoom toward. Waits for the glide to land.
 */
export async function zoomGraphInAt(window: Page, name: string, notches: number): Promise<void> {
  const at = await graphNodeCentre(window, name);
  await window.mouse.move(at.x, at.y);
  for (let i = 0; i < notches; i += 1) await window.mouse.wheel(0, -120);
  await waitForGlide(window);
}

/**
 * Starts recording the zoom the picture is drawn at, once per animation
 * frame, until `graphZoomFrames` collects it. For asking whether a glide ever
 * moved the wrong way, which a read at the end cannot answer.
 */
export async function recordGraphZoomFrames(window: Page): Promise<void> {
  await window.locator(GRAPH_SCENE).first().evaluate((scene) => {
    const log: number[] = [];
    (window as unknown as { __graphZoomFrames: number[] }).__graphZoomFrames = log;
    const tick = () => {
      const scale = /scale\(([\d.]+)\)/.exec((scene as HTMLElement).style.transform);
      if (scale) log.push(Number(scale[1]));
      if ((window as unknown as { __graphZoomFrames?: number[] }).__graphZoomFrames === log) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** The zooms recorded since `recordGraphZoomFrames`, and stops recording. */
export async function graphZoomFrames(window: Page): Promise<number[]> {
  return window.evaluate(() => {
    const holder = window as unknown as { __graphZoomFrames?: number[] };
    const log = holder.__graphZoomFrames ?? [];
    delete holder.__graphZoomFrames;
    return log;
  });
}

/** The zoom the picture is drawn at, read off the scene's transform. */
export async function graphZoom(window: Page): Promise<number> {
  const transform = await window.locator(GRAPH_SCENE).first().evaluate((scene) => (scene as HTMLElement).style.transform);
  const scale = /scale\(([\d.]+)\)/.exec(transform);
  if (!scale) throw new Error(`The scene's transform has no scale in it: ${transform}`);
  return Number(scale[1]);
}

/**
 * Waits for the wheel's glide to land. A fixed wait measured the middle of
 * the movement on CI, where a window off the screen gets its animation
 * frames late; the scene says when it has landed.
 */
export async function waitForGlide(window: Page): Promise<void> {
  await window.locator(`${GRAPH_SCENE}[data-zooming="false"]`).first().waitFor({ state: "attached", timeout: WAIT_MS });
}

/** The other way. Same notches, same reason they are small. */
export async function zoomGraphIn(window: Page, notches = 4): Promise<void> {
  await wheelOverGraph(window, notches, -300);
}

async function wheelOverGraph(window: Page, notches: number, delta: number): Promise<void> {
  const box = await window.locator(GRAPH_STAGE).first().boundingBox();
  if (!box) throw new Error("The graph has no stage to zoom");
  await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < notches; i += 1) await window.mouse.wheel(0, delta);
  // The wheel glides since the big-world pass; a read before it lands is a
  // read of the middle of a movement.
  await waitForGlide(window);
}

/**
 * The names actually drawn on screen, which is none once it is zoomed far out.
 *
 * **Asks whether the element has a box, not what text it holds.** `innerText`
 * on something with `display: none` returns its `textContent` rather than
 * nothing, so a check written on the text would report every name as present
 * while the screen showed none of them.
 */
export async function graphWrittenNames(window: Page): Promise<string[]> {
  const names = await window.locator(`${GRAPH_NODE} ${GRAPH_NODE_NAME}`).evaluateAll((labels) =>
    labels.filter((label) => label.getClientRects().length > 0).map((label) => label.textContent ?? ""),
  );
  return names.map((name) => normalize(name)).filter(Boolean);
}

/** The page in the middle — the one whose graph this is. */
export async function graphFocusName(window: Page): Promise<string> {
  return normalize(await window.locator(`${GRAPH_NODE_FOCUS} ${GRAPH_NODE_NAME}`).first().innerText());
}

/**
 * How many lines of each kind are drawn.
 *
 * The split is the point rather than the totals: a line she wrote and a line
 * that is only where the page was filed have to be distinguishable, which is
 * exactly what a unit test on the model cannot check.
 */
export async function graphEdgeCounts(window: Page): Promise<{ written: number; tree: number }> {
  await waitForGraphSettled(window);
  // The lines are painted on a canvas since the big-world pass, so they are
  // counted from what it says it drew rather than from elements.
  const canvas = window.locator(GRAPH_EDGES_CANVAS).first();
  return {
    written: Number(await canvas.getAttribute("data-written")),
    tree: Number(await canvas.getAttribute("data-tree")),
  };
}

function graphNode(window: Page, name: string): Locator {
  return window.locator(GRAPH_NODE).filter({ hasText: name }).first();
}

/** Clicks a page on the graph, which should open its preview and nothing else. */
export async function clickGraphNode(window: Page, name: string): Promise<void> {
  await waitForGraphSettled(window);
  // The mouse at the node's centre rather than a click on its element: while
  // the pages are dots the buttons take no pointer events and the stage finds
  // the nearest dot itself, which is what she does with a real mouse too.
  const at = await graphNodeCentre(window, name);
  await window.mouse.click(at.x, at.y);
}

/** Where a node sits on screen, for asserting a drag moved it. */
export async function graphNodeCentre(window: Page, name: string): Promise<{ x: number; y: number }> {
  await waitForGraphSettled(window);
  const box = await graphNode(window, name).boundingBox();
  if (!box) throw new Error(`No node on the graph called ${name}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Every node's position at once, as a fraction of the box they all occupy.
 *
 * **One call rather than one per page.** Comparing two drawings of a
 * seventy-page world by asking for each node in turn is seventy round trips and
 * seventy chances for a name to be looked up under a spelling that no longer
 * matches — which is exactly what went wrong the first time this comparison was
 * written. Reading the whole picture in one go removes the lookup entirely.
 *
 * Fractions rather than pixels for the reason `graphNodePlacement` gives: the
 * graph scales to fit its window. Here the frame is every node, which is right
 * for comparing two complete drawings of the same set.
 */
export async function graphPlacements(window: Page): Promise<Record<string, { x: number; y: number }>> {
  await waitForGraphSettled(window);
  return window.locator(GRAPH_NODE).evaluateAll((nodes) => {
    const tidy = (value: string) => value.replace(/\s+/g, " ").trim();
    const boxes = nodes.map((node) => ({
      title: tidy(node.getAttribute("title") ?? ""),
      rect: node.getBoundingClientRect(),
    }));
    if (boxes.length === 0) return {};
    const left = Math.min(...boxes.map((box) => box.rect.left));
    const right = Math.max(...boxes.map((box) => box.rect.right));
    const top = Math.min(...boxes.map((box) => box.rect.top));
    const bottom = Math.max(...boxes.map((box) => box.rect.bottom));
    const width = right - left || 1;
    const height = bottom - top || 1;
    const places: Record<string, { x: number; y: number }> = {};
    for (const box of boxes) {
      places[box.title] = {
        x: (box.rect.left + box.rect.width / 2 - left) / width,
        y: (box.rect.top + box.rect.height / 2 - top) / height,
      };
    }
    return places;
  });
}

/**
 * Where one node sits, as a fraction of the box the *other* nodes occupy.
 *
 * **Screen pixels cannot answer "did it stay where I put it".** The graph
 * scales to fit its window, so moving a node outward grows what has to fit and
 * every coordinate on screen shifts — by a little on a large window and a lot
 * on a small one, which is how a comparison written in pixels passes here and
 * fails on a CI runner with a different screen. Everything in this frame is
 * divided by the same rescale, so it falls out.
 *
 * The frame deliberately excludes the node being asked about: it would
 * otherwise help define the box it is being measured against, and a node
 * dragged to the edge would report the same fraction wherever it went. The rest
 * of the graph does re-settle a little around a newly pinned node, so this is a
 * good ruler rather than a perfect one — compare with a tolerance.
 */
/**
 * Where a node sits in the graph's own coordinates — the numbers the layout
 * put it at, or the ones it was dropped at, before any zoom or fit.
 *
 * **Exact where graphNodePlacement is approximate.** A pinned node is written
 * to `project.json` as integers in this frame and read back as fixed points,
 * so "did it come back where it was dropped" has an exact answer here, and
 * none in pixels or in fractions of the rest of the picture — the rest
 * re-settles around a pin, and what counts as a node's box changed once
 * already (2026-09-13) and moved a fraction-based check across its tolerance.
 */
export async function graphNodeSpot(window: Page, name: string): Promise<{ x: number; y: number }> {
  await waitForGraphSettled(window);
  const node = graphNode(window, name).first();
  const spot = await node.evaluate((element) => ({
    x: parseFloat((element as HTMLElement).style.left),
    y: parseFloat((element as HTMLElement).style.top),
  }));
  if (!Number.isFinite(spot.x) || !Number.isFinite(spot.y)) throw new Error(`No node on the graph called ${name}`);
  return spot;
}

export async function graphNodePlacement(window: Page, name: string): Promise<{ x: number; y: number }> {
  await waitForGraphSettled(window);
  // **The name is matched here, not in the page.** Doing it in the browser meant
  // two copies of what counts as the same name, and a page whose title tidied
  // differently on the two sides was simply reported as absent. One read, one
  // matcher — the same `normalize` every other helper reports names through.
  const boxes = await window.locator(GRAPH_NODE).evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        title: node.getAttribute("title") ?? "",
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      };
    }),
  );

  const wanted = normalize(name);
  const target = boxes.find((box) => normalize(box.title) === wanted);
  const others = boxes.filter((box) => normalize(box.title) !== wanted);
  if (!target) throw new Error(`No node on the graph called ${name}`);
  if (others.length === 0) throw new Error(`Nothing to measure ${name} against`);

  const left = Math.min(...others.map((box) => box.left));
  const right = Math.max(...others.map((box) => box.right));
  const top = Math.min(...others.map((box) => box.top));
  const bottom = Math.max(...others.map((box) => box.bottom));
  return {
    x: (target.x - left) / (right - left || 1),
    y: (target.y - top) / (bottom - top || 1),
  };
}

/** Drags a node by a number of screen pixels, in steps so the move is seen. */
export async function dragGraphNode(window: Page, name: string, byX: number, byY: number): Promise<void> {
  await waitForGraphSettled(window);
  const from = await graphNodeCentre(window, name);
  await window.mouse.move(from.x, from.y);
  await window.mouse.down();
  await window.mouse.move(from.x + byX, from.y + byY, { steps: 10 });
  await window.mouse.up();
}

/**
 * The pages on the graph, ordered left to right.
 *
 * **Order rather than coordinates, because the picture rescales.** The graph
 * fits itself to the window, so moving one node changes the zoom and shifts
 * every other node on screen — a scenario comparing pixel positions across a
 * reload is measuring the fit, not the arrangement. Which page is furthest
 * right survives any amount of scaling.
 */
export async function graphNodesLeftToRight(window: Page): Promise<string[]> {
  await waitForGraphSettled(window);
  const nodes = window.locator(GRAPH_NODE);
  const placed: { name: string; x: number }[] = [];
  for (const node of await nodes.all()) {
    const box = await node.boundingBox();
    const name = await node.locator(GRAPH_NODE_NAME).innerText();
    if (box) placed.push({ name: normalize(name), x: box.x });
  }
  return placed.sort((a, b) => a.x - b.x).map((entry) => entry.name);
}

/** The name on the card beside the graph, or null while nothing is selected. */
export async function graphPreviewName(window: Page): Promise<string | null> {
  if ((await window.locator(GRAPH_PREVIEW).count()) === 0) return null;
  return normalize(await window.locator(GRAPH_PREVIEW_NAME).first().innerText());
}

/** Puts the card away by its own close button, leaving the graph up. */
export async function closeGraphPreview(window: Page): Promise<void> {
  await window.locator(GRAPH_PREVIEW).getByRole("button", { name: "Close this card" }).click();
  await window.locator(GRAPH_PREVIEW).waitFor({ state: "detached", timeout: WAIT_MS });
}

/** Follows the preview’s way through to the page it describes. */
export async function openGraphPreviewPage(window: Page): Promise<void> {
  await window.locator(GRAPH_PREVIEW).getByRole("button", { name: "Open This Page" }).click();
  await window.locator(GRAPH).waitFor({ state: "detached", timeout: WAIT_MS });
}

/** How many pages the graph says it is drawing, as the bar words it. */
export async function graphCount(window: Page): Promise<string> {
  await waitForGraphSettled(window);
  return normalize(await window.locator(GRAPH_COUNT).first().innerText());
}

/** Sets how far out the graph reaches, in connections. */
export async function setGraphReach(window: Page, connections: number | "everything"): Promise<void> {
  await window.getByLabel("How far out to reach").selectOption(String(connections));
}

/** Whether the reach control can be used at all — it cannot with no centre. */
export async function graphReachEnabled(window: Page): Promise<boolean> {
  return window.getByLabel("How far out to reach").isEnabled();
}

/** Chooses when a line says what it is — "selected" or "all". */
export async function setGraphLabels(window: Page, mode: "pointed" | "selected" | "all"): Promise<void> {
  await window.getByLabel("When to write what a line is").selectOption(mode);
}

/** The names written along lines right now, which is what the mode above decides. */
export async function graphEdgeLabels(window: Page): Promise<string[]> {
  await waitForGraphSettled(window);
  // textContent rather than innerText: these are SVG <text> nodes, which have
  // no innerText at all, so allInnerTexts hands back a list of undefined.
  return (await window.locator(GRAPH_EDGE_LABEL).allTextContents()).map((text) => normalize(text));
}

/** Opens the graph's filter menu and returns once it is up. */
export async function openGraphFilters(window: Page): Promise<void> {
  await window.locator(`${GRAPH_TOOL}[data-tool="filter"]`).click();
  await window.locator(GRAPH_MENU).waitFor({ state: "visible", timeout: WAIT_MS });
}

/**
 * Adds one condition to the open filter menu.
 *
 * Takes the words on screen rather than the model's own keys — a scenario
 * should fail when the visible wording changes, which is the thing she reads.
 */
export async function addGraphFilter(
  window: Page,
  field: string,
  operator: string,
  value?: string,
): Promise<void> {
  await window.locator(GRAPH_MENU_ADD).click();
  const row = window.locator(`${GRAPH_MENU} ${GRAPH_FILTER_ROW}`).last();
  await row.getByLabel("What to filter on").selectOption({ label: field });
  await row.getByLabel("How to compare it").selectOption({ label: operator });
  if (value !== undefined) await row.getByLabel("What to look for").selectOption({ label: value });
}

/** Closes whichever graph menu is open, without closing the graph. */
/** Whether one of the graph's menus is up. */
export async function graphMenuIsOpen(window: Page): Promise<boolean> {
  return (await window.locator(GRAPH_MENU).count()) > 0;
}

/** The same, from the button that opened it rather than the Escape key. */
export async function closeGraphMenuFromItsButton(window: Page, tool: "filter" | "display"): Promise<void> {
  await window.locator(`${GRAPH_TOOL}[data-tool="${tool}"]`).click();
  await window.locator(GRAPH_MENU).waitFor({ state: "detached", timeout: WAIT_MS });
}

/** Opens the graph's Display menu, the one with the names slider. */
export async function openGraphDisplay(window: Page): Promise<void> {
  await window.locator(`${GRAPH_TOOL}[data-tool="display"]`).click();
  await window.locator(GRAPH_MENU).waitFor({ state: "visible", timeout: WAIT_MS });
}

export async function closeGraphMenu(window: Page): Promise<void> {
  await window.locator(GRAPH_MENU).first().press("Escape");
  await window.locator(GRAPH_MENU).waitFor({ state: "detached", timeout: WAIT_MS });
}

/** Whether the graph is offering to lay itself out again. */
export async function canPutGraphBack(window: Page): Promise<boolean> {
  return window.locator(`${GRAPH_TOOL}[data-tool="put-back"]`).isEnabled();
}

/** Lays the graph out again, forgetting everything that was dragged. */
export async function putGraphBack(window: Page): Promise<void> {
  await window.locator(`${GRAPH_TOOL}[data-tool="put-back"]`).click();
}

/** Sets a page as a shortcut from its row menu. */
export async function pinRowAsShortcut(window: Page, rowName: string): Promise<void> {
  await openTreeRowMenu(window, rowName);
  await window.locator(TREE_CONTEXT_MENU).first().getByRole("button", { name: "Set as shortcut" }).click();
}

/** The pages in the shortcuts strip, in the order it draws them. */
export async function shortcutNames(window: Page): Promise<string[]> {
  if ((await window.locator(BOOKMARKS_RAIL).count()) === 0) return [];
  const labels = await window.locator(`${BOOKMARKS_RAIL} ${BOOKMARK_TILE}`).evaluateAll((tiles) =>
    tiles.map((tile) => tile.getAttribute("aria-label") ?? ""),
  );
  return labels.map((label) => normalize(label));
}

/**
 * Opens a shortcut and removes it **in one tick of the page's own clock**.
 *
 * The point is the timing, not the gesture. Opening a page schedules a
 * debounced write of `project.json`; removing the shortcut writes it
 * immediately. Doing both from one `evaluate` puts the second inside the
 * first's 300ms window every time, on any machine — which is the only way to
 * ask about the race deliberately rather than hope a slow runner reproduces it.
 * A middle click is what the tile takes for "remove"; see BookmarksRail.
 */
export async function openAndUnpinShortcutTogether(window: Page, name: string): Promise<void> {
  await window.evaluate((pageName) => {
    const tile = document.querySelector<HTMLElement>(`.bookmark-tile[aria-label="${pageName}"]`);
    if (!tile) throw new Error(`No shortcut called ${pageName}`);
    tile.click();
    tile.dispatchEvent(new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true }));
  }, name);
}

// ---- Board spike (2026-09-13): a whiteboard drawn in the page whose body it is ----

const BOARD = ".board";
const BOARD_CANVAS = ".board .excalidraw__canvas.interactive";
const BOARD_LINK_BUTTON = ".board-link-button";
const BOARD_PICKER_ROW = ".board-picker-row";
const BOARD_PICKER_INPUT = ".board-picker input";
// The library's own popup for a selected shape that carries a link.
const BOARD_HYPERLINK = ".excalidraw-hyperlinkContainer-link";
const BOARD_PUT_BUTTON = ".board-put-button";
const BOARD_MENU_BUTTON = ".board [data-testid='main-menu-trigger']";
const BOARD_DOTS_TOGGLE = "[data-testid='board-dots-toggle']";
const BOARD_PAGE_CARD = "[data-testid='board-page-card']";
const BOARD_BOOKMARK_CARD = "[data-testid='board-bookmark-card']";
const BOARD_NOTE = "[data-testid='board-note']";
const BOARD_NOTE_BUTTON = ".board-note-button";
const BOARD_COLOUR_BUTTON = ".board-colour-button";
const BOARD_NOTE_SWATCH = ".board-note-swatch";
// The Assets tab's drag type — `ASSET_DRAG_TYPE` in src/constants/paths.ts,
// written out here the way the tree's page drag is dispatched: what a drop
// on the board is handed, not what the app calls it.
const ASSET_DRAG_TYPE = "application/x-anamnesis-asset";

/** The card showing the page called `name` — by the name it carries, since a card shrunk to its icon shows no text. */
function boardCard(window: Page, name: string): Locator {
  return window.locator(BOARD_PAGE_CARD).and(window.locator(`[data-page-name="${name.replace(/"/g, '\\"')}"]`));
}

/**
 * Waits for a just-typed page name to have left its box and been drawn as
 * the heading, before anything under it is aimed at.
 *
 * **Enter moves the grid.** The name is typed into a one-line box; on Enter
 * it becomes a heading, and a heading long enough to wrap is taller than the
 * box was — so everything under it shifts down a line, after Playwright has
 * decided where the button is and before the press lands. On a wide window
 * nothing wraps and nothing moves; on CI's narrower one the click went into
 * the hint above the grid and the page stayed blank. Found through #449's
 * board scenario, 2026-09-17.
 */
async function titleSettled(window: Page): Promise<void> {
  const input = window.locator(".page-title-input");
  // **The Enter a scenario pressed straight after typing the name may not
  // have counted.** Traced 2026-09-17: it reaches the window, but React's
  // handler on the box never fires for it — the first key after
  // `keyboard.type` arrives looking like part of the typing — while a
  // second Enter commits. Until now the click on a kind was what committed
  // the name, by taking focus off the box; when that click's target then
  // moved, nothing did. So: if the box is still there, press Enter *on it*.
  if (await input.isVisible()) await input.press("Enter");
  await input.waitFor({ state: "hidden", timeout: WAIT_MS });
  await window.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
}

/**
 * Turns the open page into a board, from the template grid a blank page
 * shows, and waits for the drawing library to have loaded — it comes in late,
 * on first use, so the grid button click is not the end of it.
 */
export async function makeBoard(window: Page): Promise<void> {
  await titleSettled(window);
  await window.locator(NEW_PAGE_GRID).getByRole("button", { name: "Board", exact: true }).click();
  await window.locator(BOARD_CANVAS).first().waitFor({ state: "visible", timeout: WAIT_MS });
}

/** Waits for the whiteboard, which arrives late on a fresh load because the library is loaded on first use. */
export async function waitForBoard(window: Page): Promise<void> {
  await window.locator(BOARD_CANVAS).first().waitFor({ state: "visible", timeout: WAIT_MS });
}

/** Whether the open page is drawing a whiteboard. */
export async function boardIsShown(window: Page): Promise<boolean> {
  return (await window.locator(BOARD_CANVAS).count()) > 0;
}

/**
 * Draws a rectangle on the board, by tool shortcut and a drag across the
 * middle of it — the way a hand would, since the drawing is a canvas and
 * there is no element to click.
 */
export async function drawBoardRectangle(window: Page): Promise<void> {
  const canvas = window.locator(BOARD_CANVAS).first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the board's canvas has no size");
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await window.keyboard.press("r");
  const from = { x: box.x + box.width * 0.3, y: box.y + box.height * 0.3 };
  const to = { x: box.x + box.width * 0.6, y: box.y + box.height * 0.6 };
  await window.mouse.move(from.x, from.y);
  await window.mouse.down();
  await window.mouse.move(to.x, to.y, { steps: 8 });
  await window.mouse.up();
  await window.keyboard.press("Escape");
}

/**
 * Selects the shape `drawBoardRectangle` drew, by clicking its left edge
 * with the selection tool. The edge and not the middle: a shape with no fill
 * is hollow to the library, and a click inside it lands on the canvas.
 *
 * **The edge is found by looking, not assumed.** It used to click at a
 * fraction of the canvas — where the shape had been drawn — and the canvas
 * does not stay put: filling the window and coming back, or CI's narrower
 * window, leaves the drawing scrolled so that spot is empty, the click
 * selected nothing and the link button never came (#449). Select-all does
 * select it but the library only shows a linked shape's popup for a click,
 * so the drawn pixels are read off the static canvas to find where the
 * shape actually is.
 */
export async function selectBoardShape(window: Page): Promise<void> {
  const canvas = window.locator(BOARD_CANVAS).first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the board's canvas has no size");
  await window.keyboard.press("Escape");
  await window.keyboard.press("v");
  const edge = await window.evaluate(() => {
    const drawn = document.querySelector<HTMLCanvasElement>(".board .excalidraw__canvas.static");
    if (!drawn) return null;
    const context = drawn.getContext("2d");
    if (!context) return null;
    const { width, height } = drawn;
    const pixels = context.getImageData(0, 0, width, height).data;
    // The background is whatever the top-left pixel is; the shape is the
    // first run of anything else, scanning rows from a third of the way down.
    const bg = [pixels[0], pixels[1], pixels[2]];
    const differs = (i: number) =>
      Math.abs(pixels[i] - bg[0]) + Math.abs(pixels[i + 1] - bg[1]) + Math.abs(pixels[i + 2] - bg[2]) > 60;
    for (let y = Math.floor(height * 0.3); y < height; y += 4) {
      for (let x = 0; x < width; x += 1) {
        if (differs((y * width + x) * 4)) {
          const scale = drawn.width / drawn.getBoundingClientRect().width;
          return { x: x / scale, y: y / scale };
        }
      }
    }
    return null;
  });
  if (!edge) throw new Error("no shape drawn on the board");
  await canvas.click({ position: { x: edge.x + 1, y: edge.y } });
  await window.locator(BOARD_LINK_BUTTON).waitFor({ state: "visible", timeout: WAIT_MS });
}

/** What the link button says of the selected shape — its tooltip, which is the same in the page and expanded. */
export async function boardLinkLabel(window: Page): Promise<string> {
  return (await window.locator(BOARD_LINK_BUTTON).getAttribute("title")) ?? "";
}

/** Links the selected shape to the page called `name`, through the picker. */
export async function linkBoardShapeToPage(window: Page, name: string): Promise<void> {
  await window.locator(BOARD_LINK_BUTTON).click();
  await window.locator(BOARD_PICKER_INPUT).fill(name);
  await window.locator(BOARD_PICKER_ROW).filter({ hasText: name }).first().click();
}

/**
 * Follows the selected shape's link, from the library's own link popup — the
 * same handler the small link icon on the shape reaches, and one that can be
 * clicked without guessing where on the canvas the icon was drawn.
 */
export async function followBoardLink(window: Page): Promise<void> {
  await window.locator(BOARD_HYPERLINK).first().click();
}

/** Whether the board is filling the window. */
export async function boardIsExpanded(window: Page): Promise<boolean> {
  return (await window.locator(`${BOARD}.board-expanded`).count()) > 0;
}

/**
 * Expands or shrinks the board, and waits for the drawing surface to have
 * followed: the library resizes its canvas a moment after its box changes,
 * and a click landed before that is measured against the old size.
 */
export async function toggleBoardExpand(window: Page): Promise<void> {
  await window.locator(`${BOARD} .board-expand`).click();
  await window.waitForFunction(
    ([boardSelector, canvasSelector]) => {
      const board = document.querySelector(boardSelector)?.getBoundingClientRect();
      const canvas = document.querySelector(canvasSelector)?.getBoundingClientRect();
      return !!board && !!canvas && Math.abs(board.width - canvas.width) < 4 && Math.abs(board.height - canvas.height) < 4;
    },
    [BOARD, BOARD_CANVAS],
    { timeout: WAIT_MS },
  );
}

// ---- Phase 25: the storyline canvas, drawn in the page whose body it is ----

/**
 * Turns the open page into a storyline, from the template grid a blank page
 * shows. The grid is only there while the page has no tabs, which is what a
 * page made a moment ago is.
 */
export async function makeStoryline(window: Page): Promise<void> {
  await titleSettled(window);
  await window.locator(NEW_PAGE_GRID).getByRole("button", { name: "Storyline", exact: true }).click();
  await window.locator(STORYLINE).first().waitFor({ state: "visible", timeout: WAIT_MS });
}

/** Whether the open page is drawing a canvas. */
export async function storylineIsShown(window: Page): Promise<boolean> {
  return (await window.locator(STORYLINE).count()) > 0;
}

/** Adds a scene, which makes a page for it inside the storyline. */
export async function addStorylineScene(window: Page): Promise<void> {
  const before = await window.locator(STORYLINE_NODE).count();
  await pressStorylineAdd(window, "Scene");
  await window
    .locator(STORYLINE_NODE)
    .nth(before)
    .waitFor({ state: "visible", timeout: WAIT_MS });
}

/**
 * The scenes on the canvas, ordered left to right.
 *
 * **Order rather than coordinates, because the picture rescales.** The canvas
 * fits itself to the window, so adding a scene changes the zoom and shifts
 * every other card on screen — a scenario comparing pixel positions across a
 * reload is measuring the fit, not the arrangement. Which scene is furthest
 * right survives any amount of scaling, which is the same call
 * `graphNodesLeftToRight` makes and for the same reason.
 */
export async function storylineScenesLeftToRight(window: Page): Promise<string[]> {
  const placed: { name: string; x: number }[] = [];
  for (const node of await window.locator(STORYLINE_NODE).all()) {
    const box = await node.boundingBox();
    const name = await node.locator(STORYLINE_NODE_NAME).innerText();
    if (box) placed.push({ name: normalize(name), x: box.x });
  }
  return placed.sort((a, b) => a.x - b.x).map((entry) => entry.name);
}

/**
 * The scenes on the canvas as their own ids, ordered left to right.
 *
 * **Ids rather than names, because every scene starts life called "Untitled".**
 * A scenario asking whether a drag moved anything cannot tell three identical
 * names apart, which is how the first version of the drag assertion passed
 * against a canvas that had not moved at all. The id is stored on the canvas,
 * so it also survives a reload — which is what makes it the right thing to
 * compare an arrangement against before and after a restart.
 */
export async function storylineSceneOrder(window: Page): Promise<string[]> {
  const placed: { id: string; x: number }[] = [];
  for (const node of await window.locator(STORYLINE_NODE).all()) {
    const box = await node.boundingBox();
    const id = await node.locator(STORYLINE_NODE_BODY).getAttribute("data-scene-id");
    if (box && id) placed.push({ id, x: box.x });
  }
  return placed.sort((a, b) => a.x - b.x).map((entry) => entry.id);
}

/** How many lines are drawn between scenes. */
export async function storylineEdgeCount(window: Page): Promise<number> {
  return await window.locator(STORYLINE_EDGE).count();
}

/**
 * Zooms the canvas out until everything on it is inside the stage.
 *
 * **The canvas does not fit itself below 70%**, on purpose — a picture
 * shrunk until its names are six-pixel marks is no use — so with four wide
 * cards in a row the ends run off the stage's edges, and a helper aiming at a
 * card out there presses on the page column instead. CI's window is narrower
 * than a laptop's; this first showed up there and not here. Zooming about
 * the stage's middle keeps the picture centred while it shrinks, so nothing
 * moves except the scale. A no-op when it already fits, which is why every
 * helper that aims at something on the canvas can call it first.
 */
/** `src/constants/storyline.ts`'s zoom sensitivity, repeated because the suite is outside the app. */
const STORYLINE_ZOOM_SENSITIVITY = 0.0015;

export async function fitStorylineOnScreen(window: Page): Promise<void> {
  // Everything is measured in one call, in one frame, so the stage and the
  // things on it are compared at the same instant — a loop of separate
  // measurements with a timer between them read a half-drawn zoom on CI and
  // kept zooming until the canvas hit its floor. The answer is how far out
  // the picture has to go, as a factor, or 1 when it already fits.
  const shortfall = () =>
    window.evaluate(
      ({ stage, items, margin }) => {
        const frame = document.querySelector(stage)?.getBoundingClientRect();
        if (!frame) return 1;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const element of document.querySelectorAll(items)) {
          const box = element.getBoundingClientRect();
          if (box.width === 0 && box.height === 0) continue;
          minX = Math.min(minX, box.left);
          minY = Math.min(minY, box.top);
          maxX = Math.max(maxX, box.right);
          maxY = Math.max(maxY, box.bottom);
        }
        if (minX === Infinity) return 1;
        const fits =
          minX >= frame.left + margin &&
          minY >= frame.top + margin &&
          maxX <= frame.right - margin &&
          maxY <= frame.bottom - margin;
        if (fits) return 1;
        // The picture is centred on the stage, so what has to shrink is its
        // reach from the middle, on whichever side reaches furthest.
        const centreX = frame.left + frame.width / 2;
        const centreY = frame.top + frame.height / 2;
        const reachX = Math.max(centreX - minX, maxX - centreX);
        const reachY = Math.max(centreY - minY, maxY - centreY);
        const roomX = frame.width / 2 - margin;
        const roomY = frame.height / 2 - margin;
        return Math.min(roomX / reachX, roomY / reachY);
      },
      { stage: STORYLINE_STAGE, items: `${STORYLINE_NODE}, ${STORYLINE_BAND_LABEL}, ${STORYLINE_NOTE}`, margin: 6 },
    );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const factor = await shortfall();
    if (factor >= 1) return;
    const frame = await window.locator(STORYLINE_STAGE).boundingBox();
    if (!frame) return;
    // One wheel event for the whole distance: the canvas scales by
    // exp(-deltaY × sensitivity), so the delta that gets there is worked out
    // rather than stepped towards. A little past, for rounding.
    const deltaY = Math.ceil(-Math.log(factor * 0.92) / STORYLINE_ZOOM_SENSITIVITY);
    await window.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2);
    await window.mouse.wheel(0, deltaY);
    // Two frames, so what is measured next has actually been drawn.
    await window.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  }
}

/** The middle of one scene's card, in window pixels. */
async function storylineSceneCentre(window: Page, index: number): Promise<{ x: number; y: number }> {
  await fitStorylineOnScreen(window);
  const box = await window.locator(STORYLINE_NODE).nth(index).boundingBox();
  if (!box) throw new Error(`No scene at index ${index}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Draws a line from one scene to another by dragging the first one's handle
 * onto the second's card — the gesture, not a shortcut through the store.
 */
export async function joinStorylineScenes(window: Page, from: number, to: number): Promise<void> {
  await fitStorylineOnScreen(window);
  const handle = await window.locator(STORYLINE_HANDLE).nth(from).boundingBox();
  if (!handle) throw new Error(`No handle on the scene at index ${from}`);
  const target = await storylineSceneCentre(window, to);
  await window.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await window.mouse.down();
  await window.mouse.move(target.x, target.y, { steps: 10 });
  await window.mouse.up();
}

/** Drags a scene by a number of screen pixels, in steps so the move is seen. */
export async function dragStorylineScene(
  window: Page,
  index: number,
  byX: number,
  byY: number,
): Promise<void> {
  const from = await storylineSceneCentre(window, index);
  await window.mouse.move(from.x, from.y);
  await window.mouse.down();
  await window.mouse.move(from.x + byX, from.y + byY, { steps: 10 });
  await window.mouse.up();
}

/**
 * Drags the canvas itself by a number of screen pixels, from its top-left
 * corner — the one spot nothing is ever drawn on, since the picture is fitted
 * to the middle of the stage.
 */
export async function panStoryline(window: Page, byX: number, byY: number): Promise<void> {
  const box = await window.locator(STORYLINE_STAGE).boundingBox();
  if (!box) throw new Error("No storyline stage on screen");
  const from = { x: box.x + 12, y: box.y + 12 };
  await window.mouse.move(from.x, from.y);
  await window.mouse.down();
  await window.mouse.move(from.x + byX, from.y + byY, { steps: 10 });
  await window.mouse.up();
}

/**
 * Presses one of the four "add" actions on the storyline's toolbar, whichever
 * arrangement the bar is in: a button of its own when the bar is wide, a row
 * of the *Add* menu when it is not. Scenarios say what they want added and
 * never which arrangement they expect — the width decides that.
 */
async function pressStorylineAdd(window: Page, name: "Scene" | "Existing Page" | "Note" | "Stretch"): Promise<void> {
  const menu = window.locator(STORYLINE_ADD_MENU);
  if (await menu.isVisible()) {
    await menu.getByRole("button", { name: "Add", exact: true }).click();
    await menu.getByRole("menuitem", { name, exact: true }).click();
    return;
  }
  await window.locator(STORYLINE_BAR).getByRole("button", { name, exact: true }).click();
}

/**
 * Whether the storyline's toolbar is one row with nothing cut off: no button
 * sits lower than the first, and every one ends inside the bar. It wrapped to
 * two rows at the page column's ordinary width beside a sidebar, and was
 * reported as looking broken on 2026-09-13; a first fix kept one row by
 * letting the right-hand buttons run off the edge, which this also catches.
 */
export async function storylineBarIsOneRow(window: Page): Promise<boolean> {
  const bar = await window.locator(STORYLINE_BAR).boundingBox();
  if (!bar) return false;
  const tops: number[] = [];
  for (const button of await window.locator(`${STORYLINE_BAR} button:visible`).all()) {
    const box = await button.boundingBox();
    if (!box) continue;
    if (box.x + box.width > bar.x + bar.width + 0.5) return false;
    tops.push(Math.round(box.y));
  }
  return tops.length > 0 && Math.max(...tops) - Math.min(...tops) <= 2;
}

/** Clicks empty canvas, which puts any selection away. */
export async function clickStorylineBackground(window: Page): Promise<void> {
  await window.locator(STORYLINE_STAGE).click({ position: { x: 12, y: 12 } });
}

/** The highlighted text anywhere in the window, "" when nothing is. */
export async function selectedText(window: Page): Promise<string> {
  return await window.evaluate(() => window.getSelection()?.toString() ?? "");
}

/** Where each scene's card sits on screen, in DOM order. */
export async function storylineScenePositions(window: Page): Promise<{ x: number; y: number }[]> {
  const positions: { x: number; y: number }[] = [];
  for (const node of await window.locator(STORYLINE_NODE).all()) {
    const box = await node.boundingBox();
    if (box) positions.push({ x: box.x, y: box.y });
  }
  return positions;
}

/** Clicks a scene's card, which selects it. */
export async function selectStorylineScene(window: Page, index: number): Promise<void> {
  await fitStorylineOnScreen(window);
  const node = window.locator(STORYLINE_NODE).nth(index);
  await node.locator(STORYLINE_NODE_BODY).click();
  await node.and(window.locator(".storyline-node-selected")).waitFor({ state: "visible", timeout: WAIT_MS });
}

/**
 * Opens a scene's menu by right-clicking its card — everything that can be
 * done to a scene is on the scene itself since 2026-09-15, and the menu is
 * the list of it. The same menu opens from the card's corner button.
 */
export async function openStorylineSceneMenu(window: Page, index: number): Promise<void> {
  await fitStorylineOnScreen(window);
  await window.locator(STORYLINE_NODE).nth(index).locator(STORYLINE_NODE_BODY).click({ button: "right" });
  await window.locator(STORYLINE_MENU).waitFor({ state: "visible", timeout: WAIT_MS });
}

/** Presses one row of the open scene menu. */
async function pressStorylineMenuRow(window: Page, name: string): Promise<void> {
  await window.locator(STORYLINE_MENU).getByRole("menuitem", { name, exact: true }).click();
  await window.locator(STORYLINE_MENU).waitFor({ state: "hidden", timeout: WAIT_MS });
}

/** Drags a card's bottom-right corner by a number of screen pixels. */
export async function resizeStorylineScene(window: Page, index: number, byX: number, byY = 0): Promise<void> {
  await fitStorylineOnScreen(window);
  const corner = await window.locator(STORYLINE_NODE).nth(index).locator(STORYLINE_NODE_RESIZE).boundingBox();
  if (!corner) throw new Error(`No resize corner on the scene at index ${index}`);
  const from = { x: corner.x + corner.width / 2, y: corner.y + corner.height / 2 };
  await window.mouse.move(from.x, from.y);
  await window.mouse.down();
  await window.mouse.move(from.x + byX, from.y + byY, { steps: 10 });
  await window.mouse.up();
}

/** Every card's size on screen by scene id, in window pixels. */
export async function storylineSceneSizes(window: Page): Promise<Record<string, { width: number; height: number }>> {
  const sizes: Record<string, { width: number; height: number }> = {};
  for (const node of await window.locator(STORYLINE_NODE).all()) {
    const box = await node.boundingBox();
    const id = await node.locator(STORYLINE_NODE_BODY).getAttribute("data-scene-id");
    if (box && id) sizes[id] = { width: box.width, height: box.height };
  }
  return sizes;
}

/** How far down a card its name sits, in window pixels — its top stays near the card's top however tall the card. */
export async function storylineSceneNameOffset(window: Page, index: number): Promise<number> {
  const node = window.locator(STORYLINE_NODE).nth(index);
  const card = await node.boundingBox();
  const name = await node.locator(STORYLINE_NODE_NAME_TEXT).boundingBox();
  if (!card || !name) throw new Error(`No scene at index ${index}`);
  return name.y - card.y;
}

/** A card's width on screen, in window pixels. */
export async function storylineSceneWidth(window: Page, index: number): Promise<number> {
  const box = await window.locator(STORYLINE_NODE).nth(index).boundingBox();
  if (!box) throw new Error(`No scene at index ${index}`);
  return box.width;
}

/**
 * Removes the line at `index` through its right-click menu.
 *
 * Aimed at the middle of the drawn line by hand: an SVG group has no box of
 * its own for Playwright to call visible, and the wide hit line under the
 * drawn one is transparent, which it reads the same way.
 */
export async function removeStorylineLine(window: Page, index: number): Promise<void> {
  await fitStorylineOnScreen(window);
  const box = await window.locator(`${STORYLINE_EDGE} .storyline-edge-line`).nth(index).boundingBox();
  if (!box) throw new Error(`No line at index ${index}`);
  await window.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  await pressStorylineMenuRow(window, "Remove Line");
}

/** What the canvas said when it would not draw a line, or null while it is quiet. */
export async function storylineRefusal(window: Page): Promise<string | null> {
  if ((await window.locator(STORYLINE_REFUSAL).count()) === 0) return null;
  return normalize(await window.locator(STORYLINE_REFUSAL).first().innerText());
}

/** Takes a scene off the canvas through its menu, leaving its page in the tree. */
export async function takeSceneOffCanvas(window: Page, index: number): Promise<void> {
  await openStorylineSceneMenu(window, index);
  await pressStorylineMenuRow(window, "Take Off the Canvas");
}

/** Opens a scene's page from the button in the card's own corner. */
export async function openSceneFromCard(window: Page, index: number): Promise<void> {
  await fitStorylineOnScreen(window);
  await window.locator(STORYLINE_NODE).nth(index).locator(STORYLINE_NODE_OPEN).click();
}

/**
 * Says what happens in a scene, the way she does it: a real double-click on
 * the card, the words typed into the box that opens in it, Ctrl+Enter to
 * finish. The words land on the page's Summary field; the card reads them
 * back from there, which is what the wait at the end is for.
 */
export async function describeStorylineScene(window: Page, index: number, text: string): Promise<void> {
  await fitStorylineOnScreen(window);
  // Low and to the left, clear of the name: a double-click on the name
  // itself renames, and on a one-row card the name covers the middle.
  const body = window.locator(STORYLINE_NODE).nth(index).locator(STORYLINE_NODE_BODY);
  const box = await body.boundingBox();
  if (!box) throw new Error(`No scene at index ${index}`);
  await body.dblclick({ position: { x: 8, y: box.height - 6 } });
  const input = window.locator(STORYLINE_NODE_SUMMARY_INPUT);
  await input.waitFor({ state: "visible", timeout: WAIT_MS });
  await window.keyboard.press("Control+a");
  await window.keyboard.type(text);
  // Enter is done; Shift+Enter would be a new line.
  await window.keyboard.press("Enter");
  await input.waitFor({ state: "hidden", timeout: WAIT_MS });
  await window
    .locator(STORYLINE_NODE)
    .nth(index)
    .locator(STORYLINE_NODE_SUMMARY)
    .filter({ hasText: text })
    .waitFor({ timeout: WAIT_MS });
}

/** What each scene's card says under its name, in DOM order; "" for a card that says nothing. */
export async function storylineSceneSummaries(window: Page): Promise<string[]> {
  const out: string[] = [];
  for (const node of await window.locator(STORYLINE_NODE).all()) {
    const summary = node.locator(STORYLINE_NODE_SUMMARY);
    out.push((await summary.count()) > 0 ? normalize(await summary.first().textContent() ?? "") : "");
  }
  return out;
}

/** The height of a scene's card on screen, in window pixels. */
export async function storylineSceneHeight(window: Page, index: number): Promise<number> {
  const box = await window.locator(STORYLINE_NODE).nth(index).boundingBox();
  if (!box) throw new Error(`No scene at index ${index}`);
  return box.height;
}

/**
 * Renames a scene from the canvas, or gives up on it: a real double-click on
 * the name itself, which is where a name is renamed since 2026-09-15 (a
 * double-click anywhere else on the card writes the description).
 *
 * The box opens in the name's place with the old name selected, so typing
 * replaces it. Enter keeps the new name; Escape keeps the old one, which is
 * the half of this that a rename box is most often wrong about.
 */
export async function renameStorylineScene(
  window: Page,
  index: number,
  name: string,
  how: "keep" | "give-up" = "keep",
): Promise<void> {
  await fitStorylineOnScreen(window);
  await window.locator(STORYLINE_NODE).nth(index).locator(STORYLINE_NODE_NAME_TEXT).dblclick();
  const input = window.locator(STORYLINE_NODE_INPUT);
  await input.waitFor({ state: "visible", timeout: WAIT_MS });
  await window.keyboard.type(name);
  await window.keyboard.press(how === "keep" ? "Enter" : "Escape");
  await input.waitFor({ state: "hidden", timeout: WAIT_MS });
}

/**
 * Names a scene and says what happens in it in one go, with Tab between the
 * two boxes: a double-click on the name, the name typed, Tab, the description
 * typed, Enter. Then Shift+Tab from the description back to the name, to
 * prove the road runs both ways. Returns whether each box opened when asked.
 */
export async function tabThroughStorylineScene(
  window: Page,
  index: number,
  name: string,
  summary: string,
): Promise<{ tabOpenedDescription: boolean; shiftTabOpenedName: boolean }> {
  await fitStorylineOnScreen(window);
  const node = window.locator(STORYLINE_NODE).nth(index);
  await node.locator(STORYLINE_NODE_NAME_TEXT).dblclick();
  const nameInput = window.locator(STORYLINE_NODE_INPUT);
  await nameInput.waitFor({ state: "visible", timeout: WAIT_MS });
  await window.keyboard.type(name);
  await window.keyboard.press("Tab");
  const summaryInput = window.locator(STORYLINE_NODE_SUMMARY_INPUT);
  const tabOpenedDescription = await summaryInput
    .waitFor({ state: "visible", timeout: WAIT_MS })
    .then(() => true)
    .catch(() => false);
  if (!tabOpenedDescription) return { tabOpenedDescription, shiftTabOpenedName: false };
  await window.keyboard.press("Control+a");
  await window.keyboard.type(summary);
  await window.keyboard.press("Shift+Tab");
  const shiftTabOpenedName = await nameInput
    .waitFor({ state: "visible", timeout: WAIT_MS })
    .then(() => true)
    .catch(() => false);
  if (shiftTabOpenedName) await window.keyboard.press("Enter");
  await nameInput.waitFor({ state: "hidden", timeout: WAIT_MS });
  return { tabOpenedDescription, shiftTabOpenedName };
}

// ---- Phase 25 step 2: notes, labelled stretches, and tidying up ----

/** Adds a note, which opens straight into typing. */
export async function addStorylineNote(window: Page, text: string): Promise<void> {
  const before = await window.locator(STORYLINE_NOTE).count();
  await pressStorylineAdd(window, "Note");
  await window.locator(STORYLINE_NOTE_INPUT).waitFor({ state: "visible", timeout: WAIT_MS });
  await window.keyboard.type(text);
  // Committed by leaving it, which is the gesture the canvas is built around.
  await window.locator(STORYLINE_STAGE).click({ position: { x: 12, y: 12 } });
  await window.locator(STORYLINE_NOTE).nth(before).waitFor({ state: "visible", timeout: WAIT_MS });
}

/** What every note on the canvas says, as one string each. */
export async function storylineNoteTexts(window: Page): Promise<string[]> {
  const texts = await window.locator(STORYLINE_NOTE).allInnerTexts();
  return texts.map((text) => normalize(text));
}

/** The page names inside notes that resolved to a real page. */
export async function storylineNoteLinks(window: Page): Promise<string[]> {
  const names = await window.locator(STORYLINE_NOTE_LINK).allInnerTexts();
  return names.map((name) => normalize(name));
}

/** The bracketed names that pointed at nothing. */
export async function storylineBrokenLinks(window: Page): Promise<string[]> {
  const names = await window.locator(STORYLINE_NOTE_BROKEN).allInnerTexts();
  return names.map((name) => normalize(name));
}

/** Follows a note's link through to the page it names. */
export async function followStorylineNoteLink(window: Page, name: string): Promise<void> {
  await fitStorylineOnScreen(window);
  await window.locator(STORYLINE_NOTE_LINK).filter({ hasText: name }).first().click();
}

/** Adds a labelled stretch, which also opens straight into typing. */
export async function addStorylineBand(window: Page, label: string): Promise<void> {
  await pressStorylineAdd(window, "Stretch");
  await window.locator(STORYLINE_BAND_INPUT).waitFor({ state: "visible", timeout: WAIT_MS });
  await window.keyboard.type(label);
  await window.keyboard.press("Enter");
  await window.locator(STORYLINE_BAND_LABEL).filter({ hasText: label }).first().waitFor({ timeout: WAIT_MS });
}

/**
 * Renames a labelled stretch the way the placeholder says to: a real
 * double-click on its label, then typing over the old name.
 *
 * A real one and not a dispatched event, because the band captures the
 * pointer on press and a double-click built from a captured release is aimed
 * at the band, not at whatever was under the mouse — which is exactly the
 * thing a dispatched `dblclick` on the label could never have caught.
 */
export async function renameStorylineBand(window: Page, index: number, label: string): Promise<void> {
  await fitStorylineOnScreen(window);
  await window.locator(STORYLINE_BAND_LABEL).nth(index).dblclick();
  await window.locator(STORYLINE_BAND_INPUT).waitFor({ state: "visible", timeout: WAIT_MS });
  await window.keyboard.press("Control+a");
  await window.keyboard.type(label);
  await window.keyboard.press("Enter");
  await window.locator(STORYLINE_BAND_LABEL).filter({ hasText: label }).first().waitFor({ timeout: WAIT_MS });
}

/**
 * What every labelled stretch is called.
 *
 * `textContent` rather than `innerText`: the label is drawn in small caps, and
 * `innerText` hands back what is drawn — "ACT 2" for a stretch she named
 * "Act 2". What she typed is the question.
 */
export async function storylineBandLabels(window: Page): Promise<string[]> {
  const labels = await window.locator(STORYLINE_BAND_LABEL).allTextContents();
  return labels.map((label) => normalize(label));
}

/** Drags a labelled stretch by a number of screen pixels. */
export async function dragStorylineBand(window: Page, index: number, byX: number, byY: number): Promise<void> {
  await fitStorylineOnScreen(window);
  const box = await window.locator(STORYLINE_BAND).nth(index).boundingBox();
  if (!box) throw new Error(`No band at index ${index}`);
  // Grabbed near the bottom edge, clear of the label and of any scene standing
  // on it — a press that lands on a card drags the card instead.
  const from = { x: box.x + box.width / 2, y: box.y + box.height - 12 };
  await window.mouse.move(from.x, from.y);
  await window.mouse.down();
  await window.mouse.move(from.x + byX, from.y + byY, { steps: 10 });
  await window.mouse.up();
}

/** Where every note sits on screen, in the order the canvas draws them. */
export async function storylineNotePlacements(window: Page): Promise<{ x: number; y: number }[]> {
  const placed: { x: number; y: number }[] = [];
  for (const note of await window.locator(STORYLINE_NOTE).all()) {
    const box = await note.boundingBox();
    if (box) placed.push({ x: Math.round(box.x), y: Math.round(box.y) });
  }
  return placed;
}

/** Lines the scenes up. */
export async function tidyStoryline(window: Page): Promise<void> {
  await window.locator(STORYLINE).getByRole("button", { name: "Tidy Up" }).click();
}

/** Whether *Tidy up* still has anything to do. */
export async function canTidyStoryline(window: Page): Promise<boolean> {
  return await window.locator(STORYLINE).getByRole("button", { name: "Tidy Up" }).isEnabled();
}

/**
 * Where every scene sits on screen, by its id.
 *
 * **Rounded hard, because the canvas rescales.** A tidy-up changes the fit, so
 * two positions taken either side of one are never equal to the pixel; what a
 * scenario is actually asking is whether things line up with each other, and
 * that survives the scaling.
 */
export async function storylineScenePlacements(window: Page): Promise<Record<string, { x: number; y: number }>> {
  const placed: Record<string, { x: number; y: number }> = {};
  for (const node of await window.locator(STORYLINE_NODE).all()) {
    const box = await node.boundingBox();
    const id = await node.locator(STORYLINE_NODE_BODY).getAttribute("data-scene-id");
    if (box && id) placed[id] = { x: Math.round(box.x), y: Math.round(box.y) };
  }
  return placed;
}

// ---- Phase 25 step 3: pages that already exist, and who is in a scene ----

/** Opens the "put an existing page on it" search. */
export async function openStorylinePicker(window: Page): Promise<void> {
  await pressStorylineAdd(window, "Existing Page");
  await window.locator(STORYLINE_PICKER).waitFor({ state: "visible", timeout: WAIT_MS });
}

/**
 * Types into the picker and returns what it offers.
 *
 * **The box is not cleared first.** It keeps focus and empties itself after a
 * pick, which is what lets several pages go on without reopening it, so a
 * caller typing a second name is doing what she would do.
 */
export async function searchStorylinePicker(window: Page, query: string): Promise<string[]> {
  await window.keyboard.type(query);
  // Long enough for the list to settle rather than catching it mid-keystroke.
  await window.waitForTimeout(300);
  const names = await window.locator(STORYLINE_PICKER_NAME).allInnerTexts();
  return names.map((name) => normalize(name));
}

/** Takes the first page the picker is offering. */
export async function pickStorylinePage(window: Page): Promise<void> {
  await window.locator(STORYLINE_PICKER_ROW).first().click();
}

/** What the picker says when it has nothing to offer, or null. */
export async function storylinePickerEmptyMessage(window: Page): Promise<string | null> {
  if ((await window.locator(STORYLINE_PICKER_EMPTY).count()) === 0) return null;
  return normalize(await window.locator(STORYLINE_PICKER_EMPTY).first().innerText());
}

/** How many cast icons the scene at `index` is drawing on its card. */
export async function storylineSceneCastCount(window: Page, index: number): Promise<number> {
  return await window.locator(STORYLINE_NODE).nth(index).locator(STORYLINE_CAST_DOT).count();
}

/** The names of who is in a scene, read from its menu, which is then put away. */
export async function storylineSceneCast(window: Page, index: number): Promise<string[]> {
  await openStorylineSceneMenu(window, index);
  const names = await window.locator(STORYLINE_MENU_CAST).allInnerTexts();
  await window.keyboard.press("Escape");
  await window.locator(STORYLINE_MENU).waitFor({ state: "hidden", timeout: WAIT_MS });
  return names.map((name) => normalize(name));
}

/** Follows one of those names to its page, through the scene's menu. */
export async function openStorylineCastMember(window: Page, index: number, name: string): Promise<void> {
  await openStorylineSceneMenu(window, index);
  await pressStorylineMenuRow(window, name);
}

// ---- Quick capture (Phase 30) ----

/** Types into the open page's capture box, replacing whatever was there. */
export async function typeCapture(window: Page, text: string): Promise<void> {
  await window.locator(`${CAPTURE_BOX} ${CAPTURE_TEXT}`).first().fill(text);
}

/** Presses the capture box's button and gives the page time to appear. */
export async function pressCapture(window: Page): Promise<void> {
  await window.locator(CAPTURE_BOX).getByRole("button", { name: "Capture", exact: true }).first().click();
  await window.waitForTimeout(600);
}

/** What the capture box says it will file under — the words on the control, chip included. */
export async function captureDestination(window: Page): Promise<string> {
  return normalize((await window.locator(`${CAPTURE_BOX} ${CAPTURE_DESTINATION}`).first().textContent()) ?? "");
}

/** The line under the box saying where the last thought went, or "" before any has. */
export async function captureSavedNote(window: Page): Promise<string> {
  const note = window.locator(`${CAPTURE_BOX} ${CAPTURE_SAVED}`);
  if ((await note.count()) === 0) return "";
  return normalize((await note.first().textContent()) ?? "");
}

/** Opens the capture box's destination picker and takes the top match for `name`. */
export async function pickCaptureDestination(window: Page, name: string): Promise<void> {
  await window.locator(`${CAPTURE_BOX} ${CAPTURE_DESTINATION}`).first().click();
  const search = window.getByPlaceholder("Find a destination");
  await search.fill(name);
  await search.press("Enter");
}

/** Opens the Quick capture dialog by its default shortcut, and waits for it. */
export async function openQuickCapture(window: Page): Promise<void> {
  await window.keyboard.press("Control+Shift+n");
  await window.locator(QUICK_CAPTURE_DIALOG).waitFor({ state: "visible", timeout: WAIT_MS });
}

/** Whether the Quick capture dialog is on screen. */
export async function quickCaptureOpen(window: Page): Promise<boolean> {
  return (await window.locator(QUICK_CAPTURE_DIALOG).count()) > 0;
}

/** Everything the Quick capture dialog says, as one run of text. */
export async function quickCaptureText(window: Page): Promise<string> {
  return normalize((await window.locator(QUICK_CAPTURE_DIALOG).first().textContent()) ?? "");
}

/** Opens the search palette by its default shortcut. */
export async function openSearchPalette(window: Page): Promise<void> {
  await window.keyboard.press("Control+k");
  await window.getByPlaceholder(/Search every page/).waitFor({ state: "visible", timeout: WAIT_MS });
}

// ---- Style name (Phase 30, step 2) ----

/**
 * The `data-style` the open page's root carries, or null when it carries
 * none. Read off the root itself, because that attribute *is* the feature —
 * it is what a snippet aims at.
 */
export async function pageStyleName(window: Page): Promise<string | null> {
  const root = window.locator(".page-view-shell, .folder-view").first();
  return root.getAttribute("data-style");
}

/** The `data-template` beside it — the page's kind, as a snippet sees it. */
export async function pageTemplateHook(window: Page): Promise<string | null> {
  const root = window.locator(".page-view-shell, .folder-view").first();
  return root.getAttribute("data-template");
}

/** Opens a row's menu, goes into Style name, and types a name in. Enter saves it. */
export async function setStyleName(window: Page, rowName: string, name: string): Promise<void> {
  await openTreeRowMenu(window, rowName);
  await window.getByRole("button", { name: /^Style Name/ }).click();
  const box = window.getByPlaceholder("e.g. dashboard");
  await box.fill(name);
  await box.press("Enter");
  await clearTreeSearch(window);
  await window.waitForTimeout(300);
}

/** The names the Style name submenu is offering under "Already in use", once it is open. */
export async function styleNamesOffered(window: Page, rowName: string): Promise<string[]> {
  await openTreeRowMenu(window, rowName);
  await window.getByRole("button", { name: /^Style Name/ }).click();
  const menu = window.locator(".tree-style-menu");
  const heading = menu.locator(".tree-context-menu-heading");
  if ((await heading.count()) === 0) return [];
  const rows = await menu.locator(".tree-context-menu-heading ~ button:not(.tree-style-clear)").allInnerTexts();
  return rows.map(normalize);
}

/**
 * The value of the `--skin` custom property on the open page's root, as the
 * stylesheets resolved it — "" when nothing set one. A scenario writes a
 * snippet that sets it under `[data-style="…"]` and reads it back here, which
 * proves the attribute is reachable from a real `.css` file and not only
 * present in the DOM.
 */
export async function pageSkinMarker(window: Page): Promise<string> {
  return window.evaluate(() => {
    const root = document.querySelector(".page-view-shell, .folder-view");
    return root ? getComputedStyle(root).getPropertyValue("--skin").trim() : "";
  });
}

/**
 * Switches a snippet on in Settings → Snippets, by its file name, and closes
 * Settings again. Snippets are opt-in on purpose — a file dropped in the folder
 * does nothing until it is ticked — so a scenario writing one has to do this.
 */
export async function enableSnippet(window: Page, fileName: string): Promise<void> {
  await openSettings(window);
  await openSettingsSection(window, "Snippets");
  const row = window.getByRole("dialog").locator("label").filter({ hasText: fileName }).first();
  await row.waitFor({ state: "visible", timeout: WAIT_MS });
  const box = row.locator("input[type=checkbox]");
  if (!(await box.isChecked())) await box.check();
  await window.keyboard.press("Escape");
  await window.waitForTimeout(300);
}

// ---- Collection rows (Phase 30) ----

/**
 * The page names a sidebar block lists, top to bottom, by the block's heading.
 * Rooted at the panel so a block moved into the page isn't counted twice.
 */
export async function panelBlockRows(window: Page, title: string): Promise<string[]> {
  const shell = window
    .locator(`${BLOCK_PANEL} ${BLOCK_SHELL}`)
    .filter({ has: window.locator(BLOCK_TITLE, { hasText: title }) })
    .first();
  const names = await shell.locator(".block-link-name").allTextContents();
  return names.map(normalize);
}

/** Sets a page as a shortcut from its row menu — the rail's pin. */
export async function setAsShortcut(window: Page, rowName: string): Promise<void> {
  await openTreeRowMenu(window, rowName);
  await window.getByRole("button", { name: "Set as Shortcut", exact: true }).click();
  await clearTreeSearch(window);
  await window.waitForTimeout(200);
}

/**
 * Makes a new page with Ctrl+N, names it, and gives it a built-in template
 * from the grid a fresh page opens on. Returns once the page's title is up.
 */
export async function makePageOfTemplate(window: Page, name: string, template: string): Promise<void> {
  await window.keyboard.press("Control+n");
  await window.keyboard.type(name);
  await window.keyboard.press("Enter");
  await titleSettled(window);
  await window.locator(NEW_PAGE_GRID).getByRole("button", { name: template, exact: true }).click();
  await waitForPageTitle(window, name);
  await window.waitForTimeout(500);
}

/** The names of the snippets Settings → Snippets lists, and whether each is on. */
export async function snippetStates(window: Page): Promise<{ file: string; on: boolean }[]> {
  await openSettings(window);
  await openSettingsSection(window, "Snippets");
  const rows = window.getByRole("dialog").locator("label");
  const count = await rows.count();
  const out: { file: string; on: boolean }[] = [];
  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    const file = normalize((await row.locator(".appearance-snippet-file").textContent()) ?? "");
    if (!file) continue;
    out.push({ file, on: await row.locator("input[type=checkbox]").isChecked() });
  }
  await window.keyboard.press("Escape");
  await window.waitForTimeout(200);
  return out;
}

/**
 * Puts the page called `name` on the board, through the *Put a Page on It*
 * picker, and waits for its card. The picker is left open, which is its
 * behaviour: several pages in a row is how a board gets started.
 */
export async function putPageOnBoard(window: Page, name: string): Promise<void> {
  const before = await window.locator(BOARD_PAGE_CARD).count();
  const put = window.locator(BOARD_PUT_BUTTON);
  if ((await put.getAttribute("aria-expanded")) !== "true") await put.click();
  await window.locator(BOARD_PICKER_INPUT).fill(name);
  await window.locator(BOARD_PICKER_ROW).filter({ hasText: name }).first().click();
  await window.locator(BOARD_PAGE_CARD).nth(before).waitFor({ state: "visible", timeout: WAIT_MS });
}

/** Whether the put-a-page picker is open with its search box focused — what a pick leaves behind. */
export async function boardPickerIsOpenAndFocused(window: Page): Promise<boolean> {
  const input = window.locator(BOARD_PICKER_INPUT);
  if (!(await input.isVisible())) return false;
  return input.evaluate((element) => element === document.activeElement);
}

/** The cards on the board, by the page each one shows. */
export async function boardCardNames(window: Page): Promise<string[]> {
  return window.locator(BOARD_PAGE_CARD).evaluateAll((cards) => cards.map((card) => card.getAttribute("data-page-name") ?? ""));
}

/** How the card for `name` is presenting its page: "icon", "row" or "picture". */
export async function boardCardPresentation(window: Page, name: string): Promise<string> {
  return (await boardCard(window, name).first().getAttribute("data-presentation")) ?? "";
}

/**
 * Clicks the card for `name` on the board, at its middle.
 *
 * **By coordinates, not through the element.** The library keeps a card's
 * box from taking pointer events until the card is woken, so the click has
 * to land on the canvas where the card is drawn — which is where a hand
 * would put it. The first click selects the card; the second opens its page.
 */
export async function clickBoardCard(window: Page, name: string): Promise<void> {
  const box = await boardCard(window, name).first().boundingBox();
  if (!box) throw new Error(`no card for ${name} on the board`);
  await window.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await settlePastWake(window);
}

/**
 * The library treats a quick press-and-release on an embed's middle as a
 * "wake" and acts on it a hundred milliseconds later, setting the selection
 * as it does. A gesture begun inside that window — which a driven mouse
 * manages and a hand does not — is clobbered by it, so every helper that
 * ends on a card's middle waits it out.
 */
async function settlePastWake(window: Page): Promise<void> {
  await window.waitForTimeout(250);
}

/**
 * Resizes the card for `name` by dragging its bottom-right handle, so its
 * box ends `width` by `height` on screen (the board at its default zoom is
 * one unit to one pixel, so these are the drawing's own units too). The card
 * must be selected already, since the handles are only drawn then.
 */
export async function resizeBoardCard(window: Page, name: string, width: number, height: number): Promise<void> {
  const box = await boardCard(window, name).first().boundingBox();
  if (!box) throw new Error(`no card for ${name} on the board`);
  // The library draws the corner handle just outside the element's box —
  // its centre sits six units out from the corner at this zoom — and the
  // card's own box sits one unit inside the element's, for the stroke.
  const grip = 7;
  const from = { x: box.x + box.width + grip, y: box.y + box.height + grip };
  await window.mouse.move(from.x, from.y);
  await window.mouse.down();
  await window.mouse.move(box.x - 1 + width + grip, box.y - 1 + height + grip, { steps: 8 });
  await window.mouse.up();
}

/**
 * Drags the tree row called `name` onto the board's middle, the way a hand
 * would take a page from the sidebar to a board.
 *
 * **The drag's events are dispatched, not performed.** A native drag never
 * starts from the driven mouse inside Electron — neither Playwright's
 * `dragTo` nor a press-move-release produces a single `dragstart` — so the
 * two ends the app owns are exercised directly: the row's `dragstart`, which
 * writes the page ids onto the drag, and the board's `dragover` and `drop`,
 * which read them back. One `DataTransfer` carries them between, as the
 * browser's would. What the browser does in between is the browser's.
 */
export async function dragPageOntoBoard(window: Page, name: string): Promise<void> {
  const before = await window.locator(BOARD_PAGE_CARD).count();
  await searchTree(window, name);
  const row = treeRow(window, name).first();
  await row.evaluate((rowElement, boardSelector) => {
    const board = document.querySelector(boardSelector);
    if (!board) throw new Error("no board canvas to drop on");
    const carried = new DataTransfer();
    rowElement.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: carried }));
    const box = board.getBoundingClientRect();
    const over = { bubbles: true, cancelable: true, dataTransfer: carried, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
    board.dispatchEvent(new DragEvent("dragenter", over));
    board.dispatchEvent(new DragEvent("dragover", over));
    board.dispatchEvent(new DragEvent("drop", over));
    rowElement.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: carried }));
  }, BOARD_CANVAS);
  await clearTreeSearch(window);
  await window.locator(BOARD_PAGE_CARD).nth(before).waitFor({ state: "visible", timeout: WAIT_MS });
}

/**
 * Drops a picture from the Assets tab on the middle of the board — the tab's
 * own drag, with its payload, dispatched at the canvas the way
 * `dragPageOntoBoard` dispatches the tree's.
 */
export async function dropAssetOntoBoard(window: Page, fileName: string): Promise<void> {
  await window.locator(BOARD_CANVAS).first().evaluate((board, [type, name]) => {
    const carried = new DataTransfer();
    carried.setData(type, name);
    const box = board.getBoundingClientRect();
    const over = { bubbles: true, cancelable: true, dataTransfer: carried, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
    board.dispatchEvent(new DragEvent("dragenter", over));
    board.dispatchEvent(new DragEvent("dragover", over));
    board.dispatchEvent(new DragEvent("drop", over));
  }, [ASSET_DRAG_TYPE, fileName]);
}

/**
 * Pastes a PNG onto the board, as Ctrl+V with a picture on the clipboard
 * would: a paste event carrying the file, dispatched where the library
 * listens for one.
 */
export async function pasteImageOnBoard(window: Page, png: Uint8Array): Promise<void> {
  // The library takes a paste only with the keyboard on the board and the
  // mouse over its canvas — the picture lands under the mouse.
  const canvas = window.locator(BOARD_CANVAS).first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the board's canvas has no size");
  await canvas.click({ position: { x: box.width / 2, y: box.height - 8 } });
  await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await canvas.evaluate((board, bytes) => {
    const carried = new DataTransfer();
    carried.items.add(new File([new Uint8Array(bytes)], "pasted.png", { type: "image/png" }));
    board.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: carried }));
  }, Array.from(png));
}

/**
 * Pastes text onto the board, as Ctrl+V with it on the clipboard would —
 * the board's own paste, so a web address becomes a bookmark card where
 * the mouse is, which is the middle of the canvas here.
 */
export async function pasteTextOnBoard(window: Page, text: string): Promise<void> {
  const canvas = window.locator(BOARD_CANVAS).first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the board's canvas has no size");
  await canvas.click({ position: { x: box.width / 2, y: box.height - 8 } });
  await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await canvas.evaluate((board, pasted) => {
    const carried = new DataTransfer();
    carried.setData("text/plain", pasted);
    board.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: carried }));
  }, text);
}

/** The bookmark cards on the board, by their titles, in drawing order. */
export async function boardBookmarkTitles(window: Page): Promise<string[]> {
  return window.locator(BOARD_BOOKMARK_CARD).evaluateAll((cards) =>
    cards.map((card) => card.querySelector(".board-bookmark-card-title")?.textContent ?? ""),
  );
}

/** Waits until a bookmark card on the board has heard back from its page. */
export async function waitForBookmarkFetched(window: Page, count: number): Promise<void> {
  await window.locator(`${BOARD_BOOKMARK_CARD}[data-fetched="true"]`).nth(count - 1).waitFor({ state: "attached", timeout: WAIT_MS });
}

/** A small real PNG — a 12×8 orange block — for anything that refuses a file that will not decode. */
export function smallPng(): Uint8Array {
  const width = 12;
  const height = 8;
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body), 0);
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const raw = Buffer.alloc(height * (width * 3 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < width; x++) {
      raw[offset++] = 230;
      raw[offset++] = 120;
      raw[offset++] = 40;
    }
  }
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

/** Waits until the board shows at least `count` cards — on a fresh load they arrive after the library does. */
export async function waitForBoardCards(window: Page, count: number): Promise<void> {
  await window.locator(BOARD_PAGE_CARD).nth(count - 1).waitFor({ state: "visible", timeout: WAIT_MS });
}

/**
 * Clears the board's selection by clicking an empty spot — the bottom
 * middle of the canvas, which the library keeps clear of its own buttons
 * and which cards, placed mid-view, do not reach. Escape does not do this:
 * the library's Escape ends the tool in hand and leaves the selection.
 */
export async function deselectOnBoard(window: Page): Promise<void> {
  const canvas = window.locator(BOARD_CANVAS).first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the board's canvas has no size");
  // No tool shortcut first: the keyboard may be in the tree's search box,
  // and a letter typed there filters the tree rather than picking a tool.
  await canvas.click({ position: { x: box.width / 2, y: box.height - 8 } });
}

/** Whether the board is drawing its dotted background. */
export async function boardDotsShown(window: Page): Promise<boolean> {
  return (await window.locator(BOARD).first().getAttribute("data-dots")) === "true";
}

/** Switches the dots on or off, from the board's own menu. */
export async function toggleBoardDots(window: Page): Promise<void> {
  const before = await boardDotsShown(window);
  await window.locator(BOARD_MENU_BUTTON).first().click();
  await window.locator(BOARD_DOTS_TOGGLE).first().click();
  await window.waitForFunction(
    ([selector, was]) => document.querySelector(selector)?.getAttribute("data-dots") !== was,
    [BOARD, before ? "true" : "false"],
    { timeout: WAIT_MS },
  );
  await window.keyboard.press("Escape");
}

/** Where the card for `name` sits on screen, for telling whether it moved. */
export async function boardCardBox(window: Page, name: string): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await boardCard(window, name).first().boundingBox();
  if (!box) throw new Error(`no card for ${name} on the board`);
  return box;
}

/** Drags the card for `name` by its middle, `dx` and `dy` pixels — what a hand does to move a card. */
export async function dragBoardCard(window: Page, name: string, dx: number, dy: number): Promise<void> {
  const box = await boardCardBox(window, name);
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await window.mouse.move(from.x, from.y);
  await window.mouse.down();
  await window.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 4 });
  await window.mouse.move(from.x + dx, from.y + dy, { steps: 4 });
  await window.mouse.up();
  await settlePastWake(window);
}

/**
 * Draws a selection box from one corner of the canvas region to the other,
 * the way everything inside is selected at once. The corners are given as
 * fractions of the canvas.
 */
export async function boxSelectOnBoard(window: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  const canvas = window.locator(BOARD_CANVAS).first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the board's canvas has no size");
  await window.mouse.move(box.x + box.width * from.x, box.y + box.height * from.y);
  await window.mouse.down();
  await window.mouse.move(box.x + box.width * to.x, box.y + box.height * to.y, { steps: 8 });
  await window.mouse.up();
}

/** How many cards are on the board. */
export async function boardCardCount(window: Page): Promise<number> {
  return window.locator(BOARD_PAGE_CARD).count();
}

/**
 * Draws a hollow rectangle on the board between two points given as
 * fractions of the canvas — `drawBoardRectangle` with the corners chosen.
 */
export async function drawBoardRectangleAt(window: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  const canvas = window.locator(BOARD_CANVAS).first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the board's canvas has no size");
  // A click on the empty starting corner first, so the keyboard is the
  // board's — the tool shortcut typed anywhere else draws nothing.
  await canvas.click({ position: { x: box.width * from.x, y: box.height * from.y } });
  await window.keyboard.press("r");
  await window.mouse.move(box.x + box.width * from.x, box.y + box.height * from.y);
  await window.mouse.down();
  await window.mouse.move(box.x + box.width * to.x, box.y + box.height * to.y, { steps: 8 });
  await window.mouse.up();
  await window.keyboard.press("Escape");
}

/**
 * Draws a frame on the board between two points given as fractions of the
 * canvas, with the library's frame tool.
 */
export async function drawBoardFrameAt(window: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  const canvas = window.locator(BOARD_CANVAS).first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the board's canvas has no size");
  await canvas.click({ position: { x: box.width * from.x, y: box.height * from.y } });
  await window.keyboard.press("f");
  await window.mouse.move(box.x + box.width * from.x, box.y + box.height * from.y);
  await window.mouse.down();
  await window.mouse.move(box.x + box.width * to.x, box.y + box.height * to.y, { steps: 8 });
  await window.mouse.up();
  await window.keyboard.press("Escape");
}

/**
 * Turns whatever is selected on the board by its rotation grip — the small
 * handle above the selection's top edge — dragging it to a point given as
 * fractions of the canvas. `top` is the selection's top-centre, also as
 * fractions; the grip sits a fixed 20px above it at the default zoom.
 */
export async function turnBoardSelection(window: Page, top: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  const canvas = window.locator(BOARD_CANVAS).first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the board's canvas has no size");
  await window.mouse.move(box.x + box.width * top.x, box.y + box.height * top.y - 20);
  await window.mouse.down();
  await window.mouse.move(box.x + box.width * to.x, box.y + box.height * to.y, { steps: 8 });
  await window.mouse.up();
}

/** The size of the board's canvas on screen, for turning fractions into pixels. */
export async function boardCanvasSize(window: Page): Promise<{ width: number; height: number }> {
  const box = await window.locator(BOARD_CANVAS).first().boundingBox();
  if (!box) throw new Error("the board's canvas has no size");
  return { width: box.width, height: box.height };
}

/** Clicks the board at a point given as fractions of the canvas, with the selection tool. */
export async function clickBoardAt(window: Page, at: { x: number; y: number }): Promise<void> {
  const canvas = window.locator(BOARD_CANVAS).first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the board's canvas has no size");
  await canvas.click({ position: { x: box.width * at.x, y: box.height * at.y } });
}

/** Drags on the board from one point to another, both as fractions of the canvas, with the selection tool. */
export async function dragBoardFrom(window: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  const canvas = window.locator(BOARD_CANVAS).first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the board's canvas has no size");
  await window.mouse.move(box.x + box.width * from.x, box.y + box.height * from.y);
  await window.mouse.down();
  await window.mouse.move(box.x + box.width * to.x, box.y + box.height * to.y, { steps: 8 });
  await window.mouse.up();
}

/** Locks whatever is selected on the board, with the library's own shortcut. */
export async function lockBoardSelection(window: Page): Promise<void> {
  await window.keyboard.press("Control+Shift+l");
}

/** Whether the board is showing the pointer cursor of a button — a locked shape with a link under the mouse. */
export async function boardShowsButtonCursor(window: Page): Promise<boolean> {
  return (await window.locator(BOARD).first().getAttribute("data-over-button")) === "true";
}

// ---- Sticky notes (Phase 32, step 10) ----

/**
 * Adds a note in `colour` through the top-right Note button and its
 * swatches, and waits for it to be open for writing — a new note is
 * ready for the keyboard at once.
 */
export async function addBoardNote(window: Page, colour: string): Promise<void> {
  const before = await window.locator(BOARD_NOTE).count();
  const button = window.locator(BOARD_NOTE_BUTTON);
  if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
  await window.locator(`${BOARD_NOTE_SWATCH}[data-colour="${colour}"]`).click();
  await window.locator(`${BOARD_NOTE}[data-editing="true"]`).nth(0).waitFor({ state: "visible", timeout: WAIT_MS });
  await window.locator(BOARD_NOTE).nth(before).waitFor({ state: "visible", timeout: WAIT_MS });
}

/** Whether a note on the board is open for writing, with the keyboard in it. */
export async function boardNoteIsBeingWritten(window: Page): Promise<boolean> {
  return window.evaluate((selector) => {
    const words = document.querySelector<HTMLElement>(`${selector}[data-editing="true"] .board-note-words`);
    return !!words && words === document.activeElement;
  }, BOARD_NOTE);
}

/** Whether any note on the board is open for writing, wherever the keyboard is. */
export async function boardNoteIsOpen(window: Page): Promise<boolean> {
  return (await window.locator(`${BOARD_NOTE}[data-editing="true"]`).count()) > 0;
}

/** The words of every note on the board, marks off, in drawing order. */
export async function boardNoteTexts(window: Page): Promise<string[]> {
  return window.locator(BOARD_NOTE).evaluateAll((notes) => notes.map((note) => (note.querySelector(".board-note-words") as HTMLElement).innerText.replace(/\n+$/, "")));
}

/** The colours of every note on the board, in drawing order. */
export async function boardNoteColours(window: Page): Promise<string[]> {
  return window.locator(BOARD_NOTE).evaluateAll((notes) => notes.map((note) => note.getAttribute("data-colour") ?? ""));
}

/** The words a note draws in bold, and the ones it draws as links, for the note at `index`. */
export async function boardNoteMarks(window: Page, index: number): Promise<{ bold: string[]; links: { text: string; href: string }[] }> {
  return window.locator(BOARD_NOTE).nth(index).evaluate((note) => ({
    bold: Array.from(note.querySelectorAll("strong, b")).map((element) => element.textContent ?? ""),
    links: Array.from(note.querySelectorAll("a")).map((element) => ({ text: element.textContent ?? "", href: element.getAttribute("href") ?? "" })),
  }));
}

/** The box of the note at `index`, in window pixels — the drawing's units at the default zoom. */
export async function boardNoteBox(window: Page, index: number): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await window.locator(BOARD_NOTE).nth(index).boundingBox();
  if (!box) throw new Error(`no note at index ${index} on the board`);
  return box;
}

/** Ends the writing in a note with Escape, which keeps it selected. */
export async function finishBoardNote(window: Page): Promise<void> {
  await window.keyboard.press("Escape");
  await window.locator(`${BOARD_NOTE}[data-editing="true"]`).waitFor({ state: "detached", timeout: WAIT_MS });
}

/**
 * Clicks the note at `index` at its middle, by coordinates like a card:
 * the first click selects it; the second, or a double-click, opens it for
 * writing.
 */
export async function clickBoardNote(window: Page, index: number): Promise<void> {
  const box = await boardNoteBox(window, index);
  await window.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await settlePastWake(window);
}

export async function doubleClickBoardNote(window: Page, index: number): Promise<void> {
  const box = await boardNoteBox(window, index);
  await window.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  await window.locator(`${BOARD_NOTE}[data-editing="true"]`).nth(0).waitFor({ state: "visible", timeout: WAIT_MS });
  // Open is not enough: the keyboard has to be in it before anything is
  // typed, and the library's wake timers from the two clicks are still to
  // fire (see BoardNote's keep-focus note).
  await window.waitForFunction(
    (selector) => {
      const words = document.querySelector<HTMLElement>(`${selector}[data-editing="true"] .board-note-words`);
      return !!words && words === document.activeElement;
    },
    BOARD_NOTE,
    { timeout: WAIT_MS },
  );
  await settlePastWake(window);
}

/** Clicks the link reading `text` in the words of the note at `index`. */
export async function clickBoardNoteLink(window: Page, index: number, text: string): Promise<void> {
  await window.locator(BOARD_NOTE).nth(index).locator("a").filter({ hasText: text }).first().click();
}

/** Recolours the selected notes through the top-right Colour button. */
export async function recolourBoardNotes(window: Page, colour: string): Promise<void> {
  const button = window.locator(BOARD_COLOUR_BUTTON);
  if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
  await window.locator(`${BOARD_NOTE_SWATCH}[data-colour="${colour}"]`).click();
}

/** Whether the top-right row offers the Colour button, which it does only with a note selected. */
export async function boardOffersNoteColour(window: Page): Promise<boolean> {
  return (await window.locator(BOARD_COLOUR_BUTTON).count()) > 0;
}

/**
 * Puts a link to the page called `name` into the note being written, at
 * the caret, through Ctrl+K and the picker.
 */
export async function linkBoardNoteWordsToPage(window: Page, name: string): Promise<void> {
  await window.keyboard.press("Control+k");
  await window.locator(BOARD_PICKER_INPUT).fill(name);
  await window.locator(BOARD_PICKER_ROW).filter({ hasText: name }).first().click();
}

/** Moves the mouse over the middle of the card for `name`, without clicking. */
export async function hoverBoardCard(window: Page, name: string): Promise<void> {
  const box = await boardCardBox(window, name);
  await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await window.mouse.move(box.x + box.width / 2 + 1, box.y + box.height / 2 + 1);
}
