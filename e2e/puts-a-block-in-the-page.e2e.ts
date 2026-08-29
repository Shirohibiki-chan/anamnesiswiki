// A block from the sidebar, drawn in the middle of the writing. Phase 19.5.
//
// **The assertion that matters is that it leaves the sidebar.** Anything can
// draw a block on a page; what the phase decided is that there is still only
// one block — its record stays in `node.blocks` and the document holds a
// pointer — so a block in the page must be *gone* from the panel rather than
// shown twice. A copy model passes every other check in this file.
//
// The reload is the other half. Where a block lives is derived from the page's
// writing on every read, never stored, so a block that is only in the page
// until the app restarts means the pointer never reached the disk.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  openPage,
  pageBlockCount,
  pageBlockTitles,
  panelBlockTitles,
  typeAtLineStartInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";

describe("putting a block in the page", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("adds one from the slash menu", async () => {
    expect(await pageBlockCount(app.window)).toBe(0);

    await typeAtLineStartInEditor(app.window, "/text block");
    await app.window.getByText("A titled box of writing, in the page").click();
    await app.window.waitForTimeout(800);

    expect(await pageBlockCount(app.window)).toBe(1);
    expect(await pageBlockTitles(app.window)).toContain("Text");
  });

  it("does not also leave it in the sidebar", async () => {
    // The whole decision, in one assertion. Under a copy model the panel would
    // be holding a second Text block here and everything else would still pass.
    expect(await panelBlockTitles(app.window)).not.toContain("Text");
  });

  it("is still in the page after a reload", async () => {
    await app.window.reload();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(800);

    expect(await pageBlockCount(app.window)).toBe(1);
    expect(await panelBlockTitles(app.window)).not.toContain("Text");
  });

  it("goes back to the sidebar when it is taken out of the page", async () => {
    // **Deleting the pointer is not deleting the block**, which is the half of
    // the model easiest to get wrong in the other direction: the record is
    // untouched, so the block reappears where it came from rather than
    // vanishing.
    //
    // Through BlockNote's own block menu, which is what a person has. The block
    // holds no text and is not editable, so the caret never goes inside it and
    // backspace has nothing to bite on — the handle beside it is the only way
    // to take it out, and its menu offers exactly one thing.
    await app.window.locator(".page-block").first().hover();
    await app.window.getByLabel("Open block menu").click();
    await app.window.getByText("Delete", { exact: true }).click();
    await app.window.waitForTimeout(800);

    expect(await pageBlockCount(app.window)).toBe(0);
    expect(await panelBlockTitles(app.window)).toContain("Text");
  });
});
