// Selecting on a board, the way Canva and LegendKeeper's boards do it.
// Phase 32, 2026-09-18 and -19.
//
// Two of the drawing library's own rules are changed by
// `patches/@excalidraw__excalidraw@0.18.1.patch` (see
// `scripts/excalidraw-patch.mjs`): a selection box took only what it
// swallowed whole — she drew a box across five things and got the one
// inside it — and a click inside an unfilled shape picked up nothing. These
// are the guards on the patch: they fail against the library as shipped.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  boxSelectOnBoard,
  clearTreeSearch,
  clickBoardAt,
  deselectOnBoard,
  dragBoardFrom,
  drawBoardRectangleAt,
  makeBoard,
  waitForWorld,
} from "./harness/screen";

/** Long enough for the settle delay and the queued write to reach the disk. */
const WRITTEN_MS = 2500;

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

type Shape = { x: number; y: number };

async function shapesOnDisk(app: RunningApp): Promise<number>;
async function shapesOnDisk(app: RunningApp, whole: true): Promise<Shape[]>;
async function shapesOnDisk(app: RunningApp, whole?: true): Promise<number | Shape[]> {
  await app.window.waitForTimeout(WRITTEN_MS);
  const file = await findBoardFile(app.world!.path);
  const elements = file ? (JSON.parse(await fs.readFile(file, "utf8")) as { elements: Shape[] }).elements : [];
  return whole ? elements : elements.length;
}

describe("selecting on a board", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type("Selection practice");
    await app.window.keyboard.press("Enter");
    await makeBoard(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("takes every shape the box crosses, not only the ones it swallows", async () => {
    // Two hollow rectangles side by side, and a box that crosses into both
    // without holding either whole.
    await drawBoardRectangleAt(app.window, { x: 0.2, y: 0.3 }, { x: 0.4, y: 0.6 });
    await drawBoardRectangleAt(app.window, { x: 0.6, y: 0.3 }, { x: 0.8, y: 0.6 });
    expect(await shapesOnDisk(app)).toBe(2);
    await deselectOnBoard(app.window);
    // Started on empty board, left of both — a press inside a shape moves it.
    await boxSelectOnBoard(app.window, { x: 0.1, y: 0.45 }, { x: 0.7, y: 0.75 });
    await app.window.keyboard.press("Delete");
    expect(await shapesOnDisk(app)).toBe(0);
  });

  it("picks up a hollow shape from a click anywhere inside it", async () => {
    await drawBoardRectangleAt(app.window, { x: 0.3, y: 0.3 }, { x: 0.7, y: 0.7 });
    expect(await shapesOnDisk(app)).toBe(1);
    await deselectOnBoard(app.window);
    // Nowhere near the outline: the library's own rule would hit the canvas.
    await clickBoardAt(app.window, { x: 0.5, y: 0.5 });
    await app.window.keyboard.press("Delete");
    expect(await shapesOnDisk(app)).toBe(0);
  });

  it("moves a hollow shape dragged from anywhere inside it", async () => {
    await drawBoardRectangleAt(app.window, { x: 0.3, y: 0.3 }, { x: 0.7, y: 0.7 });
    const [before] = await shapesOnDisk(app, true);
    await deselectOnBoard(app.window);
    await dragBoardFrom(app.window, { x: 0.5, y: 0.5 }, { x: 0.6, y: 0.55 });
    const [after] = await shapesOnDisk(app, true);
    expect(after.x).toBeGreaterThan(before.x + 20);
    expect(after.y).toBeGreaterThan(before.y + 10);
    expect(app.errors).toEqual([]);
  });
});
