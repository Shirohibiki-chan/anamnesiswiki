// An infobox asked for from inside a lane of columns. Phase 19.5.
//
// **The `/` menu offers it in there, so it has to arrive in there and fit.**
// Reported 2026-09-04 as the frame landing outside the row altogether. That
// description has two readings — the frame is parented outside the row, or it
// is inside its lane and drawn wider than one — and they look the same on
// screen, so this asks both. See `infoboxInLane` in the harness.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clickColumnLane,
  columnLanes,
  columnRowCount,
  infoboxInLane,
  openPage,
  pickInfoboxMenuItem,
  typeAtLineStartInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";

// A frame is allowed its own border past the lane's edge and no more.
const WITHIN_LANE = 4;

describe("an infobox inside a lane of columns", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await typeAtLineStartInEditor(app.window, "/two columns");
    await app.window.getByText("Two lanes of writing, side by side").click();
    await app.window.waitForTimeout(800);
    // Into the lane, then ask for the frame from in there — the caret has to be
    // inside a lane for this scenario to be about anything.
    await clickColumnLane(app.window, 0);
    await app.window.keyboard.type("/infobox", { delay: 20 });
    await app.window.getByText("A framed group of blocks, with its own Add Block").first().click();
    await app.window.waitForTimeout(800);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("puts the frame in the lane it was asked for", async () => {
    expect((await infoboxInLane(app.window)).lane).toBe(0);
  });

  it("draws it no wider than the lane holding it", async () => {
    const box = await infoboxInLane(app.window);
    expect(box.frameWidth).toBeLessThan(box.laneWidth + WITHIN_LANE);
  });

  it("leaves the row standing, with both its lanes", async () => {
    expect(await columnRowCount(app.window)).toBe(1);
    expect((await columnLanes(app.window)).length).toBe(2);
  });

  // The state it was found in: the report came out of checking whether a
  // *wrapped* frame behaves inside a lane, and that question was never answered
  // because of the bug. A float is taken out of the ordinary flow, so this is
  // the arrangement most likely to put the frame somewhere it was not asked for.
  it("keeps it in the lane, and in its width, once the writing wraps round it", async () => {
    await pickInfoboxMenuItem(app.window, "Wrap right");
    const box = await infoboxInLane(app.window);
    expect(box.lane).toBe(0);
    expect(box.frameWidth).toBeLessThan(box.laneWidth + WITHIN_LANE);
  });
});
