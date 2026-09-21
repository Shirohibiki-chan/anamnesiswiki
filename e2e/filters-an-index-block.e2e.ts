// A Subpage index block in the sidebar has the same settings a page shown as
// a database has — columns, filter, sort, group — behind one control on its
// own bar (Queued Adjustments, 2026-09-21).
//
// The engine was never in question: a block's view is the same record a page
// stores and goes through the same pipeline. What was missing was the menus
// being reachable at a sidebar's width, so this checks the reaching: the
// control is there, the menus open from it, a filter written there thins the
// block's rows, and the one thing a block must not offer — widening where
// its rows come from — is not offered.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBlockToPanel,
  addPageInside,
  blockDatabaseRowNames,
  clearTreeSearch,
  flipDatabaseSort,
  makePageOfTemplate,
  openBlockDatabaseMenu,
  openPage,
  waitForWorld,
} from "./harness/screen";

const CREW = "The Crew";

describe("an index block's settings", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await makePageOfTemplate(app.window, CREW, "Faction");
    for (const name of ["Ana", "Bo", "Cy"]) await addPageInside(app.window, CREW, name);
    await openPage(app.window, CREW);
    await addBlockToPanel(app.window, "Subpage Index");
    await app.window.waitForTimeout(600);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("lists the pages inside to begin with", async () => {
    expect(await blockDatabaseRowNames(app.window)).toEqual(["Ana", "Bo", "Cy"]);
  });

  it("thins the rows with a filter written in the block's own menu", async () => {
    await openBlockDatabaseMenu(app.window, "filter");
    // Not on a block: its rows are its source's.
    expect(await app.window.getByLabel("Where to look for rows").count()).toBe(0);

    await app.window.getByRole("button", { name: "Add a Filter" }).click();
    await app.window.getByLabel("What to filter on").selectOption("name");
    await app.window.getByLabel("How to compare it").selectOption("contains");
    await app.window.getByLabel("What to look for").fill("b");
    await app.window.keyboard.press("Escape");
    await app.window.locator(".database-menu").waitFor({ state: "hidden", timeout: 10_000 });

    expect(await blockDatabaseRowNames(app.window)).toEqual(["Bo"]);
    // The control says something is on.
    expect(await app.window.locator('[data-tool="block-settings"][data-on]').count()).toBe(1);
  });

  it("sorts them the other way round from the same place", async () => {
    await openBlockDatabaseMenu(app.window, "filter");
    await app.window.getByRole("button", { name: /^Remove the/ }).click();
    await app.window.keyboard.press("Escape");
    await app.window.locator(".database-menu").waitFor({ state: "hidden", timeout: 10_000 });

    await openBlockDatabaseMenu(app.window, "sort");
    await app.window.getByRole("button", { name: "Add a Sort" }).click();
    await app.window.getByLabel("What to sort by").selectOption("name");
    await flipDatabaseSort(app.window);
    await app.window.keyboard.press("Escape");
    await app.window.locator(".database-menu").waitFor({ state: "hidden", timeout: 10_000 });

    expect(await blockDatabaseRowNames(app.window)).toEqual(["Cy", "Bo", "Ana"]);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
