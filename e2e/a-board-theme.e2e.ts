// A board follows the theme while it is open. Phase 32, step 8.
//
// What only the real app can answer: that the drawing library's look
// switches under an open board when the theme is switched in Settings —
// light for Daylight, dark again for Midnight — without leaving the page.
// The board used to read the theme once, when it opened.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { boardLook, clearTreeSearch, makeBoard, openSettings, openSettingsSection, pickTheme, waitForWorld } from "./harness/screen";

describe("a board's theme", () => {
  let app: RunningApp;
  const BOARD = "Weather wall";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type(BOARD);
    await app.window.keyboard.press("Enter");
    await makeBoard(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("follows the theme while the board is open, both ways", async () => {
    // The default theme is a dark one.
    expect(await boardLook(app.window)).toBe("dark");

    await openSettings(app.window);
    await openSettingsSection(app.window, "Theme");
    await pickTheme(app.window, "Daylight");
    await expect.poll(() => boardLook(app.window), { timeout: 10_000 }).toBe("light");

    await pickTheme(app.window, "Midnight");
    await expect.poll(() => boardLook(app.window), { timeout: 10_000 }).toBe("dark");
    await app.window.keyboard.press("Escape");
  });
});
