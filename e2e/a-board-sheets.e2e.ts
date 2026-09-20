// Sheets: the boards inside a board, as a tab strip along the bottom.
// Phase 32, step 13.
//
// What only the real app can answer: that a board shows itself as its one
// sheet; that + makes a board inside it, opens it, and both are in the
// strip from either side; that a tab opens its board; that the new board is
// an ordinary page in the tree; and that the strip reads the same after a
// restart.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBoardSheet,
  boardCurrentSheet,
  boardIsShown,
  boardSheetNames,
  clearTreeSearch,
  makeBoard,
  openBoardSheet,
  openPage,
  pageTitle,
  searchTree,
  treeRow,
  waitForBoard,
  waitForPageTitle,
  waitForWorld,
} from "./harness/screen";

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

describe("the boards inside a board", () => {
  let app: RunningApp;
  const BOARD = "Campaign wall";
  const SECOND = "Board 2";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type(BOARD);
    await app.window.keyboard.press("Enter");
    await makeBoard(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("shows a board as its own one sheet", async () => {
    expect(await boardSheetNames(app.window)).toEqual([BOARD]);
    expect(await boardCurrentSheet(app.window)).toBe(BOARD);
  });

  it("makes a board inside it on +, opens it, and lists both from there", async () => {
    await addBoardSheet(app.window);
    await waitForPageTitle(app.window, SECOND);
    await waitForBoard(app.window);
    expect(await boardIsShown(app.window)).toBe(true);
    expect(await boardSheetNames(app.window)).toEqual([BOARD, SECOND]);
    expect(await boardCurrentSheet(app.window)).toBe(SECOND);
    // An ordinary page in the tree, inside the first board.
    await searchTree(app.window, SECOND);
    expect(await treeRow(app.window, SECOND).count()).toBeGreaterThan(0);
    await clearTreeSearch(app.window);
    expect(app.errors).toEqual([]);
  });

  it("opens a sheet from its tab, and the strip reads the same on either", async () => {
    await openBoardSheet(app.window, BOARD);
    expect(await pageTitle(app.window)).toBe(BOARD);
    expect(await boardSheetNames(app.window)).toEqual([BOARD, SECOND]);
    expect(await boardCurrentSheet(app.window)).toBe(BOARD);
    await openBoardSheet(app.window, SECOND);
    expect(await boardCurrentSheet(app.window)).toBe(SECOND);
  });

  it("numbers the next one past what is there", async () => {
    await addBoardSheet(app.window);
    await waitForPageTitle(app.window, "Board 3");
    await waitForBoard(app.window);
    expect(await boardSheetNames(app.window)).toEqual([BOARD, SECOND, "Board 3"]);
  });

  it("reads the same after a restart", async () => {
    await reload(app);
    await openPage(app.window, SECOND);
    await waitForBoard(app.window);
    expect(await boardSheetNames(app.window)).toEqual([BOARD, SECOND, "Board 3"]);
    expect(await boardCurrentSheet(app.window)).toBe(SECOND);
    expect(app.errors).toEqual([]);
  });
});
