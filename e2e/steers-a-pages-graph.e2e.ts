// The controls above a page's graph. Phase 24, step 2.
//
// **What the unit tests structurally cannot answer.** graph-service.test.ts
// already says the walk stops at a filter and graph-layout.test.ts already says
// a pinned node lands where it was pinned — both assertions about functions.
// What is left is whether any of it survives the round trip: whether the
// controls are wired to the walk at all, and whether an arrangement written to
// `project.json` is still there after the window has been reloaded. The second
// is the promise of the step, and only a real app can be asked.
//
// **Deep Nesting Test again**, for the reason the step-1 scenario gives: the
// generator fills most of the world with mentions chosen at random, and that
// chain is the one page whose connections are built deterministically.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addGraphFilter,
  canPutGraphBack,
  clearTreeSearch,
  closeGraphMenu,
  closePageGraph,
  dragGraphNode,
  graphCount,
  graphEdgeLabels,
  graphNodesLeftToRight,
  graphNodeNames,
  openGraphFilters,
  openPage,
  openPageGraph,
  putGraphBack,
  setGraphLabels,
  setGraphReach,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Deep Nesting Test";

/** Long enough for the debounced write of `project.json` to reach the disk. */
const WRITTEN_MS = 1500;

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

async function openGraph(app: RunningApp): Promise<void> {
  await clearTreeSearch(app.window);
  await openPage(app.window, PAGE);
  await openPageGraph(app.window);
}

describe("steering a page's graph", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openGraph(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("reaches further when asked to", async () => {
    const near = await graphNodeNames(app.window);

    await setGraphReach(app.window, 2);

    expect((await graphNodeNames(app.window)).length).toBeGreaterThan(near.length);
    await setGraphReach(app.window, 1);
    expect(await graphNodeNames(app.window)).toEqual(near);
  });

  // Phase 23's filter model pointed at the graph, which is the plan's promise
  // rather than a second language for the same job.
  it("draws only what a filter leaves standing, and says how many that is", async () => {
    const before = await graphNodeNames(app.window);

    await openGraphFilters(app.window);
    await addGraphFilter(app.window, "Template", "is", "Location");
    await closeGraphMenu(app.window);

    const after = await graphNodeNames(app.window);
    expect(after.length).toBeLessThan(before.length);
    // Both numbers, because a filter that hides everything and a page connected
    // to nothing look identical otherwise.
    // Compared without case: the bar is uppercased by CSS, and pinning that
    // here would make a restyle look like a broken feature.
    expect((await graphCount(app.window)).toLowerCase()).toBe(`${after.length} of ${before.length} pages`);
  });

  it("keeps the page whose graph it is, even when the filter excludes it", async () => {
    expect(await graphNodeNames(app.window)).toContain(PAGE);
  });

  it("puts every page back when the filter is removed", async () => {
    await openGraphFilters(app.window);
    await app.window.locator(".graph-menu .ui-inline-remove").first().click();
    await closeGraphMenu(app.window);
    expect(await graphCount(app.window)).not.toContain(" of ");
  });

  // Both label modes ship because she asked for both — see docs/plan.md.
  it("writes the reason on a line only when asked to", async () => {
    await setGraphLabels(app.window, "all");
    const named = await graphEdgeLabels(app.window);
    expect(named.length).toBeGreaterThan(0);

    await setGraphLabels(app.window, "selected");
    // Nothing is hovered or selected, so the quiet mode has nothing to write.
    expect(await graphEdgeLabels(app.window)).toEqual([]);
  });

  it("offers nothing to put back until something has been moved", async () => {
    expect(await canPutGraphBack(app.window)).toBe(false);
  });

  it("remembers where a page was dragged, across a reload", async () => {
    const order = await graphNodesLeftToRight(app.window);
    const neighbour = order.find((name) => name !== PAGE)!;
    expect(order[order.length - 1]).not.toBe(neighbour);

    // Far enough that no re-fit could account for it, and checked by which
    // page is furthest right rather than by pixels — see graphNodesLeftToRight.
    await dragGraphNode(app.window, neighbour, 600, 0);
    expect((await graphNodesLeftToRight(app.window)).at(-1)).toBe(neighbour);
    expect(await canPutGraphBack(app.window)).toBe(true);

    await app.window.waitForTimeout(WRITTEN_MS);
    await closePageGraph(app.window);
    await reload(app);
    await openGraph(app);

    // The promise of the step, and the only assertion here a unit test could
    // not have made.
    expect((await graphNodesLeftToRight(app.window)).at(-1)).toBe(neighbour);
    expect(await canPutGraphBack(app.window)).toBe(true);
  });

  it("lays the graph out again when told to put it back", async () => {
    await putGraphBack(app.window);
    expect(await canPutGraphBack(app.window)).toBe(false);
  });

  // The one that was broken until 2026-09-07: the arrangement went off the
  // screen but stayed on the disk, so it came back on the next reload. See the
  // note on setGraphPins about the debounce it now shares.
  it("stays put back after a reload", async () => {
    await app.window.waitForTimeout(WRITTEN_MS);
    await closePageGraph(app.window);
    await reload(app);
    await openGraph(app);

    expect(await canPutGraphBack(app.window)).toBe(false);
  });
});
