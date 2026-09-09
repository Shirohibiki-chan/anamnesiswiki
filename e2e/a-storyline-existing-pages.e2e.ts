// Putting a page that already exists on a storyline, and showing who is in a
// scene. Phase 25, step 3.
//
// **What a unit test cannot ask here is whether a scene is genuinely the same
// page.** `storyline-service.test.ts` proves the rules — the universe check,
// what the picker offers, what a scene's cast is — but "the same page, not a
// copy of it" is a claim about the tree, the canvas file and the reference
// index at once, and only the running app holds all three.
//
// The other half is the connection going *back*: a page that is a scene on a
// storyline should say so where its connections are counted, which is what
// makes a storyline part of the app rather than a picture beside it.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addStorylineScene,
  clearTreeSearch,
  makeStoryline,
  openStorylineCastMember,
  openStorylinePicker,
  pageTitle,
  pickStorylinePage,
  searchStorylinePicker,
  searchTree,
  storylinePickerEmptyMessage,
  storylineSceneCastCount,
  storylineScenesLeftToRight,
  storylineSelectionCast,
  selectStorylineScene,
  treeRow,
  waitForWorld,
} from "./harness/screen";

/** Long enough for the queued write to reach the disk. */
const WRITTEN_MS = 1500;

/**
 * Pages the generated world really has. Fixed by the world generator rather
 * than read off the tree, which is virtualised — what is in the DOM is not
 * what is in the world.
 */
const EXISTING = "Greyharbour";
const ANOTHER = "Longford";

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

async function openPageNamed(app: RunningApp, name: string): Promise<void> {
  await searchTree(app.window, name);
  await treeRow(app.window, name).first().click();
  await clearTreeSearch(app.window);
}

describe("putting a page that already exists on a storyline", () => {
  let app: RunningApp;
  const STORYLINE = "The Harbour Road";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type(STORYLINE);
    await app.window.keyboard.press("Enter");
    await makeStoryline(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("offers nothing until something is typed", async () => {
    await openStorylinePicker(app.window);
    expect(await searchStorylinePicker(app.window, "")).toEqual([]);
  });

  /**
   * **One scenario, because the claim is about what happens between the two
   * picks.** Split in half it read better and tested less: the tree search in
   * between left focus in the sidebar, so the second name was typed there and
   * the assertion failed against an app that was behaving correctly.
   */
  it("puts two pages on without reopening the box, and makes neither of them", async () => {
    expect(await searchStorylinePicker(app.window, EXISTING)).toContain(EXISTING);
    await pickStorylinePage(app.window);
    expect(await storylineScenesLeftToRight(app.window)).toEqual([EXISTING]);

    // The box empties itself and keeps focus, so the next name is just typed.
    expect(await searchStorylinePicker(app.window, ANOTHER)).toContain(ANOTHER);
    await pickStorylinePage(app.window);
    expect(await storylineScenesLeftToRight(app.window)).toEqual([EXISTING, ANOTHER]);

    // The proof that nothing was duplicated: exactly one page by each name is
    // in the tree. A canvas that copied the page instead of pointing at it
    // would look identical on screen and leave her world with two Greyharbours.
    for (const name of [EXISTING, ANOTHER]) {
      await searchTree(app.window, name);
      expect(await treeRow(app.window, name).count()).toBe(1);
      await clearTreeSearch(app.window);
    }
  });

  it("stops offering a page that is already on the canvas", async () => {
    // The tree search above took the focus, so the box has to be given it back
    // before anything is typed — a scenario's own housekeeping, not the app's.
    await app.window.locator(".storyline-picker input").click();
    const offered = await searchStorylinePicker(app.window, EXISTING);
    expect(offered).not.toContain(EXISTING);
    expect(await storylinePickerEmptyMessage(app.window)).toContain("already here");
  });

  it("closes when the canvas is clicked, rather than only on Escape", async () => {
    await app.window.locator(".storyline-stage").click({ position: { x: 40, y: 300 } });
    await app.window.waitForTimeout(200);
    // Reopening has to work: the picker's only exit used to be Escape while
    // the box had focus, so the next click on the button closed it instead.
    await openStorylinePicker(app.window);
    expect(await searchStorylinePicker(app.window, ANOTHER)).toEqual([]);
    await app.window.keyboard.press("Escape");
  });

  it("keeps the page on the canvas across a restart", async () => {
    await app.window.waitForTimeout(WRITTEN_MS);
    await reload(app);
    await openPageNamed(app, STORYLINE);
    expect(await storylineScenesLeftToRight(app.window)).toEqual([EXISTING, ANOTHER]);
  });

  /**
   * The half that makes a storyline part of the app rather than a picture
   * beside it: the connection reads from the other end too.
   */
  it("shows up as a connection on the page it put on", async () => {
    await openPageNamed(app, EXISTING);
    // The graph is the surface that draws every connection the index knows,
    // and it is reached from the page's own title row.
    await app.window.locator(".page-title-graph-button").first().click();
    await app.window.locator(".page-graph").waitFor({ state: "visible", timeout: 10_000 });
    const drawn = await app.window.locator(".page-graph-node").evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("title") ?? ""),
    );
    expect(drawn).toContain(STORYLINE);
    await app.window.keyboard.press("Escape");
  });
});

describe("who is in a scene", () => {
  let app: RunningApp;
  const STORYLINE = "Who Is Here";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type(STORYLINE);
    await app.window.keyboard.press("Enter");
    await makeStoryline(app.window);
    // A blank new scene, which nobody is in yet.
    await addStorylineScene(app.window);
    // And a page from the world, which points at things already.
    await openStorylinePicker(app.window);
    await searchStorylinePicker(app.window, EXISTING);
    await pickStorylinePage(app.window);
    await app.window.locator(".storyline-stage").click({ position: { x: 40, y: 300 } });
  });

  afterAll(async () => {
    await app?.close();
  });

  it("draws nobody on a scene that names nobody", async () => {
    expect(await storylineSceneCastCount(app.window, 0)).toBe(0);
  });

  it("draws the pages a scene points at", async () => {
    expect(await storylineSceneCastCount(app.window, 1)).toBeGreaterThan(0);
  });

  it("names them in the strip, and each one goes to its page", async () => {
    await selectStorylineScene(app.window, 1);
    const cast = await storylineSelectionCast(app.window);
    expect(cast.length).toBeGreaterThan(0);

    await openStorylineCastMember(app.window, cast[0]);
    expect(await pageTitle(app.window)).toBe(cast[0]);
  });
});
