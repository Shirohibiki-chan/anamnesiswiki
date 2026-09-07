// Changing a value from inside a table row. Phase 23, step 3.
//
// **The case worth driving the real app for is the one where nothing exists
// yet.** A column is there because *some* page carries that property, so typing
// into another row's cell has to mint that page's own copy of the property, add
// the block that makes it visible in the page's own panel, and write the value
// — and all of it has to be one press of Ctrl+Z away from being undone.
//
// `database-service.test.ts` proves the patch. This proves the patch reaches
// the disk, the panel and the undo stack.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  databaseCellField,
  openPage,
  panelBlockTitles,
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

/** Adds a per-page property through the panel, the way a person would. */
async function addProperty(app: RunningApp, pageName: string, label: string, value: string): Promise<void> {
  await openPage(app.window, pageName);
  await app.window.getByRole("button", { name: "Add Block", exact: true }).click();
  await app.window.getByRole("button", { name: "+ New property" }).click();
  await app.window.getByPlaceholder("Property name").fill(label);
  await app.window.getByRole("button", { name: "Add", exact: true }).click();
  await app.window.waitForTimeout(WRITTEN_MS);
  await app.window.locator(".block-shell", { hasText: label }).last().locator("input").first().fill(value);
  await app.window.waitForTimeout(WRITTEN_MS);
}

describe("editing a value in the row", () => {
  let app: RunningApp;

  const SECTION = "Characters";
  const HAS_IT = "Thonn Lindqvist";
  const LACKS_IT = "Kalla Reyes";
  const LABEL = "Rank";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);

    await addProperty(app, HAS_IT, LABEL, "Captain");

    await searchTree(app.window, SECTION);
    await treeRow(app.window, SECTION).first().click({ button: "right" });
    await app.window.locator(".tree-context-menu").first().waitFor({ state: "visible", timeout: 10_000 });
    await app.window.getByRole("button", { name: "Turn into a table" }).click();
    await app.window.waitForTimeout(WRITTEN_MS);
    await clearTreeSearch(app.window);
    await openPage(app.window, SECTION);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("changes a value the page already had", async () => {
    const cell = databaseCellField(app.window, LABEL, HAS_IT);
    await expect.poll(() => cell.inputValue()).toBe("Captain");

    await cell.fill("Commander");
    await app.window.waitForTimeout(WRITTEN_MS);

    await expect.poll(() => cell.inputValue()).toBe("Commander");
  });

  it("gives the property to a page that never had it", async () => {
    const cell = databaseCellField(app.window, LABEL, LACKS_IT);
    await expect.poll(() => cell.inputValue()).toBe("");

    await cell.fill("Sergeant");
    await app.window.waitForTimeout(WRITTEN_MS);

    await expect.poll(() => cell.inputValue()).toBe("Sergeant");
  });

  it("puts the field in that page's own panel, not only in the table", async () => {
    // A value the table can see and the page cannot would be a value hiding
    // from the person who wrote it.
    await openPage(app.window, LACKS_IT);
    expect(await panelBlockTitles(app.window)).toContain(LABEL);
  });

  it("still says so after a reload", async () => {
    await reload(app);
    await openPage(app.window, SECTION);

    await expect.poll(() => databaseCellField(app.window, LABEL, LACKS_IT).inputValue()).toBe("Sergeant");
    await expect.poll(() => databaseCellField(app.window, LABEL, HAS_IT).inputValue()).toBe("Commander");
  });

  it("takes one press of undo to put a cell back", async () => {
    const cell = databaseCellField(app.window, LABEL, HAS_IT);
    await cell.fill("Admiral");
    await app.window.waitForTimeout(WRITTEN_MS);

    // Focus leaves the cell first: Ctrl+Z inside a text box is the browser's
    // own undo, which would only take back the typing rather than the change.
    await app.window.locator(".database-table").click({ position: { x: 2, y: 2 } });
    await app.window.keyboard.press("Control+z");
    await app.window.waitForTimeout(WRITTEN_MS);

    await expect.poll(() => databaseCellField(app.window, LABEL, HAS_IT).inputValue()).toBe("Commander");
  });
});
