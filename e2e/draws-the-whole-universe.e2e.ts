// The graph of a whole universe, opened from the rail. Phase 24, step 3.
//
// **What a unit test cannot ask here is whether the two doors reach one
// place.** `graph-service.test.ts` proves that a set of pages given outright
// comes out as nodes and lines, and that a page with nothing pointing at it is
// still drawn. What it cannot prove is that the button in the rail — which
// knows nothing about any page — opens the same overlay the button beside a
// page's name does, that widening a page's graph all the way lands on the same
// picture, and that an arrangement made on one is not the arrangement of the
// other. Those are questions about two components and a store, so they are
// asked here.
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  closePageGraph,
  dragGraphNode,
  graphCount,
  graphHeading,
  graphIsOpen,
  clickGraphNode,
  graphNamesAreQuiet,
  graphNodeNames,
  graphWrittenNames,
  graphNodeCentre,
  graphNodePlacement,
  graphReachEnabled,
  openPage,
  openPageGraph,
  openWorldGraph,
  setGraphReach,
  waitForWorld,
  zoomGraphIn,
  zoomGraphOut,
} from "./harness/screen";

/** Long enough for the debounced write to reach the disk. */
const WRITTEN_MS = 1500;

/**
 * An ordinary page rather than a folder, and the same one the step 1 scenario
 * uses. A folder is drawn by FolderView, which has no title row and therefore
 * no button beside a name — see docs/plan.md Phase 24 for that gap.
 */
const PAGE = "Deep Nesting Test";

