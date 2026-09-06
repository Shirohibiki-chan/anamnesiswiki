// Turning a top-level page into a universe, and the rule that keeps it there.
//
// **Phase 22's first half, and the half a unit test cannot finish.**
// `node-edit-service.test.ts` says a move that would file a universe inside
// something returns no plan, and `tree-service.test.ts` says the Move to menu
// offers it nowhere — but neither can say that the conversion reached the disk,
// which is the only thing that decides whether her worlds are still arranged
// this way tomorrow morning. So the assertions here survive a reload.
//
// The menu item is read as the proof of what the page *is*: "Turn back into a
// folder" only appears on a top-level row that is already a universe, so
// finding it after a restart says the template key was written and read back.
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
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

/** Right-clicks a row and returns once its menu is up. */
async function openRowMenu(app: RunningApp, name: string): Promise<void> {
  await searchTree(app.window, name);
  await treeRow(app.window, name).first().click({ button: "right" });
  await app.window.locator(".tree-context-menu").first().waitFor({ state: "visible", timeout: 10_000 });
}

/** The labels the row's own menu is offering, so a missing item is a real absence. */
async function menuItems(app: RunningApp): Promise<string[]> {
  const labels = await app.window.locator(".tree-context-menu button").allInnerTexts();
  return labels.map((label) => label.replace(/\s+/g, " ").trim());
}

async function closeMenu(app: RunningApp): Promise<void> {
  await app.window.keyboard.press("Escape");
  await app.window.locator(".tree-context-menu").first().waitFor({ state: "hidden", timeout: 10_000 });
}

describe("making a universe", () => {
  let app: RunningApp;

  // Both names are fixed by the world generator rather than read off the tree:
  // "Hard Cases" is one of its top-level folders and "Deep Nesting Test" sits
  // inside another one, which is exactly the pair this needs. Reading them off
  // the screen instead is what the first draft did, and it cannot be done
  // reliably — the tree is virtualised, so expanding a row does not change how
  // many rows are in the page.
  const TOP_LEVEL = "Hard Cases";
  const NESTED = "Deep Nesting Test";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("offers the conversion on a top-level page and nowhere else", async () => {
    await openRowMenu(app, TOP_LEVEL);
    expect(await menuItems(app)).toContain("Turn into a universe");
    await closeMenu(app);

    await openRowMenu(app, NESTED);
    // The whole point of the word: a universe that could sit inside something
    // would be a folder, which is the shape it replaces.
    expect(await menuItems(app)).not.toContain("Turn into a universe");
    await closeMenu(app);
    await clearTreeSearch(app.window);
  });

  it("turns a page into one, and it is still one after a reload", async () => {
    await openRowMenu(app, TOP_LEVEL);
    await app.window.getByRole("button", { name: "Turn into a universe" }).click();
    await app.window.waitForTimeout(WRITTEN_MS);

    await reload(app);

    await openRowMenu(app, TOP_LEVEL);
    // Only a row that already is one offers the way back, so this is the
    // template key having survived the trip to disk and home again.
    expect(await menuItems(app)).toContain("Turn back into a folder");
    await closeMenu(app);
    await clearTreeSearch(app.window);
  });

  it("will not file a universe inside anything", async () => {
    await openRowMenu(app, TOP_LEVEL);
    await app.window.getByRole("button", { name: "Move to" }).click();
    const list = app.window.locator(".tree-move-list");
    await list.waitFor({ state: "visible", timeout: 10_000 });
    // Not "nowhere to put this yet" — the emptiness is the rule, and the
    // hopeful wording would send someone off to make a folder for it.
    expect(await list.innerText()).toContain("A universe stays at the top level");
    await closeMenu(app);
    await clearTreeSearch(app.window);
  });

  it("turns back into a folder, and stays one after a reload", async () => {
    await openRowMenu(app, TOP_LEVEL);
    await app.window.getByRole("button", { name: "Turn back into a folder" }).click();
    await app.window.waitForTimeout(WRITTEN_MS);

    await reload(app);

    await openRowMenu(app, TOP_LEVEL);
    expect(await menuItems(app)).toContain("Turn into a universe");
    await closeMenu(app);
    await clearTreeSearch(app.window);
  });
});
