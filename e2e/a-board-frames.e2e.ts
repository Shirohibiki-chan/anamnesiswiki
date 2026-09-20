// Frames that nest and turn. Phase 32, step 3, 2026-09-19.
//
// Neither is in the drawing library: it refuses a frame as a child of a
// frame and refuses to turn one. Both are written into it by
// `patches/@excalidraw__excalidraw@0.18.1.patch` (see
// `scripts/excalidraw-patch.mjs`), and these are the guards on that part of
// the patch: they fail against the library as shipped.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  boardCanvasSize,
  clearTreeSearch,
  clickBoardAt,
  deselectOnBoard,
  dragBoardFrom,
  drawBoardFrameAt,
  drawBoardRectangleAt,
  makeBoard,
  turnBoardSelection,
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

type Shape = { id: string; type: string; x: number; y: number; width: number; height: number; angle: number; frameId: string | null };

async function shapesOnDisk(app: RunningApp): Promise<Shape[]> {
  await app.window.waitForTimeout(WRITTEN_MS);
  const file = await findBoardFile(app.world!.path);
  return file ? (JSON.parse(await fs.readFile(file, "utf8")) as { elements: Shape[] }).elements : [];
}

const byType = (shapes: Shape[], type: string) => shapes.filter((shape) => shape.type === type);
/** The frames on the board, widest first — the file's own order is not the drawing order. */
const frames = (shapes: Shape[]) => byType(shapes, "frame").sort((a, b) => b.width - a.width);

