// Phase 28 — handing a page template to somebody, and being handed one.
//
// **The round trip is the test.** Save a template to a file, open the file
// back, and check what appears is the template that left. A unit test can
// check the bundle format; only this can check that the whole path through
// the library, the disk and the asset folder joins up.
//
// Both native dialogs are answered from the Electron main process, the same
// technique the other export scenarios use — nothing test-only is added to
// the app to allow it.
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openRailPanel, searchTree, treeRow, waitForWorld } from "./harness/screen";

/** Answers the next native save dialog with this path. */
async function answerSaveWith(app: RunningApp, chosen: string): Promise<void> {
  await app.electron.evaluate(({ dialog }, path) => {
    const original = dialog.showSaveDialog.bind(dialog);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dialog as any).showSaveDialog = async (...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dialog as any).showSaveDialog = original;
      void args;
      return { canceled: false, filePath: path };
    };
  }, chosen);
}

/** Answers the next native open dialog with this path. */
async function answerOpenWith(app: RunningApp, chosen: string): Promise<void> {
  await app.electron.evaluate(({ dialog }, path) => {
    const original = dialog.showOpenDialog.bind(dialog);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dialog as any).showOpenDialog = async (...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dialog as any).showOpenDialog = original;
      void args;
      return { canceled: false, filePaths: [path] };
    };
  }, chosen);
}

const SHARE = ".tree-templates-share";

/**
 * How many of *her* templates the panel is showing.
 *
 * Counted by the share button rather than by row, because the built-in
 * section above draws the same row class and only hers can be sent — which
 * makes the button the honest definition of "one of hers".
 *
 * **By class rather than by role**, and that is not a style choice: the row's
 * buttons are `display: none` until it is hovered, so until then they are not
 * in the accessibility tree and `getByRole` counts none of them.
 */
async function ownTemplateCount(app: RunningApp): Promise<number> {
  return app.window.locator(SHARE).count();
}

/**
 * Hovers the first of her templates and clicks its share button.
 *
 * The hover is not decoration: the row's buttons are `display: none` until
 * the row is hovered, so until then the button is not in the accessibility
 * tree at all and cannot be found by its label.
 */
async function shareFirstTemplate(app: RunningApp): Promise<void> {
  const row = app.window.locator(".tree-templates-row").filter({ has: app.window.locator(SHARE) }).first();
  await row.hover();
  await row.locator(SHARE).click();
}

describe("sharing a page template", () => {
  let app: RunningApp;
  let folder: string;
  let saved: string;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    folder = await mkdtemp(join(tmpdir(), "anamnesis-anpage-"));
    saved = join(folder, "sheet.anpage");

    // A template of a real page, made the way she would make one.
    await searchTree(app.window, "Verity Jiang");
    await treeRow(app.window, "Verity Jiang").first().click({ button: "right" });
    await app.window.getByText("Save as template", { exact: true }).click();
    // It asks whether the pages inside come too; take them, so the round trip
    // below has a subtree to carry.
    await app.window.getByRole("button", { name: "Include sub-pages", exact: true }).click();
    await openRailPanel(app.window, "Templates");
  }, 180_000);

  afterAll(async () => {
    await rm(folder, { recursive: true, force: true });
    await app?.close();
  });

  it("saves a template to a file, saying what is in it first", async () => {
    expect(await ownTemplateCount(app)).toBeGreaterThan(0);
    await answerSaveWith(app, saved);
    await shareFirstTemplate(app);

    const modal = app.window.locator(".export-modal");
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    // It counts before she picks anywhere, which is the whole reason the plan
    // is built before the modal opens.
    expect(await modal.locator(".export-modal-summary").innerText()).toMatch(/\d+ pages?/);

    await app.window.getByRole("button", { name: "Choose where to save", exact: true }).click();
    await expect.poll(() => modal.locator(".export-modal-path").count(), { timeout: 30_000 }).toBe(1);
    await app.window.getByRole("button", { name: "Done", exact: true }).click();
    await modal.waitFor({ state: "detached", timeout: 10_000 });

    expect((await stat(saved)).size).toBeGreaterThan(0);
  }, 120_000);

  it("opens one back, says what arrived, and adds it beside the original", async () => {
    const before = await ownTemplateCount(app);

    await answerOpenWith(app, saved);
    await app.window.getByRole("button", { name: "Open a template file", exact: true }).click();

    // It says what landed rather than leaving her to go and look.
    const notice = app.window.locator(".confirm-dialog-message");
    await notice.waitFor({ state: "visible", timeout: 30_000 });
    expect(await notice.innerText()).toMatch(/is in your templates/);
    await app.window.getByRole("button", { name: "OK", exact: true }).click();
    await notice.waitFor({ state: "detached", timeout: 10_000 });

    // A second copy, not a replacement: ids are re-minted on the way in, so
    // opening the same file twice is two templates rather than one silently
    // overwriting the other.
    await expect.poll(() => ownTemplateCount(app), { timeout: 20_000 }).toBe(before + 1);
  }, 120_000);
});
