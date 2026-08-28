// The safety net, driven end to end in the real app (Phase 19).
//
// **This scenario exists because the unit tests cannot fail the way this
// feature fails.** They prove the rules — when a copy is due, what gets
// pruned, what a restore patches — against a fake disk. What they cannot prove
// is that a copy is taken at all when a person types into a page, that the
// panel finds it, or that restoring puts the words back on screen. That is the
// whole feature, and the app has already lost her pages once.
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openPage, openSettings, openSettingsSection, treeRow, waitForWorld } from "./harness/screen";

const PANEL = ".page-history";
// A page the generator always writes, so the scenario is not at the mercy of
// its random names.
const PAGE = "Deep Nesting Test";

describe("keeping earlier versions of a page", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  // A scenario that fails with the panel open takes the next two down with it,
  // because the backdrop swallows every click at the page behind it. Closing
  // it here keeps one failure to one failure.
  afterEach(async () => {
    if ((await app.window.locator(PANEL).count()) === 0) return;
    await app.window.keyboard.press("Escape");
    await app.window.locator(PANEL).waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
  });

  // Through the row's right-click menu, which is where a person finds it —
  // the row's ⋯ button opens the same menu and only appears on hover.
  async function openHistory(): Promise<void> {
    await treeRow(app.window, PAGE).first().click({ button: "right" });
    await app.window.getByRole("button", { name: "Earlier versions" }).click();
    await app.window.locator(PANEL).waitFor({ state: "visible", timeout: 20_000 });
    // The panel paints before its list arrives — reading the folder is a disk
    // round trip. Waiting for whichever of the two outcomes lands stops a
    // scenario from reading the panel while it still says "Looking…", which is
    // how this went green on a fast disk and red on CI. The loading line has a
    // class of its own precisely so this wait cannot match it.
    await app.window
      .locator(`${PANEL} .page-history-row, ${PANEL} .page-history-empty`)
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
  }

  it("has nothing to offer before anything has been written over", async () => {
    await openHistory();
    expect(await app.window.locator(PANEL).innerText()).toContain("Nothing kept yet");
    await app.window.keyboard.press("Escape");
    await app.window.locator(PANEL).waitFor({ state: "detached" });
  });

  it("keeps what a page said before it was typed into", async () => {
    const editor = app.window.locator(".editor-shell-wrapper [contenteditable='true']").first();
    await editor.click();
    await editor.pressSequentially("A sentence that was not there before.");
    // The save is debounced by about a third of a second; the copy is taken on
    // the way into that write.
    await app.window.waitForTimeout(2000);

    await openHistory();
    const text = await app.window.locator(PANEL).innerText();
    expect(text).not.toContain("Nothing kept yet");
    expect(text).not.toContain("A sentence that was not there before.");
  });

  it("puts the old words back, and the new ones become a version too", async () => {
    // Opened here rather than inherited from the test above: each of these
    // stands on its own, so one failing does not decide what the next one is
    // looking at.
    await openHistory();
    await app.window.getByRole("button", { name: "Restore this version" }).click();
    await app.window.locator(PANEL).waitFor({ state: "detached", timeout: 20_000 });
    await app.window.waitForTimeout(2000);

    expect(await app.window.locator(".editor-shell-wrapper").first().innerText()).not.toContain(
      "A sentence that was not there before.",
    );

    await openHistory();
    // Two now: what the page said before the typing, and what it said after —
    // taken on the way into the restore, which is what makes restoring the
    // wrong one survivable.
    expect(await app.window.locator(".page-history-row").count()).toBeGreaterThanOrEqual(2);
    expect(await app.window.locator(PANEL).innerText()).toContain("A sentence that was not there before.");
  });

  // The retention rules are hers to set (Phase 19). Driven here rather than
  // left to the unit tests because the panel is the only thing that can be
  // wrong in a way `parsePreferences` cannot see — a control wired to the
  // wrong setter, or a section registered under a tab that isn't there.
  it("lets the rules be changed from Settings", async () => {
    await openSettings(app.window);
    await openSettingsSection(app.window, "History");

    const interval = app.window.getByLabel("How often a copy is kept");
    await interval.waitFor({ state: "visible", timeout: 20_000 });
    await interval.selectOption("15");
    expect(await interval.inputValue()).toBe("15");

    await app.window.getByLabel("How far back they go").selectOption("365");
    await app.window.getByLabel("How many copies per page").selectOption("100");

    await app.window.keyboard.press("Escape");
    await app.window.waitForTimeout(500);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