describe("frames on a board", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type("Frame practice");
    await app.window.keyboard.press("Enter");
    await makeBoard(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("nests a frame drawn inside a frame, and the outer one carries it out and back", async () => {
    // An outer frame, an inner frame drawn inside it, and a shape drawn
    // inside the inner one: the shape belongs to the innermost frame.
    await drawBoardFrameAt(app.window, { x: 0.1, y: 0.2 }, { x: 0.55, y: 0.8 });
    await drawBoardFrameAt(app.window, { x: 0.2, y: 0.35 }, { x: 0.4, y: 0.6 });
    await drawBoardRectangleAt(app.window, { x: 0.25, y: 0.4 }, { x: 0.35, y: 0.5 });
    let shapes = await shapesOnDisk(app);
    let [outer, inner] = frames(shapes);
    let [rectangle] = byType(shapes, "rectangle");
    expect(frames(shapes)).toHaveLength(2);
    expect(inner.frameId).toBe(outer.id);
    expect(rectangle.frameId).toBe(inner.id);
    expect(outer.frameId).toBeNull();

    // Dragging the outer frame by its top edge moves everything inside it.
    const { width, height } = await boardCanvasSize(app.window);
    await deselectOnBoard(app.window);
    await dragBoardFrom(app.window, { x: 0.3, y: 0.2 }, { x: 0.4, y: 0.25 });
    const before = { outer, inner, rectangle };
    shapes = await shapesOnDisk(app);
    [outer, inner] = frames(shapes);
    [rectangle] = byType(shapes, "rectangle");
    for (const [was, now] of [
      [before.outer, outer],
      [before.inner, inner],
      [before.rectangle, rectangle],
    ]) {
      expect(now.x - was.x).toBeCloseTo(width * 0.1, -1);
      expect(now.y - was.y).toBeCloseTo(height * 0.05, -1);
    }
    expect(inner.frameId).toBe(outer.id);

    // Dragging the inner frame out of the outer one — by its top edge, to
    // the empty right — makes it a frame of its own, still holding its shape.
    await deselectOnBoard(app.window);
    const innerTop = { x: (inner.x + inner.width / 2) / width, y: inner.y / height };
    await dragBoardFrom(app.window, innerTop, { x: innerTop.x + 0.45, y: innerTop.y });
    shapes = await shapesOnDisk(app);
    [outer, inner] = frames(shapes);
    [rectangle] = byType(shapes, "rectangle");
    expect(inner.frameId).toBeNull();
    expect(rectangle.frameId).toBe(inner.id);
    expect(inner.x).toBeGreaterThan(outer.x + outer.width);

    // And back in: a child again.
    await deselectOnBoard(app.window);
    const outsideTop = { x: (inner.x + inner.width / 2) / width, y: inner.y / height };
    await dragBoardFrom(app.window, outsideTop, { x: outsideTop.x - 0.45, y: outsideTop.y });
    shapes = await shapesOnDisk(app);
    [outer, inner] = frames(shapes);
    expect(inner.frameId).toBe(outer.id);
  }, 120_000);

  it("duplicates the tree as one, and deletes it as one", async () => {
    // Picks up where the last one left off: an outer frame holding an inner
    // one holding a rectangle.
    let shapes = await shapesOnDisk(app);
    const [outer, inner] = frames(shapes);
    const [rectangle] = byType(shapes, "rectangle");
    expect(inner.frameId).toBe(outer.id);
    const { width, height } = await boardCanvasSize(app.window);

    // Duplicating the outer frame copies the whole tree, wired the same way.
    await deselectOnBoard(app.window);
    await clickBoardAt(app.window, { x: (outer.x + outer.width / 2) / width, y: outer.y / height });
    await app.window.keyboard.press("Control+d");
    shapes = await shapesOnDisk(app);
    expect(shapes).toHaveLength(6);
    const copies = frames(shapes).filter((frame) => frame.id !== outer.id && frame.id !== inner.id);
    expect(copies).toHaveLength(2);
    const [outerCopy, innerCopy] = copies;
    expect(outerCopy.frameId).toBeNull();
    expect(innerCopy.frameId).toBe(outerCopy.id);
    expect(byType(shapes, "rectangle").map((shape) => shape.frameId).sort()).toEqual([inner.id, innerCopy.id].sort());

    // Deleting the copy — by its top edge, it lies a little down and right
    // of the original — takes the inner frame and its shape with it.
    await deselectOnBoard(app.window);
    await clickBoardAt(app.window, { x: (outerCopy.x + outerCopy.width / 2) / width, y: outerCopy.y / height });
    await app.window.keyboard.press("Delete");
    shapes = await shapesOnDisk(app);
    expect(shapes.map((shape) => shape.id).sort()).toEqual([outer.id, inner.id, rectangle.id].sort());

    // And the original the same way, leaving nothing.
    await deselectOnBoard(app.window);
    await clickBoardAt(app.window, { x: (outer.x + outer.width / 2) / width, y: outer.y / height });
    await app.window.keyboard.press("Delete");
    expect(await shapesOnDisk(app)).toHaveLength(0);
  }, 120_000);

  it("turns a frame by its rotation grip, and what is in it turns with it", async () => {
    await drawBoardFrameAt(app.window, { x: 0.3, y: 0.3 }, { x: 0.6, y: 0.6 });
    await drawBoardRectangleAt(app.window, { x: 0.35, y: 0.35 }, { x: 0.45, y: 0.45 });
    let shapes = await shapesOnDisk(app);
    let [frame] = byType(shapes, "frame");
    let [rectangle] = byType(shapes, "rectangle");
    expect(rectangle.frameId).toBe(frame.id);
    expect(frame.angle).toBe(0);
    const { width, height } = await boardCanvasSize(app.window);
    const centre = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
    const rectangleCentre = { x: rectangle.x + rectangle.width / 2, y: rectangle.y + rectangle.height / 2 };

    // Select the frame by its top edge, then drag the grip above its
    // top-centre round to the right of its centre: a quarter turn.
    await deselectOnBoard(app.window);
    await clickBoardAt(app.window, { x: centre.x / width, y: frame.y / height });
    await turnBoardSelection(app.window, { x: centre.x / width, y: frame.y / height }, { x: (centre.x + 120) / width, y: centre.y / height });
    shapes = await shapesOnDisk(app);
    [frame] = byType(shapes, "frame");
    [rectangle] = byType(shapes, "rectangle");
    expect(frame.angle).toBeCloseTo(Math.PI / 2, 1);
    expect(rectangle.angle).toBeCloseTo(Math.PI / 2, 1);
    expect(rectangle.frameId).toBe(frame.id);
    // The shape went round the frame's centre: a quarter turn takes a point
    // above-left of the centre to above-right of it.
    const turned = { x: rectangle.x + rectangle.width / 2, y: rectangle.y + rectangle.height / 2 };
    expect(turned.x - centre.x).toBeCloseTo(-(rectangleCentre.y - centre.y), 0);
    expect(turned.y - centre.y).toBeCloseTo(rectangleCentre.x - centre.x, 0);
  }, 120_000);
});
