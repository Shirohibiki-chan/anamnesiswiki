// A link that goes to one block rather than to the top of a page. Phase 19.5.
//
// **The link is already written, rather than copied and pasted here.** A block's
// own menu puts one on the clipboard, and nothing in this suite may touch the
// clipboard — it is the machine's, and the person running the tests has
// their own things on it (docs/handoff.md). So the generated world carries a
// page with a link to a spot in its own writing, and what is tested here is
// everything either side of the clipboard: the item being offered, the chip
// saying where it goes, and following it landing on the block.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  arrivalMarkShown,
  arrivedBlockText,
  blockInView,
  editorBlockMenuItems,
  followPageLink,
  openPage,
  spotLinkCount,
  waitForWorld,
} from "./harness/screen";

// The hard case the generator always writes: a link at the top, a heading
// twelve paragraphs below it, and the id in both places. See make-test-world.
const PAGE = "A Link To A Spot Further Down This Page";
const TARGET = "The Spot Being Linked To";

describe("linking to a spot on a page", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(800);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("offers the link in a block's own menu", async () => {
    expect(await editorBlockMenuItems(app.window, 1)).toContain("Copy link to this block");
  });

  it("says on the chip that it goes to a spot rather than to the page", async () => {
    expect(await spotLinkCount(app.window)).toBe(1);
  });

  it("scrolls to the block and marks it when the link is followed", async () => {
    // The point of the twelve paragraphs: there is nothing to prove if the
    // block was already on screen.
    expect(await blockInView(app.window, TARGET)).toBe(false);

    await followPageLink(app.window, "further down");
    // The mark is read first and with nothing waited for in front of it: it is
    // on screen for two seconds and then gone by design. Asked in two steps so
    // that a failure says which half went wrong — nothing marked at all, or the
    // wrong block marked.
    expect(await arrivalMarkShown(app.window)).toBe(true);
    expect(await arrivedBlockText(app.window)).toContain(TARGET);

    // The scroll is animated, so it is the one to give a moment.
    await app.window.waitForTimeout(700);
    expect(await blockInView(app.window, TARGET)).toBe(true);
  });

  it("leaves the mark behind rather than needing it dismissed", async () => {
    // It fades on its own — see BlockAnchor.tsx, where the class comes off
    // after a couple of seconds and the pending anchor is forgotten with it.
    await app.window.waitForTimeout(2500);
    expect(await arrivedBlockText(app.window)).toBeNull();
  });
});
