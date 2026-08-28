// Moving a block up the right-hand panel, and finding it still there after a
// reload.
//
// **Written for the Phase 19.5 split, and it is the half of that refactor a
// type checker cannot see.** `BlockList` draws the blocks and no longer knows
// where in the page's list any of them sit; it reports *which* block moved onto
// *which*, and `BlockPanel` turns that back into a pair of positions. Get that
// translation wrong and nothing fails to compile, nothing throws, and every
// unit test still passes — the block simply lands in the wrong place, or
// nowhere. The only thing that can catch it is moving one and looking.
//
// The reload at the end is the second half: an order that changes on screen and
// is never written is the same bug wearing a disguise.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openBlockMenu, openPage, panelBlockTitles, waitForWorld } from "./harness/screen";

// A Location the generator always writes, and one with several titled blocks
// down its panel. See scripts/make-test-world.mjs.
const PAGE = "Deep Nesting Test";

describe("rearranging the right-hand panel", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("moves a block above the one over it, and keeps it there", async () => {
    const before = await panelBlockTitles(app.window);
    // Two is the least this can be driven with: something to move, and
    // something for it to move above.
    expect(before.length).toBeGreaterThan(1);

    const [first, second] = before;
    await openBlockMenu(app.window, second);
    await app.window.getByRole("button", { name: "Move up" }).click();
    await app.window.waitForTimeout(500);

    const after = await panelBlockTitles(app.window);
    expect(after.slice(0, 2)).toEqual([second, first]);
    // Everything under the swap stays where it was — a reorder that also
    // reshuffles the rest is a different bug with the same first assertion.
    expect(after.slice(2)).toEqual(before.slice(2));

    // Saved, not just moved. The panel autosaves, so the wait is for the write
    // rather than for the render.
    await app.window.waitForTimeout(1500);
    await app.window.evaluate(() => {
      (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
    });
    await app.window.keyboard.press("Control+r");
    await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);

    expect(await panelBlockTitles(app.window)).toEqual(after);
  });
});
