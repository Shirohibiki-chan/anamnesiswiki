// Ctrl+A then Backspace, on a page that has columns on it. Phase 19.5.
//
// **Reported from use, and only reproducible with a row on the page.** Measured
// both ways in the running app before anything was changed: with no row,
// select-all selected the writing; with a row, it collapsed the cursor to the
// end of the document and selected nothing, so the Backspace after it took out
// a single character. Whatever handles that key stops working once one of our
// container blocks is in the document — the editor's own `selectAll` command
// was correct on the same page throughout, which is what the fix binds the key
// to. See services/editor-blocks/select-all.ts.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { columnRowCount, editorText, openPage, typeInEditor, typeAtLineStartInEditor, waitForWorld } from "./harness/screen";

const PAGE = "Quietgate";

describe("clearing a page that has columns on it", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await typeAtLineStartInEditor(app.window, "/two columns");
    await app.window.getByText("Two lanes of writing, side by side").click();
    await app.window.waitForTimeout(800);
    expect(await columnRowCount(app.window)).toBe(1);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("takes the whole page, row included", async () => {
    // The cursor goes into ordinary writing rather than into a lane, which is
    // where hers was: a row anywhere on the page was enough to break this.
    await typeInEditor(app.window, "x");
    await app.window.waitForTimeout(300);

    await app.window.keyboard.press("Control+a");
    await app.window.waitForTimeout(400);
    await app.window.keyboard.press("Backspace");
    await app.window.waitForTimeout(800);

    expect(await columnRowCount(app.window)).toBe(0);
    expect((await editorText(app.window)).trim()).toBe("");
  });
});
