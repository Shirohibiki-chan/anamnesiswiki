// A page opened on a board. Phase 32, step 6.
//
// What only the real app can answer: that a page card stretched past a
// page's worth shows the page's own writing, the words the page holds on
// disk; that the first click still selects it and the second opens it for
// reading, with the keyboard in it, and Escape ends that; that being read it
// scrolls under the wheel without the board panning; that its Open button
// is the way to the page in full; that shrunk back it is a picture card
// again and the file holds only the size; and that locked it reads without
// being woken and still opens by its button.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  boardCardBox,
  boardCardPresentation,
  boardOpenPageIsBeingRead,
  boardOpenPageScroll,
  boardOpenPageText,
  clearTreeSearch,
  clickBoardCard,
  deselectOnBoard,
  doubleClickBoardCard,
  dragBoardCard,
  lockBoardSelection,
  makeBoard,
  openBoardOpenPage,
  openPage,
  pageTitle,
  putPageOnBoard,
  resizeBoardCard,
  waitForBoard,
  waitForBoardCards,
  waitForPageTitle,
  waitForWorld,
  wheelOverBoardCard,
} from "./harness/screen";

/** A page the generated world really has — see a-storyline-existing-pages. */
const PAGE = "Greyharbour";

/** Long enough for the settle delay and the queued write to reach the disk. */
const WRITTEN_MS = 2500;

/** A page's worth, and a little more: past both thresholds in `cardPresentation`. */
const OPEN_WIDTH = 480;
const OPEN_HEIGHT = 340;

type SavedElement = { type: string; link?: string | null; width: number; height: number };

async function findFile(root: string, wanted: (entry: string, isDirectory: boolean) => boolean): Promise<string | null> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (wanted(entry.name, entry.isDirectory())) return entry.isDirectory() ? path.join(full, "_page.json") : full;
    if (entry.isDirectory()) {
      const found = await findFile(full, wanted);
      if (found) return found;
    }
  }
  return null;
}

/**
 * The first line of writing the page called `name` holds on disk: the text
 * of the first block with any, as the page's own tab would draw it. What the
 * opened card shows is checked against this rather than against the page's
 * own view, so the test says the card shows the *page* and not merely
 * something.
 */
async function firstWordsOnDisk(root: string, name: string): Promise<string> {
  const file = await findFile(root, (entry, isDirectory) => (isDirectory ? entry === name : entry === `${name}.json`));
  expect(file).not.toBeNull();
  const page = JSON.parse(await fs.readFile(file!, "utf8")) as { tabs: { content: { content?: { type: string; text?: string }[] }[] }[] };
  for (const block of page.tabs[0].content) {
    const text = (block.content ?? []).map((run) => run.text ?? "").join("");
    if (text.trim()) return text.replace(/\s+/g, " ").trim();
  }
  throw new Error(`${name} has nothing written on it`);
}

async function savedElements(app: RunningApp): Promise<SavedElement[]> {
  await app.window.waitForTimeout(WRITTEN_MS);
  const file = await findFile(app.world!.path, (entry, isDirectory) => !isDirectory && entry === "_board.json");
  expect(file).not.toBeNull();
  return (JSON.parse(await fs.readFile(file!, "utf8")) as { elements: SavedElement[] }).elements;
}

