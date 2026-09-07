// One page's relationships, opened over the page. Phase 24, step 1.
//
// **What a unit test structurally cannot answer.** graph-service.test.ts
// already says which pages and lines the model holds, and graph-layout.test.ts
// already says the positions repeat — both are assertions about functions. What
// is left is whether any of it reaches the screen: whether the button is there,
// whether the page you were reading is the one in the middle, whether a line
// she wrote is drawn differently from a line that is only where she filed the
// page, and whether clicking a node opens a preview rather than throwing the
// graph away. Every one of those is a question about the window.
//
// **Deep Nesting Test is the page, and not by accident.** The generator fills
// most of the world with mentions and reference fields chosen at random, so no
// particular character reliably has connections. That chain is built
// deterministically: it sits inside a section and holds a level below it, which
// is two tree connections that are always there.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  clickGraphNode,
  closePageGraph,
  dragGraphNode,
  graphEdgeCounts,
  graphFocusName,
  graphIsOpen,
  graphNodeCentre,
  graphNodeNames,
  graphPreviewName,
  openGraphPreviewPage,
  openPage,
  openPageGraph,
  pageTitle,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Deep Nesting Test";

describe("a page's connections", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("opens from the page and puts that page in the middle", async () => {
    await openPage(app.window, PAGE);
    expect(await graphIsOpen(app.window)).toBe(false);

    await openPageGraph(app.window);

    expect(await graphIsOpen(app.window)).toBe(true);
    expect(await graphFocusName(app.window)).toBe(PAGE);
  });

  it("draws the pages it is connected to", async () => {
    const names = await graphNodeNames(app.window);
    // The chain's own page, the section holding it and the level under it —
    // more than that is fine and depends on what the generator wrote, fewer
    // means the walk did not reach in both directions.
    expect(names).toContain(PAGE);
    expect(names.length).toBeGreaterThanOrEqual(3);
  });

  // Her call 2026-09-07: the tree counts as a connection, drawn differently
  // from something she wrote. This page is nested, so at least two of its lines
  // have to be the quiet kind.
  it("tells a line she wrote from a line that is only the tree", async () => {
    const counts = await graphEdgeCounts(app.window);
    expect(counts.tree).toBeGreaterThanOrEqual(2);
  });

  it("closes on Escape", async () => {
    await closePageGraph(app.window);
    expect(await graphIsOpen(app.window)).toBe(false);
    expect(await pageTitle(app.window)).toBe(PAGE);
  });

  // The commitment the plan makes in as many words: clicking a node must not
  // throw the graph away.
  it("shows a card about a page clicked on, without leaving the graph", async () => {
    await openPageGraph(app.window);
    const neighbour = (await graphNodeNames(app.window)).find((name) => name !== PAGE);
    expect(neighbour).toBeDefined();

    await clickGraphNode(app.window, neighbour!);

    expect(await graphPreviewName(app.window)).toBe(neighbour);
    expect(await graphIsOpen(app.window)).toBe(true);
  });

  it("goes to that page only when asked a second time", async () => {
    const going = await graphPreviewName(app.window);

    await openGraphPreviewPage(app.window);

    expect(await graphIsOpen(app.window)).toBe(false);
    expect(await pageTitle(app.window)).toBe(going);
  });

  // A node is both a thing to click and a thing to move, and the two must not
  // be the same gesture — see GRAPH_DRAG_THRESHOLD.
  it("moves a node when it is dragged, and opens nothing", async () => {
    await openPage(app.window, PAGE);
    await openPageGraph(app.window);
    const before = await graphNodeCentre(app.window, PAGE);

    await dragGraphNode(app.window, PAGE, 90, 60);

    const after = await graphNodeCentre(app.window, PAGE);
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(40);
    expect(await graphPreviewName(app.window)).toBeNull();
    await closePageGraph(app.window);
  });
});
