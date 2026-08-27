// A template swap must not take a page's writing with it (2026-08-27).
//
// **The bug this covers was silent.** Applying one of the project's own
// templates replaced the page's whole property set, so a field the template
// had no equivalent of lost its value — and the block that had been showing it
// turned into "Missing property", which was the only visible sign. The text was
// still in the file with no way back to it.
//
// Unit tests cover the rule (`planTemplateSwap`); this covers the wiring,
// because the rule being right is no use if the store hands it the wrong
// arguments — and this is a data-loss path, which is the kind this suite
// exists for.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openPage, treeRow, waitForWorld } from "./harness/screen";

const PANEL = ".properties-panel, .block-panel";
const SOURCE = "Deep Nesting Test";
const FIELD = "Where it started";
const VALUE = "A note that must survive";

describe("applying a template to a page that already has fields", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);

    // A template of this world's own, made the way a person makes one.
    await openPage(app.window, SOURCE);
    await treeRow(app.window, SOURCE).first().click({ button: "right" });
    await app.window.getByRole("button", { name: "Save as template" }).click();
    await app.window.getByRole("button", { name: "Just this page" }).click();
    await app.window.waitForTimeout(600);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("keeps a field the template has no home for, and what was in it", async () => {
    // A blank page with a field of its own, which is the shape that lost data:
    // its custom properties were replaced wholesale by the template's.
    // Ctrl+N makes a blank page and leaves its "what kind of page is this?"
    // prompt up, which is the only route to one of the world's own templates.
    await app.window.keyboard.press("Control+n");
    await app.window.locator(".new-page-landing").waitFor({ state: "visible", timeout: 20_000 });
    await app.window.keyboard.press("Escape");

    // A field of its own, with something in it. This is the shape that lost
    // data: a blank page's custom properties were replaced wholesale.
    await app.window.getByRole("button", { name: "Add Block" }).first().click();
    await app.window.getByRole("button", { name: "+ New property" }).click();
    await app.window.getByPlaceholder("Property name").fill(FIELD);
    await app.window.keyboard.press("Enter");
    await app.window.waitForTimeout(600);

    const field = app.window.locator(".property-value-input, .property-value-textarea").last();
    await field.click();
    await field.pressSequentially(VALUE);
    await app.window.waitForTimeout(1000);

    // The world's own template, named after the page it was made from. The
    // row also carries a delete button naming the same template, hence the
    // class rather than the accessible name alone.
    await app.window.locator(".new-page-landing-custom .new-page-landing-choice").filter({ hasText: SOURCE }).click();
    await app.window.waitForTimeout(1500);

    // Upper-cased by the panel's own eyebrow styling, so the comparison is
    // about the field being there rather than about how it is drawn.
    const panel = (await app.window.locator(PANEL).first().innerText()).toLowerCase();
    expect(panel).toContain(FIELD.toLowerCase());
    expect(panel).not.toContain("missing property");
    const values = await app.window.locator(".property-value-input, .property-value-textarea").evaluateAll((els) =>
      els.map((el) => (el as HTMLInputElement).value),
    );
    expect(values).toContain(VALUE);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
