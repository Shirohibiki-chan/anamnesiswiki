// The `?` sheet, in the real app.
//
// **The interesting part is that the list is the live one.** Its rows are read
// out of the same store the listener matches against, so a scenario that
// rebinds nothing still proves the wiring: the keys on screen have to be the
// defaults, spelled the way the app spells them. A hardcoded list would pass
// this too — which is why the rebind below is here, and is the assertion worth
// keeping.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { waitForWorld } from "./harness/screen";

const SHEET = ".shortcut-sheet";

describe("showing every shortcut", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("opens on ?", async () => {
    await app.window.keyboard.press("Shift+Slash");
    await app.window.locator(SHEET).waitFor({ state: "visible", timeout: 20_000 });
    const text = await app.window.locator(SHEET).innerText();
    expect(text).toContain("Search");
    expect(text).toContain("Ctrl+K");
  });

  it("lists the keys that can't be rebound as well, and says so", async () => {
    const text = await app.window.locator(SHEET).innerText();
    expect(text).toContain("Fullscreen");
    expect(text).toContain("F11");
    expect(text.toLowerCase()).toContain("can't be changed");
  });

  it("lists the editor's own keys too", async () => {
    const text = await app.window.locator(SHEET).innerText();
    expect(text).toContain("Bold");
    expect(text).toContain("Ctrl+B");
  });

  // The slash list is the menu's own, read from the same code that draws it
  // — so a command of ours and one of BlockNote's both have to be there.
  it("lists the slash commands on their own tab", async () => {
    await app.window.getByRole("tab", { name: "Slash Commands", exact: true }).click();
    const text = await app.window.locator(SHEET).innerText();
    expect(text).toContain("Info");
    expect(text).toContain("Heading 1");
    expect(text).toContain("YouTube");
    expect(text).toContain("/");
  });

  it("lists the markdown that turns into formatting", async () => {
    await app.window.getByRole("tab", { name: "Markdown", exact: true }).click();
    const text = await app.window.locator(SHEET).innerText();
    expect(text).toContain("**text**");
    expect(text).toContain("Heading 1");
    await app.window.getByRole("tab", { name: "Keys", exact: true }).click();
  });

  it("closes on the same key, and on Escape", async () => {
    await app.window.keyboard.press("Shift+Slash");
    await app.window.locator(SHEET).waitFor({ state: "detached", timeout: 20_000 });

    await app.window.keyboard.press("F1");
    await app.window.locator(SHEET).waitFor({ state: "visible", timeout: 20_000 });
    await app.window.keyboard.press("Escape");
    await app.window.locator(SHEET).waitFor({ state: "detached", timeout: 20_000 });
  });

  // The claim the panel is making: these are *your* keys, not a manual's.
  it("shows a rebound key rather than the default", async () => {
    // Driven through the settings screen rather than the store, since reaching
    // into state is what the harness exists not to do.
    await app.window.getByLabel("Settings", { exact: true }).first().click();
    await app.window.getByRole("tab", { name: "Keyboard", exact: true }).click();
    await app.window.getByRole("button", { name: /Change the shortcut for Save now/ }).click();
    await app.window.keyboard.press("Control+F2");
    await app.window.getByRole("button", { name: "Close settings" }).click();

    await app.window.keyboard.press("Shift+Slash");
    await app.window.locator(SHEET).waitFor({ state: "visible", timeout: 20_000 });
    expect(await app.window.locator(SHEET).innerText()).toContain("Ctrl+F2");
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
