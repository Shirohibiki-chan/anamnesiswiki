// Picking a block up and putting it somewhere else. Phase 19.5.
//
// **Reported from use 2026-09-04, with a screenshot of the mess.** dnd-kit's
// full transform scales the item being dragged to the shape of the slot it is
// over, and this panel holds blocks of wildly different heights — a picture is
// three times a text box. So dragging one past another blew the picture up,
// squashed the headings, and pushed a gauge out through the side of its box.
//
// The second scenario is the other half of the same report: inside an infobox
// the frame's resize handles run down the inner edges, over the grips of every
// block in it, so a block in a frame could not be picked up at all.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBlockToInfobox,
  draggedBlockShape,
  dropBlock,
  infoboxBlockTitles,
  infoboxWidthRatio,
  openPage,
  panelBlockTitles,
  pickUpBlock,
  typeAtLineStartInEditor,
  waitForWorld,
} from "./harness/screen";

// A generated page with a portrait and a full panel — the shape the report came
// from, where the blocks are all different heights.
const PAGE = "Thonn Lindqvist";

describe("dragging a block", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(800);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("keeps its own size and shape while it is being dragged", async () => {
    const before = await panelBlockTitles(app.window);
    expect(before.length).toBeGreaterThan(2);

    const height = await app.window.locator(".block-panel .block-shell").nth(1).boundingBox();
    await pickUpBlock(app.window, "panel", 1, 380);

    const dragged = await draggedBlockShape(app.window);
    expect(dragged).not.toBeNull();
    // The whole bug, in one assertion: a block being dragged moves, it does not
    // resize.
    expect(dragged?.scaled).toBe(false);
    expect(dragged?.height).toBe(Math.round(height!.height));

    await dropBlock(app.window);
  });

  it("lands where it was dropped", async () => {
    const after = await panelBlockTitles(app.window);
    // It was taken from second place and carried down past the block below it.
    expect(after[1]).not.toBe("Summary");
    expect(after).toContain("Summary");
  });

  it("can be picked up inside an infobox, where the frame's own handles are", async () => {
    await typeAtLineStartInEditor(app.window, "/infobox");
    await app.window.getByText("A framed group of blocks, with its own Add Block").first().click();
    await app.window.waitForTimeout(800);
    await addBlockToInfobox(app.window, "Text block");
    await app.window.waitForTimeout(400);
    await addBlockToInfobox(app.window, "Tags");
    await app.window.waitForTimeout(600);

    const width = await infoboxWidthRatio(app.window);
    expect(await infoboxBlockTitles(app.window)).toEqual(["Text", "Tags"]);

    await pickUpBlock(app.window, "infobox", 0, 140);
    const dragged = await draggedBlockShape(app.window);
    await dropBlock(app.window);

    // Picked up rather than resized: the grip won where it overlaps the frame's
    // resize handle, so the block moved and the frame is still the width it was.
    expect(dragged).not.toBeNull();
    expect(await infoboxBlockTitles(app.window)).toEqual(["Tags", "Text"]);
    expect(await infoboxWidthRatio(app.window)).toBeCloseTo(width, 1);
  });
});
