// The highlighter on a board. Phase 32, step 11.
//
// What only the real app can answer: that the highlighter's stroke reaches
// `_board.json` as the library's pen stroke with the highlighter's width,
// see-through-ness and colour, marked as a highlight and under a shape
// drawn before it; that the highlighter stays in hand for the next stroke;
// that putting it down gives the pen its own style back; and that Shift+P
// picks it up and puts it down.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  boardHighlighterIsInHand,
  clearTreeSearch,
  clickBoardAt,
  drawBoardRectangleAt,
  drawBoardStrokeAt,
  makeBoard,
  pickBoardHighlighter,
  waitForWorld,
} from "./harness/screen";

/** Long enough for the settle delay and the queued write to reach the disk. */
const WRITTEN_MS = 2500;

type SavedElement = { type: string; opacity: number; strokeWidth: number; strokeColor: string; customData?: { highlight?: boolean } };

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

describe("the highlighter on a board", () => {
  let app: RunningApp;
  const BOARD = "Marked up";

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

  it("marks a wide, see-through stroke, under the shape drawn before it", async () => {
    await drawBoardRectangleAt(app.window, { x: 0.3, y: 0.4 }, { x: 0.6, y: 0.7 });
    await pickBoardHighlighter(app.window);
    expect(await boardHighlighterIsInHand(app.window)).toBe(true);
    await drawBoardStrokeAt(app.window, { x: 0.25, y: 0.55 }, { x: 0.65, y: 0.55 });
    const elements = await savedElements(app);
    // Under the ink: the stroke comes first in the file, the rectangle over it.
    expect(elements.map((element) => element.type)).toEqual(["freedraw", "rectangle"]);
    const [stroke] = elements;
    expect(stroke.opacity).toBe(50);
    expect(stroke.strokeWidth).toBe(6);
    expect(stroke.strokeColor).toBe("#ffd43b");
    expect(stroke.customData?.highlight).toBe(true);
    expect(app.errors).toEqual([]);
  });

  it("stays in hand for the next stroke, and putting it down gives the pen its own style back", async () => {
    expect(await boardHighlighterIsInHand(app.window)).toBe(true);
    await drawBoardStrokeAt(app.window, { x: 0.25, y: 0.62 }, { x: 0.65, y: 0.62 });
    await app.window.keyboard.press("Escape");
    await app.window.waitForTimeout(200);
    expect(await boardHighlighterIsInHand(app.window)).toBe(false);
    // The library's own pen, by its key: a stroke as the pen was before —
    // solid, thin, and on top.
    await clickBoardAt(app.window, { x: 0.1, y: 0.3 });
    await app.window.keyboard.press("p");
    await drawBoardStrokeAt(app.window, { x: 0.25, y: 0.45 }, { x: 0.65, y: 0.45 });
    await app.window.keyboard.press("Escape");
    const elements = await savedElements(app);
    expect(elements.map((element) => element.type)).toEqual(["freedraw", "freedraw", "rectangle", "freedraw"]);
    const pen = elements[3];
    expect(pen.opacity).toBe(100);
    expect(pen.strokeWidth).toBeLessThan(6);
    expect(pen.customData?.highlight).toBeUndefined();
    expect(elements[1].customData?.highlight).toBe(true);
  });

  it("is picked up and put down with Shift+P", async () => {
    await clickBoardAt(app.window, { x: 0.1, y: 0.3 });
    await app.window.keyboard.press("Shift+p");
    expect(await boardHighlighterIsInHand(app.window)).toBe(true);
    await app.window.keyboard.press("Shift+p");
    await app.window.waitForTimeout(200);
    expect(await boardHighlighterIsInHand(app.window)).toBe(false);
    expect(app.errors).toEqual([]);
  });
});
