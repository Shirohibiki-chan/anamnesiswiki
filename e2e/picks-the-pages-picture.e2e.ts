// Two picture blocks on one page, and only one of them is the page's. Phase 19.5.
//
// **What this is protecting is that "the page's picture" became a choice.** An
// image block used to be a window onto `node.image` and nothing else, so a
// second one was the same photograph drawn twice and a picture dropped into one
// in the middle of the writing quietly became the page's portrait. Every image
// block holds its own picture now, and which one is the page's is stored.
//
// It reads the mark rather than the photographs, deliberately: the generated
// world has no pictures in it, and the thing that can go wrong here is the
// bookkeeping — two blocks both claiming the portrait, or the choice not
// reaching the disk. The pictures themselves are unit-tested in
// `block-service.test.ts`, which is where the swap is decided.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBlockToPanel,
  blockMenuItems,
  openBlockMenu,
  openPage,
  openPageBlockMenu,
  pageBlockCount,
  typeAtLineStartInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";
const MINE = "The page's picture";
const TAKE_IT = "Use as the page's picture";

async function closeMenu(app: RunningApp): Promise<void> {
  await app.window.keyboard.press("Escape");
  await app.window.waitForTimeout(200);
}

describe("choosing which picture block is the page's", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("starts with the sidebar's own picture block holding it", async () => {
    // Added rather than assumed: the generated world writes portraits onto
    // pages but no picture block to show them in, so this page's panel has
    // none until one is asked for.
    await addBlockToPanel(app.window, "Image");
    await app.window.waitForTimeout(600);

    // Nothing is stored on a page that has never been asked: the first image
    // block there is has the mark, which is what makes a world written before
    // this open unchanged.
    await openBlockMenu(app.window, "Image");
    expect(await blockMenuItems(app.window)).toContain(MINE);
    await closeMenu(app);
  });

  it("offers the mark to a second picture block in the writing", async () => {
    await typeAtLineStartInEditor(app.window, "/picture block");
    await app.window.getByText("A picture, in a block of its own").click();
    await app.window.waitForTimeout(800);
    expect(await pageBlockCount(app.window)).toBe(1);

    await openPageBlockMenu(app.window, "Image");
    const items = await blockMenuItems(app.window);
    expect(items).toContain(TAKE_IT);
    expect(items).not.toContain(MINE);
    await closeMenu(app);
  });

  it("moves the mark when it is taken", async () => {
    await openPageBlockMenu(app.window, "Image");
    await app.window.getByRole("button", { name: TAKE_IT }).click();
    await app.window.waitForTimeout(600);

    await openPageBlockMenu(app.window, "Image");
    expect(await blockMenuItems(app.window)).toContain(MINE);
    await closeMenu(app);

    // And the block it came from says so, rather than both claiming it.
    await openBlockMenu(app.window, "Image");
    expect(await blockMenuItems(app.window)).toContain(TAKE_IT);
    await closeMenu(app);
  });

  it("still has it after a reload", async () => {
    // The choice is a field on the page, so a mark that only lasts until the
    // app restarts means it never reached the disk.
    await app.window.reload();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(800);

    await openPageBlockMenu(app.window, "Image");
    expect(await blockMenuItems(app.window)).toContain(MINE);
    await closeMenu(app);
  });
});
