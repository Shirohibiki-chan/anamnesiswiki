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
   * The dialog slides between the two positions over 180ms, and a box read the
   * instant after a section is clicked is a box mid-flight — which is how this
   * first failed, reporting the docked position for the centred case. Waits for
   * two identical reads rather than for a guessed number of milliseconds, so
   * retuning the transition doesn't quietly turn this into a flake.
   */
  async function settledBox(): Promise<{ x: number; width: number }> {
    let previous = { x: -1, width: -1 };
    for (let i = 0; i < 40; i += 1) {
      const box = await app.window.locator(MODAL).boundingBox();
      const now = { x: box?.x ?? 0, width: box?.width ?? 0 };
      if (now.x === previous.x && now.width === previous.width) return now;
      previous = now;
      await app.window.waitForTimeout(50);
    }
    return previous;
  }

  it("stops dimming the app on Colours", async () => {
    await openSettingsSection(app.window, "Colours");
    // Fully transparent, not merely lighter: a colour seen through any wash is
    // not the colour that was picked, which is the whole complaint.
    expect(await backdropPaint()).toBe("rgba(0, 0, 0, 0)");
  });

  it("leaves the sidebar and part of the page uncovered", async () => {
    const box = await settledBox();
    // Left of the dialog, not merely narrower than the window. 260px is the
    // tree's own width; anything less exposes no whole surface to look at.
    expect(box.x).toBeGreaterThan(260);
    expect(box.x + box.width).toBeLessThanOrEqual(WIDTH);
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

    const box = await settledBox();
    expect(Math.abs(box.x + box.width / 2 - WIDTH / 2)).toBeLessThan(4);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
