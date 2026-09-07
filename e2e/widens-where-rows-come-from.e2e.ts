// Gathering rows from beyond the page a database is on. Phase 23, step 5.
//
// **The scope is the whole of what "a rule" turned out to be.** The filter model
// from step 2 already matches on template and tag over any set of pages, so the
// only thing missing was which set — and this checks the two promises that came
// with the answer: a widened view says it is widened, and it stops offering to
// add a page, because it has nowhere honest to put one.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  databaseCount,
  databaseRowNames,
  openDatabaseMenu,
  openPage,
  turnIntoDatabase,
  waitForWorld,
} from "./harness/screen";

const WRITTEN_MS = 1200;

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

async function look(app: RunningApp, where: string): Promise<void> {
  await openDatabaseMenu(app.window, "filter");
  await app.window.getByLabel("Where to look for rows").selectOption(where);
  await app.window.waitForTimeout(WRITTEN_MS);
  await app.window.keyboard.press("Escape");
  await app.window.locator(".database-menu").first().waitFor({ state: "hidden", timeout: 10_000 });
}

/** Whether the database is still offering to make a page inside this one. */
function addButton(app: RunningApp) {
  return app.window.locator(".database-add");
}

describe("widening where rows come from", () => {
  let app: RunningApp;

  const SECTION = "Characters";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await turnIntoDatabase(app.window, SECTION);
    await app.window.waitForTimeout(WRITTEN_MS);
    await clearTreeSearch(app.window);
    await openPage(app.window, SECTION);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("gathers pages from outside the folder, and says that it did", async () => {
    const inside = await databaseRowNames(app.window);
    expect(await addButton(app).count()).toBe(1);

    await look(app, "everywhere");

    const widened = await databaseRowNames(app.window);
    expect(widened.length).toBeGreaterThan(inside.length);
    // Not merely more rows: rows that were nowhere near this folder.
    expect(widened.some((name) => !inside.includes(name))).toBe(true);
    expect((await databaseCount(app.window)).toLowerCase()).toContain("everywhere");
  });

  // "Everywhere" with no conditions is every page in the world, which is a
  // useless answer that looks like the setting broke something.
  it("narrows to the template it is a table of, as a filter she can see", async () => {
    await openDatabaseMenu(app.window, "filter");
    await expect.poll(() => app.window.getByLabel("What to filter on").inputValue()).toBe("template");
    await app.window.keyboard.press("Escape");
  });

  // Settled when the scope question was answered: a widened view has nowhere
  // obvious to put a new page, and a New that filed it here anyway would lie.
  it("stops offering to add a page, and offers again when narrowed", async () => {
    expect(await addButton(app).count()).toBe(0);

    await look(app, "subpages");

    expect(await addButton(app).count()).toBe(1);
  });

  it("remembers where it was looking after a reload", async () => {
    await look(app, "everywhere");
    await reload(app);
    await openPage(app.window, SECTION);

    expect((await databaseCount(app.window)).toLowerCase()).toContain("everywhere");
    expect(await addButton(app).count()).toBe(0);
  });

  it("explains itself when asked for a universe that isn't there", async () => {
    // Nothing in the generated world is a universe, so this is a view looking
    // for one from a page that is not in one — an empty table with no
    // explanation is the shape a bug takes.
    await look(app, "universe");

    await expect.poll(() => app.window.locator(".database-empty").innerText()).toContain("universe");
  });
});
