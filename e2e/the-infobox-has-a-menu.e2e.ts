// The infobox's own menu: how wide it is, where it sits, and duplicating it.
// Phase 19.5.
//
// **The assertion that matters is the last one.** An infobox holds *pointers*
// to the page's blocks, so duplicating one has to hand the copy copies — a
// frame pointing at the same records would put one block in two places, which
// the phase rules out everywhere else, and every other check in this file
// passes just as well under that mistake. Writing in one and reading the other
// is what tells them apart.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBlockToInfobox,
  infoboxCount,
  infoboxGaps,
  infoboxText,
  infoboxWidthRatio,
  openInfoboxMenu,
  openPage,
  typeAtLineStartInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";

describe("the infobox's own menu", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);

    await typeAtLineStartInEditor(app.window, "/infobox");
    await app.window.getByText("A framed group of blocks, with its own Add Block").first().click();
    await app.window.waitForTimeout(800);
    await addBlockToInfobox(app.window, "Text block");
    await app.window.waitForTimeout(500);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("shrinks to what it holds, and goes back", async () => {
    expect(await infoboxWidthRatio(app.window)).toBeGreaterThan(0.95);

    await openInfoboxMenu(app.window);
    await app.window.getByRole("button", { name: /Auto-adapt/ }).click();
    await app.window.waitForTimeout(600);
    expect(await infoboxWidthRatio(app.window)).toBeLessThan(0.95);

    await openInfoboxMenu(app.window);
    await app.window.getByRole("button", { name: /^Fixed/ }).click();
    await app.window.waitForTimeout(600);
    expect(await infoboxWidthRatio(app.window)).toBeGreaterThan(0.95);
  });

  it("centres a narrow frame, and puts it back on the left", async () => {
    await openInfoboxMenu(app.window);
    await app.window.getByRole("button", { name: /Auto-adapt/ }).click();
    await app.window.waitForTimeout(600);
    await openInfoboxMenu(app.window);
    await app.window.getByRole("button", { name: "Align centre" }).click();
    await app.window.waitForTimeout(600);

    const centred = await infoboxGaps(app.window);
    // Even space either side, rather than "has the class": what a reader sees
    // is where the box is.
    expect(Math.abs(centred.left - centred.right)).toBeLessThan(0.02);
    expect(centred.left).toBeGreaterThan(0.05);

    await openInfoboxMenu(app.window);
    await app.window.getByRole("button", { name: "Align left" }).click();
    await app.window.waitForTimeout(600);
    expect((await infoboxGaps(app.window)).left).toBeLessThan(0.02);
  });

  it("duplicates the frame with copies of its blocks, not the same ones", async () => {
    await openInfoboxMenu(app.window);
    await app.window.getByRole("button", { name: /Auto-adapt/ }).click();
    await app.window.waitForTimeout(400);
    await openInfoboxMenu(app.window);
    await app.window.getByRole("button", { name: /Duplicate/ }).click();
    await app.window.waitForTimeout(900);

    expect(await infoboxCount(app.window)).toBe(2);

    // The whole decision, in one assertion. Two frames pointing at one record
    // would show this in both.
    await app.window.locator(".infobox").first().locator("textarea").first().fill("only in the first");
    await app.window.waitForTimeout(800);
    expect(await infoboxText(app.window, 0)).toBe("only in the first");
    expect(await infoboxText(app.window, 1)).toBe("");
  });

  it("keeps both frames, and how they look, after a reload", async () => {
    await app.window.reload();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(1000);

    expect(await infoboxCount(app.window)).toBe(2);
    expect(await infoboxWidthRatio(app.window)).toBeLessThan(0.95);
    expect(await infoboxText(app.window, 0)).toBe("only in the first");
    expect(await infoboxText(app.window, 1)).toBe("");
  });
});
