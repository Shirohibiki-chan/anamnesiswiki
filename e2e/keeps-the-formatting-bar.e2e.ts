// Settings → Writing → the formatting bar stays at the top of the page.
//
// **The whole feature is "is it there when nothing is selected", which is a
// question only the running app can answer.** Both modes render the same
// component with the same buttons; what differs is whether anything is on
// screen at rest, and — the part that actually broke while this was written —
// *where* it lands in the document. The first cut rendered it after the
// editor's content, a page's worth of writing below the fold: present, correct,
// and invisible. A unit test would have been perfectly happy with that.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  formattingBarGroups,
  formattingBarShown,
  openPage,
  openSettings,
  openSettingsSection,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Deep Nesting Test";

describe("keeping the formatting bar on screen", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  async function chooseBar(option: RegExp) {
    await openSettings(app.window);
    await openSettingsSection(app.window, "Writing");
    await app.window.getByRole("radio", { name: option }).click();
    await app.window.waitForTimeout(300);
    await app.window.keyboard.press("Escape");
    await app.window.waitForTimeout(700);
  }

  it("shows nothing at rest until it is asked to", async () => {
    // The default. Nothing selected, so nothing on screen.
    expect(await formattingBarShown(app.window)).toBe(false);
  });

  it("keeps the bar up with nothing selected once it is set to", async () => {
    await chooseBar(/Stays at the top/);
    expect(await formattingBarShown(app.window)).toBe(true);

    // And it is *above* the writing, not after it. This is the assertion that
    // would have caught the first cut, which put the bar below the fold.
    const above = await app.window.evaluate(() => {
      const bar = document.querySelector(".bn-formatting-toolbar")?.getBoundingClientRect();
      const editor = document.querySelector(".bn-editor")?.getBoundingClientRect();
      return Boolean(bar && editor && bar.top < editor.top);
    });
    expect(above).toBe(true);
  });

  it("separates its buttons into groups, and only between the ones on screen", async () => {
    // Set to fixed by the test above, so the bar is up. Put a selection in an
    // ordinary paragraph, which is the strip with every group in it.
    await app.window.locator('.bn-block-content[data-content-type="paragraph"]').last().click();
    await app.window.keyboard.press("End");
    await app.window.keyboard.down("Shift");
    await app.window.keyboard.press("Home");
    await app.window.keyboard.up("Shift");
    await app.window.waitForTimeout(400);

    const groups = await formattingBarGroups(app.window);
    const visible = groups.filter((group) => group.shown);
    expect(visible.length).toBeGreaterThan(2);

    // **The failure this catches is a divider beside a button that is not
    // there.** Each of BlockNote's items hides itself when it does not apply
    // while staying an entry in the array, so the first cut drew two rules
    // stacked at the left of the bar and one trailing off the right. A group
    // that rendered nothing has to leave the layout, and the hairline has to
    // fall only between groups that are actually on screen.
    expect(groups.every((group) => group.shown === group.buttons > 0)).toBe(true);
    expect(visible[0].rule).toBe(false);
    expect(visible.slice(1).every((group) => group.rule)).toBe(true);
  });

  it("survives a reload, being a setting rather than a mood", async () => {
    await app.window.evaluate(() => {
      (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
    });
    await app.window.keyboard.press("Control+r");
    await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(700);

    expect(await formattingBarShown(app.window)).toBe(true);
  });

  it("goes back to appearing on a selection", async () => {
    await chooseBar(/Appears when you select/);
    expect(await formattingBarShown(app.window)).toBe(false);
  });
});
