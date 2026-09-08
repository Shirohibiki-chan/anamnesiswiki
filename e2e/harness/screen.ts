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
// Phase 24: one page’s relationships, opened over the page. The button that
// opens it lives on the page title; everything else only exists while it is up.
const GRAPH_BUTTON = ".page-title-graph-button";
const GRAPH = ".page-graph";
const GRAPH_NODE = ".page-graph-node";
const GRAPH_NODE_NAME = ".page-graph-node-name";
const GRAPH_NODE_FOCUS = ".page-graph-node-focus";
const GRAPH_EDGE_TREE = ".page-graph-edge-tree";
const GRAPH_EDGE_WRITTEN = ".page-graph-edge-written";
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
 * The pages the "Link page names" dialog is offering, with how many times each
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
  await menu.getByRole("button", { name: "Turn into", exact: true }).click();
  await menu.getByRole("button", { name: layout, exact: true }).click();
}

/** Puts a database back to being an ordinary page. */
export async function stopShowingAsDatabase(window: Page, rowName: string): Promise<void> {
  await openTreeRowMenu(window, rowName);
  await window.locator(TREE_CONTEXT_MENU).first().getByRole("button", { name: "Stop showing as a database" }).click();
}

/** Opens the graph from the button beside the open page’s name. */
export async function openPageGraph(window: Page): Promise<void> {
  await window.locator(GRAPH_BUTTON).first().click();
  await window.locator(GRAPH).waitFor({ state: "visible", timeout: WAIT_MS });
}

/**
 * Opens the whole-universe graph from the rail, which is the other of the two
 * doors — see docs/plan.md Phase 24 step 3.
 */
export async function openWorldGraph(window: Page): Promise<void> {
  await window.locator(LEFT_RAIL).getByRole("button", { name: "Graph", exact: true }).click();
  await window.locator(GRAPH).waitFor({ state: "visible", timeout: WAIT_MS });
}

/** What the graph calls itself, which says which of the two is up. */
export async function graphHeading(window: Page): Promise<string> {
  return normalize(await window.locator(GRAPH_HEADING).first().innerText());
}

/** Whether the picture is far enough out that names are being held back. */
export async function graphNamesAreQuiet(window: Page): Promise<boolean> {
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

/** The other way. Same notches, same reason they are small. */
export async function zoomGraphIn(window: Page, notches = 4): Promise<void> {
  await wheelOverGraph(window, notches, -300);
}

async function wheelOverGraph(window: Page, notches: number, delta: number): Promise<void> {
  const box = await window.locator(GRAPH_STAGE).first().boundingBox();
  if (!box) throw new Error("The graph has no stage to zoom");
  await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < notches; i += 1) await window.mouse.wheel(0, delta);
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
  return {
    written: await window.locator(GRAPH_EDGE_WRITTEN).count(),
    tree: await window.locator(GRAPH_EDGE_TREE).count(),
  };
}

function graphNode(window: Page, name: string): Locator {
  return window.locator(GRAPH_NODE).filter({ hasText: name }).first();
}

/** Clicks a page on the graph, which should open its preview and nothing else. */
export async function clickGraphNode(window: Page, name: string): Promise<void> {
  await graphNode(window, name).click();
}

/** Where a node sits on screen, for asserting a drag moved it. */
export async function graphNodeCentre(window: Page, name: string): Promise<{ x: number; y: number }> {
  const box = await graphNode(window, name).boundingBox();
  if (!box) throw new Error(`No node on the graph called ${name}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Where a node sits, as a fraction of the box the *other* nodes occupy.
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
export async function graphNodePlacement(window: Page, name: string): Promise<{ x: number; y: number }> {
  const placement = await window.locator(GRAPH_NODE).evaluateAll((nodes, wanted) => {
    const boxes = nodes.map((node) => ({
      title: node.getAttribute("title") ?? "",
      rect: node.getBoundingClientRect(),
    }));
    const target = boxes.find((box) => box.title === wanted);
    const others = boxes.filter((box) => box.title !== wanted);
    if (!target || others.length === 0) return null;
    const left = Math.min(...others.map((box) => box.rect.left));
    const right = Math.max(...others.map((box) => box.rect.right));
    const top = Math.min(...others.map((box) => box.rect.top));
    const bottom = Math.max(...others.map((box) => box.rect.bottom));
    if (right - left === 0 || bottom - top === 0) return null;
    return {
      x: (target.rect.left + target.rect.width / 2 - left) / (right - left),
      y: (target.rect.top + target.rect.height / 2 - top) / (bottom - top),
    };
  }, name);
  if (!placement) throw new Error(`No node on the graph called ${name}`);
  return placement;
}

/** Drags a node by a number of screen pixels, in steps so the move is seen. */
export async function dragGraphNode(window: Page, name: string, byX: number, byY: number): Promise<void> {
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

/** Follows the preview’s way through to the page it describes. */
export async function openGraphPreviewPage(window: Page): Promise<void> {
  await window.locator(GRAPH_PREVIEW).getByRole("button", { name: "Open this page" }).click();
  await window.locator(GRAPH).waitFor({ state: "detached", timeout: WAIT_MS });
}

/** How many pages the graph says it is drawing, as the bar words it. */
export async function graphCount(window: Page): Promise<string> {
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
export async function setGraphLabels(window: Page, mode: "selected" | "all"): Promise<void> {
  await window.getByLabel("When to write what a line is").selectOption(mode);
}

/** The names written along lines right now, which is what the mode above decides. */
export async function graphEdgeLabels(window: Page): Promise<string[]> {
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
