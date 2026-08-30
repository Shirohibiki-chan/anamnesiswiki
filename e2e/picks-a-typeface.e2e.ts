// The typeface menu in Settings → Fonts and text, which stopped being a
// `<select>` because the operating system drew its category headings and, with
// 119 families in one list, they could not be told apart while scrolling.
//
// **This has to be a scenario.** A native popup is drawn outside the document,
// so the old control could not be styled *or* looked at; the whole reason for
// owning the menu is that it is now real DOM, and the only way to know it is
// real DOM is to drive it. It also caught the bug that shipping this without
// it would have shipped: the popover rendered at `visibility: visible`, the
// right size, in the right place, and painted behind the Settings dialog,
// because `.tree-popover` is `z-index: 30` and `.ui-backdrop` is 1000.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, resizeWindow, type RunningApp } from "./harness/launch-app";
import { openPage, openSettings, openSettingsSection, waitForWorld } from "./harness/screen";

const TRIGGER = ".font-picker-trigger";
const MENU = ".font-picker-menu";
const LIST = ".font-picker-list";
const ROW = ".font-picker-row";
const HEADING = ".font-picker-group-label";

/** The Interface slot's own control, by the token it writes. */
const slot = (token: string) => `[data-setting="${token}"] ${TRIGGER}`;

describe("picking a typeface", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await resizeWindow(app, 1600, 950);
    await openPage(app.window, "Locations");
    await openSettings(app.window);
    await openSettingsSection(app.window, "Fonts and text");
    // The four pickers only exist once the faces are hers rather than the
    // built-in theme's, and this world starts on a built-in.
    if ((await app.window.locator(TRIGGER).count()) === 0) {
      await app.window.getByText("Use one set of fonts in every theme").first().click();
    }
    await app.window.locator(TRIGGER).first().waitFor({ state: "visible", timeout: 20_000 });
  });

  afterAll(async () => {
    await app?.close();
  });

  it("opens a menu that is actually on top of the dialog", async () => {
    await app.window.locator(slot("--font-ui")).click();
    const menu = app.window.locator(MENU);
    await menu.waitFor({ state: "visible", timeout: 10_000 });

    // Not merely present. A menu behind the dialog is present, correctly sized
    // and invisible — which is exactly what the first build of this did.
    const painted = await menu.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const middle = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return el.contains(middle);
    });
    expect(painted).toBe(true);
  });

  it("heads each category, and keeps the heading in place while its own options scroll", async () => {
    const headings = await app.window.locator(HEADING).allInnerTexts();
    expect(headings.length).toBe(5);
    expect(headings[0]).toContain("SANS-SERIF");

    await app.window.locator(LIST).evaluate((el) => {
      el.scrollTop = 900;
    });
    const pinned = await app.window.locator(LIST).evaluate((list) => {
      const top = list.getBoundingClientRect().top;
      return Array.from(list.querySelectorAll(".font-picker-group-label")).some((head) => Math.abs(head.getBoundingClientRect().top - top) < 2);
    });
    expect(pinned).toBe(true);
  });

  it("finds a family by typing, since a native select had type-ahead and this has to replace it", async () => {
    await app.window.locator(".font-picker-search-input").fill("comfor");
    const rows = await app.window.locator(ROW).allInnerTexts();
    // The "whatever the theme uses" row is deliberately never filtered out —
    // typing three letters must not hide the way back to no choice at all.
    expect(rows).toHaveLength(2);
    expect(rows.some((row) => row.includes("Comfortaa"))).toBe(true);
  });

  it("sets the slot and closes", async () => {
    await app.window.locator(ROW, { hasText: "Comfortaa" }).first().click();
    await app.window.locator(MENU).waitFor({ state: "detached", timeout: 10_000 });
    expect(await app.window.locator(slot("--font-ui")).innerText()).toContain("Comfortaa");
  });

  /**
   * The gate is gone: every slot offers every family, in its own order. Code
   * used to be the only way to reach Monospace and the only slot that offered
   * nothing else.
   */
  it("offers every category from the Code slot too, monospace first", async () => {
    await app.window.locator(slot("--font-mono")).click();
    await app.window.locator(MENU).waitFor({ state: "visible", timeout: 10_000 });

    const headings = await app.window.locator(HEADING).allInnerTexts();
    expect(headings.length).toBe(5);
    expect(headings[0]).toContain("MONOSPACE");
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
