// A template names the pages inside it after the page they land in (Queued
// Adjustments, asked for 2026-08-31): `Damien` getting `Damien_Pics` and
// `Damien_Sheets`, renamed with it, and offered to pages that already exist.
//
// The whole road, in the real app: a page with two sub-pages saved as a
// template, the rule switched on in the template's own view, a new page made
// from it through the grid, a rename that carries the children with it, a
// child renamed by hand that then stays put, the right-click route into an
// existing page with its count — twice, to see it skip — and the name asked
// for first when the page is still "Untitled".
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addPageInside,
  clearTreeSearch,
  makeBlankPage,
  makePageOfTemplate,
  openPage,
  openRailPanel,
  openTemplateForEditing,
  openTreeRowMenu,
  pickTreeMenuItem,
  readNotice,
  renameOpenPage,
  saveRowAsTemplate,
  searchTree,
  visibleTreeRows,
  waitForWorld,
} from "./harness/screen";

const SOURCE = "Damien";
const EXISTING = "Thonn Lindqvist";

/**
 * The rows the tree shows for a search that begin with the text, in tree
 * order. The search is fuzzy and shows a hit's ancestors too, so the rows
 * that matter are picked out of what it shows rather than taken whole.
 */
async function rowsMatching(app: RunningApp, text: string): Promise<string[]> {
  await searchTree(app.window, text);
  await app.window.waitForTimeout(300);
  const rows = await visibleTreeRows(app.window);
  await clearTreeSearch(app.window);
  return rows.filter((row) => row.startsWith(text));
}

describe("a template that names the pages inside", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);

    // The shape: a character holding Pics and Sheets, saved with them.
    await makePageOfTemplate(app.window, SOURCE, "Character");
    await addPageInside(app.window, SOURCE, "Pics");
    await addPageInside(app.window, SOURCE, "Sheets");
    await saveRowAsTemplate(app.window, SOURCE, true);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("offers the rule on the template, with an example", async () => {
    await openTemplateForEditing(app.window, SOURCE);
    const box = app.window.locator(".template-view-naming");
    await box.getByRole("checkbox").check();
    const text = await box.innerText();
    expect(text).toContain("Damien_Pics");
    // Back to the tree for the rest.
    await openRailPanel(app.window, "Project");
  });

  it("names a new page's sub-pages after it", async () => {
    await makeBlankPage(app.window, "Kestrel");
    await app.window.locator(".new-page-landing-custom .new-page-landing-choice").filter({ hasText: SOURCE }).click();
    await app.window.waitForTimeout(1200);
    expect(await rowsMatching(app, "Kestrel")).toEqual(["Kestrel", "Kestrel_Pics", "Kestrel_Sheets"]);
  });

  it("renames them with the page", async () => {
    await openPage(app.window, "Kestrel");
    await renameOpenPage(app.window, "Kes");
    await app.window.waitForTimeout(1200);
    expect(await rowsMatching(app, "Kes")).toEqual(["Kes", "Kes_Pics", "Kes_Sheets"]);
  });

  it("leaves a sub-page alone once it has been renamed by hand", async () => {
    await openPage(app.window, "Kes_Pics");
    await renameOpenPage(app.window, "Gallery");
    await openPage(app.window, "Kes");
    await renameOpenPage(app.window, "Kestrel");
    await app.window.waitForTimeout(1200);
    expect(await rowsMatching(app, "Kestrel")).toEqual(["Kestrel", "Kestrel_Sheets"]);
    expect(await rowsMatching(app, "Gallery")).toEqual(["Gallery"]);
  });

  it("puts the template's pages inside a page that already exists, and says how many", async () => {
    await openTreeRowMenu(app.window, EXISTING);
    await pickTreeMenuItem(app.window, "Add Pages From Template");
    await pickTreeMenuItem(app.window, SOURCE);
    expect(await readNotice(app.window)).toBe(`2 pages added inside "${EXISTING}".`);
    await clearTreeSearch(app.window);
    expect(await rowsMatching(app, EXISTING)).toEqual([EXISTING, `${EXISTING}_Pics`, `${EXISTING}_Sheets`]);
  });

  it("skips the ones already there the second time", async () => {
    await openTreeRowMenu(app.window, EXISTING);
    await pickTreeMenuItem(app.window, "Add Pages From Template");
    await pickTreeMenuItem(app.window, SOURCE);
    expect(await readNotice(app.window)).toBe(`Nothing added inside "${EXISTING}" — all 2 were already there.`);
    await clearTreeSearch(app.window);
    expect(await rowsMatching(app, EXISTING)).toHaveLength(3);
  });

  it("asks for the name first when the page has none yet", async () => {
    await app.window.keyboard.press("Control+n");
    await app.window.locator(".new-page-landing").waitFor({ state: "visible", timeout: 20_000 });
    await app.window.keyboard.press("Escape");
    await app.window.locator(".new-page-landing-custom .new-page-landing-choice").filter({ hasText: SOURCE }).click();

    const prompt = app.window.getByRole("dialog", { name: "What Is This Page Called?" });
    await prompt.waitFor({ state: "visible", timeout: 20_000 });
    await prompt.getByLabel("Name").fill("Rook");
    await prompt.getByRole("button", { name: "Continue" }).click();
    await app.window.waitForTimeout(1200);
    expect(await rowsMatching(app, "Rook")).toEqual(["Rook", "Rook_Pics", "Rook_Sheets"]);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
