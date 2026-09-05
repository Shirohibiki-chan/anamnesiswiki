// Settings is a panel at the right edge of the window, on every section, with
// the app beside it in its true colours and still clickable.
//
// **Worth a scenario rather than a unit test** because none of it is decidable
// from the source. Whether the app is visible behind it is a computed
// backgroundColor and a real click landing on a real tree row; whether it is
// docked is a bounding box against the window. A test asserting the class name
// would pass with the rules deleted, which is how this would actually break.
//
// **The assertions that matter most are the ones comparing two sections.** Two
// earlier passes each shipped a version of the same bug — something about the
// panel keyed off which section was open, so it changed under you as you moved
// through it. First the position (docked on the four appearance sections,
// centred for the rest), then, after that was pulled, the dim. Reading the same
// property either side of the crossing is the guard against a third.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, MIN_WINDOW, resizeWindow, type RunningApp } from "./harness/launch-app";
import { openPage, openSettings, openSettingsSection, pageTitle, waitForWorld } from "./harness/screen";

const BACKDROP = ".ui-backdrop";
const MODAL = ".settings-modal";

const WIDTH = 1400;
const HEIGHT = 880;

describe("Settings sits beside the app instead of over it", () => {
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

  async function modalBox(): Promise<{ x: number; width: number; height: number }> {
    const box = await app.window.locator(MODAL).boundingBox();
    return { x: box?.x ?? 0, width: box?.width ?? 0, height: box?.height ?? 0 };
  }

  it("never dims the app, on an appearance section or an app one", async () => {
    await openSettingsSection(app.window, "Colours");
    // Fully transparent, not merely lighter: a colour seen through any wash is
    // not the colour that was picked, which is the whole complaint.
    expect(await backdropPaint()).toBe("rgba(0, 0, 0, 0)");

    await openSettingsSection(app.window, "Keyboard");
    expect(await backdropPaint()).toBe("rgba(0, 0, 0, 0)");
  });

  /**
   * **It has to look docked, not merely be off to one side.** An early version
   * kept the floating-dialog shape — inset from the edge, rounded, capped at
   * 44rem tall — and on a large window that is a square adrift in the middle of
   * nothing, anchored to nothing. It read as a lost box, not a panel.
   */
  it("fills the height and touches the right edge", async () => {
    const box = await modalBox();
    expect(box.x + box.width).toBe(WIDTH);
    expect(box.height).toBe(HEIGHT);

    const radius = await app.window.locator(MODAL).evaluate((el) => getComputedStyle(el).borderTopRightRadius);
    expect(radius).toBe("0px");
  });

  it("leaves the sidebar and part of the page uncovered", async () => {
    const box = await modalBox();
    // Left of the panel, not merely narrower than the window. 260px is the
    // tree's own width; anything less exposes no whole surface to look at.
    expect(box.x).toBeGreaterThan(260);
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
    // The backdrop is click-through, so this lands on the tree. Walking to
    // another page while the picker is open is the point: a theme is judged on
    // more than one screen. It is also what click-to-close would have taken
    // away, which is why Settings no longer has it.
    await app.window.locator(".tree-row-name", { hasText: "Quietgate" }).first().click();
    expect(await pageTitle(app.window)).toBe("Quietgate");
    expect(await app.window.locator(MODAL).isVisible()).toBe(true);
  });

  it("does not move or resize when you cross between sections", async () => {
    await openSettingsSection(app.window, "Colours");
    const onLook = await modalBox();

    await openSettingsSection(app.window, "Sidebar");
    const onApp = await modalBox();

    // Identical, not merely both docked: this crossing is where both earlier
    // versions of this feature changed something under the pointer.
    expect(onApp).toEqual(onLook);
  });

  it("still docks on a narrow window, giving up width instead of position", async () => {
    await resizeWindow(app, MIN_WINDOW.width, 700);
    const box = await modalBox();
    expect(box.x + box.width).toBe(MIN_WINDOW.width);
    // **704 is the modal's cap, not a squeeze, and that changed on 2026-09-05.**
    // `--ui-modal-width` is `min(44rem, max(26rem, 100vw - 17rem))`, so the
    // dialog gives up width only once the window is under 976px. This assertion
    // read `toBeLessThan` while the floor was 948 and the modal was genuinely
    // being squeezed to 676; the floor is 984 now — the rail widened to fit its
    // labels — and the window is finally wide enough for the dialog's full size.
    // Below the floor is not reachable: the app will not open a window there.
    // What is still worth asserting is the part that was never about the
    // squeeze — it docks to the right edge and leaves a usable strip of app
    // beside it, which at the floor is 280px.
    expect(box.width).toBeLessThanOrEqual(704);
    expect(box.x).toBeGreaterThanOrEqual(260);
    await resizeWindow(app, WIDTH, HEIGHT);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
