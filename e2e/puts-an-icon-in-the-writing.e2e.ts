// The icon that sits in a sentence and can be asked again (Phase 19.5).
//
// **What a unit test cannot reach here is that it is still an icon after a
// reload.** Everything interesting is a round trip: the `/` command inserts
// custom inline content, the choice is a prop on it, and that prop travels
// through the document, the autosave, the file on disk and the schema's
// default on the way back in. An icon that draws once and comes back as a
// blank — or as the literal word "sword" — is the failure this exists to
// catch.
//
// **And the callout's icon, in the same file**, because the two share the
// picker and the interesting case is the one they do not share: a callout's
// blank state is the icon its colour implies, so "no icon" and "back to the
// usual one" have to stay two different answers.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  iconPickerOpen,
  inlineIconCount,
  openPage,
  pickSuggestion,
  suggestionMenuItems,
  suggestionMenuOpen,
  typeInEditor,
  typeAtLineStartInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Deep Nesting Test";

describe("an icon in the writing", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  const inlineIcon = () => app.window.locator(".editor-inline-icon").first();

  async function reload() {
    // Long enough for the autosave to have written, then a real window reload —
    // the same shape the callout-colour scenario uses, for the same reason.
    await app.window.waitForTimeout(1500);
    await app.window.evaluate(() => {
      (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
    });
    await app.window.keyboard.press("Control+r");
    await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  }

  it("drops one in from the slash menu without asking first", async () => {
    await typeAtLineStartInEditor(app.window, "/icon");
    await pickSuggestion(app.window, "Icon");
    await app.window.waitForTimeout(600);

    // It arrives already drawn. The picker does not open, on purpose — the
    // sentence carries on and the icon is changed afterwards.
    await inlineIcon().waitFor({ state: "visible", timeout: 10_000 });
    expect(await app.window.locator(".icon-picker").count()).toBe(0);
  });

  it("does nothing on a bare colon, and opens once there is something to match", async () => {
    // Her call 2026-09-01, after three attempts to make one control do both
    // jobs: a colon on its own is punctuation far more often than it is a
    // request, so the type-ahead waits for something to search for.
    await typeInEditor(app.window, " and she laughed ");
    await app.window.keyboard.press(":");
    await app.window.waitForTimeout(500);
    expect(await suggestionMenuOpen(app.window)).toBe(false);
    expect(await iconPickerOpen(app.window)).toBe(false);

    await app.window.keyboard.type("sm", { delay: 40 });
    await app.window.waitForTimeout(700);
    expect(await suggestionMenuOpen(app.window)).toBe(true);
  });

  it("is driven by the keyboard, arrows and Enter, without reaching for the mouse", async () => {
    // The whole point of a type-ahead. Tab takes the highlighted item too —
    // that machinery is shared with the other suggestion menus.
    await app.window.keyboard.press("ArrowDown");
    await app.window.keyboard.press("Enter");
    await app.window.waitForTimeout(800);

    const text = await app.window.locator(".editor-shell .bn-editor").first().innerText();
    // The colon and what was typed after it are gone, replaced by what she
    // took — and an emoji goes in as a character, the way it always has.
    expect(text).not.toContain(":sm");
    expect(text).toContain("and she laughed");
  });

  it("finds an emoji by the name a chat app calls it", async () => {
    await typeInEditor(app.window, " truly ");
    await app.window.keyboard.press(":");
    await app.window.keyboard.type("joy", { delay: 40 });
    await app.window.waitForTimeout(700);
    // Written back out with its colons, which is what the thing is called
    // everywhere else somebody types one.
    expect(await suggestionMenuItems(app.window)).toContain(":joy:");
  });

  it("leaves a colon alone when it is punctuation", async () => {
    const before = await inlineIconCount(app.window);
    await app.window.keyboard.press("Escape");
    await typeInEditor(app.window, " Note:");
    await app.window.waitForTimeout(500);
    // Nothing opened and nothing was inserted — the trigger is gated on what
    // comes before the colon as well as on what follows it.
    expect(await suggestionMenuOpen(app.window)).toBe(false);
    expect(await inlineIconCount(app.window)).toBe(before);
  });

  it("opens the whole picker on Ctrl and the same key", async () => {
    // The other half of the pair: the type-ahead is for when you know the
    // name, this is for when you do not. It opens on an empty line too, which
    // is where an earlier cut of it did not — the caret has no rectangle in an
    // empty block and that was read as having nowhere to anchor.
    await typeInEditor(app.window, "");
    await app.window.keyboard.press("Enter");
    await app.window.waitForTimeout(400);
    await app.window.keyboard.press("Control+:");
    await app.window.waitForTimeout(700);
    expect(await iconPickerOpen(app.window)).toBe(true);
    // **Empty, not holding the colon it was opened with.** The search box is
    // focused, so a stray trigger character in it means the first thing she
    // types is filtering against punctuation.
    expect(await app.window.locator(".icon-picker input").inputValue()).toBe("");
  });

  it("offers every emoji there is, not a hand-picked corner of them", async () => {
    await app.window.getByRole("button", { name: "Emoji" }).click();
    await app.window.waitForTimeout(1000);
    // The curated list this replaced held 129. The point of the check is that
    // nobody quietly trims it again.
    expect(await app.window.locator(".icon-picker-option").count()).toBeGreaterThan(1500);
    await app.window.keyboard.press("Escape");
    await app.window.waitForTimeout(400);
  });

  it("changes it when you click it, and remembers", async () => {
    await inlineIcon().click();
    await app.window.locator(".icon-picker").waitFor({ state: "visible", timeout: 10_000 });

    await app.window.getByPlaceholder("Search icons").fill("anchor");
    await app.window.getByLabel("anchor", { exact: true }).first().click();
    await app.window.waitForTimeout(600);

    // An SVG, not the word — the text fallback is what a name the catalogue
    // does not know would produce, so its absence is the check that the name
    // resolved.
    expect(await inlineIcon().locator("svg").count()).toBe(1);

    await reload();
    await inlineIcon().waitFor({ state: "visible", timeout: 20_000 });
    expect(await inlineIcon().locator("svg").count()).toBe(1);
  });

  it("takes a callout's icon off without putting the colour's own back", async () => {
    const callout = app.window.locator(".editor-callout").first();
    await callout.waitFor({ state: "visible", timeout: 20_000 });

    // Amber first, so there is a derived icon to argue with.
    await callout.hover();
    await app.window.getByLabel("Colour of this callout").first().click();
    await app.window.getByLabel("Amber", { exact: true }).first().click();
    await app.window.waitForTimeout(600);
    await app.window.getByLabel("Caution").first().waitFor({ state: "visible", timeout: 5_000 });

    await app.window.getByLabel("Caution").first().click();
    await app.window.locator(".icon-picker").waitFor({ state: "visible", timeout: 10_000 });
    await app.window.getByRole("button", { name: "No icon" }).click();
    await app.window.waitForTimeout(600);

    // Gone, and it stays gone: the whole reason "no icon" is stored as a value
    // of its own rather than as an empty prop.
    expect(await app.window.getByLabel("Caution").count()).toBe(0);
    await reload();
    await callout.waitFor({ state: "visible", timeout: 20_000 });
    expect(await app.window.getByLabel("Caution").count()).toBe(0);
    expect(await app.window.locator(".editor-callout-colored").count()).toBe(1);
  });

  it("puts the colour's own icon back when asked for it", async () => {
    await app.window.locator(".editor-callout-icon").first().click();
    await app.window.locator(".icon-picker").waitFor({ state: "visible", timeout: 10_000 });
    await app.window.getByRole("button", { name: "The usual icon" }).click();
    await app.window.waitForTimeout(600);

    await app.window.getByLabel("Caution").first().waitFor({ state: "visible", timeout: 5_000 });
  });
});
