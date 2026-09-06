// The universe switcher: choosing one, the tree following it, and the choice
// surviving a restart. Phase 22.
//
// **What only this can check** is that the tree is actually rooted somewhere
// else afterwards. `tree-service.test.ts` says which universe an id resolves to
// and what a stale id falls back to; none of that can say that the rows on
// screen changed, or that reopening the world lands in the same universe rather
// than back at everything-at-once.
//
// The last scenario is the one that would be silently broken otherwise:
// navigating to a page that is *not* in the universe you are in has to move the
// tree to where that page is, or the sidebar quietly stops following you and
// you end up editing a page with no row anywhere.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { clearTreeSearch, searchTree, treeRow, visibleTreeRows, waitForWorld } from "./harness/screen";

/** Long enough for the debounced write of project.json to land. */
const WRITTEN_MS = 1500;

/** Both are fixed by the world generator — see `makes-a-universe.e2e.ts`. */
const UNIVERSE = "Hard Cases";
const OUTSIDE = "Locations";

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

async function runRowMenuItem(app: RunningApp, row: string, label: string): Promise<void> {
  await searchTree(app.window, row);
  await treeRow(app.window, row).first().click({ button: "right" });
  await app.window.locator(".tree-context-menu").first().waitFor({ state: "visible", timeout: 10_000 });
  await app.window.getByRole("button", { name: label }).click();
  await app.window.waitForTimeout(WRITTEN_MS);
  await clearTreeSearch(app.window);
}

/** What the switcher button currently reads, or null when there isn't one. */
async function switcherLabel(app: RunningApp): Promise<string | null> {
  const button = app.window.locator(".tree-universe-button");
  if ((await button.count()) === 0) return null;
  return (await button.first().innerText()).replace(/\s+/g, " ").trim();
}

async function chooseUniverse(app: RunningApp, name: string): Promise<void> {
  await app.window.locator(".tree-universe-button").first().click();
  await app.window.locator(".tree-universe-menu").waitFor({ state: "visible", timeout: 10_000 });
  await app.window.locator(".tree-universe-menu button").filter({ hasText: name }).first().click();
  await app.window.waitForTimeout(WRITTEN_MS);
}

describe("switching universe", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("draws no switcher in a world with no universes", async () => {
    // The feature costs nothing to anyone who does not want it, and this is
    // where that is either true or not.
    expect(await switcherLabel(app)).toBeNull();
  });

  it("appears once there is a universe, and changes nothing until one is picked", async () => {
    // Set up the page this scenario navigates back to at the end, while the
    // whole tree is still reachable.
    await runRowMenuItem(app, OUTSIDE, "Set as project home");
    await runRowMenuItem(app, UNIVERSE, "Turn into a universe");

    expect(await switcherLabel(app)).toBe("All universes");
    // Making one is opt-in: nothing is rearranged until she chooses.
    expect(await visibleTreeRows(app.window)).toContain(OUTSIDE);
  });

  it("shows one universe's contents at the root once one is picked", async () => {
    await chooseUniverse(app, UNIVERSE);

    expect(await switcherLabel(app)).toBe(UNIVERSE);
    const rows = await visibleTreeRows(app.window);
    // The universe itself stops being a row — its inside *is* the tree now —
    // and everything outside it is not being shown.
    expect(rows).not.toContain(UNIVERSE);
    expect(rows).not.toContain(OUTSIDE);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("opens in the same universe after a restart", async () => {
    await reload(app);
    // In project.json rather than session state on purpose: reopening a world
    // into a different version of it than you left would be losing your place.
    expect(await switcherLabel(app)).toBe(UNIVERSE);
    expect(await visibleTreeRows(app.window)).not.toContain(OUTSIDE);
  });

  it("follows you out of the universe when you go somewhere outside it", async () => {
    await app.window.locator(".tree-project-header-home").click();
    await app.window.waitForTimeout(WRITTEN_MS);

    // Home is a page outside every universe, so the only view that can show it
    // is all of them.
    expect(await switcherLabel(app)).toBe("All universes");
    expect(await visibleTreeRows(app.window)).toContain(OUTSIDE);
  });
});
