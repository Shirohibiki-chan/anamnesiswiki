// A page viewed beside a board. Phase 32, step 6, the View panel.
//
// What only the real app can answer: that View on a selected page card
// opens the page beside the board with its own title and the writing the
// page holds on disk; that typing in the panel reaches the page's file and
// the page's opened box on the board follows it; that the box cannot be
// written in while its page is viewed, and can again once the panel is
// closed; and that the panel's Open button is the page in full.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  boardCardPresentation,
  boardIsExpanded,
  boardOffersView,
  boardOpenPageIsBeingWritten,
  boardOpenPageText,
  boardViewPanelIsOpen,
  boardViewPanelName,
  boardViewPanelText,
  boardViewPanelTitle,
  clearTreeSearch,
  clickBoardCard,
  closeBoardViewPanel,
  deselectOnBoard,
  doubleClickBoardCard,
  doubleClickBoardCardQuietly,
  dragBoardCard,
  editorText,
  makeBoard,
  openBoardViewPanelPage,
  openPage,
  pageTitle,
  putPageOnBoard,
  resizeBoardCard,
  toggleBoardExpand,
  typeInBoardViewPanel,
  viewBoardCardPage,
  waitForBoard,
  waitForBoardCards,
  waitForPageTitle,
  waitForWorld,
} from "./harness/screen";

/** A page the generated world really has — see a-storyline-existing-pages. */
const PAGE = "Longford";

/** Long enough for the settle delay and the queued write to reach the disk. */
const WRITTEN_MS = 2500;

/** What is typed into the page beside the board. */
const TYPED = "Written beside the board";

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

/** The whole of the first tab's writing as it is on disk, as one string. */
async function wordsOnDisk(root: string, name: string): Promise<string> {
  const file = await findFile(root, (entry, isDirectory) => (isDirectory ? entry === name : entry === `${name}.json`));
  expect(file).not.toBeNull();
  const page = JSON.parse(await fs.readFile(file!, "utf8")) as { tabs: { content: { content?: { text?: string }[] }[] }[] };
  return page.tabs[0].content
    .map((block) => (block.content ?? []).map((run) => run.text ?? "").join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("a page viewed beside a board", () => {
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

  it("opens the selected card's page beside the board, with its title and its writing", async () => {
    await putPageOnBoard(app.window, PAGE);
    await app.window.keyboard.press("Escape");
    // The board expanded to the window: the panel takes a third of the
    // board, and the test window's board-in-the-page is too narrow to hold
    // both a panel and a stretched card.
    await toggleBoardExpand(app.window);
    expect(await boardIsExpanded(app.window)).toBe(true);
    await deselectOnBoard(app.window);
    await clickBoardCard(app.window, PAGE);
    // A page card selected is what puts View on offer.
    expect(await boardOffersView(app.window)).toBe(true);
    await viewBoardCardPage(app.window);
    expect(await boardViewPanelName(app.window)).toBe(PAGE);
    expect(await boardViewPanelTitle(app.window)).toBe(PAGE);
    const words = await wordsOnDisk(app.world!.path, PAGE);
    expect(words.length).toBeGreaterThan(0);
    expect(await boardViewPanelText(app.window)).toContain(words.slice(0, 40));
    // Still on the board: the page is beside it, not instead of it.
    expect(await pageTitle(app.window)).toBe(BOARD);
    expect(app.errors).toEqual([]);
  });

  it("saves what is typed in the panel to the page, and the page's opened box on the board follows", async () => {
    // The card, stretched to show its page, so the box can be watched.
    await deselectOnBoard(app.window);
    await clickBoardCard(app.window, PAGE);
    await dragBoardCard(app.window, PAGE, -120, -120);
    await app.window.waitForTimeout(400);
    await resizeBoardCard(app.window, PAGE, 420, 320);
    expect(await boardCardPresentation(app.window, PAGE)).toBe("page");
    await typeInBoardViewPanel(app.window, TYPED);
    await app.window.waitForTimeout(WRITTEN_MS);
    expect(await wordsOnDisk(app.world!.path, PAGE)).toContain(TYPED);
    expect(await boardOpenPageText(app.window, PAGE)).toContain(TYPED);
    expect(app.errors).toEqual([]);
  });

  it("keeps the box drawn while its page is viewed, and lets it be written in once the panel is closed", async () => {
    await deselectOnBoard(app.window);
    await clickBoardCard(app.window, PAGE);
    await app.window.waitForTimeout(400);
    await doubleClickBoardCardQuietly(app.window, PAGE);
    // One editor per page: the panel has it.
    expect(await boardOpenPageIsBeingWritten(app.window, PAGE)).toBe(false);
    expect(await boardViewPanelIsOpen(app.window)).toBe(true);
    await closeBoardViewPanel(app.window);
    await deselectOnBoard(app.window);
    await clickBoardCard(app.window, PAGE);
    await app.window.waitForTimeout(400);
    await doubleClickBoardCard(app.window, PAGE);
    expect(await boardOpenPageIsBeingWritten(app.window, PAGE)).toBe(true);
    await app.window.keyboard.press("Escape");
  });

  it("opens the page in full from the panel's Open button", async () => {
    await deselectOnBoard(app.window);
    await clickBoardCard(app.window, PAGE);
    await viewBoardCardPage(app.window);
    await openBoardViewPanelPage(app.window);
    await waitForPageTitle(app.window, PAGE);
    // Left the expanded board behind, whole: the page is in full.
    expect(await boardIsExpanded(app.window)).toBe(false);
    expect(await editorText(app.window)).toContain(TYPED);
    await openPage(app.window, BOARD);
    await waitForBoard(app.window);
    await waitForBoardCards(app.window, 1);
    expect(app.errors).toEqual([]);
  });
});
