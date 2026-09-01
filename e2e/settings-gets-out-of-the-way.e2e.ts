// The appearance sections of Settings stop dimming the app and let clicks
// through to it, so a colour can be judged while it is being picked — and the
// dialog itself stays exactly where it is while they do.
//
// **Worth a scenario rather than a unit test** because none of it is decidable
// from the source. Whether the app is visible behind the dialog is a computed
// backgroundColor and a real click landing on a real tree row; a test that
// asserted the class name would pass with the rule deleted, which is the way
// this would actually break.
//
// **The dock is gone, deliberately.** Until 2026-09-01 these four sections also
// slid the dialog against the right edge and back again, and this file asserted
// the docked geometry. Removed on report: a dialog that sits somewhere else
// depending on which section of it you are on is a surprise every time. The
// staying-put assertion below is the guard against it coming back by accident.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, resizeWindow, type RunningApp } from "./harness/launch-app";
import { openPage, openSettings, openSettingsSection, pageTitle, waitForWorld } from "./harness/screen";

const BACKDROP = ".ui-backdrop";
const MODAL = ".settings-modal";

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

  async function modalBox(): Promise<{ x: number; width: number }> {
    const box = await app.window.locator(MODAL).boundingBox();
    return { x: box?.x ?? 0, width: box?.width ?? 0 };
  }

  const isCentred = (box: { x: number; width: number }) => Math.abs(box.x + box.width / 2 - WIDTH / 2) < 4;

  it("stops dimming the app on Colours", async () => {
    await openSettingsSection(app.window, "Colours");
    // Fully transparent, not merely lighter: a colour seen through any wash is
    // not the colour that was picked, which is the whole complaint.
    expect(await backdropPaint()).toBe("rgba(0, 0, 0, 0)");
  });

  it("stays centred there, like everywhere else", async () => {
    expect(isCentred(await modalBox())).toBe(true);
  });

  /**
   * `overflow-y: auto` makes the panel a scroll container on both axes, and
   * every full-width control in it starts on its left edge — so a focus ring,
   * drawn 4px outside the box, had its left side sliced off. Reported as the
   * font picker looking cut in half.
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

  it("dims the app again on the app sections, without moving the dialog", async () => {
    const before = await modalBox();
    await openSettingsSection(app.window, "Sidebar");
    expect(await backdropPaint()).not.toBe("rgba(0, 0, 0, 0)");

    // Same box, not merely a centred one: crossing between an appearance
    // section and an app one is the moment the dock used to fire.
    const after = await modalBox();
    expect(after.x).toBe(before.x);
    expect(after.width).toBe(before.width);
    expect(isCentred(after)).toBe(true);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
