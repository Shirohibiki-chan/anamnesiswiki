// Moving a page into a folder, and deleting one — the two operations on her
// writing that had no scenario at all.
//
// **Duplicating was already covered (see `undo-keys`), these two were not**, and
// they are the pair that can lose work rather than merely add some. The unit
// tests in `node-edit-service.test.ts` say what the new tree and the new
// ordering should look like; only this can say that the answer reached the
// disk, which is the half that matters the morning after.
//
// Every assertion here survives a reload on purpose. A move or a delete that
// only happened in memory looks exactly like one that worked until the app is
// opened again — which is the worst possible moment to find out.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { clearTreeSearch, searchTree, treeRow, waitForWorld } from "./harness/screen";

/** Long enough for the debounced write and the queued relocation to land. */
const WRITTEN_MS = 1500;

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(
    () => !(window as unknown as { __beforeReload?: boolean }).__beforeReload,
  );
  await waitForWorld(app.window);
}

/** Right-clicks a row and returns once its menu is up. */
async function openRowMenu(app: RunningApp, name: string): Promise<void> {
  await searchTree(app.window, name);
  await treeRow(app.window, name).first().click({ button: "right" });
  await app.window.locator(".tree-context-menu").first().waitFor({ state: "visible", timeout: 10_000 });
}

describe("moving and deleting a page", () => {
  let app: RunningApp;
  /** A page with nothing inside it, and a folder to put it in. */
  let page: string;
  let folder: string;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);

    // Named off the tree rather than assumed: the generated world's ordinary
    // pages have random names, and hardcoding one would tie this scenario to
    // the generator's seed.
    await clearTreeSearch(app.window);
    const rows = await app.window.locator(".tree-row-name").allInnerTexts();
    const names = rows.map((r) => r.replace(/\s+/g, " ").trim()).filter(Boolean);
    folder = names[0];
    page = names.find((n) => n !== folder)!;
  });

  afterAll(async () => {
    await app?.close();
  });

  it("files a page into a folder, and it is still there after a reload", async () => {
    await openRowMenu(app, page);
    await app.window.getByRole("button", { name: "Move to" }).click();
    const search = app.window.locator(".tree-move-search-input");
    await search.waitFor({ state: "visible", timeout: 10_000 });
    await search.fill(folder);
    await search.press("Enter");
    await app.window.waitForTimeout(WRITTEN_MS);

    await reload(app);

    // The page still exists, which is the part a broken move loses.
    await searchTree(app.window, page);
    expect(await treeRow(app.window, page).count()).toBeGreaterThan(0);
    await clearTreeSearch(app.window);
  });

  it("deletes a page, and it stays deleted after a reload", async () => {
    await openRowMenu(app, page);
    await app.window.getByRole("button", { name: "Delete" }).click();

    // Delete is confirmed before it runs.
    const dialog = app.window.locator(".confirm-dialog").first();
    await dialog.waitFor({ state: "visible", timeout: 10_000 });
    await dialog.getByRole("button", { name: /Delete/i }).click();
    await app.window.waitForTimeout(WRITTEN_MS);

    await searchTree(app.window, page);
    expect(await treeRow(app.window, page).count()).toBe(0);
    await clearTreeSearch(app.window);

    await reload(app);

    // The one that would be silent: a delete that never reached the disk comes
    // back looking like nothing happened.
    await searchTree(app.window, page);
    expect(await treeRow(app.window, page).count()).toBe(0);
    await clearTreeSearch(app.window);
  });

  it("takes a deleted page off the shortcut rail with it", async () => {
    // A pinned page is an ordinary page and can be deleted like one, so the
    // rail is the easiest place to be left with a tile pointing at nothing.
    const rows = await app.window.locator(".tree-row-name").allInnerTexts();
    const doomed = rows.map((r) => r.replace(/\s+/g, " ").trim()).filter((n) => n && n !== folder)[0];

    await openRowMenu(app, doomed);
    await app.window.getByRole("button", { name: "Set as shortcut" }).click();
    await app.window.waitForTimeout(WRITTEN_MS);
    expect(await app.window.locator(".bookmarks-rail").getByLabel(doomed, { exact: true }).count()).toBeGreaterThan(0);

    await openRowMenu(app, doomed);
    await app.window.getByRole("button", { name: "Delete" }).click();
    const dialog = app.window.locator(".confirm-dialog").first();
    await dialog.waitFor({ state: "visible", timeout: 10_000 });
    await dialog.getByRole("button", { name: /Delete/i }).click();
    await app.window.waitForTimeout(WRITTEN_MS);
    await clearTreeSearch(app.window);

    expect(await app.window.locator(".bookmarks-rail").getByLabel(doomed, { exact: true }).count()).toBe(0);

    await reload(app);
    expect(await app.window.locator(".bookmarks-rail").getByLabel(doomed, { exact: true }).count()).toBe(0);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
