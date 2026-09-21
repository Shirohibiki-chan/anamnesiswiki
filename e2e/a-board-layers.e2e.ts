// The Layers panel on a board. Phase 32, step 15.
//
// What only the real app can answer: that the panel lists what is on the
// board top to bottom with names read off the shapes and the pages; that
// a row selects its shape; that a row dragged over another moves the
// shape over it in the drawing — and in `_board.json`; that the eye and
// the lock on a row reach the file; that a page card's row follows its
// page's name; and that the panel sits on the right, in the page and
// expanded alike.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBoardNote,
  boardCardCount,
  boardIsExpanded,
  boardLayerNames,
  boardLayerRows,
  boardLayersEmptyText,
  boardLayersIsOpen,
  boardLayersLayout,
  boardLinkLabel,
  clearTreeSearch,
  clickBoardLayer,
  deselectOnBoard,
  dragBoardLayer,
  drawBoardRectangleAt,
  finishBoardNote,
  makeBoard,
  openPage,
  putPageOnBoard,
  renameOpenPage,
  toggleBoardExpand,
  toggleBoardLayerHidden,
  toggleBoardLayerLocked,
  toggleBoardLayers,
  waitForBoard,
  waitForBoardCards,
  waitForWorld,
} from "./harness/screen";

/** A page the generated world really has — see a-storyline-existing-pages. */
const PAGE = "Longford";

/** Long enough for the settle delay and the queued write to reach the disk. */
const WRITTEN_MS = 2500;

type SavedElement = { type: string; link?: string; opacity: number; locked: boolean; customData?: { hidden?: { opacity: number; locked: boolean } } };

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

/** A saved element's kind as the panel would name it, for reading the file's order. */
function kindOf(element: SavedElement): string {
  if (element.link === "anamnesis://note") return "note";
  if (element.link?.startsWith("anamnesis://page/")) return "page";
  return element.type;
}

describe("the Layers panel on a board", () => {
  let app: RunningApp;
  const BOARD = "Stacked";
  const NOTE = "Top note";

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

  it("lists what is on the board top to bottom, named, and says so when there is nothing", async () => {
    await toggleBoardLayers(app.window);
    expect(await boardLayersIsOpen(app.window)).toBe(true);
    expect(await boardLayersEmptyText(app.window)).toBe("Nothing on this board yet.");

    // Three things, in this order: a rectangle, a page card, a note — so
    // the note is on top and the rectangle at the bottom.
    await drawBoardRectangleAt(app.window, { x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 });
    await putPageOnBoard(app.window, PAGE);
    await waitForBoardCards(app.window, 1);
    await addBoardNote(app.window, "teal");
    await app.window.keyboard.type(NOTE, { delay: 20 });
    await finishBoardNote(app.window);
    await deselectOnBoard(app.window);

    expect(await boardLayerNames(app.window)).toEqual([NOTE, PAGE, "Rectangle"]);
    expect((await boardLayerRows(app.window)).map((row) => row.kind)).toEqual(["note", "page", "rectangle"]);
  });

  it("selects a shape from its row, and shows the selection on the rows", async () => {
    await clickBoardLayer(app.window, "Rectangle");
    // The library's own sign of a selected shape: the link button names
    // it as unlinked.
    expect(await boardLinkLabel(app.window)).toBe("Link this shape to a page");
    expect((await boardLayerRows(app.window)).map((row) => row.selected)).toEqual([false, false, true]);
    await clickBoardLayer(app.window, PAGE, true);
    expect((await boardLayerRows(app.window)).map((row) => row.selected)).toEqual([false, true, true]);
    await deselectOnBoard(app.window);
    expect((await boardLayerRows(app.window)).map((row) => row.selected)).toEqual([false, false, false]);
  });

  it("moves a shape over another by dragging its row above, and the file agrees", async () => {
    await dragBoardLayer(app.window, "Rectangle", NOTE);
    expect(await boardLayerNames(app.window)).toEqual(["Rectangle", NOTE, PAGE]);
    // The file lists bottom to top.
    expect((await savedElements(app)).map(kindOf)).toEqual(["page", "note", "rectangle"]);
    // And back under, by dragging below the last row.
    await dragBoardLayer(app.window, "Rectangle", PAGE);
    expect(await boardLayerNames(app.window)).toEqual([NOTE, PAGE, "Rectangle"]);
    expect((await savedElements(app)).map(kindOf)).toEqual(["rectangle", "page", "note"]);
  });

  it("hides a shape from its row — see-through and locked, put back on showing — and locks one", async () => {
    await toggleBoardLayerHidden(app.window, PAGE);
    expect((await boardLayerRows(app.window)).find((row) => row.name === PAGE)?.hidden).toBe(true);
    // Nothing is drawn in a hidden card's box, so nothing in it can be clicked unseen.
    expect(await boardCardCount(app.window)).toBe(0);
    let card = (await savedElements(app)).find((element) => kindOf(element) === "page")!;
    expect(card.opacity).toBe(0);
    expect(card.locked).toBe(true);
    expect(card.customData?.hidden).toEqual({ opacity: 100, locked: false });

    await toggleBoardLayerHidden(app.window, PAGE);
    expect((await boardLayerRows(app.window)).find((row) => row.name === PAGE)?.hidden).toBe(false);
    await waitForBoardCards(app.window, 1);
    card = (await savedElements(app)).find((element) => kindOf(element) === "page")!;
    expect(card.opacity).toBe(100);
    expect(card.locked).toBe(false);
    expect(card.customData?.hidden).toBeUndefined();

    await toggleBoardLayerLocked(app.window, "Rectangle");
    expect((await boardLayerRows(app.window)).find((row) => row.name === "Rectangle")?.locked).toBe(true);
    expect((await savedElements(app)).find((element) => element.type === "rectangle")?.locked).toBe(true);
    await toggleBoardLayerLocked(app.window, "Rectangle");
    expect((await boardLayerRows(app.window)).find((row) => row.name === "Rectangle")?.locked).toBe(false);
  });

  it("names a page card's row by its page, and follows a rename", async () => {
    const RENAMED = "Longford Keep";
    await openPage(app.window, PAGE);
    await renameOpenPage(app.window, RENAMED);
    await openPage(app.window, BOARD);
    await waitForBoard(app.window);
    await toggleBoardLayers(app.window);
    expect(await boardLayerNames(app.window)).toEqual([NOTE, RENAMED, "Rectangle"]);
  });

  it("sits on the board's right, in the page and expanded alike", async () => {
    const inPage = await boardLayersLayout(app.window);
    expect(inPage.panelLeft).toBeGreaterThanOrEqual(inPage.canvasRight - 1);
    await toggleBoardExpand(app.window);
    expect(await boardIsExpanded(app.window)).toBe(true);
    expect(await boardLayersIsOpen(app.window)).toBe(true);
    const expanded = await boardLayersLayout(app.window);
    expect(expanded.panelLeft).toBeGreaterThanOrEqual(expanded.canvasRight - 1);
    await toggleBoardExpand(app.window);
  });
});
