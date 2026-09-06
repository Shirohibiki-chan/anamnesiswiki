// Getting rid of a universe without losing what is in it. Phase 22.
//
// **The gap this closes was reachability, not absence.** Turning a universe
// back into a folder has existed since the day universes did — but only on the
// universe's own row in the tree, and that row only exists in the all-universes
// view. From inside a universe there was no way out of it at all, which is the
// same shape of mistake as making one being right-click-only. Reported by the
// user 2026-09-06.
//
// The two assertions that matter are the ones a unit test cannot make: that the
// pages survive, and that the app does not strand you looking at a universe
// that no longer exists.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { clearTreeSearch, searchTree, treeRow, visibleTreeRows, waitForWorld } from "./harness/screen";

const WRITTEN_MS = 1500;

/** Fixed by the world generator, and holds pages. */
const UNIVERSE = "Locations";
/** One of the pages inside it, which must still be there afterwards. */
const PAGE_INSIDE = "Greyharbour";

async function openSwitcher(app: RunningApp): Promise<void> {
  await app.window.locator(".tree-universe-button").first().click();
  await app.window.locator(".tree-universe-menu").waitFor({ state: "visible", timeout: 10_000 });
}

async function switcherLabel(app: RunningApp): Promise<string> {
  return (await app.window.locator(".tree-universe-button").first().innerText()).replace(/\s+/g, " ").trim();
}

describe("removing a universe", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);

    await searchTree(app.window, UNIVERSE);
    await treeRow(app.window, UNIVERSE).first().click({ button: "right" });
    await app.window.locator(".tree-context-menu").first().waitFor({ state: "visible", timeout: 10_000 });
    await app.window.getByRole("button", { name: "Turn into a universe" }).click();
    await app.window.waitForTimeout(WRITTEN_MS);
    await clearTreeSearch(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("is offered from inside the universe you are removing", async () => {
    // Which is the whole point: the row's own menu is unreachable from here,
    // because in this view the universe is not a row.
    await openSwitcher(app);
    await app.window.locator(".tree-universe-menu button").filter({ hasText: UNIVERSE }).first().click();
    await app.window.waitForTimeout(WRITTEN_MS);
    expect(await switcherLabel(app)).toBe(UNIVERSE);

    await openSwitcher(app);
    expect(await app.window.getByRole("button", { name: "Remove a universe" }).count()).toBe(1);
    await app.window.keyboard.press("Escape");
  });

  it("keeps every page, and puts the folder back at the top level", async () => {
    await openSwitcher(app);
    await app.window.getByRole("button", { name: "Remove a universe" }).click();
    await app.window.locator(".tree-universe-list").waitFor({ state: "visible", timeout: 10_000 });
    await app.window.locator(".tree-universe-list button").filter({ hasText: UNIVERSE }).first().click();
    await app.window.waitForTimeout(WRITTEN_MS);

    // Stranded is the failure mode: the tree was rooted at that universe, and
    // it is not one any more. It has to fall back to showing everything.
    expect(await switcherLabel(app)).toBe("All universes");

    const rows = await visibleTreeRows(app.window);
    expect(rows).toContain(UNIVERSE);

    // The pages are the thing that must not have gone anywhere.
    await searchTree(app.window, PAGE_INSIDE);
    expect(await treeRow(app.window, PAGE_INSIDE).count()).toBeGreaterThan(0);
    await clearTreeSearch(app.window);
  });

  it("stays removed after a restart, and does not come back as the one you were in", async () => {
    await app.window.evaluate(() => {
      (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
    });
    await app.window.keyboard.press("Control+r");
    await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
    await waitForWorld(app.window);

    // The pointer in project.json named this page. If it were left behind, the
    // page turning back into a universe later would silently become the one
    // being worked in again.
    expect(await switcherLabel(app)).toBe("All universes");
    await openSwitcher(app);
    const listed = await app.window.locator(".tree-universe-menu button").allInnerTexts();
    expect(listed.map((t) => t.replace(/\s+/g, " ").trim())).not.toContain(UNIVERSE);
    await app.window.keyboard.press("Escape");
  });
});
