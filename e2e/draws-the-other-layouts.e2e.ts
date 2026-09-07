// Cards, board and list, and the drag that makes a board a board.
// Phase 23, step 4.
//
// **The point of the phase's shape is that a layout is only a way of drawing.**
// So the assertions worth making here are that the same pages turn up in all
// four, that switching does not lose the view's settings, and that the one
// interaction a layout adds — dragging a card between columns — writes the same
// value typing into the table would have written.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  databaseBoardCards,
  databaseBoardColumns,
  databaseCardNames,
  databaseCellField,
  databaseListNames,
  databaseRowNames,
  dragDatabaseCard,
  openDatabaseMenu,
  openPage,
  pickDatabaseLayout,
  searchTree,
  treeRow,
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

describe("the other layouts", () => {
  let app: RunningApp;

  const SECTION = "Characters";
  const LABEL = "Standing";
  const SWORN = "Sworn";
  const EXILED = "Exiled";
  const MOVED = "Kalla Reyes";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);

    // A status property on one page, so a column exists; the rest get their
    // values from inside the table, which is step 3's job and is how a board
    // gets more than one column to drag between.
    await openPage(app.window, "Thonn Lindqvist");
    await app.window.getByRole("button", { name: "Add Block", exact: true }).click();
    await app.window.getByRole("button", { name: "+ New property" }).click();
    await app.window.getByPlaceholder("Property name").fill(LABEL);
    await app.window.locator(".property-add-type").selectOption("status");
    await app.window.getByRole("button", { name: "Add", exact: true }).click();
    await app.window.waitForTimeout(WRITTEN_MS);

    await searchTree(app.window, SECTION);
    await treeRow(app.window, SECTION).first().click({ button: "right" });
    await app.window.locator(".tree-context-menu").first().waitFor({ state: "visible", timeout: 10_000 });
    await app.window.getByRole("button", { name: "Turn into", exact: true }).click();
    await app.window.getByRole("button", { name: "Table", exact: true }).click();
    await app.window.waitForTimeout(WRITTEN_MS);
    await clearTreeSearch(app.window);
    await openPage(app.window, SECTION);

    for (const [who, what] of [
      ["Thonn Lindqvist", SWORN],
      [MOVED, EXILED],
    ]) {
      await databaseCellField(app.window, LABEL, who).click();
      await app.window.getByPlaceholder("Find or add").fill(what);
      const existing = app.window.locator(".database-menu .database-option");
      if ((await existing.count()) > 0) await existing.first().click();
      else await app.window.locator(".database-menu .database-menu-add").click();
      await app.window.waitForTimeout(WRITTEN_MS);
      await app.window.keyboard.press("Escape");
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it("shows the same pages as cards and as a list", async () => {
    const inTable = await databaseRowNames(app.window);

    await pickDatabaseLayout(app.window, "Cards");
    expect(await databaseCardNames(app.window)).toEqual(inTable);

    await pickDatabaseLayout(app.window, "List");
    expect(await databaseListNames(app.window)).toEqual(inTable);
  });

  it("remembers the layout after a reload", async () => {
    await reload(app);
    await openPage(app.window, SECTION);

    expect((await databaseListNames(app.window)).length).toBeGreaterThan(0);
  });

  // Grouping by a dropdown rather than by template, because a folder of
  // characters grouped by template is one column and looks broken on arrival.
  it("picks a grouping worth having when it becomes a board", async () => {
    await pickDatabaseLayout(app.window, "Board");

    const columns = await databaseBoardColumns(app.window);
    expect(columns).toContain(SWORN);
    expect(columns).toContain(EXILED);
  });

  it("moves a card between columns, and that is a real edit", async () => {
    expect(await databaseBoardCards(app.window, EXILED)).toContain(MOVED);

    await dragDatabaseCard(app.window, MOVED, SWORN);
    await app.window.waitForTimeout(WRITTEN_MS);

    expect(await databaseBoardCards(app.window, SWORN)).toContain(MOVED);
    expect(await databaseBoardCards(app.window, EXILED)).not.toContain(MOVED);
  });

  it("wrote the value the table would have written", async () => {
    // The whole claim of the layouts: they are ways of drawing one record, so a
    // drag and a typed cell have to end up as the same thing.
    await pickDatabaseLayout(app.window, "Table");

    const cell = app.window.getByLabel(`${LABEL} for ${MOVED}`);
    await expect.poll(() => cell.innerText()).toContain(SWORN);
  });

  it("keeps the settings across a switch", async () => {
    // The grouping was set when the board was chosen; going back to the table
    // must not have dropped it, because it was the view's grouping all along.
    await openDatabaseMenu(app.window, "group");
    const on = app.window.locator(".database-menu-item[data-on]");
    await expect.poll(() => on.innerText()).toBe(LABEL);
    await app.window.keyboard.press("Escape");
  });
});
