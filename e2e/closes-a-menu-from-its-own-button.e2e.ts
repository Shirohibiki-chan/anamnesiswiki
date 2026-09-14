// A menu's button closes the menu it opened. 2026-09-14.
//
// **What a unit test cannot see.** The popover closes on a press outside it
// and the button opens on a click, and a press on the button *is* a press
// outside the popover — so before use-click-outside learnt to leave the
// opening control alone, the press closed the menu and the click reopened it,
// and the button could only ever open. Both happen inside one real click, in
// the order the browser fires them; only the real app can be asked.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  closeDatabaseMenuFromItsButton,
  closeGraphMenuFromItsButton,
  closePageGraph,
  graphMenuIsOpen,
  hasDatabase,
  openDatabaseMenu,
  openGraphDisplay,
  openGraphFilters,
  openPage,
  openWorldGraph,
  turnIntoDatabase,
  waitForWorld,
} from "./harness/screen";

const SECTION = "Characters";

/** Long enough for the debounced write of `project.json` to reach the disk. */
const WRITTEN_MS = 1500;

describe("closing a menu from its own button", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp({ pages: 30 });
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("closes the graph's Filter and Display menus", async () => {
    await openWorldGraph(app.window);

    await openGraphFilters(app.window);
    expect(await graphMenuIsOpen(app.window)).toBe(true);
    await closeGraphMenuFromItsButton(app.window, "filter");
    expect(await graphMenuIsOpen(app.window)).toBe(false);

    await openGraphDisplay(app.window);
    await closeGraphMenuFromItsButton(app.window, "display");
    expect(await graphMenuIsOpen(app.window)).toBe(false);

    await closePageGraph(app.window);
  });

  it("closes a table's menu the same way", async () => {
    await turnIntoDatabase(app.window, SECTION);
    await app.window.waitForTimeout(WRITTEN_MS);
    await clearTreeSearch(app.window);
    await openPage(app.window, SECTION);
    expect(await hasDatabase(app.window)).toBe(true);

    await openDatabaseMenu(app.window, "filter");
    await closeDatabaseMenuFromItsButton(app.window, "filter");
  });
});
