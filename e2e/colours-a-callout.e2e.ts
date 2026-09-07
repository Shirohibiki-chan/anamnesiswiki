// Giving a callout a colour of its own (Phase 19.5), and the icon staying put
// while you do it (2026-09-06).
//
// **The interesting part is that it is stored, and a unit test cannot see
// that.** The colour is a prop on a BlockNote block, so it travels through the
// editor's document, the autosave, the file on disk and the schema's default on
// the way back in — and the default is what every callout written before this
// relies on. A colour that shows on screen and is gone after a reload is the
// failure this exists to catch.
//
// **The icon assertions are the other half, and they are here because this is
// the scenario that changes a colour.** Icons used to be derived from the
// colour, which meant recolouring a box swapped the mark on it and an
// uncoloured box wore nothing at all. Both are gone; `callout-colors.test.ts`
// holds the rules, and this holds the only thing that can prove the block on
// screen agrees with them.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openPage, typeAtLineStartInEditor, waitForWorld } from "./harness/screen";

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
  const icon = () => callout().locator(".editor-callout-icon");
  /** What the icon is actually drawing, so a swap is visible to the assertion. */
  const iconDrawing = () => icon().innerHTML();

  it("keeps the colour across a reload, and leaves the icon alone", async () => {
    await callout().waitFor({ state: "visible", timeout: 20_000 });
    // Nothing is coloured to begin with: a page written before this looks
    // exactly as it did, which is what the schema default is for.
    expect(await app.window.locator(".editor-callout-colored").count()).toBe(0);
    // And it is wearing its type's icon rather than nothing, which is what an
    // uncoloured callout used to wear.
    expect(await icon().count()).toBe(1);
    const before = await iconDrawing();
    expect(before).not.toBe("");

    await callout().hover();
    await app.window.getByLabel("Colour of this callout").first().click();
    await app.window.getByLabel("Amber", { exact: true }).first().click();
    await app.window.waitForTimeout(600);

    expect(await app.window.locator(".editor-callout-colored").count()).toBe(1);
    // **The point of the rewrite.** Amber used to mean caution and swapped the
    // mark on the box out from under her; the icon is a value on the block now,
    // so recolouring moves the colour and nothing else.
    expect(await iconDrawing()).toBe(before);

    // Saved, not just shown.
    await app.window.waitForTimeout(1500);
    await app.window.evaluate(() => {
      (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
    });
    await app.window.keyboard.press("Control+r");
    await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);

    await callout().waitFor({ state: "visible", timeout: 20_000 });
    expect(await app.window.locator(".editor-callout-colored").count()).toBe(1);
    expect(await iconDrawing()).toBe(before);
  });

  it("puts it back to the colour its type has, still without touching the icon", async () => {
    const before = await iconDrawing();

    await callout().hover();
    await app.window.getByLabel("Colour of this callout").first().click();
    await app.window.getByRole("button", { name: "The usual colour" }).click();
    await app.window.waitForTimeout(600);

    expect(await app.window.locator(".editor-callout-colored").count()).toBe(0);
    expect(await icon().count()).toBe(1);
    expect(await iconDrawing()).toBe(before);
  });

  it("makes a Warning that is already amber and already carrying its triangle", async () => {
    // The four conventions became things you pick rather than things a colour
    // implies, so the menu entry has to arrive wearing both halves — this is
    // what "you asked for the warn one" means on screen.
    await typeAtLineStartInEditor(app.window, "/warning");
    await app.window.waitForTimeout(400);
    await app.window.keyboard.press("Enter");
    await app.window.waitForTimeout(600);

    const made = app.window.locator(".editor-callout-colored").first();
    await made.waitFor({ state: "visible", timeout: 10_000 });
    expect(await made.locator(".editor-callout-icon").count()).toBe(1);
    expect(await made.locator(".editor-callout-icon svg").count()).toBe(1);
  });

  it("takes the icon off and puts one back", async () => {
    // **Reported 2026-09-06**: taking the icon off looked like a one-way door.
    // It never was — the way back was an invisible 15px square in the corner,
    // which is the same thing from where she was sitting. The way back is a
    // button you can see now, and this is what proves it stays one.
    await callout().hover();
    await icon().click();
    await app.window.getByRole("button", { name: "No icon" }).click();
    await app.window.waitForTimeout(600);
    expect(await icon().count()).toBe(0);

    await callout().hover();
    const back = callout().getByRole("button", { name: "Add an icon" });
    await back.waitFor({ state: "visible", timeout: 5_000 });
    await back.click();
    await app.window.locator(".icon-picker").waitFor({ state: "visible", timeout: 5_000 });
    await app.window.locator(".icon-picker-grid button").first().click();
    await app.window.waitForTimeout(600);

    expect(await icon().count()).toBe(1);
    expect(await icon().locator("svg").count()).toBe(1);
  });
});
