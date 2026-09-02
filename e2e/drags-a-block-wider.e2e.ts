// A block in the page, dragged narrower by its own edge. Phase 19.5.
//
// **The assertions are ratios of the writing column, never pixels.** The column
// depends on the window and on where the two side panels have been dragged to,
// so a scenario that asserts a width in pixels is asserting the harness's
// window size — see `pageBlockWidthRatio`.
//
// The reload is the half worth having. A width lives on the block's own record
// while an infobox's lives on a prop in the document, and those are two
// different files on disk: a resize that only survives until the app restarts
// means one of the two never reached it.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  dragBlockEdge,
  dragInfoboxEdge,
  focusBlockWidthHandle,
  infoboxWidthRatio,
  openPage,
  pageBlockCount,
  pageBlockWidthRatio,
  typeAtLineStartInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";

describe("dragging a block wider", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await typeAtLineStartInEditor(app.window, "/text block");
    await app.window.getByText("A titled box of writing, in the page").click();
    await app.window.waitForTimeout(800);
    expect(await pageBlockCount(app.window)).toBe(1);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("starts as the whole column", async () => {
    expect(await pageBlockWidthRatio(app.window)).toBeGreaterThan(0.99);
  });

  it("takes the width it is dragged to, from the right edge", async () => {
    await dragBlockEdge(app.window, "right", 0.6);
    // Snapped to two thirds or a half depending where it landed; either way it
    // is a long way from full width and it stopped near where it was let go.
    expect(await pageBlockWidthRatio(app.window)).toBeLessThan(0.75);
    expect(await pageBlockWidthRatio(app.window)).toBeGreaterThan(0.4);
  });

  it("drags from the left edge too, mirrored", async () => {
    // The block is left-aligned, so the left handle cannot pull the box off the
    // side of the page — it widens away from the edge instead, which is what
    // BlockNote's own picture handles do in the same document.
    await dragBlockEdge(app.window, "left", 1);
    expect(await pageBlockWidthRatio(app.window)).toBeGreaterThan(0.9);
  });

  it("is still that width after a reload", async () => {
    await dragBlockEdge(app.window, "right", 0.5);
    const dragged = await pageBlockWidthRatio(app.window);

    await app.window.reload();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(800);

    expect(await pageBlockWidthRatio(app.window)).toBeCloseTo(dragged, 1);
  });

  it("has a keyboard way in and out", async () => {
    // Dragging must not be the only way to set a width: Home is the way back to
    // the whole column and the arrows step it.
    await focusBlockWidthHandle(app.window, "right");
    await app.window.keyboard.press("Home");
    await app.window.waitForTimeout(400);
    expect(await pageBlockWidthRatio(app.window)).toBeGreaterThan(0.99);

    await app.window.keyboard.press("ArrowLeft");
    await app.window.waitForTimeout(400);
    expect(await pageBlockWidthRatio(app.window)).toBeLessThan(0.99);
  });

  it("resizes an infobox the same way, and remembers that too", async () => {
    await app.window.keyboard.press("Escape");
    await typeAtLineStartInEditor(app.window, "/infobox");
    await app.window.getByText("A framed group of blocks, with its own Add Block").click();
    await app.window.waitForTimeout(800);
    expect(await infoboxWidthRatio(app.window)).toBeGreaterThan(0.99);

    await dragInfoboxEdge(app.window, "right", 0.5);
    const dragged = await infoboxWidthRatio(app.window);
    expect(dragged).toBeLessThan(0.7);

    await app.window.reload();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(800);

    expect(await infoboxWidthRatio(app.window)).toBeCloseTo(dragged, 1);
  });
});
