// The example world, opened the way somebody who just installed the app would
// open it. Phase 26, step 1.
//
// **What the unit tests cannot ask is whether any of it survives being
// written.** `example-world.test.ts` proves the description is coherent — every
// link resolves, every property exists on its template, the canvas arrives
// tidy. What it cannot prove is that the world reaches the disk, that the tree
// shows what was described, that a mention written into a tab is a link when
// the editor renders it, or that `_storyline.json` landed beside the scenes
// rather than nowhere. Those are questions about a store, a component and the
// filesystem together.
//
// The world is made inside the harness's own temp projects folder — see
// `launch-app.ts`, which points `projectsDir` there — so a run never leaves a
// Saltmere in anybody's real library.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  databaseRowNames,
  editorMentions,
  openPage,
  pageTitle,
  storylineBandLabels,
  storylineEdgeCount,
  storylineIsShown,
  storylineNoteLinks,
  storylineScenesLeftToRight,
  visibleTreeRows,
  waitForWorld,
} from "./harness/screen";

/** Opens the start screen and asks for the example world. */
async function openExample(app: RunningApp): Promise<void> {
  await app.window.getByLabel("Switch project").click();
  await app.window.locator(".start").waitFor({ state: "visible", timeout: 20_000 });
  await app.window.getByRole("button", { name: /The example world/ }).click();
  await waitForWorld(app.window);
}

describe("the example world", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openExample(app);
  }, 90_000);

  afterAll(async () => {
    await app?.close();
  });

  it("opens on the page that explains what it is", async () => {
    expect(await pageTitle(app.window)).toBe("Start Here");
  });

  it("puts the world it described in the tree", async () => {
    const rows = await visibleTreeRows(app.window);
    expect(rows).toContain("Start Here");
    expect(rows).toContain("Characters");
    expect(rows).toContain("Places");
    expect(rows).toContain("The Tidewrights");
    expect(rows).toContain("The Salt Tide");
    // The two containers Start Here talks about arrive open, so the shape is
    // visible without anybody going looking for it.
    expect(rows).toContain("Maren Kell");
    expect(rows).toContain("Saltmere");
  });

  it("renders the names in the writing as real links", async () => {
    // A mention is a link to a page id, not the page's name in bold — so this
    // is the assertion that says the world is joined up rather than merely
    // spelled consistently.
    const mentions = await editorMentions(app.window);
    expect(mentions.length).toBeGreaterThan(3);
    expect(mentions).toContain("Maren Kell");
    expect(mentions).toContain("The Salt Tide");
  });

  it("shows Places as a table of the pages inside it", async () => {
    await openPage(app.window, "Places");
    const rows = await databaseRowNames(app.window);
    expect(rows).toContain("Saltmere");
    expect(rows).toContain("The Drowned Chapel");
  });

  it("arrives with the storyline drawn, joined and labelled", async () => {
    await openPage(app.window, "The Salt Tide");
    expect(await storylineIsShown(app.window)).toBe(true);

    // Left to right is narrative order here, because the world ships in the
    // positions tidying would choose: the night, the two threads, the room.
    const scenes = await storylineScenesLeftToRight(app.window);
    expect(scenes[0]).toBe("The Lantern Goes Out");
    expect(scenes[3]).toBe("Two Tides Later");
    expect(await storylineEdgeCount(app.window)).toBe(4);
    expect(await storylineBandLabels(app.window)).toContain("One night in Saltmere");
    // The note's wikilink resolving proves the canvas and the pages agree
    // about what exists — the note is written by name and matched at draw time.
    expect(await storylineNoteLinks(app.window)).toContain("The Drowned Chapel");
  });

  it("makes a second copy rather than refusing when asked again", async () => {
    await openExample(app);
    await app.window.getByLabel("Switch project").click();
    await app.window.locator(".start").waitFor({ state: "visible", timeout: 20_000 });
    // The grid is filled by a scan of the projects folder, which is disk work
    // and finishes after the screen is up — so this waits for the second copy
    // by name rather than reading the tiles the moment they could be empty.
    await app.window.locator(".project-tile-cap b", { hasText: "Saltmere Example 2" }).first().waitFor({ timeout: 20_000 });
    const names = (await app.window.locator(".project-tile-cap b").allInnerTexts()).map((name) => name.trim());
    expect(names).toContain("Saltmere Example");
  });
});

describe("a fresh install", () => {
  let app: RunningApp;

  beforeAll(async () => {
    // No world of its own, and the example world left to happen the way it does
    // on somebody's first morning.
    app = await launchApp({ openWorld: false, exampleWorld: true });
    await app.window.locator(".start").waitFor({ state: "visible", timeout: 20_000 });
  }, 90_000);

  afterAll(async () => {
    await app?.close();
  });

  it("has the example world in the library without anybody asking", async () => {
    // Her call, 2026-09-09: it is a world, so it belongs in the library rather
    // than behind a row somebody has to notice on the one screen that offers it.
    await app.window
      .locator(".project-tile-cap b", { hasText: "Saltmere Example" })
      .first()
      .waitFor({ timeout: 30_000 });
  });

  it("does not put it back after it has been deleted", async () => {
    // The assertion the whole flag exists for. An example world that reappears
    // is the app arguing with her about what is in her own folder.
    const tile = app.window.locator(".project-tile").filter({ hasText: "Saltmere Example" }).first();
    await tile.hover();
    await tile.locator(".project-tile-menu-btn").first().click();
    await app.window.getByRole("menuitem", { name: /Delete/ }).click();
    await app.window.locator(".confirm-dialog .ui-btn-danger").click();
    await app.window.waitForTimeout(2500);
    expect(await app.window.locator(".project-tile-cap b", { hasText: "Saltmere Example" }).count()).toBe(0);

    // Through a real reload rather than by reading the setting: the screen that
    // makes one is the screen that just came back.
    await app.window.keyboard.press("Control+r");
    await app.window.locator(".start").waitFor({ state: "visible", timeout: 20_000 });
    await app.window.waitForTimeout(3000);
    expect(await app.window.locator(".project-tile-cap b", { hasText: "Saltmere Example" }).count()).toBe(0);
  });
});