describe("the graph of a whole universe", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  /**
   * The overlay covers the window, so one scenario leaving it up fails every
   * scenario after it — on a click that never lands, thirty seconds at a time,
   * with nothing in the message about the test that actually broke. Closing it
   * here means a failure is reported once, by the assertion that found it.
   */
  afterEach(async () => {
    if (await graphIsOpen(app.window)) await closePageGraph(app.window);
  });

  it("opens from the rail with no page at its centre", async () => {
    await openWorldGraph(app.window);

    expect(await graphIsOpen(app.window)).toBe(true);
    // The heading is the thing that says which of the two graphs this is.
    expect(await graphHeading(app.window)).toContain("Everything in");
    // Hops are counted from a centre, and this graph has none.
    expect(await graphReachEnabled(app.window)).toBe(false);

    await closePageGraph(app.window);
  });

  // The reason the world graph is not a walk: a walk can only reach what
  // something already points at.
  it("draws more pages than any one page can reach", async () => {
    await openPage(app.window, PAGE);
    await openPageGraph(app.window);
    const around = (await graphNodeNames(app.window)).length;
    await closePageGraph(app.window);

    await openWorldGraph(app.window);
    const everywhere = (await graphNodeNames(app.window)).length;
    await closePageGraph(app.window);

    expect(everywhere).toBeGreaterThan(around);
  });

  // Both doors, one place. Widening a page's graph all the way should draw the
  // same set as opening the world's, which is what "one component fed a
  // different set of pages" has to mean on screen.
  it("is the same picture a page's graph widened all the way gives", async () => {
    await openWorldGraph(app.window);
    const fromRail = (await graphNodeNames(app.window)).sort();
    await closePageGraph(app.window);

    await openPage(app.window, PAGE);
    await openPageGraph(app.window);
    await setGraphReach(app.window, "everything");
    const fromPage = (await graphNodeNames(app.window)).sort();
    await closePageGraph(app.window);

    expect(fromPage).toEqual(fromRail);
  });

  /**
   * Past a certain distance a name is not text any more, it is texture — so the
   * labels are held back and the shape is what is left to read.
   *
   * **Reached by zooming rather than by opening**, which is worth knowing: the
   * fit never starts below that size, and this world is not big enough to make
   * it. The rule is about how far out she can go, not about how a world opens.
   */
  /**
   * **Asserted as a change under zooming, not as a state on opening.** How far
   * out a graph starts is whatever fits the window it opened into, so a version
   * of this that expected names to be written the moment it opened was really
   * asking how big the screen was — it held on this machine and would not have
   * on a narrower one. Zooming out then in is the rule itself, and it says the
   * same thing on any window.
   */
  it("stops writing the names once it is zoomed far enough out", async () => {
    await openWorldGraph(app.window);
    const drawn = (await graphNodeNames(app.window)).length;

    // Selected first, because that is the case the rule used to make an
    // exception for — and the exception drew an unreadable smear where the
    // name should have been.
    await clickGraphNode(app.window, (await graphNodeNames(app.window))[2]);
    await zoomGraphOut(app.window, 8);

    expect(await graphNamesAreQuiet(app.window)).toBe(true);
    expect((await graphWrittenNames(app.window)).length).toBe(0);
    // The pages are all still drawn; only their writing went quiet.
    expect((await graphNodeNames(app.window)).length).toBe(drawn);

    await zoomGraphIn(app.window, 12);

    expect(await graphNamesAreQuiet(app.window)).toBe(false);
    expect((await graphWrittenNames(app.window)).length).toBeGreaterThan(0);

    await closePageGraph(app.window);
  });

  it("still counts what it is drawing", async () => {
    await openWorldGraph(app.window);
    // Cased down because the bar uppercases it in CSS: the question is what
    // the graph says it is drawing, and pinning the casing would make a
    // restyle read as a broken feature.
    expect((await graphCount(app.window)).toLowerCase()).toMatch(/\d+ pages/);
    await closePageGraph(app.window);
  });

  /**
   * The arrangements are separate, which is the whole of why the pin key has a
   * prefix — see `graphPinKey`.
   *
   * Tidying the world's graph must not move anything on a page's, and the two
   * are stored under keys that cannot collide precisely so that it cannot.
   */
  it("keeps its own arrangement, apart from a page's", async () => {
    await openPage(app.window, PAGE);
    await openPageGraph(app.window);
    const pageBefore = await graphNodeCentre(app.window, PAGE);
    await closePageGraph(app.window);

    await openWorldGraph(app.window);
    const [first] = await graphNodeNames(app.window);
    await dragGraphNode(app.window, first, 140, 90);
    await app.window.waitForTimeout(WRITTEN_MS);
    await closePageGraph(app.window);

    await openPageGraph(app.window);
    const pageAfter = await graphNodeCentre(app.window, PAGE);
    await closePageGraph(app.window);

    // **Near enough rather than exactly, and the tolerance is the point.** The
    // graph scales to fit the window, and the size it fits to arrives from a
    // ResizeObserver a frame after the overlay mounts — so two openings can
    // settle a handful of pixels apart without anything having moved. What is
    // being asked here is whether an arrangement leaked between two graphs, and
    // the drag above was 140 pixels; a leak is not something that hides inside
    // this margin. The same reason graphNodesLeftToRight compares order instead
    // of coordinates.
    expect(Math.abs(pageAfter.x - pageBefore.x)).toBeLessThan(30);
    expect(Math.abs(pageAfter.y - pageBefore.y)).toBeLessThan(30);
  });

  /**
   * **The drag has to happen inside this scenario, or it proves nothing.**
   * Opening the same graph twice and finding a node in the same place is what a
   * deterministic layout does on its own — the assertion would hold with the
   * stored arrangement deleted entirely. So it is moved here, and the check is
   * that it came back *moved*: near where it was dropped, and nowhere near
   * where the simulation had put it.
   */
  it("comes back arranged the way it was left", async () => {
    await openWorldGraph(app.window);
    const [, second] = await graphNodeNames(app.window);
    const settled = await graphNodePlacement(app.window, second);
    await dragGraphNode(app.window, second, 180, 120);
    const dropped = await graphNodePlacement(app.window, second);
    await app.window.waitForTimeout(WRITTEN_MS);
    await closePageGraph(app.window);

    // The drag actually moved it, so the comparison below has something to say.
    expect(Math.hypot(dropped.x - settled.x, dropped.y - settled.y)).toBeGreaterThan(0.15);

    await openWorldGraph(app.window);
    const reopened = await graphNodePlacement(app.window, second);
    await closePageGraph(app.window);

    // **Measured against the rest of the graph rather than against the screen.**
    // See graphNodePlacement: the picture rescales when a node is moved outward,
    // so a comparison in pixels is partly a measurement of the window it was run
    // in — which is how the first version of this passed locally and failed on a
    // CI runner. The tolerance is loose because the other nodes settle a little
    // around a newly pinned one; it is still a fraction of the distance to where
    // the simulation had put this node, which is what the second line says.
    expect(Math.hypot(reopened.x - dropped.x, reopened.y - dropped.y)).toBeLessThan(0.08);
    expect(Math.hypot(reopened.x - settled.x, reopened.y - settled.y)).toBeGreaterThan(0.15);
  });
});
