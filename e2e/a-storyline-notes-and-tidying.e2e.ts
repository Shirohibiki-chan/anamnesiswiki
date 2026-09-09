// Notes, labelled stretches, and lining the sequence up. Phase 25, step 2.
//
// **What a unit test cannot ask here is whether an annotation is genuinely not
// part of the story.** `storyline-service.test.ts` proves the rules — a note
// has no edges, a band carries the scenes standing on it, tidying leaves both
// alone — but "not part of the story" is a claim about what the canvas *shows*
// and what it saved, and that is three files working together.
//
// The reload is the point of half of this file. A note that only exists in
// memory looks identical to one that saved, right up until the morning after.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addStorylineBand,
  addStorylineNote,
  addStorylineScene,
  canTidyStoryline,
  clearTreeSearch,
  dragStorylineBand,
  dragStorylineScene,
  followStorylineNoteLink,
  joinStorylineScenes,
  makeStoryline,
  pageTitle,
  searchTree,
  storylineBandLabels,
  storylineBrokenLinks,
  storylineEdgeCount,
  storylineIsShown,
  storylineNoteLinks,
  storylineNotePlacements,
  storylineNoteTexts,
  storylineSceneOrder,
  storylineScenePlacements,
  storylineScenesLeftToRight,
  tidyStoryline,
  treeRow,
  waitForWorld,
} from "./harness/screen";

/** Long enough for the queued write to reach the disk. */
const WRITTEN_MS = 1500;

/**
 * A page the generated world really has, so a wikilink in a note has something
 * to resolve to. Fixed by the world generator rather than read off the tree —
 * the tree is virtualised, so what is in the DOM is not what is in the world.
 */
const REAL_PAGE = "Greyharbour";

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

async function openStoryline(app: RunningApp, name: string): Promise<void> {
  await searchTree(app.window, name);
  await treeRow(app.window, name).first().click();
  await clearTreeSearch(app.window);
}