describe("a page opened on a board", () => {
  let app: RunningApp;
  const BOARD = "The reading room";

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

  it("shows the page's own writing once its card is stretched past a page's worth", async () => {
    await putPageOnBoard(app.window, PAGE);
    await app.window.keyboard.press("Escape");
    expect(await boardCardPresentation(app.window, PAGE)).toBe("picture");
    // A card put on arrives selected; the selection is cleared and the
    // card clicked once, which selects it and draws its handles.
    await deselectOnBoard(app.window);
    await clickBoardCard(app.window, PAGE);
    // Up and left first: a page's worth grows from the card's top-left
    // corner, and from the middle of the view the far corner — and its
    // handle — would end off the canvas.
    await dragBoardCard(app.window, PAGE, -150, -110);
    await app.window.waitForTimeout(400);
    await resizeBoardCard(app.window, PAGE, OPEN_WIDTH, OPEN_HEIGHT);
    expect(await boardCardPresentation(app.window, PAGE)).toBe("page");
    const words = await firstWordsOnDisk(app.world!.path, PAGE);
    expect(await boardOpenPageText(app.window, PAGE)).toContain(words);
    // Stretched, not opened for reading: the box is still a shape.
    expect(await boardOpenPageIsBeingRead(app.window, PAGE)).toBe(false);
    expect(app.errors).toEqual([]);
  });

  it("is opened for reading by a second click, with the keyboard in it, and Escape ends that", async () => {
    await deselectOnBoard(app.window);
    await clickBoardCard(app.window, PAGE);
    // One click selects, as it selects any shape.
    expect(await boardOpenPageIsBeingRead(app.window, PAGE)).toBe(false);
    await app.window.waitForTimeout(400);
    await doubleClickBoardCard(app.window, PAGE);
    expect(await boardOpenPageIsBeingRead(app.window, PAGE)).toBe(true);
    // Still on the board: an opened page is read here, not left for.
    expect(await pageTitle(app.window)).toBe(BOARD);
    await app.window.keyboard.press("Escape");
    await app.window.waitForFunction(
      () => document.querySelector("[data-testid='board-page-card']")?.getAttribute("data-reading") === "false",
    );
    expect(await boardOpenPageIsBeingRead(app.window, PAGE)).toBe(false);
  });

  it("scrolls under the wheel while being read, and the board stays put", async () => {
    await deselectOnBoard(app.window);
    await clickBoardCard(app.window, PAGE);
    await app.window.waitForTimeout(400);
    await doubleClickBoardCard(app.window, PAGE);
    const before = await boardCardBox(app.window, PAGE);
    expect((await boardOpenPageScroll(app.window, PAGE)).room).toBeGreaterThan(0);
    await wheelOverBoardCard(app.window, PAGE, 120);
    await app.window.waitForFunction(
      () => (document.querySelector(".board-open-page-body")?.scrollTop ?? 0) > 0,
    );
    expect((await boardOpenPageScroll(app.window, PAGE)).top).toBeGreaterThan(0);
    // The wheel went to the page, not the board: the card is where it was.
    const after = await boardCardBox(app.window, PAGE);
    expect(Math.round(after.x)).toBe(Math.round(before.x));
    expect(Math.round(after.y)).toBe(Math.round(before.y));
    await app.window.keyboard.press("Escape");
  });

  it("opens the page in full from its Open button", async () => {
    await deselectOnBoard(app.window);
    await openBoardOpenPage(app.window, PAGE);
    await waitForPageTitle(app.window, PAGE);
    expect(await pageTitle(app.window)).toBe(PAGE);
    await openPage(app.window, BOARD);
    await waitForBoard(app.window);
    await waitForBoardCards(app.window, 1);
    expect(await boardCardPresentation(app.window, PAGE)).toBe("page");
    expect(app.errors).toEqual([]);
  });

  it("is a picture card again once shrunk back, and the file holds only the box", async () => {
    await deselectOnBoard(app.window);
    await clickBoardCard(app.window, PAGE);
    await app.window.waitForTimeout(400);
    await resizeBoardCard(app.window, PAGE, 240, 160);
    expect(await boardCardPresentation(app.window, PAGE)).toBe("picture");
    const elements = await savedElements(app);
    expect(elements.map((element) => element.type)).toEqual(["embeddable"]);
    expect(elements[0].link).toMatch(/^anamnesis:\/\/page\/.+/);
    expect(Math.abs(elements[0].width - 240)).toBeLessThanOrEqual(2);
    expect(Math.abs(elements[0].height - 160)).toBeLessThanOrEqual(2);
  });

  it("reads without being woken once locked, and still opens by its button", async () => {
    await resizeBoardCard(app.window, PAGE, OPEN_WIDTH, OPEN_HEIGHT);
    expect(await boardCardPresentation(app.window, PAGE)).toBe("page");
    await lockBoardSelection(app.window);
    await deselectOnBoard(app.window);
    // Locked, the library will not hit it, so nothing could wake it; the
    // box is hers from the start.
    expect(await boardOpenPageIsBeingRead(app.window, PAGE)).toBe(true);
    await wheelOverBoardCard(app.window, PAGE, 120);
    await app.window.waitForFunction(
      () => (document.querySelector(".board-open-page-body")?.scrollTop ?? 0) > 0,
    );
    // A click on its middle reads, it does not leave — a locked card at
    // picture size would open its page here (step 2).
    await clickBoardCard(app.window, PAGE);
    expect(await pageTitle(app.window)).toBe(BOARD);
    await openBoardOpenPage(app.window, PAGE);
    await waitForPageTitle(app.window, PAGE);
    expect(app.errors).toEqual([]);
  });
});
