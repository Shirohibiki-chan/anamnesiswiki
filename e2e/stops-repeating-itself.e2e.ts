// Two of the 2026-08-27 loose ends, in the real app (2026-09-21).
//
// The stylesheet notice — "this file asked to load something from the
// internet" — was a fact about a file and so was there every time its panel
// was, with no way to say "I know". Now there is, and it holds until the file
// changes. And the help sheet, where somebody goes when something is wrong,
// leads to the bug report.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openSettings, openSettingsSection, waitForWorld } from "./harness/screen";

const NOTICE = ".appearance-blocked";
const SHEET = ".shortcut-sheet";

describe("a warning that can be told to stop", () => {
  let app: RunningApp;
  let file: string;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    // A snippet that reaches for the internet, which is what the notice is
    // about. Written into the real snippets folder and picked up by the
    // live watch, the way a person's own would be.
    // After the app's own first write into that folder (the Dashboard
    // snippet it seeds), which the watch is told to ignore for a moment —
    // a file landing inside that moment is ignored with it.
    await app.window.waitForTimeout(2500);
    const dir = path.join(app.projectsDir, "snippets");
    await fs.mkdir(dir, { recursive: true });
    file = path.join(dir, "webfont.css");
    await fs.writeFile(file, '@import url("https://example.com/font.css"); p { color: red }', "utf8");
    await app.window.waitForTimeout(1500);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("shows the notice for a snippet that asked for the internet", async () => {
    await openSettings(app.window);
    await openSettingsSection(app.window, "Snippets");
    const notice = app.window.getByRole("dialog").locator(NOTICE).filter({ hasText: "webfont.css" });
    await notice.waitFor({ state: "visible", timeout: 20_000 });
    expect(await notice.innerText()).toContain("asked to load");
  });

  it("goes quiet when told, and stays quiet across a rescan", async () => {
    const dialog = app.window.getByRole("dialog");
    await dialog.getByRole("button", { name: "I Know, Stop Telling Me" }).click();
    await expect.poll(() => dialog.locator(NOTICE).filter({ hasText: "webfont.css" }).count()).toBe(0);

    // Another section and back is a fresh render; a touch of an unrelated
    // file is a rescan of the folder.
    await openSettingsSection(app.window, "Theme");
    await fs.writeFile(path.join(path.dirname(file), "other.css"), "p { margin: 0 }", "utf8");
    await app.window.waitForTimeout(1500);
    await openSettingsSection(app.window, "Snippets");
    await app.window.waitForTimeout(300);
    expect(await dialog.locator(NOTICE).filter({ hasText: "webfont.css" }).count()).toBe(0);
  });

  it("speaks up again once the file changes", async () => {
    await fs.writeFile(file, '@import url("https://example.com/other.css"); p { color: blue }', "utf8");
    await app.window.waitForTimeout(1500);
    const notice = app.window.getByRole("dialog").locator(NOTICE).filter({ hasText: "webfont.css" });
    await notice.waitFor({ state: "visible", timeout: 20_000 });
    await app.window.getByRole("button", { name: "Close settings" }).click();
  });

  it("leads to the bug report from the help sheet", async () => {
    await app.window.keyboard.press("Shift+Slash");
    await app.window.locator(SHEET).waitFor({ state: "visible", timeout: 20_000 });
    await app.window.locator(SHEET).getByRole("button", { name: "Report a Bug" }).click();
    const settings = app.window.getByRole("dialog", { name: "Settings" });
    await settings.waitFor({ state: "visible", timeout: 20_000 });
    expect(await settings.getByRole("tab", { name: "Report a Bug", exact: true }).getAttribute("aria-selected")).toBe("true");
    // Escape closes Settings and leaves the sheet where it was.
    await app.window.keyboard.press("Escape");
    await settings.waitFor({ state: "hidden", timeout: 10_000 });
    expect(await app.window.locator(SHEET).count()).toBe(1);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
