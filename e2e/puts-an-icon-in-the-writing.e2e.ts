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
  pickIcon,
  pickSuggestion,
  searchIcons,
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

  it("opens the picker in the middle of a sentence, which the slash menu cannot", async () => {
    // The reason `:` exists at all: `/` only means a command at the start of a
    // line, and an icon is wanted inside a line already being written. What
    // opens is the whole picker — search box, both tabs, the full catalogue —
    // rather than a list that can only be typed at.
    await typeInEditor(app.window, " she drew her ");
    await app.window.keyboard.press(":");
    await app.window.waitForTimeout(600);
    expect(await iconPickerOpen(app.window)).toBe(true);

    await searchIcons(app.window, "sword");
    await pickIcon(app.window, "sword");
    await app.window.waitForTimeout(800);

    // Two now — the one the slash menu put in, and this one. And the colon she
    // typed is gone, swapped for what she picked rather than left behind it.
    expect(await inlineIconCount(app.window)).toBe(2);
    expect(await app.window.locator(".editor-shell .bn-editor").first().innerText()).not.toContain("her :");
  });

  it("leaves a colon alone when it is punctuation", async () => {
    await typeInEditor(app.window, " Note:");
    await app.window.waitForTimeout(500);
    // Nothing opened and nothing was inserted — the whole reason the trigger is
    // gated on what comes before it.
    expect(await iconPickerOpen(app.window)).toBe(false);
    expect(await inlineIconCount(app.window)).toBe(2);
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