describe("a storyline's notes and labels", () => {
  let app: RunningApp;
  const STORYLINE = "The Long Road";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type(STORYLINE);
    await app.window.keyboard.press("Enter");
    await makeStoryline(app.window);
    await addStorylineScene(app.window);
    await addStorylineScene(app.window);
    await addStorylineScene(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("writes a note with a link in it, and resolves the link", async () => {
    await addStorylineNote(app.window, `thread stops — continued in [[${REAL_PAGE}]]`);

    expect(await storylineNoteTexts(app.window)).toHaveLength(1);
    expect(await storylineNoteLinks(app.window)).toEqual([REAL_PAGE]);
    // The point of the whole feature: a dead end becomes an exit.
    expect((await storylineNoteTexts(app.window))[0]).toContain("thread stops");
  });

  it("marks a name nothing answers to rather than drawing it as prose", async () => {
    await addStorylineNote(app.window, "see [[No Such Page At All]] for the rest");
    expect(await storylineBrokenLinks(app.window)).toEqual(["No Such Page At All"]);
  });

  it("is never counted among the scenes", async () => {
    // Two notes are on the canvas by now and the count still says three.
    expect(await storylineScenesLeftToRight(app.window)).toHaveLength(3);
  });

  it("labels a stretch of the storyline", async () => {
    await addStorylineBand(app.window, "Act 2");
    expect(await storylineBandLabels(app.window)).toEqual(["Act 2"]);
  });

  it("keeps the notes and the label across a restart", async () => {
    await app.window.waitForTimeout(WRITTEN_MS);
    await reload(app);
    await openStoryline(app, STORYLINE);

    expect(await storylineIsShown(app.window)).toBe(true);
    expect(await storylineNoteTexts(app.window)).toHaveLength(2);
    expect(await storylineNoteLinks(app.window)).toEqual([REAL_PAGE]);
    expect(await storylineBrokenLinks(app.window)).toEqual(["No Such Page At All"]);
    expect(await storylineBandLabels(app.window)).toEqual(["Act 2"]);
  });

  it("follows a note's link to the page it names", async () => {
    await followStorylineNoteLink(app.window, REAL_PAGE);
    expect(await pageTitle(app.window)).toBe(REAL_PAGE);
  });

  /**
   * **Measured against the notes, not against the screen**, and that is the
   * whole subtlety of this one. A band carries every scene standing on it, so
   * the picture *translates* — and the canvas fits itself to the scenes, so it
   * re-centres and every scene lands back on the same screen pixel it was on.
   * The first version of this scenario compared scene positions and could never
   * have failed, whatever the code did.
   *
   * Notes are the fixed point: they never move with a band, and they are
   * deliberately not part of what the canvas fits to. So if the scenes really
   * moved, the gap between them and the notes changed.
   */
  it("carries the scenes standing on a label when it is dragged", async () => {
    await openStoryline(app, STORYLINE);
    const scenesBefore = await storylineScenePlacements(app.window);
    const notesBefore = await storylineNotePlacements(app.window);
    expect(notesBefore.length).toBeGreaterThan(0);

    await dragStorylineBand(app.window, 0, 0, -80);

    const scenesAfter = await storylineScenePlacements(app.window);
    const notesAfter = await storylineNotePlacements(app.window);

    // Every scene shifted by the same amount relative to the notes — a band
    // that carried its scenes unevenly would be worse than one carrying none.
    const ids = Object.keys(scenesBefore);
    const gapsBefore = ids.map((id) => scenesBefore[id].y - notesBefore[0].y);
    const gapsAfter = ids.map((id) => scenesAfter[id].y - notesAfter[0].y);
    const shifts = ids.map((_, index) => gapsAfter[index] - gapsBefore[index]);
    expect(shifts).toHaveLength(3);
    expect(new Set(shifts).size).toBe(1);
    expect(shifts[0]).not.toBe(0);
  });
});

describe("tidying a storyline up", () => {
  let app: RunningApp;
  const STORYLINE = "Tidy Test";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type(STORYLINE);
    await app.window.keyboard.press("Enter");
    await makeStoryline(app.window);
    for (let index = 0; index < 4; index += 1) await addStorylineScene(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("puts a fork's two threads in one column, level with each other", async () => {
    await joinStorylineScenes(app.window, 0, 1);
    await joinStorylineScenes(app.window, 1, 2);
    await joinStorylineScenes(app.window, 1, 3);
    expect(await storylineEdgeCount(app.window)).toBe(3);

    // Shove one out of line first, so the tidy has something to undo.
    await dragStorylineScene(app.window, 2, 60, 220);
    expect(await canTidyStoryline(app.window)).toBe(true);

    await tidyStoryline(app.window);
    const placed = Object.values(await storylineScenePlacements(app.window));
    const columns = [...new Set(placed.map((at) => at.x))].sort((a, b) => a - b);
    // Three columns: the first scene, the one it leads to, and the fork's pair.
    expect(columns).toHaveLength(3);
    const lastColumn = placed.filter((at) => at.x === columns[2]);
    expect(lastColumn).toHaveLength(2);
    expect(lastColumn[0].y).not.toBe(lastColumn[1].y);
  });

  it("goes quiet once there is nothing left to line up", async () => {
    expect(await canTidyStoryline(app.window)).toBe(false);
  });

  it("puts her arrangement back with Ctrl+Z", async () => {
    const tidied = await storylineScenePlacements(app.window);
    // **Ctrl+Shift+Z, not Ctrl+Z.** The app's undo deliberately does not sit on
    // Ctrl+Z, which belongs to whatever is being written — her call 2026-08-27.
    // This scenario pressed the wrong one first and passed silently against a
    // tooltip that advertised the wrong key.
    await app.window.keyboard.press("Control+Shift+z");
    await app.window.waitForTimeout(300);
    const restored = await storylineScenePlacements(app.window);
    expect(restored).not.toEqual(tidied);
    // And the button has something to do again.
    expect(await canTidyStoryline(app.window)).toBe(true);
    // And the button has something to do again.
    expect(await canTidyStoryline(app.window)).toBe(true);
  });

  it("keeps the tidied arrangement across a restart", async () => {
    await tidyStoryline(app.window);
    const tidied = await storylineSceneOrder(app.window);
    await app.window.waitForTimeout(WRITTEN_MS);
    await reload(app);
    await openStoryline(app, STORYLINE);
    expect(await storylineSceneOrder(app.window)).toEqual(tidied);
    expect(await canTidyStoryline(app.window)).toBe(false);
  });
});
