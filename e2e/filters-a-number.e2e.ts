// A number column can be filtered by a line drawn through it — "more than
// 40" — rather than only by an exact value (Queued Adjustments, 2026-09-21).
//
// The unit tests cover the comparison; this covers the wiring the menu has to
// get right on its own: that a number column offers the comparisons at all,
// that picking one turns the value picker into a box to type in, and that
// what is typed reaches the rows.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  databaseRowNames,
  openDatabaseMenu,
  openPage,
  turnIntoDatabase,
  waitForWorld,
} from "./harness/screen";

/** Long enough for the debounced write to reach the disk. */
const WRITTEN_MS = 1500;

/** Adds a number property to a page through the panel, the way a person would. */
async function addNumber(app: RunningApp, pageName: string, label: string, value: string): Promise<void> {
  await openPage(app.window, pageName);
  await app.window.getByRole("button", { name: "Add Block", exact: true }).click();
  await app.window.getByRole("button", { name: "+ New property" }).click();
  await app.window.getByPlaceholder("Property name").fill(label);
  await app.window.locator(".property-add-type").selectOption("number");
  await app.window.getByRole("button", { name: "Add", exact: true }).click();
  await app.window.waitForTimeout(WRITTEN_MS);
  await app.window.locator(".block-shell", { hasText: label }).last().locator("input").first().fill(value);
  await app.window.waitForTimeout(WRITTEN_MS);
}

async function closeMenu(app: RunningApp): Promise<void> {
  await app.window.keyboard.press("Escape");
  await app.window.locator(".database-menu").first().waitFor({ state: "hidden", timeout: 10_000 });
}

describe("filtering a number column", () => {
  let app: RunningApp;

  const SECTION = "Characters";
  const OLD = "Thonn Lindqvist";
  const YOUNG = "Kalla Reyes";
  const LABEL = "Age";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);

    await addNumber(app, OLD, LABEL, "40");
    await addNumber(app, YOUNG, LABEL, "9");

    await turnIntoDatabase(app.window, SECTION);
    await app.window.waitForTimeout(WRITTEN_MS);
    await clearTreeSearch(app.window);
    await openPage(app.window, SECTION);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("offers more than and less than on the number, and takes a typed line", async () => {
    await openDatabaseMenu(app.window, "filter");
    await app.window.getByRole("button", { name: "Add a Filter" }).click();
    await app.window.getByLabel("What to filter on").selectOption({ label: LABEL });

    const operators = await app.window.getByLabel("How to compare it").locator("option").allInnerTexts();
    expect(operators).toContain("is more than");
    expect(operators).toContain("is less than");
    expect(operators).not.toContain("contains");

    await app.window.getByLabel("How to compare it").selectOption("more-than");
    const box = app.window.getByLabel("What to look for");
    expect(await box.evaluate((el) => el.tagName.toLowerCase())).toBe("input");
    await box.fill("20");
    await closeMenu(app);
  });

  it("keeps the rows over the line and drops the rest, including rows with no number", async () => {
    const names = await databaseRowNames(app.window);
    expect(names).toEqual([OLD]);
  });

  it("turns the line round", async () => {
    await openDatabaseMenu(app.window, "filter");
    await app.window.getByLabel("How to compare it").selectOption("less-than");
    await closeMenu(app);
    expect(await databaseRowNames(app.window)).toEqual([YOUNG]);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
