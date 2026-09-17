// A thought typed into the Quick capture block becomes a page, filed where the
// block said. Phase 30, step 1.
//
// **The code word is the assertion that matters.** Anything can make a page
// from a text box; what the phase decided is that `magic - a thought` files
// under Magic *and says so on the control* before the button is pressed, and
// that the word is dropped from the title. A block that routed silently, or
// kept the prefix, would pass the first half of this file and fail the second.
//
// The reload is the other half: where the last capture went is written to the
// block, so the picker offers it again after a restart.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBlockToPanel,
  captureDestination,
  captureSavedNote,
  editorText,
  openPage,
  pageTitle,
  panelBlockTitles,
  pickCaptureDestination,
  pressCapture,
  searchTree,
  clearTreeSearch,
  treeRow,
  typeCapture,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";

describe("capturing a thought", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("adds the block, filing under the page itself", async () => {
    await addBlockToPanel(app.window, "Quick Capture");
    expect(await panelBlockTitles(app.window)).toContain("Quick Capture");
    expect(await captureDestination(app.window)).toContain(PAGE);
  });

  it("files a thought as a page under the destination", async () => {
    await typeCapture(app.window, "Magic");
    await pressCapture(app.window);

    expect(await captureSavedNote(app.window)).toBe(`Saved as Magic under ${PAGE}`);
    await searchTree(app.window, "Magic");
    expect(await treeRow(app.window, "Magic").count()).toBe(1);
    await clearTreeSearch(app.window);
    // Still on the page the thought was typed from — that is the trip saved.
    expect(await pageTitle(app.window)).toBe(PAGE);
  });

  it("reads a code word, says so, and drops it from the title", async () => {
    await typeCapture(app.window, "magic - i love witches!\nthey should have hats");
    const shown = await captureDestination(app.window);
    expect(shown).toContain("Magic");
    expect(shown).toContain("code word");

    await pressCapture(app.window);
    expect(await captureSavedNote(app.window)).toBe("Saved as i love witches! under Magic");
  });

  it("wrote the rest into the page, with a Captured field beside it", async () => {
    await openPage(app.window, "i love witches!");
    expect(await editorText(app.window)).toContain("they should have hats");
    expect(await panelBlockTitles(app.window)).toContain("Captured");
    await openPage(app.window, PAGE);
  });

  it("leaves an unmatched word in the title rather than filing it anywhere else", async () => {
    await typeCapture(app.window, "magick - a typo");
    const shown = await captureDestination(app.window);
    expect(shown).not.toContain("code word");

    await pressCapture(app.window);
    expect(await captureSavedNote(app.window)).toMatch(/^Saved as magick - a typo under /);
  });

  it("offers the last destination again after a reload", async () => {
    await pickCaptureDestination(app.window, "Magic");
    await typeCapture(app.window, "a second thought");
    await pressCapture(app.window);
    expect(await captureSavedNote(app.window)).toBe("Saved as a second thought under Magic");

    await app.window.reload();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(800);

    expect(await panelBlockTitles(app.window)).toContain("Quick Capture");
    expect(await captureDestination(app.window)).toContain("Magic");
  });
});
