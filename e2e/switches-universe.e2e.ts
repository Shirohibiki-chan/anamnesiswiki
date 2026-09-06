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

/** What the empty one made from the "+" gets called. */
const NEW_UNIVERSE = "Merfolk AU";

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

/** What the switcher button currently reads. */
async function switcherLabel(app: RunningApp): Promise<string> {
  return (await app.window.locator(".tree-universe-button").first().innerText()).replace(/\s+/g, " ").trim();
}

async function chooseUniverse(app: RunningApp, name: string): Promise<void> {
  await app.window.locator(".tree-universe-button").first().click();
  await app.window.locator(".tree-universe-menu").waitFor({ state: "visible", timeout: 10_000 });
  await app.window.locator(".tree-universe-menu button").filter({ hasText: name }).first().click();
  await app.window.waitForTimeout(WRITTEN_MS);
}

/** The names the switcher's own list is offering. */
async function switcherOptions(app: RunningApp): Promise<string[]> {
  await app.window.locator(".tree-universe-button").first().click();
  await app.window.locator(".tree-universe-menu").waitFor({ state: "visible", timeout: 10_000 });
  const labels = await app.window.locator(".tree-universe-menu button").allInnerTexts();
  await app.window.keyboard.press("Escape");
  await app.window.locator(".tree-universe-menu").waitFor({ state: "hidden", timeout: 10_000 });
  return labels.map((label) => label.replace(/\s+/g, " ").trim());
}

/** Opens the "+" beside the switcher and clicks one of its entries. */
async function addMenuItem(app: RunningApp, label: string): Promise<void> {
  await app.window.getByRole("button", { name: "New universe", exact: true }).click();
  await app.window.locator(".tree-universe-menu").waitFor({ state: "visible", timeout: 10_000 });
  await app.window.locator(".tree-universe-menu button").filter({ hasText: label }).first().click();
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

  it("is there before the world has any universes", async () => {
    // It was hidden until one existed for a day, and that made the whole
    // feature reachable only from a right-click item you had to already know
    // about. The row is the entrance now — if it is missing here, nobody who
    // has not been told finds universes at all.
    expect(await switcherLabel(app)).toBe("All universes");
  });

  it("makes one out of a page you already have, from the + beside it", async () => {
    // Set up the page this scenario navigates back to at the end, while the
    // whole tree is still reachable.
    await runRowMenuItem(app, OUTSIDE, "Set as project home");

    await addMenuItem(app, UNIVERSE);

    expect(await switcherOptions(app)).toContain(UNIVERSE);
    // Making one is opt-in: nothing is rearranged until she picks it.
    expect(await switcherLabel(app)).toBe("All universes");
    expect(await visibleTreeRows(app.window)).toContain(OUTSIDE);
  });

  it("makes a new empty one, and opens it for naming", async () => {
    await addMenuItem(app, "New, empty universe");

    // It opens with its title already asking what it is called — a new
    // universe called "Untitled" that you have to go and find is the failure
    // this avoids.
    const field = app.window.locator(".page-title-input");
    await field.waitFor({ state: "visible", timeout: 10_000 });
    await field.fill(NEW_UNIVERSE);
    await field.press("Enter");
    await app.window.waitForTimeout(WRITTEN_MS);

    expect(await switcherOptions(app)).toContain(NEW_UNIVERSE);
  });

  it("keeps the list of pages to convert on the screen in a world with a lot of them", async () => {
    // The bug this guards, reported from her own world with a picture: every
    // top-level page in one column, running off the bottom of the screen, with
    // the entries past the edge unreachable — a popover is not the page, and
    // the window does not scroll to it. Fourteen extra roots is comfortably
    // past what fits.
    for (let made = 0; made < 14; made++) {
      await app.window.getByRole("button", { name: "Add top-level page" }).click();
      await app.window.locator(".page-title-input").waitFor({ state: "visible", timeout: 10_000 });
      await app.window.keyboard.press("Escape");
    }
    await app.window.waitForTimeout(WRITTEN_MS);

    await app.window.getByRole("button", { name: "New universe", exact: true }).click();
    const list = app.window.locator(".tree-universe-list");
    await list.waitFor({ state: "visible", timeout: 10_000 });

    const fits = await list.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        scrolls: element.scrollHeight > element.clientHeight,
        withinWindow: box.bottom <= window.innerHeight,
      };
    });
    // Both halves, because either one alone can be true while it is broken: a
    // list can end on screen because it was cut off, and one can scroll and
    // still hang off the bottom.
    expect(fits.scrolls).toBe(true);
    expect(fits.withinWindow).toBe(true);

    // And typing still narrows it, which is what makes a capped list usable
    // rather than merely contained.
    await app.window.locator(".tree-move-search-input").fill(UNIVERSE);
    expect(await app.window.locator(".tree-universe-list button").count()).toBe(0);
    await app.window.locator(".tree-move-search-input").fill(OUTSIDE);
    expect(await app.window.locator(".tree-universe-list button").count()).toBe(1);
    await app.window.keyboard.press("Escape");
    await app.window.waitForTimeout(300);
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
