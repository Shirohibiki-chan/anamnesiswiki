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
const PROJECT_NAME = ".tree-project-header-name";
const BREADCRUMB_ITEM = ".page-title-breadcrumb-item";

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

/** The top bar's back button. */
export async function goBack(window: Page): Promise<void> {
  await window.getByRole("button", { name: "Back", exact: true }).click();
}

/** The top bar's forward button. */
export async function goForward(window: Page): Promise<void> {
  await window.getByRole("button", { name: "Forward", exact: true }).click();
}

/** Collapses runs of whitespace, the way the browser already has by render time. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
