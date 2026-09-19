// Box selection on a board takes what it touches. Phase 32, 2026-09-18.
//
// The drawing library's own rule is that a selection box takes only what it
// swallows whole; she drew a box across five things and got the one inside
// it. The whiteboard LegendKeeper's boards run on takes what the box
// crosses, and that rule is written into the library by
// `patches/@excalidraw__excalidraw@0.18.1.patch` (see
// `scripts/excalidraw-patch.mjs`). This is the guard on the patch: it fails
// against the library as shipped.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { boxSelectOnBoard, clearTreeSearch, deselectOnBoard, drawBoardRectangleAt, makeBoard, waitForWorld } from "./harness/screen";

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

async function shapesOnDisk(app: RunningApp): Promise<number> {
  await app.window.waitForTimeout(WRITTEN_MS);
  const file = await findBoardFile(app.world!.path);
  if (!file) return 0;
  return (JSON.parse(await fs.readFile(file, "utf8")) as { elements: unknown[] }).elements.length;
}

describe("box selection on a board", () => {
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
    await boxSelectOnBoard(app.window, { x: 0.3, y: 0.45 }, { x: 0.7, y: 0.75 });
    await app.window.keyboard.press("Delete");
    expect(await shapesOnDisk(app)).toBe(0);
  });

  it("does not take a hollow shape the box is drawn inside of", async () => {
    // A box inside a big empty rectangle crosses none of its outline, so the
    // rectangle stays — otherwise nothing inside a frame-like shape could
    // ever be box-selected on its own.
    await drawBoardRectangleAt(app.window, { x: 0.15, y: 0.2 }, { x: 0.85, y: 0.8 });
    expect(await shapesOnDisk(app)).toBe(1);
    await deselectOnBoard(app.window);
    await boxSelectOnBoard(app.window, { x: 0.3, y: 0.35 }, { x: 0.6, y: 0.65 });
    await app.window.keyboard.press("Delete");
    expect(await shapesOnDisk(app)).toBe(1);
    expect(app.errors).toEqual([]);
  });
});
