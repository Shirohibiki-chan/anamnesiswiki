// Giving a callout a colour of its own (Phase 19.5).
//
// **The interesting part is that it is stored, and a unit test cannot see
// that.** The colour is a prop on a BlockNote block, so it travels through the
// editor's document, the autosave, the file on disk and the schema's default on
// the way back in — and the default is what every callout written before this
// relies on. A colour that shows on screen and is gone after a reload is the
// failure this exists to catch.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openPage, waitForWorld } from "./harness/screen";

const PAGE = "Deep Nesting Test";

describe("colouring a callout", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  const callout = () => app.window.locator(".editor-callout").first();

  it("keeps the colour, and the icon that goes with it, across a reload", async () => {
    await callout().waitFor({ state: "visible", timeout: 20_000 });
    // Nothing is coloured to begin with: a page written before this looks
    // exactly as it did, which is what the schema default is for.
    expect(await app.window.locator(".editor-callout-colored").count()).toBe(0);

    await callout().hover();
    await app.window.getByLabel("Colour of this callout").first().click();
    await app.window.getByLabel("Amber", { exact: true }).first().click();
    await app.window.waitForTimeout(600);

    expect(await app.window.locator(".editor-callout-colored").count()).toBe(1);
    // Amber means caution, and the icon is how that is read without learning
    // it. It is keyed to the colour, so this is also the check that the colour
    // actually landed on the block rather than just on the dot.
    await app.window.getByLabel("Caution").first().waitFor({ state: "visible", timeout: 5_000 });

    // Saved, not just shown.
    await app.window.waitForTimeout(1500);
    await app.window.evaluate(() => {
      (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
    });
    await app.window.keyboard.press("Control+r");
    await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);

    await app.window.getByLabel("Caution").first().waitFor({ state: "visible", timeout: 20_000 });
    expect(await app.window.locator(".editor-callout-colored").count()).toBe(1);
  });

  it("puts it back to the colour its type has", async () => {
    await callout().hover();
    await app.window.getByLabel("Colour of this callout").first().click();
    await app.window.getByRole("button", { name: "The usual colour" }).click();
    await app.window.waitForTimeout(600);

    expect(await app.window.locator(".editor-callout-colored").count()).toBe(0);
    expect(await app.window.getByLabel("Caution").count()).toBe(0);
  });
});
