// The capture box opened from anywhere — the shortcut and the search palette.
// Phase 30, step 1, the second door.
//
// **The assertion that matters is that it is the same box.** The dialog says
// whose block it is drawing, and a thought captured through it lands where
// that block would have put it, and is remembered by that block afterwards.
// A dialog with rules of its own would pass a "makes a page" check and fail
// this one.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBlockToPanel,
  captureDestination,
  captureSavedNote,
  openPage,
  openQuickCapture,
  openSearchPalette,
  pageTitle,
  pressCapture,
  quickCaptureOpen,
  quickCaptureText,
  typeCapture,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";
const OTHER = "Greyharbour";

describe("capturing from anywhere", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("says so when the world has no box yet", async () => {
    await openQuickCapture(app.window);
    expect(await quickCaptureText(app.window)).toContain("no capture box in this world yet");
    await app.window.keyboard.press("Escape");
    await app.window.waitForTimeout(200);
    expect(await quickCaptureOpen(app.window)).toBe(false);
  });

  it("opens the world's box from another page, and says whose it is", async () => {
    await addBlockToPanel(app.window, "Quick Capture");
    await openPage(app.window, OTHER);

    await openQuickCapture(app.window);
    expect(await quickCaptureText(app.window)).toContain(`The box on ${PAGE}`);
    expect(await captureDestination(app.window)).toContain(PAGE);
  });

  it("files a thought without leaving the page", async () => {
    await typeCapture(app.window, "a thought from elsewhere");
    await pressCapture(app.window);
    expect(await captureSavedNote(app.window)).toBe(`Saved as a thought from elsewhere under ${PAGE}`);
    expect(await pageTitle(app.window)).toBe(OTHER);

    await app.window.keyboard.press("Escape");
    await app.window.waitForTimeout(200);
    expect(await quickCaptureOpen(app.window)).toBe(false);
  });

  it("is reachable from the search palette too", async () => {
    await openSearchPalette(app.window);
    await app.window.getByRole("button", { name: /Quick Capture/ }).click();
    await app.window.waitForTimeout(300);
    expect(await quickCaptureOpen(app.window)).toBe(true);
    // The palette handed over rather than stacking.
    expect(await app.window.getByPlaceholder(/Search every page/).count()).toBe(0);
    await app.window.keyboard.press("Escape");
  });

  it("is the block on the page, remembered and all", async () => {
    // The page the dialog captured to is now offered by the block itself.
    await openPage(app.window, PAGE);
    expect(await captureDestination(app.window)).toContain(PAGE);
    await openPage(app.window, "a thought from elsewhere");
    expect(await pageTitle(app.window)).toBe("a thought from elsewhere");
  });
});
