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

  it("keeps the title clear of the system's buttons", async () => {
    const band = await titleBand(app.window);
    expect(band.titleRight).toBeLessThanOrEqual(band.width - band.controls);
  });
});
