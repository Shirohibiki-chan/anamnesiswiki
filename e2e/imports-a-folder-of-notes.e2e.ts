// Phase 20 — a folder of markdown comes in as a new world, and the round trip
// through the Markdown export holds in the real app.
//
// The export scenario checks that notes reach the disk; this one checks that
// the same notes come back as a world she can open. It uses the export
// because that is the only vault the suite can make without a fixture, and
// because the export writing something the import cannot read is exactly the
// bug this phase is for.
//
// **Both native pickers are answered from the main process**, the way
// `exports-markdown.e2e.ts` does it. Nothing test-only is added to the app.
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { editorMentions, editorText, openPage, projectName, visibleTreeRows, waitForWorld } from "./harness/screen";

/** Answers Electron's next open-dialog with `chosen`, then restores it. */
async function answerNextOpenDialog(app: RunningApp, chosen: string): Promise<void> {
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

describe("importing a folder of notes", () => {
  let app: RunningApp;
  let destination: string;
  let vault: string;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);

    // Export the whole world as a vault, so there is a folder to import.
    destination = await mkdtemp(join(tmpdir(), "anamnesis-import-"));
    await answerNextOpenDialog(app, destination);
    await app.window.locator(".tree-project-header").first().click({ button: "right" });
    await app.window.getByText("Export project", { exact: true }).click();
    await app.window.getByText("As Markdown", { exact: true }).click();
    const modal = app.window.locator(".export-modal");
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    await app.window.getByRole("button", { name: "Choose where to save", exact: true }).click();
    await modal.locator(".export-modal-path").waitFor({ state: "visible", timeout: 20_000 });
    vault = (await modal.locator(".export-modal-path").innerText()).trim();
    await app.window.getByRole("button", { name: "Done", exact: true }).click();
    await modal.waitFor({ state: "detached", timeout: 10_000 });
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    if (destination) await rm(destination, { recursive: true, force: true });
  });

  it("offers a folder beside a file on the import screen", async () => {
    await app.window.getByLabel("Switch project").click();
    await app.window.locator(".start").waitFor({ state: "visible", timeout: 20_000 });
    await app.window.getByRole("button", { name: /^Import/ }).click();

    const modal = app.window.locator(".import-modal");
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    await expect.poll(() => modal.getByRole("button", { name: "Choose a file", exact: true }).count()).toBe(1);
    await expect.poll(() => modal.getByRole("button", { name: "Choose a folder", exact: true }).count()).toBe(1);
  });

  it("reads the exported vault and previews what it found", async () => {
    const modal = app.window.locator(".import-modal");
    await answerNextOpenDialog(app, vault);
    await modal.getByRole("button", { name: "Choose a folder", exact: true }).click();

    await modal.locator(".import-modal-summary").waitFor({ state: "visible", timeout: 30_000 });
    const summary = (await modal.locator(".import-modal-summary").innerText()).trim();
    // As many pages as the vault has notes — the export wrote one per page.
    const notes = (await readdir(vault, { recursive: true })).filter((name) => name.endsWith(".md")).length;
    expect(summary).toContain(`${notes} page`);

    // The project is named after the folder, which is named after the world.
    const name = await modal.locator(".import-modal-name-field input").inputValue();
    expect(name).toBe(app.world?.name);
  });

  it("writes it and opens it as a world with the same pages", async () => {
    const modal = app.window.locator(".import-modal");
    await modal.getByRole("button", { name: "Import", exact: true }).click();
    await modal.waitFor({ state: "detached", timeout: 60_000 });
    await waitForWorld(app.window);

    expect(await projectName(app.window)).toBe(app.world?.name);
    const rows = await visibleTreeRows(app.window);
    // The generator's top-level sections, present in every world it writes.
    // Not a row count: the world it left had three sections open and this one
    // arrives with everything closed, so the counts differ by design.
    expect(rows).toContain("Characters");
    expect(rows).toContain("Hard Cases");
  });

  it("brought a page's writing and its links along with it", async () => {
    // A page the generator always writes with fixed prose, a heading and a
    // link back to itself — see scripts/make-test-world.mjs.
    await openPage(app.window, "A Link To A Spot Further Down This Page");
    const text = await editorText(app.window);
    expect(text).toContain("The part worth reading is");
    expect(text).toContain("The Spot Being Linked To");
    expect(text).toContain("And this is what was worth coming down here for.");
    // The mention came back as a chip, wearing the words she gave it.
    expect(await editorMentions(app.window)).toContain("further down");
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
