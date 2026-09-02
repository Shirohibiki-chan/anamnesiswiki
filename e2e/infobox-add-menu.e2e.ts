// What the infobox's own Add Block menu offers. Phase 19.5.
//
// **Its own scenario rather than a case inside `groups-blocks-in-an-infobox`,
// and that is a lesson rather than a preference.** It was written there first;
// filling a frame with every field the page has left the infobox tall enough
// that the *next* test's hover-then-click on BlockNote's block menu became
// unstable, and CI failed on a test this change had nothing to do with. A
// scenario that changes the shape of the page is a scenario that should not
// share an app with one that hovers.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBlockToInfobox,
  infoboxAddHeadings,
  infoboxCount,
  openPage,
  propertiesOfferedByInfobox,
  typeAtLineStartInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";

describe("the infobox's Add Block menu", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await typeAtLineStartInEditor(app.window, "/infobox");
    await app.window.getByText("A framed group of blocks, with its own Add Block").click();
    await app.window.waitForTimeout(800);
    expect(await infoboxCount(app.window)).toBe(1);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("offers the page's own fields, and drops the heading once none are left", async () => {
    // **A heading over an empty space reads as a list that failed to load.**
    // The frame's menu has no New property button — that form belongs to the
    // panel — so on a page whose fields are all already shown, Properties was a
    // word at the bottom of the menu with nothing beneath it.
    const offered = await propertiesOfferedByInfobox(app.window);
    expect(offered.length).toBeGreaterThan(0);
    expect(await infoboxAddHeadings(app.window)).toContain("Properties");

    for (const field of offered) {
      await addBlockToInfobox(app.window, field);
      await app.window.waitForTimeout(600);
    }

    expect(await propertiesOfferedByInfobox(app.window)).toEqual([]);
    expect(await infoboxAddHeadings(app.window)).not.toContain("Properties");
    // The sections that are always there are still there — the menu lost a
    // heading, not its contents.
    expect(await infoboxAddHeadings(app.window)).toContain("Blocks");
  });
});
