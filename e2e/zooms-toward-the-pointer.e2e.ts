// The wheel zooms toward the pointer, and keeps doing so. 2026-09-14.
//
// **The glide keeps its own numbers, and this is the check that it does.**
// The first version of the eased zoom read the zoom back from React's last
// render on every frame, and the render lags the frames — so each step was
// worked out against a stale zoom and applied to a fresh pan, and the point
// under the pointer slid away: 180 pixels in five notches, thousands by full
// zoom. She landed in empty space every time and could not say why. Nothing
// but the real app runs the frames in the browser's order, so it is asked.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  closePageGraph,
  graphNodeCentre,
  graphNodeNames,
  graphZoom,
  graphZoomFrames,
  openWorldGraph,
  recordGraphZoomFrames,
  waitForGlide,
  waitForWorld,
  zoomGraphInAt,
} from "./harness/screen";

/**
 * How far the page under the pointer may move across twenty notches, in
 * pixels. A few come from rounding along the way; the failure this guards
 * against is hundreds.
 */
const DRIFT_PX = 24;

describe("zooming toward the pointer", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp({ pages: 120, shape: "hubs" });
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("keeps the page under the pointer where it is, all the way in", async () => {
    await openWorldGraph(app.window);
    // Off-centre on purpose: a zoom about the middle would leave a page in
    // the middle exactly where it was and prove nothing.
    const names = await graphNodeNames(app.window);
    const page = names[Math.floor(names.length / 3)];
    const before = await graphNodeCentre(app.window, page);

    let lastZoom = await graphZoom(app.window);
    for (let round = 0; round < 4; round += 1) {
      await zoomGraphInAt(app.window, page, 5);
      const now = await graphNodeCentre(app.window, page);
      // The zoom in the message, so a failure says whether the glide ran at
      // all — and checked to have moved, because a machine that never fires
      // an animation frame would sit at the starting zoom with no drift and
      // prove nothing.
      const zoom = await graphZoom(app.window);
      expect(Math.hypot(now.x - before.x, now.y - before.y), `at zoom ${zoom}`).toBeLessThan(DRIFT_PX);
      // Unless it has already reached the top of the range.
      if (lastZoom < 2.4) expect(zoom).toBeGreaterThan(lastZoom * 1.2);
      lastZoom = zoom;
    }

    await closePageGraph(app.window);
  });

  // One step back per notch was "jumping whenever I scroll" (2026-09-15):
  // the frame's clock can read a few milliseconds before the wheel event's,
  // and a negative progress on an ease-out curve moves the wrong way. Only a
  // frame-by-frame record of the real thing can see a single frame of it.
  it("never moves the wrong way, notch after notch", async () => {
    await openWorldGraph(app.window);
    const names = await graphNodeNames(app.window);
    const page = names[Math.floor(names.length / 3)];
    await recordGraphZoomFrames(app.window);

    // Some notches land before the next, some arrive mid-glide; both have
    // to hold.
    for (let notch = 0; notch < 6; notch += 1) {
      await zoomGraphInAt(app.window, page, 1);
    }
    for (let notch = 0; notch < 4; notch += 1) {
      const at = await graphNodeCentre(app.window, page);
      await app.window.mouse.move(at.x, at.y);
      await app.window.mouse.wheel(0, -120);
      await app.window.waitForTimeout(60);
    }
    await waitForGlide(app.window);

    const frames = await graphZoomFrames(app.window);
    expect(frames.length).toBeGreaterThan(10);
    const backwards = frames.filter((zoom, i) => i > 0 && zoom < frames[i - 1] - 1e-6);
    expect(backwards).toEqual([]);

    await closePageGraph(app.window);
  });
});
