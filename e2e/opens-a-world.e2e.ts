// The first thing the app has to do: start, and put someone's world in front of
// them. Everything else in this suite assumes this much works.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { pageTitle, projectName, treeRow, visibleTreeRows, waitForWorld } from "./harness/screen";

describe("opening a world", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("routes straight into the last world that was open", async () => {
    expect(await projectName(app.window)).toBe(app.world?.name);
  });

  it("draws the tree", async () => {
    const rows = await visibleTreeRows(app.window);
    expect(rows.length).toBeGreaterThan(5);
    // The generator's top-level sections, present in every world it writes
    // whatever the page count — so this is a fact about the app reading a world
    // off disk rather than about this particular run.
    expect(rows).toContain("Characters");
    expect(rows).toContain("Hard Cases");
  });

  it("opens a page when its row is clicked", async () => {
    await treeRow(app.window, "Characters").click();
    expect(await pageTitle(app.window)).toBe("Characters");
  });

  // **Deliberately last.** Everything above has now exercised startup, reading a
  // world off disk and opening a page, so this asks whether all of that happened
  // without the app complaining — not merely whether a window appeared.
  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
