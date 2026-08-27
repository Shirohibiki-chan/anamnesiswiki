// Which half of the window each undo key belongs to.
//
// **Ctrl+Z is the writing's, always.** It used to be the app's as well —
// bound to the sidebar's undo, standing down whenever the caret happened to be
// in text — so the same key undid a sentence in one place and a tree operation
// in another, depending on where you had last clicked. Rejected 2026-08-27 in
// as many words: people expect Ctrl+Z to work on what they are writing.
//
// The pair below is the whole rule, and it is the kind that rots silently:
// nothing else in the app fails if a binding drifts back, and the failure is
// invisible until somebody loses a paragraph to it.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openPage, treeRow, waitForWorld } from "./harness/screen";

const PAGE = "Deep Nesting Test";
const TYPED = "A sentence that Ctrl+Z should take back";

describe("the two undo keys", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("gives Ctrl+Z to whatever is being written", async () => {
    const editor = app.window.locator(".editor-shell-wrapper [contenteditable='true']").first();
    await editor.click();
    await editor.pressSequentially(TYPED);
    await app.window.waitForTimeout(600);
    expect(await app.window.locator(".editor-shell-wrapper").first().innerText()).toContain(TYPED);

    await app.window.keyboard.press("Control+z");
    await app.window.waitForTimeout(600);
    expect(await app.window.locator(".editor-shell-wrapper").first().innerText()).not.toContain(TYPED);
  });

  it("undoes a sidebar operation on Ctrl+Shift+Z instead", async () => {
    await treeRow(app.window, PAGE).first().click({ button: "right" });
    await app.window.getByRole("button", { name: "Duplicate" }).click();
    await app.window.waitForTimeout(1200);
    const afterDuplicate = await app.window.locator(".tree-row").count();

    await app.window.keyboard.press("Control+Shift+z");
    await app.window.waitForTimeout(1200);

    expect(await app.window.locator(".tree-row").count()).toBeLessThan(afterDuplicate);
    expect(await app.window.locator(".history-indicator").innerText()).toContain("Undid");
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
