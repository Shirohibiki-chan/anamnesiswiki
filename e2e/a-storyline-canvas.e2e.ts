// The storyline canvas: scenes in narrative order, where she put them.
// Phase 25, step 1.
//
// **What a unit test cannot ask here is whether any of it survives the app.**
// `storyline-service.test.ts` proves the rules — a scene goes where it was
// dropped, a line that would loop is refused, taking a scene off the canvas
// leaves its page alone. What it cannot prove is that adding a scene made a
// real page in the tree, that a drag reached `_storyline.json` on disk, or that
// the arrangement is still there after a restart. Those are questions about a
// component, a store and the filesystem together, so they are asked here.
//
// The reload is the point of most of this file. A canvas that only exists in
// memory looks identical to one that saved, right up until the morning after.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addStorylineScene,
  clearTreeSearch,
  dragStorylineScene,
  joinStorylineScenes,
  makeStoryline,
  openSelectedScene,
  pageTitle,
  searchTree,
  selectStorylineScene,
  storylineEdgeCount,
  storylineIsShown,
  storylineRefusal,
  storylineSceneOrder,
  storylineScenesLeftToRight,
  takeSceneOffCanvas,
  treeRow,
  waitForWorld,
} from "./harness/screen";

/** Long enough for the queued write to reach the disk. */
const WRITTEN_MS = 1500;

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

/**
 * Makes a page and turns it into a storyline, leaving it open.
 *
 * Through the keyboard and the template grid rather than by writing to the
 * store, because "is Storyline actually offered as a kind of page" is one of
 * the things this file is here to answer.
 */
async function newStoryline(app: RunningApp, name: string): Promise<void> {
  await app.window.keyboard.press("Control+n");
  // The new page opens with its name selected for typing — that is what the
  // rename request does — so the name goes in without reaching for the title.
  await app.window.keyboard.type(name);
  await app.window.keyboard.press("Enter");
  await makeStoryline(app.window);
}

describe("a storyline's canvas", () => {
  let app: RunningApp;
  const STORYLINE = "Valera's Fall";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await newStoryline(app, STORYLINE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("draws a canvas in the page rather than over it", async () => {
    expect(await storylineIsShown(app.window)).toBe(true);
    expect(await pageTitle(app.window)).toBe(STORYLINE);
    // Nothing on it yet, which is the state the empty message describes.
    expect(await storylineScenesLeftToRight(app.window)).toEqual([]);
  });

  it("makes a real page in the tree for every scene added", async () => {
    await addStorylineScene(app.window);
    await addStorylineScene(app.window);
    await addStorylineScene(app.window);

    expect((await storylineScenesLeftToRight(app.window)).length).toBe(3);

    // The proof that a scene is a page and not a card: it is findable in the
    // tree, by the name the canvas shows.
    await searchTree(app.window, "Untitled");
    expect(await treeRow(app.window, "Untitled").count()).toBeGreaterThanOrEqual(3);
    await clearTreeSearch(app.window);
  });

  it("joins two scenes, and says why it will not join them twice", async () => {
    await joinStorylineScenes(app.window, 0, 1);
    expect(await storylineEdgeCount(app.window)).toBe(1);

    // The same pair again, the other way round. A second line between two
    // scenes is the smallest possible loop, and the canvas has to say so
    // rather than quietly doing nothing.
    await joinStorylineScenes(app.window, 1, 0);
    expect(await storylineEdgeCount(app.window)).toBe(1);
    expect(await storylineRefusal(app.window)).toContain("already joined");
  });

  it("refuses a line that would send the story back on itself", async () => {
    await joinStorylineScenes(app.window, 1, 2);
    expect(await storylineEdgeCount(app.window)).toBe(2);

    // Third back to first, closing the loop the long way round.
    await joinStorylineScenes(app.window, 2, 0);
    expect(await storylineEdgeCount(app.window)).toBe(2);
    expect(await storylineRefusal(app.window)).toContain("loop");
  });

  it("keeps where a scene was dragged, across a restart", async () => {
    // By id rather than by name: every scene here is called "Untitled", so a
    // list of names cannot tell a canvas that moved from one that did not.
    const before = await storylineSceneOrder(app.window);
    // The leftmost scene, pushed well past the rightmost one.
    await dragStorylineScene(app.window, 0, 600, 0);
    const after = await storylineSceneOrder(app.window);
    expect(after).not.toEqual(before);
    expect(after[after.length - 1]).toBe(before[0]);

    await app.window.waitForTimeout(WRITTEN_MS);
    await reload(app);
    await searchTree(app.window, STORYLINE);
    await treeRow(app.window, STORYLINE).first().click();
    await clearTreeSearch(app.window);

    expect(await storylineIsShown(app.window)).toBe(true);
    expect(await storylineSceneOrder(app.window)).toEqual(after);
    // And the lines came back with the positions — they are in the same file.
    expect(await storylineEdgeCount(app.window)).toBe(2);
  });

  it("opens the page behind a scene", async () => {
    await selectStorylineScene(app.window, 0);
    await openSelectedScene(app.window);
    expect(await pageTitle(app.window)).toBe("Untitled");
  });

  it("takes a scene off the canvas without deleting its page", async () => {
    await searchTree(app.window, STORYLINE);
    await treeRow(app.window, STORYLINE).first().click();
    await clearTreeSearch(app.window);

    const before = await storylineScenesLeftToRight(app.window);
    await selectStorylineScene(app.window, 0);
    await takeSceneOffCanvas(app.window);
    expect((await storylineScenesLeftToRight(app.window)).length).toBe(before.length - 1);

    // The page it stood for is still in the tree. This is the whole difference
    // between a canvas and a container, and it is the one a mis-worded button
    // would quietly break.
    await searchTree(app.window, "Untitled");
    expect(await treeRow(app.window, "Untitled").count()).toBeGreaterThanOrEqual(3);
    await clearTreeSearch(app.window);
  });
});
