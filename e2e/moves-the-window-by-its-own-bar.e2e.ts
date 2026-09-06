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
// tall enough to be a bar, moving the window when dragged, carrying its own
// three controls — and none of those four panels doing chrome's job any more.
//
// **Everything here is read off elements now.** The controls were the system's
// for a day, which meant measuring them through `--window-controls-w` and
// `navigator.windowControlsOverlay` and never being able to see them. They are
// ours, so they can simply be looked at — and clicked, which is what catches the
// one failure that would otherwise ship silently.
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

  it("draws its own three window buttons", async () => {
    const band = await titleBand(app.window);
    // Minimise, maximise, close. They were the system's for one day, which cost
    // three 46px slabs in a 32px bar to buy a snap-layout popup the user did not
    // know existed — see TitleBar.tsx. On a shell that still draws its own
    // frame there would be none, and this scenario runs on the one that does not.
    expect(band.buttons).toBe(3);
  });

  it("lets those buttons be clicked rather than dragging the window", async () => {
    const band = await titleBand(app.window);
    // **The failure this catches costs the button entirely.** The bar is a drag
    // region and a drag region swallows clicks, so a control that does not opt
    // back out moves the window instead of doing its job — and it does it
    // silently, looking for all the world like a button that is simply ignored.
    expect(band.buttonsDrag).toBe(0);
  });

  it("keeps the title clear of the buttons", async () => {
    const band = await titleBand(app.window);
    expect(band.titleRight).toBeLessThanOrEqual(band.buttonsLeft);
  });
});

/**
 * **The picker gets the same bar, and for a day it got none at all.**
 *
 * `TitleBar` was mounted inside `AppLayout`, which only exists once a project is
 * open — so the start screen had no title bar on a window that no longer has a
 * system one. That is not a cosmetic gap: there was nothing to drag the window
 * by and no close button, so the picker could only be left through the taskbar.
 * Reported 2026-09-05. It is mounted at the app root now (App.tsx), which is
 * where everything belonging to the window rather than to a project already sat.
 *
 * The height assertion is the other half of that move: every screen used to
 * claim `100vh`, which under a 32px bar is the window's height plus the bar's.
 */
describe("the picker's title bar", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp({ openWorld: false });
    await app.window.waitForSelector(".start", { timeout: 15_000 });
    await app.window.waitForTimeout(500);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("is there, and carries the same three buttons", async () => {
    const band = await titleBand(app.window);
    expect(band.spans).toBe(true);
    expect(band.dragging).toBe(true);
    expect(band.buttons).toBe(3);
    expect(band.buttonsDrag).toBe(0);
  });

  it("leaves the screen under it a window's worth of room, not a window plus a bar", async () => {
    const fit = await app.window.evaluate(() => {
      const start = document.querySelector(".start")?.getBoundingClientRect();
      return { bottom: Math.round(start?.bottom ?? 0), inner: window.innerHeight };
    });
    expect(fit.bottom).toBeLessThanOrEqual(fit.inner);
  });
});
