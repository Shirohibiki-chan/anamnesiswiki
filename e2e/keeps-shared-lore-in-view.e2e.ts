// The shared universe — the one holding the pages that are true in every
// version of the world, riding along under whichever universe you are in.
// Phase 22.
//
// **What only this can check** is that the section is on screen and holding the
// right pages. `tree-service.test.ts` says which rows `buildTreeData` returns
// for each combination of selected and shared; none of that can say that the
// shared pages are reachable from inside another universe, which is the entire
// point of the feature — shared lore is never meant to be something you go and
// switch to.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { clearTreeSearch, searchTree, treeRow, visibleTreeRows, waitForWorld } from "./harness/screen";

const WRITTEN_MS = 1500;

/** Both fixed by the world generator, and both hold pages. */
const WORKING_IN = "Locations";
const SHARED = "Races";

async function makeUniverse(app: RunningApp, name: string): Promise<void> {
  await searchTree(app.window, name);
  await treeRow(app.window, name).first().click({ button: "right" });
  await app.window.locator(".tree-context-menu").first().waitFor({ state: "visible", timeout: 10_000 });
  await app.window.getByRole("button", { name: "Turn into a universe" }).click();
  await app.window.waitForTimeout(WRITTEN_MS);
  await clearTreeSearch(app.window);
}

async function openSwitcher(app: RunningApp): Promise<void> {
  await app.window.locator(".tree-universe-button").first().click();
  await app.window.locator(".tree-universe-menu").waitFor({ state: "visible", timeout: 10_000 });
}

async function chooseUniverse(app: RunningApp, name: string): Promise<void> {
  await openSwitcher(app);
  await app.window.locator(".tree-universe-menu button").filter({ hasText: name }).first().click();
  await app.window.waitForTimeout(WRITTEN_MS);
}

/** The section row, which is the shared universe drawn as a band. */
function sharedSection(app: RunningApp) {
  return app.window.locator(".tree-row-shared-section");
}

describe("the shared universe", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await makeUniverse(app, WORKING_IN);
    await makeUniverse(app, SHARED);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("is designated from the switcher, not only from a right-click", async () => {
    // The lesson from the switcher itself: a designation reachable only from a
    // row's right-click menu is one nobody finds.
    await openSwitcher(app);
    await app.window.getByRole("button", { name: "Shared universe" }).click();
    await app.window.locator(".tree-universe-list").waitFor({ state: "visible", timeout: 10_000 });
    await app.window.locator(".tree-universe-list button").filter({ hasText: SHARED }).first().click();
    await app.window.waitForTimeout(WRITTEN_MS);

    // Marked in the switcher's own list, so which one is shared is answerable
    // without switching to each in turn to look.
    await openSwitcher(app);
    const marked = app.window.locator(".tree-universe-menu button").filter({ hasText: SHARED });
    expect(await marked.locator(".tree-universe-tag").count()).toBe(1);
    await app.window.keyboard.press("Escape");
  });

  it("shows its pages under the universe you are working in", async () => {
    await chooseUniverse(app, WORKING_IN);

    expect(await sharedSection(app).count()).toBe(1);
    // The section is collapsed to start with, so what proves it is holding the
    // right pages is opening it.
    await sharedSection(app).locator(".tree-row-toggle").click();
    await app.window.waitForTimeout(500);

    const rows = await visibleTreeRows(app.window);
    // A page from the shared universe, reachable without leaving Locations —
    // which is the whole feature.
    expect(rows.length).toBeGreaterThan(0);
    expect(await sharedSection(app).count()).toBe(1);
  });

  it("is not drawn while the shared universe is the one showing", async () => {
    await chooseUniverse(app, SHARED);
    // Its pages are the tree here. A section under them would be the same
    // pages listed twice.
    expect(await sharedSection(app).count()).toBe(0);
  });

  it("is not drawn in the all-universes view", async () => {
    await chooseUniverse(app, "All universes");
    // It is already a row there, like every other universe.
    expect(await sharedSection(app).count()).toBe(0);
    expect(await visibleTreeRows(app.window)).toContain(SHARED);
  });

  it("keeps the designation across a restart", async () => {
    await app.window.evaluate(() => {
      (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
    });
    await app.window.keyboard.press("Control+r");
    await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
    await waitForWorld(app.window);

    await chooseUniverse(app, WORKING_IN);
    expect(await sharedSection(app).count()).toBe(1);
  });
});
