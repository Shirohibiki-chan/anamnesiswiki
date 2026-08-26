// Getting around a world that is too big to see all of.
//
// **A bigger world than the other scenarios use**, because these are the
// questions where size is the thing under test: a row four hundred pages down
// does not exist in the page until something brings it there, and a path nine
// levels deep is long enough to have been a real problem on Windows.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  breadcrumb,
  goBack,
  goForward,
  openFirstMatch,
  openPage,
  pageTitle,
  visibleTreeRows,
  waitForWorld,
} from "./harness/screen";

describe("finding and opening pages", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp({ pages: 300 });
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("draws far fewer rows than the world holds", async () => {
    // Not a performance claim — a statement of what the rest of this file has
    // to work around. The tree is virtualised, so "click the row" is only ever
    // available for rows something has brought into view.
    expect(app.world?.pages).toBeGreaterThan(200);
    expect((await visibleTreeRows(app.window)).length).toBeLessThan(app.world!.pages);
  });

  it("reaches a page through the tree's search box", async () => {
    const opened = await openFirstMatch(app.window, "Deep Nesting Test");
    expect(opened).toBe("Deep Nesting Test");
    expect(await pageTitle(app.window)).toBe("Deep Nesting Test");
  });

  it("opens the page at the bottom of the nine-level chain", async () => {
    // The generator names each level after a randomly picked place, so the only
    // knowable part is the level number. Opening it at all is the assertion:
    // this page's file sits behind a path long enough that the app failing to
    // resolve it would be a real bug on a real machine, not a contrived one.
    const opened = await openFirstMatch(app.window, "Level 9");
    expect(opened).toContain("Level 9");
    expect(await pageTitle(app.window)).toBe(opened);
  });

  it("shows the trail back up from a deep page", async () => {
    const trail = await breadcrumb(app.window);
    // The current page is its own last crumb, and the trail above it is
    // collapsed behind a "more" link once it gets long — so the count is not
    // the depth and must not be asserted as one.
    expect(trail.at(-1)).toContain("Level 9");
    expect(trail.length).toBeGreaterThan(1);
  });

  it("goes back to the page before, and forward again", async () => {
    await openPage(app.window, "Deep Nesting Test");
    await openPage(app.window, "Hard Cases");
    expect(await pageTitle(app.window)).toBe("Hard Cases");

    await goBack(app.window);
    expect(await pageTitle(app.window)).toBe("Deep Nesting Test");

    await goForward(app.window);
    expect(await pageTitle(app.window)).toBe("Hard Cases");
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
