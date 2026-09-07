// A property two pages both carry is one column, not two.
//
// **The bug this exists to keep fixed.** A custom property's key is a uuid
// minted per page (the store's `addCustomProperty`), so nine characters each
// carrying a Rank had nine keys for it. The table deduplicated its columns by
// key, which meant nine columns all called Rank, each filled in on one row and
// blank on the other eight — and a filter or a hidden column pointed at
// whichever page happened to define it first, so deleting that page took the
// setting with it.
//
// `database-service.test.ts` proves the derivation. This proves it against
// properties the app itself created, which is the part that would go wrong
// again if the store ever changed how a key is minted.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  databaseCellField,
  databaseColumns,
  databaseRowNames,
  openPage,
  searchTree,
  treeRow,
  waitForWorld,
} from "./harness/screen";

const WRITTEN_MS = 1200;

/** Adds a per-page property through the panel, the way a person would. */
async function addProperty(app: RunningApp, pageName: string, label: string, value: string): Promise<void> {
  await openPage(app.window, pageName);
  await app.window.getByRole("button", { name: "Add Block", exact: true }).click();
  await app.window.getByRole("button", { name: "+ New property" }).click();
  await app.window.getByPlaceholder("Property name").fill(label);
  await app.window.getByRole("button", { name: "Add", exact: true }).click();
  await app.window.waitForTimeout(WRITTEN_MS);

  // The new field is the last one in the panel, and it is the only one on this
  // page called this — so it is findable without knowing the uuid behind it.
  await app.window.locator(".block-shell", { hasText: label }).last().locator("input").first().fill(value);
  await app.window.waitForTimeout(WRITTEN_MS);
}

describe("one column per property", () => {
  let app: RunningApp;

  const FIRST = "Thonn Lindqvist";
  const SECOND = "Kalla Reyes";
  const LABEL = "Rank";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("shows one column for a property two pages both carry", async () => {
    await addProperty(app, FIRST, LABEL, "Captain");
    await addProperty(app, SECOND, LABEL, "Sergeant");

    await searchTree(app.window, "Characters");
    await treeRow(app.window, "Characters").first().click({ button: "right" });
    await app.window.locator(".tree-context-menu").first().waitFor({ state: "visible", timeout: 10_000 });
    await app.window.getByRole("button", { name: "Turn into a table" }).click();
    await app.window.waitForTimeout(WRITTEN_MS);
    await clearTreeSearch(app.window);
    await openPage(app.window, "Characters");

    const columns = (await databaseColumns(app.window)).map((column) => column.toLowerCase());
    expect(columns.filter((column) => column === LABEL.toLowerCase())).toHaveLength(1);
  });

  it("fills that one column in from both pages", async () => {
    // The other half. One column is only right if each row reads its own key
    // through it — otherwise the first page's value shows and every other row
    // in the column is blank.
    expect(await databaseRowNames(app.window)).toContain(FIRST);

    // Read out of each row's own cell rather than out of the table's text.
    // Step 3 made this column editable, so the value lives in an input — and
    // asking per row is the sharper question anyway: one column is only right
    // if every row reads its own key through it.
    expect(await databaseCellField(app.window, LABEL, FIRST).inputValue()).toBe("Captain");
    expect(await databaseCellField(app.window, LABEL, SECOND).inputValue()).toBe("Sergeant");
  });
});
