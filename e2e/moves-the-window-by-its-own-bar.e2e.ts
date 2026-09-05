// The window's own title bar, once the system stops drawing one. Phase 21.
//
// **The shell hands the page the whole window, and three things have to be true
// after that.** The band across the top has to move the window, or it is a
// title bar that is not one. Nothing clickable may end up under the system's
// buttons, which are drawn over the page at the top right and which this app
// has already lost a control to once. And the properties panel needs its own
// share of that band, because it is the only column that had nothing 48px tall
// at the top to reuse.
//
// **Written to hold on a platform with no overlay at all.** `--window-controls-w`
// is zero wherever the system still draws its own decorations, so every
// assertion here is a comparison against what the page reports rather than
// against a number measured on Windows.
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

  it("makes the whole band a drag region", async () => {
    const band = await titleBand(app.window);
    // The rail, the bar above the page, the tree's header and the properties
    // panel's band — all four, or the window only moves from part of its top.
    expect(band.dragging).toHaveLength(4);
  });

  it("keeps the bar's own controls clear of the system's buttons", async () => {
    const band = await titleBand(app.window);
    expect(band.rightmost).toBeLessThanOrEqual(band.width - band.controls);
  });
});
