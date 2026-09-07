// Showing a page as a table of the pages inside it, and putting it back.
//
// **Phase 23 step 1, and the promise a unit test cannot make.**
// `database-service.test.ts` says which pages become rows and which properties
// become columns, but every one of those assertions is about a function. What
// decides whether this feature is safe is whether *stopping* leaves the pages
// alone — a view is a lens, and the whole scoping decision behind the phase
// rests on it never being able to take anything with it when it goes. That is
// a question about the tree after a click, so it is asked here.
//
// The reload in the middle is the other half: a table that only exists until
// the window is closed is not a way of arranging a world.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  databaseColumns,
  databaseRowNames,
  hasDatabase,
  openDatabaseRow,
  openPage,
  pageTitle,
  stopShowingAsDatabase,
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

async function showAsTable(app: RunningApp, name: string): Promise<void> {
  await turnIntoDatabase(app.window, name);
  await app.window.waitForTimeout(WRITTEN_MS);
}

async function stopShowing(app: RunningApp, name: string): Promise<void> {
  await stopShowingAsDatabase(app.window, name);
  await app.window.waitForTimeout(WRITTEN_MS);
}

/** The column headings, cased down — see the note at the first assertion. */
async function columns(app: RunningApp): Promise<string[]> {
  return (await databaseColumns(app.window)).map((heading) => heading.toLowerCase());
}

/** The pages the table on this page is showing, which are the pages inside it. */
async function pagesInside(app: RunningApp, name: string): Promise<string[]> {
  await openPage(app.window, name);
  return databaseRowNames(app.window);
}

describe("showing a page as a table", () => {
  let app: RunningApp;

  // A root folder the generator always makes, holding pages that are all
  // characters — which is the ordinary case this feature is for, and the one
  // where guessing the columns has an obviously right answer.
  const SECTION = "Characters";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("draws the pages inside as rows, under the columns their template names", async () => {
    await openPage(app.window, SECTION);
    expect(await hasDatabase(app.window)).toBe(false);

    await showAsTable(app, SECTION);
    await clearTreeSearch(app.window);
    await openPage(app.window, SECTION);

    expect(await hasDatabase(app.window)).toBe(true);
    // Name first because it is the row's identity, then the Character
    // template's own two fields in the order the sidebar puts them — refs
    // last. Nothing was moved to make this happen.
    //
    // Compared without case because the heading is uppercased by CSS, and the
    // question here is which columns a table decided to show — pinning the
    // casing would make a restyle look like a broken feature.
    expect(await columns(app)).toEqual(["name", "summary", "friends"]);
    expect((await databaseRowNames(app.window)).length).toBeGreaterThan(0);
  });

  it("is still a table after a reload", async () => {
    await reload(app);
    await openPage(app.window, SECTION);

    expect(await hasDatabase(app.window)).toBe(true);
    expect(await columns(app)).toEqual(["name", "summary", "friends"]);
  });

  it("opens the page a row names", async () => {
    await openPage(app.window, SECTION);
    const [first] = await databaseRowNames(app.window);

    await openDatabaseRow(app.window, first);

    expect(await pageTitle(app.window)).toBe(first);
  });

  // The one that matters. Removing a view removes a view.
  it("puts the page back with every row still in it", async () => {
    const before = await pagesInside(app, SECTION);
    expect(before.length).toBeGreaterThan(0);

    await stopShowing(app, SECTION);
    await clearTreeSearch(app.window);
    await openPage(app.window, SECTION);

    expect(await hasDatabase(app.window)).toBe(false);

    // Shown as a table again purely to count what survived — the rows are the
    // pages, so the table is the cheapest way to read the folder's contents
    // back out through the app rather than off the disk.
    await showAsTable(app, SECTION);
    await clearTreeSearch(app.window);

    expect(await pagesInside(app, SECTION)).toEqual(before);
  });
});
