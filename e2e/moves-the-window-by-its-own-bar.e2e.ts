// The window's own title bar, once the system stops drawing one.
//
// **The first version of this scenario passed while the feature was wrong**, and
// that is the thing worth knowing before changing it. It asserted that all four
// of the app's top-row panels were drag regions — which they were, and which was
// the defect: there was no title bar, only four panels with four backgrounds
// standing in for one, seams and mismatched window buttons included. The user
// rejected it on sight 2026-09-05. A test that measures the workaround cannot
// fail when the workaround is the problem.
//
// So this checks the shape instead. One bar, reaching both edges of the window,
// tall enough to be a bar, moving the window when dragged — and none of those
// four panels doing that job any more.
//
// **Written to hold on a platform with no overlay at all.** `--window-controls-w`
// is zero wherever the system still draws its own decorations, so the last
// assertion is a comparison against what the page reports rather than against a
// number measured on Windows.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openPage, titleBand, waitForWorld } from "./harness/screen";

const PAGE = "Quietgate";

describe("moving the window by its own bar", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(600);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("draws one bar across the whole window", async () => {
    const band = await titleBand(app.window);
    expect(band.spans).toBe(true);
    expect(band.height).toBeGreaterThanOrEqual(28);
  });

  it("moves the window by that bar", async () => {
    const band = await titleBand(app.window);
    expect(band.dragging).toBe(true);
  });

  it("leaves the panels underneath as panels", async () => {
    const band = await titleBand(app.window);
    // The rail, the bar above the page, the tree's header, the properties band —
    // none of them is chrome now, and the properties band does not exist at all.
    expect(band.strays).toEqual([]);
  });

  it("gives the system's buttons the same height as the bar", async () => {
    const band = await titleBand(app.window);
    // Null on a shell with no overlay — macOS, or one still drawing its own
    // decorations. There is nothing to compare there and nothing to get wrong.
    if (band.overlayHeight === null) return;
    // **This is the assertion that would have caught the buttons overhanging the
    // bar**, reported from use 2026-09-05 and invisible to every other check
    // here, and it is deliberately one pixel short of the bar. The system paints
    // the overlay opaquely over the page, so a full-height one covers the bar's
    // bottom rule for the 137px the buttons occupy and the line across the top of
    // the window stops short of the right edge. `OVERLAY_HEIGHT` in
    // electron/main.js is the bar minus that rule; both sides are read here so
    // they cannot drift apart.
    expect(band.overlayHeight).toBe(band.height - 1);
  });

  it("keeps the title clear of the system's buttons", async () => {
    const band = await titleBand(app.window);
    expect(band.titleRight).toBeLessThanOrEqual(band.width - band.controls);
  });
});
