// Bold, italic and links in a board's ordinary text. Phase 32, step 14.
//
// What only the real app can answer: that the marks put on the words by
// the toolbar and its keys land in the library's own text box as
// Markdown's marks; that the drawn words hide them — the patched library
// draws `**Hello**` no wider than `Hello`, and heavier; that the Layers
// panel names the box by its words alone; and that a link put on the
// words from the toolbar, through the page picker, opens its page when the
// drawn link is clicked. The width and the weight are read off the drawn
// canvas, since the words are pixels: an unpatched library draws the stars.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  boardInkExtent,
  boardLayerNames,
  boardTextBeingWritten,
  boardTextIsBeingWritten,
  boardTextToolsShown,
  clearTreeSearch,
  clickBoardTextTool,
  editBoardTextAt,
  linkBoardWordsToPage,
  makeBoard,
  selectAllBoardText,
  startBoardText,
  toggleBoardLayers,
  waitForPageTitle,
  waitForWorld,
} from "./harness/screen";

describe("bold, italic and links in a board's text", () => {
  let app: RunningApp;
  // A page the generated world already has, for the words to link to.
  const TARGET = "Greyharbour";
  const BOARD = "Words wall";
  let plain: { width: number; count: number };

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

  it("draws the words bold without their stars, from the toolbar's Bold", async () => {
    await startBoardText(app.window, { x: 0.35, y: 0.4 }, "Hello");
    expect(await boardTextToolsShown(app.window)).toBe(true);
    await app.window.keyboard.press("Escape");
    expect(await boardTextIsBeingWritten(app.window)).toBe(false);
    expect(await boardTextToolsShown(app.window)).toBe(false);
    const before = await boardInkExtent(app.window);
    plain = { width: before.right - before.left, count: before.count };
    expect(plain.width).toBeGreaterThan(20);

    await editBoardTextAt(app.window, { x: (before.left + before.right) / 2, y: (before.top + before.bottom) / 2 });
    await selectAllBoardText(app.window);
    await clickBoardTextTool(app.window, "Bold");
    expect(await boardTextBeingWritten(app.window)).toBe("**Hello**");
    await app.window.keyboard.press("Escape");
    await expect.poll(async () => (await boardInkExtent(app.window)).count, { timeout: 10_000 }).toBeGreaterThan(plain.count);
    const after = await boardInkExtent(app.window);
    // The stars are not drawn: bold is a little wider than plain, and
    // nothing like the four stars wider.
    expect(after.right - after.left).toBeLessThan(plain.width * 1.4);
  });

  it("puts the italic star on and off with Ctrl+I, and the Layers panel names the box by its words", async () => {
    const ink = await boardInkExtent(app.window);
    await editBoardTextAt(app.window, { x: (ink.left + ink.right) / 2, y: (ink.top + ink.bottom) / 2 });
    await selectAllBoardText(app.window);
    await app.window.keyboard.press("Control+i");
    expect(await boardTextBeingWritten(app.window)).toBe("***Hello***");
    await app.window.keyboard.press("Control+i");
    expect(await boardTextBeingWritten(app.window)).toBe("**Hello**");
    await app.window.keyboard.press("Escape");

    await toggleBoardLayers(app.window);
    expect(await boardLayerNames(app.window)).toEqual(["Hello"]);
    await toggleBoardLayers(app.window);
  });

  it("links the words to a page from the toolbar, and a click on the drawn link opens the page", async () => {
    const ink = await boardInkExtent(app.window);
    await editBoardTextAt(app.window, { x: (ink.left + ink.right) / 2, y: (ink.top + ink.bottom) / 2 });
    await selectAllBoardText(app.window);
    await linkBoardWordsToPage(app.window, TARGET);
    // The picker's pick went into the words, and the words are still being written.
    expect(await boardTextBeingWritten(app.window)).toMatch(/^\[\*\*Hello\*\*\]\(anamnesis:\/\/page\/[^)]+\)$/);
    expect(await boardTextIsBeingWritten(app.window)).toBe(true);
    await app.window.keyboard.press("Escape");
    expect(await boardTextIsBeingWritten(app.window)).toBe(false);
    // Drawn as the word alone, underlined — no brackets, no address.
    const linked = await boardInkExtent(app.window);
    expect(linked.right - linked.left).toBeLessThan(plain.width * 1.4);

    await app.window.mouse.click((linked.left + linked.right) / 2, (linked.top + linked.bottom) / 2);
    await waitForPageTitle(app.window, TARGET);
  });
});
