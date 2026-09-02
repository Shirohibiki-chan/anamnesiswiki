// The infobox: a framed group of the page's own blocks, in the writing.
// Phase 19.5.
//
// **It groups blocks; it does not own them.** Everything inside is the same
// record in `node.blocks` that a sidebar block is — the frame stores a list of
// ids. So the assertions that matter are the same two the lone block has, plus
// one that only a container can get wrong: a block added here has to *leave*
// the sidebar, and deleting the frame has to give every one of them back rather
// than taking them with it.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBlockToInfobox,
  infoboxAddHeadings,
  infoboxBlockTitles,
  infoboxCount,
  propertiesOfferedByInfobox,
  openPage,
  panelBlockTitles,
  typeAtLineStartInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";

describe("grouping blocks in an infobox", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("arrives empty from the slash menu", async () => {
    expect(await infoboxCount(app.window)).toBe(0);

    await typeAtLineStartInEditor(app.window, "/infobox");
    await app.window.getByText("A framed group of blocks, with its own Add Block").click();
    await app.window.waitForTimeout(800);

    expect(await infoboxCount(app.window)).toBe(1);
    // Empty, and holding nothing it did not make: the entry is the one item in
    // that menu that creates no block record at all.
    expect(await infoboxBlockTitles(app.window)).toEqual([]);
  });

  it("takes blocks from its own Add Block, and they leave the sidebar", async () => {
    await addBlockToInfobox(app.window, "Text block");
    await app.window.waitForTimeout(800);
    await addBlockToInfobox(app.window, "Gauge");
    await app.window.waitForTimeout(800);

    // In the frame, in the order they were added — the frame keeps its own
    // order, which is not the page's storage order.
    expect(await infoboxBlockTitles(app.window)).toEqual(["Text", "Gauge"]);
    // And gone from the panel, because there is only ever one of each block.
    expect(await panelBlockTitles(app.window)).not.toContain("Text");
    expect(await panelBlockTitles(app.window)).not.toContain("Gauge");
  });

  it("drops the Properties heading once there is nothing left under it", async () => {
    // **A heading over an empty space reads as a list that failed to load.**
    // The frame's menu has no New property button — that form belongs to the
    // panel — so on a page whose fields are all already shown, Properties was
    // a word at the bottom of the menu with nothing beneath it.
    const remaining = await propertiesOfferedByInfobox(app.window);
    for (const field of remaining) {
      await addBlockToInfobox(app.window, field);
      await app.window.waitForTimeout(600);
    }

    expect(await propertiesOfferedByInfobox(app.window)).toEqual([]);
    expect(await infoboxAddHeadings(app.window)).not.toContain("Properties");
  });

  it("is still grouped after a reload", async () => {
    // Where a block lives is derived from the page's writing on every read, so
    // a group that only holds together until restart means the list of ids
    // never reached the disk.
    await app.window.reload();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(800);

    expect(await infoboxCount(app.window)).toBe(1);
    expect(await infoboxBlockTitles(app.window)).toContain("Text");
    expect(await infoboxBlockTitles(app.window)).toContain("Gauge");
  });

  it("gives its blocks back to the sidebar when the frame is deleted", async () => {
    // **The escape route, and the one thing a container can get badly wrong.**
    // The frame is not the blocks: deleting it drops the list of ids, nothing
    // else, so every block in it becomes unclaimed and the sidebar draws it
    // again. A container that took its contents with it would lose work.
    await app.window.locator(".page-infobox").first().hover();
    await app.window.getByLabel("Open block menu").click();
    await app.window.getByText("Delete", { exact: true }).click();
    await app.window.waitForTimeout(800);

    expect(await infoboxCount(app.window)).toBe(0);
    expect(await panelBlockTitles(app.window)).toContain("Text");
    expect(await panelBlockTitles(app.window)).toContain("Gauge");
  });
});
