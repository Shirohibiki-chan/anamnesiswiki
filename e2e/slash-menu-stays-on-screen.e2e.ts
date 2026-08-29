// The `/` menu fitting inside the window, wherever the cursor is.
//
// **Reported from use twice, and the second time with a screenshot**: the menu
// ran off the bottom of the page. Nothing could have caught it — every scenario
// about this menu asked whether it was *open*, and a menu hanging half off the
// window is open, correct, and unusable.
//
// **What was wrong is worth knowing, because the fix is a thing not to do
// again.** floating-ui measures the room actually left beside the caret and
// writes a `max-height` on the menu's wrapper. A stylesheet rule was
// out-specifying that with `!important` and a floor of 260px, so whenever the
// measured room was less than the forced height the box overflowed the window
// — off the bottom with the caret high on the page, and off the *top* when it
// flipped, which is how it was first measured: a menu at y=-31.
//
// So this walks the cursor down the page, opens the menu at each depth, and
// asserts the whole box is on screen. It is deliberately a range rather than
// one position: the failure only appears in the band where the room beside the
// caret is smaller than the height the menu wants.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openPage, suggestionMenuBox, suggestionMenuOpen, waitForWorld } from "./harness/screen";

const PAGE = "Quietgate";

describe("the slash menu staying on screen", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("fits inside the window wherever the cursor is", async () => {
    const editor = await app.window.locator(".editor-shell .bn-editor").first().boundingBox();
    expect(editor).not.toBeNull();
    if (!editor) return;

    const depths = [0.1, 0.3, 0.5, 0.7, 0.9].map((fraction) => editor.y + editor.height * fraction);
    let opened = 0;

    for (const y of depths) {
      // The left edge of the text column, never the middle of it: a click in
      // the middle of a page can land on a link chip and navigate away.
      await app.window.mouse.click(editor.x + 6, Math.round(y));
      await app.window.keyboard.press("Home");
      await app.window.keyboard.type("/", { delay: 20 });
      await app.window.waitForTimeout(600);

      if (await suggestionMenuOpen(app.window)) {
        const box = await suggestionMenuBox(app.window);
        expect(box).not.toBeNull();
        if (box) {
          opened += 1;
          expect.soft(box.top, `menu top at caret y=${Math.round(y)}`).toBeGreaterThanOrEqual(0);
          expect.soft(box.bottom, `menu bottom at caret y=${Math.round(y)}`).toBeLessThanOrEqual(box.windowHeight);
          // Not squeezed to nothing either — the failure the old floor was
          // reaching for, asserted here where it cannot push the box off screen.
          expect.soft(box.height, `menu height at caret y=${Math.round(y)}`).toBeGreaterThan(100);
        }
      }

      await app.window.keyboard.press("Escape");
      await app.window.keyboard.press("Backspace");
      await app.window.waitForTimeout(150);
    }

    // A run where the menu never opened would pass every assertion above
    // without testing anything.
    expect(opened).toBeGreaterThan(0);
  }, 120_000);
});
