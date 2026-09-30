// The import window's tiles, and the two imports added with them (2026-09-30):
// a world's own backup, and a website.
//
// **Both are round trips through the app's own exports**, because those are
// the only backup and the only website the suite can make without a fixture,
// and because an export the import cannot read is exactly the bug worth
// catching. The HTML half also proves the translator runs in the real
// renderer: the unit tests give it a DOM from happy-dom, and this is the one
// place it meets Chromium's.
//
// Native pickers are answered from the main process, as in
// `imports-a-folder-of-notes.e2e.ts`; nothing test-only is added to the app.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { projectName, visibleTreeRows, waitForWorld } from "./harness/screen";

async function answerNextDialog(app: RunningApp, kind: "open" | "save", chosen: string): Promise<void> {
  await app.electron.evaluate(
    ({ dialog }, { kind, chosen }) => {
      const key = kind === "open" ? "showOpenDialog" : "showSaveDialog";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const original = (dialog as any)[key].bind(dialog);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dialog as any)[key] = async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dialog as any)[key] = original;
        return kind === "open" ? { canceled: false, filePaths: [chosen] } : { canceled: false, filePath: chosen };
      };
    },
    { kind, chosen },
  );
}

async function exportProject(app: RunningApp, format: string): Promise<string> {
  await app.window.locator(".tree-project-header").first().click({ button: "right" });
  await app.window.getByText("Export Project", { exact: true }).click();
  await app.window.getByText(format, { exact: true }).click();
  const modal = app.window.locator(".export-modal");
  await modal.waitFor({ state: "visible", timeout: 10_000 });
  const save = app.window.getByRole("button", { name: "Choose Where to Save", exact: true });
  await save.waitFor({ state: "visible", timeout: 20_000 });
  await save.click();
  await modal.locator(".export-modal-path").waitFor({ state: "visible", timeout: 60_000 });
  const written = (await modal.locator(".export-modal-path").innerText()).trim();
  await app.window.getByRole("button", { name: "Done", exact: true }).click();
  await modal.waitFor({ state: "detached", timeout: 10_000 });
  return written;
}

async function openImportWindow(app: RunningApp) {
  if (!(await app.window.locator(".start").isVisible())) await app.window.getByLabel("Switch project").click();
  await app.window.locator(".start").waitFor({ state: "visible", timeout: 20_000 });
  await app.window.getByRole("button", { name: /^Import/ }).click();
  const modal = app.window.locator(".import-modal");
  await modal.waitFor({ state: "visible", timeout: 10_000 });
  return modal;
}

async function importAs(app: RunningApp, modal: ReturnType<RunningApp["window"]["locator"]>, name: string): Promise<void> {
  await modal.locator(".import-modal-name-field input").fill(name);
  await modal.getByRole("button", { name: "Import", exact: true }).click();
  await modal.waitFor({ state: "detached", timeout: 60_000 });
  await waitForWorld(app.window);
}

describe("importing by source", () => {
  let app: RunningApp;
  let scratch: string;
  let originalRows: string[];
  let zip: string;
  let site: string;

  // Both exports first, while the generated world is the one open.
  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    originalRows = await visibleTreeRows(app.window);
    scratch = await mkdtemp(join(tmpdir(), "anamnesis-import-by-source-"));

    zip = join(scratch, "backup.zip");
    await answerNextDialog(app, "save", zip);
    await exportProject(app, "As JSON (.zip)");

    await answerNextDialog(app, "open", scratch);
    site = await exportProject(app, "As a Website");
  }, 240_000);

  afterAll(async () => {
    await app?.close();
    if (scratch) await rm(scratch, { recursive: true, force: true });
  });

  it("lists every source as its own tile, with a place to drop", async () => {
    const modal = await openImportWindow(app);
    const tiles = (await modal.locator(".import-modal-source b").allInnerTexts()).map((text) => text.trim());
    expect(tiles).toEqual(["LegendKeeper", "Obsidian", "Text & Markdown", "HTML", "Anamnesis Backup", "Folder", "Zip"]);
    expect(await modal.locator(".import-modal-drop").innerText()).toMatch(/Drop a file or folder here/);
    // Closed from the backdrop, the way the window is closed by hand.
    await app.window.locator(".ui-backdrop").click({ position: { x: 5, y: 5 } });
    await modal.waitFor({ state: "detached", timeout: 10_000 });
  });

  it("restores a backup made by Export as JSON, whole", async () => {
    const modal = await openImportWindow(app);
    await answerNextDialog(app, "open", zip);
    await modal.getByRole("button", { name: /^Anamnesis Backup/ }).click();
    await expect.poll(() => modal.locator(".import-modal-summary").innerText(), { timeout: 30_000 }).toMatch(/A backup of an Anamnesis world — \d+ pages/);
    await importAs(app, modal, "Restored From Backup");

    expect(await projectName(app.window)).toBe("Restored From Backup");
    // Nothing translated, so the tree comes back exactly as it was left.
    expect(await visibleTreeRows(app.window)).toEqual(originalRows);
  }, 180_000);

  it("reads a website back in through its index.html", async () => {
    const modal = await openImportWindow(app);
    await answerNextDialog(app, "open", join(site, "index.html"));
    await modal.getByRole("button", { name: /^HTML/ }).click();
    await expect.poll(() => modal.locator(".import-modal-summary").innerText(), { timeout: 30_000 }).toMatch(/\d+ pages? found/);
    const pages = Number((await modal.locator(".import-modal-summary").innerText()).match(/(\d+) pages? found/)![1]);
    expect(pages).toBeGreaterThan(10);
    await importAs(app, modal, "Restored From Website");

    expect(await projectName(app.window)).toBe("Restored From Website");
    const rows = await visibleTreeRows(app.window);
    expect(rows).toContain("Characters");
  }, 180_000);

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
