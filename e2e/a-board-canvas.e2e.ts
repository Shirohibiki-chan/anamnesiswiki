// The board: a whiteboard in the page whose body it is. Board spike,
// 2026-09-13.
//
// What only the real app can answer: that Board is offered as a kind of page,
// that the drawing library actually loads inside Electron with its fonts
// coming off the disk rather than a CDN, that a shape drawn reaches
// `_board.json`, and that it is still there after a restart.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  boardDotsShown,
  boardIsExpanded,
  boardIsShown,
  boardLinkLabel,
  clearTreeSearch,
  clickBoardAt,
  deselectOnBoard,
  drawBoardRectangle,
  followBoardLink,
  linkBoardShapeToPage,
  lockBoardSelection,
  makeBoard,
  pageTitle,
  openPage,
  selectBoardShape,
  toggleBoardDots,
  toggleBoardExpand,
  waitForBoard,
  waitForPageTitle,
  waitForWorld,
} from "./harness/screen";

/** A page the generated world really has — see a-storyline-existing-pages. */
const EXISTING = "Greyharbour";

/** Long enough for the settle delay and the queued write to reach the disk. */
const WRITTEN_MS = 2500;

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

async function findBoardFile(root: string): Promise<string | null> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const found = await findBoardFile(full);
      if (found) return found;
    } else if (entry.name === "_board.json") {
      return full;
    }
  }
  return null;
}

describe("a board's whiteboard", () => {
  let app: RunningApp;
  const BOARD = "Where the rivers go";

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

  it("draws a whiteboard in the page, with its fonts loading off the disk", async () => {
    expect(await boardIsShown(app.window)).toBe(true);
    expect(await pageTitle(app.window)).toBe(BOARD);
    const fontRequestsOffTheNetwork = app.errors.filter((message) => /esm\.sh|unpkg|font/i.test(message));
    expect(fontRequestsOffTheNetwork).toEqual([]);
  });

  it("writes a shape drawn on it into the page's own _board.json", async () => {
    await drawBoardRectangle(app.window);
    await app.window.waitForTimeout(WRITTEN_MS);
    const file = await findBoardFile(app.world!.path);
    expect(file).not.toBeNull();
    const board = JSON.parse(await fs.readFile(file!, "utf8")) as { elements: { type: string }[] };
    expect(board.elements.map((element) => element.type)).toEqual(["rectangle"]);
  });

  it("fills the window on Expand and comes back", async () => {
    await toggleBoardExpand(app.window);
    expect(await boardIsExpanded(app.window)).toBe(true);
    await toggleBoardExpand(app.window);
    expect(await boardIsExpanded(app.window)).toBe(false);
  });

  it("links a shape to a page, and writes the page's id rather than its name", async () => {
    await selectBoardShape(app.window);
    expect(await boardLinkLabel(app.window)).toBe("Link this shape to a page");
    await linkBoardShapeToPage(app.window, EXISTING);
    expect(await boardLinkLabel(app.window)).toBe(`Linked to ${EXISTING}`);
    await app.window.waitForTimeout(WRITTEN_MS);
    const file = await findBoardFile(app.world!.path);
    const board = JSON.parse(await fs.readFile(file!, "utf8")) as { elements: { link?: string }[] };
    expect(board.elements[0].link).toMatch(/^anamnesis:\/\/page\/.+/);
    expect(board.elements[0].link).not.toContain(EXISTING);
  });

  it("opens the page when the link is followed", async () => {
    await selectBoardShape(app.window);
    await followBoardLink(app.window);
    await waitForPageTitle(app.window, EXISTING);
    expect(await pageTitle(app.window)).toBe(EXISTING);
    expect(app.errors).toEqual([]);
  });

  it("draws its dots by default, and remembers them switched off", async () => {
    await openPage(app.window, BOARD);
    await waitForBoard(app.window);
    expect(await boardDotsShown(app.window)).toBe(true);
    await toggleBoardDots(app.window);
    expect(await boardDotsShown(app.window)).toBe(false);
    await app.window.waitForTimeout(WRITTEN_MS);
    const file = await findBoardFile(app.world!.path);
    expect((JSON.parse(await fs.readFile(file!, "utf8")) as { dots?: boolean }).dots).toBe(false);
    await reload(app);
    await openPage(app.window, BOARD);
    await waitForBoard(app.window);
    expect(await boardDotsShown(app.window)).toBe(false);
    await toggleBoardDots(app.window);
    expect(await boardDotsShown(app.window)).toBe(true);
  });

  it("opens the page on a click anywhere in the shape once it is locked", async () => {
    // The same linked rectangle, locked: it can no longer be moved or
    // edited, so a click inside it goes where its link goes — LK's rule for
    // locked shapes, and step 2 of Phase 32.
    await selectBoardShape(app.window);
    await lockBoardSelection(app.window);
    await deselectOnBoard(app.window);
    // The rectangle was drawn across the middle of the canvas; this is well
    // inside it and nowhere near its outline.
    await clickBoardAt(app.window, { x: 0.45, y: 0.45 });
    await waitForPageTitle(app.window, EXISTING);
    expect(await pageTitle(app.window)).toBe(EXISTING);
  });

  it("still has the shape and its link after a restart", async () => {
    // The app reopens on the page the link led to, not on the board — the
    // file is what is being asked about here, not the screen.
    await reload(app);
    const file = await findBoardFile(app.world!.path);
    const board = JSON.parse(await fs.readFile(file!, "utf8")) as { elements: { type: string; link?: string }[] };
    expect(board.elements).toHaveLength(1);
    expect(board.elements[0].link).toMatch(/^anamnesis:\/\/page\//);
    expect(app.errors).toEqual([]);
  });
});
