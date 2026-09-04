// Text flowing around an infobox — the last item on the reference's Layout
// menu. Phase 19.5.
//
// **Written because the docs said this could not be done.** Three of them said
// BlockNote cannot float a block, and none of the three had been tested; she
// asked the obvious question and the answer was that it floats fine. So the
// thing this scenario is really guarding is the measurement: not "is there a
// class on it" but "does the writing after it actually go round it".
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBlockToInfobox,
  openPage,
  pickInfoboxMenuItem,
  textAroundInfobox,
  typeAtLineStartInEditor,
  waitForWorld,
} from "./harness/screen";

// A page whose writing is a long run of plain paragraphs, so there is something
// for the frame to sit in the middle of.
const PAGE = "A Link To A Spot Further Down This Page";

// **The slack is wide on purpose.** Where a line breaks depends on the fonts the
// machine has, and CI has different ones — the same paragraph ended 18px further
// from the edge there than here, which failed a 12px tolerance and meant
// nothing. What this scenario asks is whether a line runs the width of the page
// or stops a third of the way across it, and that difference is 250px.
const NEAR_THE_EDGE = 60;

// A frame flush against one side is still a few pixels inside it: its own border
// and the padding of the block holding it.
const FLUSH = 16;

describe("wrapping the writing round an infobox", () => {
  let app: RunningApp;
  let plainLines = 0;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(800);
    await typeAtLineStartInEditor(app.window, "/infobox");
    await app.window.getByText("A framed group of blocks, with its own Add Block").first().click();
    await app.window.waitForTimeout(800);
    await addBlockToInfobox(app.window, "Text block");
    await app.window.waitForTimeout(600);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("starts with the frame on a line of its own", async () => {
    const before = await textAroundInfobox(app.window);
    expect(before).not.toBeNull();
    plainLines = before!.lines;
    // The paragraph under it runs the whole width of the writing.
    expect(before!.columnRight - before!.lineRight).toBeLessThan(NEAR_THE_EDGE);
  });

  it("puts the frame on the right and the writing beside it", async () => {
    await pickInfoboxMenuItem(app.window, "Wrap right");
    const after = await textAroundInfobox(app.window);
    expect(after).not.toBeNull();

    // The frame is against the right-hand edge of the column…
    expect(after!.frameRight).toBeGreaterThan(after!.columnRight - FLUSH);
    expect(after!.frameLeft).toBeGreaterThan(after!.columnLeft + 40);
    // …and the line beside it stops before it starts, which is the whole
    // feature: the paragraph is no longer running the full width.
    expect(after!.lineRight).toBeLessThan(after!.frameLeft + 4);
    expect(after!.lines).toBeGreaterThan(plainLines);
  });

  it("puts it on the left, with the writing on its right", async () => {
    await pickInfoboxMenuItem(app.window, "Wrap left");
    const after = await textAroundInfobox(app.window);
    expect(after!.frameLeft).toBeLessThan(after!.columnLeft + FLUSH);
    // The line now starts after the frame rather than ending before it.
    expect(after!.lineLeft).toBeGreaterThan(after!.frameRight - 4);
  });

  it("stops wrapping when the same side is picked again", async () => {
    await pickInfoboxMenuItem(app.window, "Wrap left");
    const after = await textAroundInfobox(app.window);
    expect(after!.columnRight - after!.lineRight).toBeLessThan(NEAR_THE_EDGE);
    expect(after!.lines).toBe(plainLines);
  });
});
