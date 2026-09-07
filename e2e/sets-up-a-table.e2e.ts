// The four settings above a database: columns, filter, sort, group.
// Phase 23, step 2.
//
// **`database-service.test.ts` already proves the logic**, row by row and
// operator by operator, and none of that says the settings reach the table or
// survive being closed. That is what this is for: the filter that hides six
// pages has to still be hiding them after a reload, or it is a toy.
//
// The world these run against has no dropdown properties, so the fields used
// here are the three that exist on every page anyway — its name, its template
// and its tags. That is not a compromise: those three are exactly what Phase 24
// is written to reuse this filter model for.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  databaseColumns,
  databaseCount,
  databaseGroupLabels,
  databaseRowNames,
  flipDatabaseSort,
  openDatabaseMenu,
  openPage,
  turnIntoDatabase,
  waitForWorld,
} from "./harness/screen";

/** Long enough for the debounced write to reach the disk. */
const WRITTEN_MS = 1500;

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

async function turnIntoTable(app: RunningApp, name: string): Promise<void> {
  await turnIntoDatabase(app.window, name);
  await app.window.waitForTimeout(WRITTEN_MS);
  await clearTreeSearch(app.window);
  await openPage(app.window, name);
}

async function closeMenu(app: RunningApp): Promise<void> {
  await app.window.keyboard.press("Escape");
  await app.window.locator(".database-menu").first().waitFor({ state: "hidden", timeout: 10_000 });
}

describe("setting up a table", () => {
  let app: RunningApp;

  const SECTION = "Characters";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await turnIntoTable(app, SECTION);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("turns a column off and leaves the rest alone", async () => {
    expect((await databaseColumns(app.window)).map((c) => c.toLowerCase())).toEqual(["name", "summary", "friends"]);

    await openDatabaseMenu(app.window, "columns");
    await app.window.getByRole("checkbox", { name: "Summary" }).click();
    await closeMenu(app);

    expect((await databaseColumns(app.window)).map((c) => c.toLowerCase())).toEqual(["name", "friends"]);
  });

  it("puts the column back", async () => {
    await openDatabaseMenu(app.window, "columns");
    await app.window.getByRole("checkbox", { name: "Summary" }).click();
    await closeMenu(app);

    expect((await databaseColumns(app.window)).map((c) => c.toLowerCase())).toEqual(["name", "summary", "friends"]);
  });

  it("hides the rows a filter excludes, and says how many it left out", async () => {
    const before = (await databaseRowNames(app.window)).length;

    await openDatabaseMenu(app.window, "filter");
    await app.window.getByRole("button", { name: "Add a filter" }).click();
    await app.window.getByLabel("What to filter on").selectOption("name");
    await app.window.getByLabel("How to compare it").selectOption("contains");
    await app.window.getByLabel("What to look for").fill("kalla");
    await closeMenu(app);

    const after = await databaseRowNames(app.window);
    expect(after.length).toBeGreaterThan(0);
    expect(after.length).toBeLessThan(before);
    for (const name of after) expect(name.toLowerCase()).toContain("kalla");
    // Not just "3 pages" — a filter hiding six of nine and a folder holding
    // three must not read the same. Cased down because the line is uppercased
    // by CSS, and this is about what it says rather than how it is styled.
    expect((await databaseCount(app.window)).toLowerCase()).toContain(`of ${before}`);
  });

  it("is still filtering after a reload", async () => {
    await reload(app);
    await openPage(app.window, SECTION);

    const names = await databaseRowNames(app.window);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name.toLowerCase()).toContain("kalla");
  });

  it("sorts the rows it kept, and turns them over on the second click", async () => {
    await openDatabaseMenu(app.window, "sort");
    await app.window.getByRole("button", { name: "Add a sort" }).click();
    await app.window.getByLabel("What to sort by").selectOption("name");
    await closeMenu(app);

    const ascending = await databaseRowNames(app.window);
    expect([...ascending].sort((a, b) => a.localeCompare(b))).toEqual(ascending);

    await openDatabaseMenu(app.window, "sort");
    await flipDatabaseSort(app.window);
    await closeMenu(app);

    expect(await databaseRowNames(app.window)).toEqual([...ascending].reverse());
  });

  it("clears the filter again", async () => {
    await openDatabaseMenu(app.window, "filter");
    await app.window.getByRole("button", { name: /^Remove the/ }).click();
    await closeMenu(app);

    // No "of", because nothing is being left out any more.
    expect((await databaseCount(app.window)).toLowerCase()).not.toContain(" of ");
  });

  it("gathers rows into sections, and drops them again", async () => {
    // A folder the generator fills with two different templates, which is what
    // makes grouping by template say anything.
    await turnIntoTable(app, "Hard Cases");

    await openDatabaseMenu(app.window, "group");
    await app.window.getByRole("button", { name: "Template", exact: true }).click();
    await closeMenu(app);

    const labels = await databaseGroupLabels(app.window);
    expect(labels.length).toBeGreaterThan(1);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));

    await openDatabaseMenu(app.window, "group");
    await app.window.getByRole("button", { name: "Don't group" }).click();
    await closeMenu(app);

    expect(await databaseGroupLabels(app.window)).toEqual([]);
  });
});
