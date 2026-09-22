// Known Bug, found 2026-09-09 placing the example world's canvas: the view
// fitted itself to the *scenes*, so a note dropped out past the last scene,
// or a band drawn round empty space, was on the canvas and off the screen
// every time the page was opened, until somebody dragged the view. The fit
// now covers the notes and the bands too.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addStorylineNote,
  addStorylineScene,
  clearTreeSearch,
  dragStorylineNote,
  makeStoryline,
  storylineNoteOnScreen,
  treeRow,
  waitForWorld,
} from "./harness/screen";

describe("a note put out past the scenes", () => {
  let app: RunningApp;
  const STORYLINE = "The Long Way Round";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type(STORYLINE);
    await app.window.keyboard.press("Enter");
    await makeStoryline(app.window);
    await addStorylineScene(app.window);
    await addStorylineNote(app.window, "Nobody comes this way twice.");
  });

  afterAll(async () => {
    await app?.close();
  });

  it("is still on the screen when the canvas is opened again", async () => {
    // Well past the scene, most of the way to the stage's edge.
    await dragStorylineNote(app.window, 0, 420, 160);
    await app.window.waitForTimeout(1500);
    // Away and back is a fresh fit, the way opening the page later is.
    await treeRow(app.window, "Greyharbour").first().click();
    await treeRow(app.window, STORYLINE).first().click();
    await expect.poll(() => storylineNoteOnScreen(app.window, 0), { timeout: 10_000 }).toBe(true);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
