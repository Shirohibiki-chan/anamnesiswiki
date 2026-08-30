// The appearance sections of Settings dock against the right edge and stop
// dimming the app, so a colour can be judged while it is being picked.
//
// **Worth a scenario rather than a unit test** because none of it is decidable
// from the source. Whether the app is visible behind the dialog is a computed
// backgroundColor, a bounding box and a real click landing on a real tree row;
// a test that asserted the class name would pass with the media query deleted,
// which is the way this would actually break.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, resizeWindow, type RunningApp } from "./harness/launch-app";
import { openPage, openSettings, openSettingsSection, pageTitle, waitForWorld } from "./harness/screen";

const BACKDROP = ".ui-backdrop";
const MODAL = ".settings-modal";

/** Wide enough for the docked layout — under 72rem the class deliberately does nothing. */
const WIDTH = 1400;
const HEIGHT = 880;

describe("Settings gets out of the way on the appearance sections", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await resizeWindow(app, WIDTH, HEIGHT);
    await openPage(app.window, "Locations");
    await openSettings(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  async function backdropPaint(): Promise<string> {
    return app.window.locator(BACKDROP).evaluate((el) => getComputedStyle(el).backgroundColor);
  }

  /**
   * The dialog slides between its two positions over 180ms, so a box read the
   * instant after a section is clicked is a box mid-flight. This polls until
   * the box is where the caller expects it, and hands back whatever it last
   * saw if it never gets there — so a real regression fails with the position
   * it actually found rather than with a timeout.
   *
   * **It waits for the destination, not for the box to stop moving.** Waiting
   * for two identical reads is what the first version did, and it passed
   * locally and failed on CI: on a slower machine the class swap hadn't
   * rendered yet, so the first two reads were both the *old* position and the
   * helper called that settled. It reported the docked box for the centred
   * case, 348px out. A "nothing changed recently" test cannot tell "arrived"
   * from "hasn't started".
   */
  async function boxWhere(done: (box: { x: number; width: number }) => boolean): Promise<{ x: number; width: number }> {
    let last = { x: 0, width: 0 };
    for (let i = 0; i < 160; i += 1) {
      const box = await app.window.locator(MODAL).boundingBox();
      last = { x: box?.x ?? 0, width: box?.width ?? 0 };
      if (done(last)) return last;
      await app.window.waitForTimeout(50);
    }
    return last;
  }

  const docked = (box: { x: number; width: number }) => box.x + box.width === WIDTH;
  const centred = (box: { x: number; width: number }) => Math.abs(box.x + box.width / 2 - WIDTH / 2) < 4;

  it("stops dimming the app on Colours", async () => {
    await openSettingsSection(app.window, "Colours");
    // Fully transparent, not merely lighter: a colour seen through any wash is
    // not the colour that was picked, which is the whole complaint.
    expect(await backdropPaint()).toBe("rgba(0, 0, 0, 0)");
  });

  it("leaves the sidebar and part of the page uncovered", async () => {
    const box = await boxWhere(docked);
    // Left of the dialog, not merely narrower than the window. 260px is the
    // tree's own width; anything less exposes no whole surface to look at.
    expect(box.x).toBeGreaterThan(260);
    expect(box.x + box.width).toBeLessThanOrEqual(WIDTH);
  });

  /**
   * **It has to look docked, not merely be off to one side.** The first version
   * kept the floating-dialog shape — inset from the edge, rounded, and capped
   * at 44rem tall by `.settings-modal`'s own max-height — and on a 2560x1400
   * window that is a 704px square adrift in the middle of nothing. It was
   * reported the day it shipped, and fairly. A panel touches an edge.
   */
  it("fills the height and touches the right edge", async () => {
    const box = await boxWhere(docked);
    expect(box.x + box.width).toBe(WIDTH);

    const shape = await app.window.locator(MODAL).evaluate((el) => {
      const s = getComputedStyle(el);
      return { height: el.getBoundingClientRect().height, radius: s.borderTopRightRadius };
    });
    expect(shape.height).toBe(HEIGHT);
    expect(shape.radius).toBe("0px");
  });

  /**
   * `overflow-y: auto` makes the panel a scroll container on both axes, and
   * every full-width control in it starts on its left edge — so a focus ring,
   * drawn 4px outside the box, had its left side sliced off. Reported as the
   * font picker looking cut in half. Pre-dates the dock and shows at every
   * window size; it was only ever *noticed* once the panel got narrower.
   */
  it("leaves room for a focus ring inside the scrolling panel", async () => {
    await openSettingsSection(app.window, "Fonts and text");
    const gutters = await app.window.locator(".settings-panel").evaluate((panel) => {
      const control = panel.querySelector("select, input, button");
      if (!control) return null;
      const box = control.getBoundingClientRect();
      const scroller = panel.getBoundingClientRect();
      return { left: box.left - scroller.left, right: scroller.right - box.right };
    });
    // 4px is the ring's reach: `outline-offset` plus `outline-width`.
    expect(gutters?.left ?? 0).toBeGreaterThanOrEqual(4);
    expect(gutters?.right ?? 0).toBeGreaterThanOrEqual(4);
  });

  it("lets a click reach the app, and stays open when it does", async () => {
    // Behind the dialog in the ordinary sense — the backdrop is click-through,
    // so this lands on the tree. Walking to another page while the picker is
    // open is the point: a theme is judged on more than one screen.
    await app.window.locator(".tree-row-name", { hasText: "Quietgate" }).first().click();
    expect(await pageTitle(app.window)).toBe("Quietgate");
    expect(await app.window.locator(MODAL).isVisible()).toBe(true);
  });

  it("goes back to a centred, dimmed dialog on the app sections", async () => {
    await openSettingsSection(app.window, "Sidebar");
    expect(await backdropPaint()).not.toBe("rgba(0, 0, 0, 0)");

    const box = await boxWhere(centred);
    expect(Math.abs(box.x + box.width / 2 - WIDTH / 2)).toBeLessThan(4);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
