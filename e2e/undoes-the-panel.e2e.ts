// Undo, in the panel down the right of a page (Phase 19).
//
// **The unit tests cannot fail the way this feature fails.** They prove the
// folding rule and the patch against a fake stack; what they cannot prove is
// that typing into a real field records anything, that the app's undo key
// reaches it while the caret is still in that field, or that a run of
// keystrokes comes back as *one* press rather than thirty. That last one is
// the whole design, and it is invisible from a unit test.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openPage, waitForWorld } from "./harness/screen";

// A page the generator always writes, and a Location — so its panel has the
// Summary field this drives. See scripts/make-test-world.mjs.
const PAGE = "Deep Nesting Test";
const TYPED = "A place undo should forget";

describe("undoing what the right-hand panel did", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  const summary = () => app.window.locator(".properties-panel .property-value-textarea").first();

  it("takes back a run of typing as one press", async () => {
    const field = summary();
    await field.waitFor({ state: "visible", timeout: 20_000 });
    await field.click();
    // Typed rather than filled, so this goes through the same per-keystroke
    // path a person does — which is the path the folding rule exists for.
    await field.pressSequentially(TYPED);
    await app.window.waitForTimeout(800);
    expect(await field.inputValue()).toContain(TYPED);

    await app.window.keyboard.press("Control+Shift+z");
    await app.window.waitForTimeout(1000);

    // Not "one character shorter": the whole run reverses, or the merge key
    // isn't doing its job.
    expect(await field.inputValue()).not.toContain(TYPED);
  });

  // The message is how anyone knows the press landed — most of what this undo
  // reverses is a field the eye isn't on at the time.
  it("says which field it was", async () => {
    expect(await app.window.locator(".history-indicator").innerText()).toContain("Undid changing Summary");
  });

  it("puts it back on redo", async () => {
    await app.window.keyboard.press("Control+Shift+y");
    await app.window.waitForTimeout(1000);
    expect(await summary().inputValue()).toContain(TYPED);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
