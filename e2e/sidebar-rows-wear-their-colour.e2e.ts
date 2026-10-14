// A sidebar row shows its page's colour, and how much is a setting. 2026-10-13.
//
// **What a unit test cannot see.** The colour reaches a row as a custom
// property and every wash is the stylesheet's, ranked against the accent's
// selection and the hover — which one wins is only knowable in a real layout.
// The bug this came from was exactly that: a page set to red, selected, drawn
// in the accent colour, because the old tint was inline and nothing could
// outrank it.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { colourRow, openPage, pickSidebarColour, treeRowBackground, waitForWorld } from "./harness/screen";

/** Given its own colour here. */
const RED_PAGE = "Thonn Lindqvist";
/** Takes its colour from the Characters section above it and has none of its own. */
const INHERITING_PAGE = "Kalla Reyes";

describe("sidebar rows and their colour", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp({ pages: 30 });
    await waitForWorld(app.window);
    await colourRow(app.window, RED_PAGE, "Red");
  });

  afterAll(async () => {
    await app?.close();
  });

  it("selects a red page in red, not in the accent", async () => {
    await openPage(app.window, RED_PAGE);
    await expect
      .poll(async () => {
        const { r, g, b, a } = await treeRowBackground(app.window, RED_PAGE);
        return a > 0 && r > g + 40 && r > b + 40;
      })
      .toBe(true);
  });

  it("leaves a page that only inherits its colour untinted in the subtle look", async () => {
    expect((await treeRowBackground(app.window, INHERITING_PAGE)).a).toBe(0);
  });

  it("tints that page once Tinted Rows is picked", async () => {
    await pickSidebarColour(app.window, "Tinted Rows");
    await expect.poll(async () => (await treeRowBackground(app.window, INHERITING_PAGE)).a).toBeGreaterThan(0);
  });

  it("takes the tint off again on Subtle", async () => {
    await pickSidebarColour(app.window, "Subtle");
    await expect.poll(async () => (await treeRowBackground(app.window, INHERITING_PAGE)).a).toBe(0);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
