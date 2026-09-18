// Page cards on a board. Phase 32, step 1.
//
// What only the real app can answer: that a page put on a board becomes a
// card that names the page, that the card is the library's own element and
// reaches `_board.json` with the page's id, that resizing it changes what it
// shows, that a second click on it opens the page, that a row dragged out of
// the tree lands as a card, and that the cards are still there — still
// naming their pages — after a restart.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  boardCardNames,
  boardCardPresentation,
  boardPickerIsOpenAndFocused,
  clearTreeSearch,
  clickBoardCard,
  deselectOnBoard,
  dragPageOntoBoard,
  makeBoard,
  openPage,
  pageTitle,
  putPageOnBoard,
  resizeBoardCard,
  waitForBoard,
  waitForBoardCards,
  waitForPageTitle,
  waitForWorld,
} from "./harness/screen";

/** Pages the generated world really has — see a-storyline-existing-pages. */
const FIRST = "Greyharbour";
const SECOND = "Longford";

/** Long enough for the settle delay and the queued write to reach the disk. */
const WRITTEN_MS = 2500;

type SavedElement = { type: string; link?: string | null; width: number; height: number };

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

async function savedElements(app: RunningApp): Promise<SavedElement[]> {
  await app.window.waitForTimeout(WRITTEN_MS);
  const file = await findBoardFile(app.world!.path);
  expect(file).not.toBeNull();
  return (JSON.parse(await fs.readFile(file!, "utf8")) as { elements: SavedElement[] }).elements;
}

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

describe("page cards on a board", () => {
  let app: RunningApp;
  const BOARD = "The war table";

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

  it("puts a page on the board as a card that names it, and keeps the picker open for the next", async () => {
    await putPageOnBoard(app.window, FIRST);
    expect(await boardCardNames(app.window)).toEqual([FIRST]);
    expect(await boardCardPresentation(app.window, FIRST)).toBe("picture");
    expect(await boardPickerIsOpenAndFocused(app.window)).toBe(true);
    await app.window.keyboard.press("Escape");
  });

  it("writes the card as the library's embed with the page's id, not its name", async () => {
    const elements = await savedElements(app);
    expect(elements.map((element) => element.type)).toEqual(["embeddable"]);
    expect(elements[0].link).toMatch(/^anamnesis:\/\/page\/.+/);
    expect(elements[0].link).not.toContain(FIRST);
  });

  it("changes what it shows as it is resized, with nothing to set", async () => {
    // A card put on arrives selected, and a click on a selected card opens
    // its page (below) — so the selection is cleared first and the card
    // clicked once, which selects it and draws its handles.
    await deselectOnBoard(app.window);
    await clickBoardCard(app.window, FIRST);
    await resizeBoardCard(app.window, FIRST, 240, 60);
    expect(await boardCardPresentation(app.window, FIRST)).toBe("row");
    await resizeBoardCard(app.window, FIRST, 80, 60);
    expect(await boardCardPresentation(app.window, FIRST)).toBe("icon");
    await resizeBoardCard(app.window, FIRST, 260, 180);
    expect(await boardCardPresentation(app.window, FIRST)).toBe("picture");
    // The size reaches the file too. Within a unit or two: the drag is aimed
    // at a handle drawn a few units outside the box, so the arithmetic is
    // close rather than exact, and the presentation thresholds are what
    // matter.
    const [card] = await savedElements(app);
    expect(Math.abs(card.width - 260)).toBeLessThanOrEqual(2);
    expect(Math.abs(card.height - 180)).toBeLessThanOrEqual(2);
  });

  it("lands a page dragged out of the tree as a card where it was dropped", async () => {
    await dragPageOntoBoard(app.window, SECOND);
    expect(await boardCardNames(app.window)).toEqual([FIRST, SECOND]);
    const elements = await savedElements(app);
    expect(elements.map((element) => element.type)).toEqual(["embeddable", "embeddable"]);
  });

  it("opens the page on a second click: the first selects the card", async () => {
    await deselectOnBoard(app.window);
    await clickBoardCard(app.window, SECOND);
    // Still on the board: one click selects, as it selects any shape.
    expect(await pageTitle(app.window)).toBe(BOARD);
    await app.window.waitForTimeout(400);
    await clickBoardCard(app.window, SECOND);
    await waitForPageTitle(app.window, SECOND);
    expect(await pageTitle(app.window)).toBe(SECOND);
    expect(app.errors).toEqual([]);
  });

  it("still has both cards, naming their pages, after a restart", async () => {
    await reload(app);
    await openPage(app.window, BOARD);
    await waitForBoard(app.window);
    await waitForBoardCards(app.window, 2);
    expect((await boardCardNames(app.window)).sort()).toEqual([FIRST, SECOND].sort());
  });
});
