// The two side panels, after they have been dragged as far as they go.
//
// **This is a regression test before it is anything else.** The first cut of
// the centre column's minimum let the grid shrink the panels while the drag
// handles stayed at the width that had been *stored* — so on a window too
// narrow for both, the handles ended up floating in the middle of the page,
// and dragging one appeared to do nothing at all. Reported from use within
// minutes of the build being run.
//
// What it checks is the invariant that was broken: a handle is on the edge of
// the panel it resizes, always, whatever the window has had to do to the
// widths.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, MIN_WINDOW, resizeWindow, type RunningApp } from "./harness/launch-app";
import { openPage, waitForWorld } from "./harness/screen";

/** How far a handle may sit from its panel's edge: its own width, centred. */
const ON_THE_EDGE = 6;

describe("dragging the side panels", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, "Deep Nesting Test");
  });

  afterAll(async () => {
    await app?.close();
  });

  async function drag(handle: string, toX: number): Promise<void> {
    const box = await app.window.locator(handle).boundingBox();
    if (!box) throw new Error(`no ${handle} to drag`);
    await app.window.mouse.move(box.x + box.width / 2, box.y + 200);
    await app.window.mouse.down();
    await app.window.mouse.move(toX, box.y + 200, { steps: 14 });
    await app.window.mouse.up();
    await app.window.waitForTimeout(250);
  }

  async function edges() {
    return app.window.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
      const round = (n: number | undefined) => (n === undefined ? -1 : Math.round(n));
      return {
        centre: round(box(".app-layout-center")?.width),
        treeEdge: round(box(".app-layout-tree")?.right),
        treeHandle: round(box(".resize-handle-tree")?.left),
        propertiesEdge: round(box(".app-layout-properties")?.left),
        propertiesHandle: round(box(".resize-handle-properties")?.left),
      };
    });
  }

  it("keeps the page readable when both panels are pulled right out", async () => {
    await resizeWindow(app, MIN_WINDOW.width, 640);
    await app.window.waitForTimeout(400);
    await drag(".resize-handle-tree", 880);
    await drag(".resize-handle-properties", 20);

    const state = await edges();
    // 420 is CENTER_MIN_WIDTH. The page used to be zero here.
    expect(state.centre).toBeGreaterThanOrEqual(420);
    expect(Math.abs(state.treeHandle - state.treeEdge)).toBeLessThan(ON_THE_EDGE);
    expect(Math.abs(state.propertiesHandle - state.propertiesEdge)).toBeLessThan(ON_THE_EDGE);
  });

  it("still moves both ways once there is room again", async () => {
    await resizeWindow(app, 1280, 800);
    await app.window.waitForTimeout(400);

    await drag(".resize-handle-tree", 1200);
    const out = await edges();
    expect(out.centre).toBeGreaterThanOrEqual(420);
    expect(Math.abs(out.treeHandle - out.treeEdge)).toBeLessThan(ON_THE_EDGE);

    await drag(".resize-handle-tree", 300);
    const back = await edges();
    expect(back.treeEdge).toBeLessThan(out.treeEdge - 40);
    expect(Math.abs(back.treeHandle - back.treeEdge)).toBeLessThan(ON_THE_EDGE);

    await drag(".resize-handle-properties", 700);
    const properties = await edges();
    expect(Math.abs(properties.propertiesHandle - properties.propertiesEdge)).toBeLessThan(ON_THE_EDGE);
  });

  // Asked for in these words: dragged all the way out, neither panel should be
  // longer than the other. It used to depend on which one was dragged first —
  // that one took everything and the second would not move at all.
  it("comes to rest with both panels the same width when both are dragged out", async () => {
    await resizeWindow(app, 1258, 800);
    await app.window.waitForTimeout(400);

    await drag(".resize-handle-tree", 1200);
    await drag(".resize-handle-properties", 20);
    const both = await app.window.evaluate(() => {
      const width = (selector: string) => Math.round(document.querySelector(selector)?.getBoundingClientRect().width ?? -1);
      return {
        tree: width(".app-layout-tree"),
        centre: width(".app-layout-center"),
        properties: width(".app-layout-properties"),
      };
    });

    expect(Math.abs(both.tree - both.properties)).toBeLessThanOrEqual(2);
    expect(both.centre).toBeGreaterThanOrEqual(420);

    const state = await edges();
    expect(Math.abs(state.treeHandle - state.treeEdge)).toBeLessThan(ON_THE_EDGE);
    expect(Math.abs(state.propertiesHandle - state.propertiesEdge)).toBeLessThan(ON_THE_EDGE);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
