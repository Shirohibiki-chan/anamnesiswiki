// Phase 28 — the world's folder, zipped, and what is actually inside it.
//
// **The claim this format makes is unusually checkable**: unzip it and you
// have the folder back. So this does exactly that — exports a real generated
// world, opens the archive with the same library that wrote it, and compares
// what came out against what is on disk. A unit test can only check the rules
// about which files travel; this checks that the bytes arrived.
//
// The save dialog is native, so it is answered from the Electron main process
// — see `exports-markdown.e2e.ts` for the same trick and why nothing
// test-only is added to the app to allow it.
import { readdir, readFile, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { waitForWorld } from "./harness/screen";

const MODAL = ".export-modal";

async function openProjectExports(app: RunningApp): Promise<void> {
  await app.window.locator(".tree-project-header").first().click({ button: "right" });
  await app.window.getByText("Export project", { exact: true }).click();
  await app.window.getByText("As JSON (.zip)", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
}

/** Every file under a folder, as `/`-separated paths relative to it. */
async function filesUnder(root: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await filesUnder(root, relative)));
    else out.push(relative);
  }
  return out.sort();
}

describe("exporting the world as JSON", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  // There is no folder for a single character, so offering it on a page's
  // menu would be offering something that cannot mean what it says.
  it("is offered for the project and not for one page", async () => {
    await openProjectExports(app);
    const panel = app.window.locator(".tree-context-menu").first();
    expect((await panel.locator("button").allInnerTexts()).map((entry) => entry.trim())).toContain("As JSON (.zip)");
    await app.window.keyboard.press("Escape");

    await app.window.locator(".tree-row").first().click({ button: "right" });
    await app.window.getByText("Export", { exact: true }).click();
    await app.window.getByText("As Markdown", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    const rowPanel = app.window.locator(".tree-context-menu").first();
    expect((await rowPanel.locator("button").allInnerTexts()).map((entry) => entry.trim())).not.toContain("As JSON (.zip)");
    await app.window.keyboard.press("Escape");
  });

  it("counts the real folder before writing anything", async () => {
    await openProjectExports(app);
    await app.window.getByText("As JSON (.zip)", { exact: true }).click();

    const modal = app.window.locator(MODAL);
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    // The count arrives from disk rather than from the store, so the modal
    // opens on "looking" and the number lands after.
    await expect.poll(() => modal.locator(".export-modal-summary").innerText(), { timeout: 20_000 }).toMatch(/\d+ files/);

    const summary = await modal.locator(".export-modal-summary").innerText();
    expect(Number(summary.match(/(\d+) files/)![1])).toBeGreaterThan(10);
    expect(summary).toContain("rather than anything converted");

    await app.window.getByRole("button", { name: "Cancel", exact: true }).click();
    await modal.waitFor({ state: "detached", timeout: 10_000 });
  });

  it("writes a zip that unzips back into the project folder", async () => {
    const destination = await mkdtemp(join(tmpdir(), "anamnesis-zip-"));
    const target = join(destination, "world.zip");
    try {
      await app.electron.evaluate(({ dialog }, chosen) => {
        const original = dialog.showSaveDialog.bind(dialog);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dialog as any).showSaveDialog = async (...args: unknown[]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (dialog as any).showSaveDialog = original;
          void args;
          return { canceled: false, filePath: chosen };
        };
      }, target);

      await openProjectExports(app);
      await app.window.getByText("As JSON (.zip)", { exact: true }).click();
      const modal = app.window.locator(MODAL);
      await modal.waitFor({ state: "visible", timeout: 10_000 });
      const save = app.window.getByRole("button", { name: "Choose where to save", exact: true });
      await save.waitFor({ state: "visible", timeout: 20_000 });
      await save.click();

      await expect.poll(() => modal.locator(".export-modal-path").count(), { timeout: 60_000 }).toBe(1);
      await app.window.getByRole("button", { name: "Done", exact: true }).click();

      const unpacked = unzipSync(new Uint8Array(await readFile(target)));
      const inZip = Object.keys(unpacked).sort();
      expect(inZip.length).toBeGreaterThan(10);

      // Everything sits under one folder, so unzipping does not empty
      // seventy files into whatever folder she happened to be in.
      const roots = new Set(inZip.map((path) => path.split("/")[0]));
      expect(roots.size).toBe(1);
      const [root] = [...roots];

      // The claim: it is the folder. Compared against the world on disk,
      // minus what is deliberately left behind.
      const everything = await filesUnder(app.world!.path);
      // The one exclusion that matters, asserted rather than assumed: the app
      // is running, so the marker saying so is really there to be left out.
      expect(everything).toContain(".anamnesis-open.json");
      expect(inZip.some((path) => path.endsWith(".anamnesis-open.json"))).toBe(false);

      const onDisk = everything.filter((path) => !path.split("/").some((part) => part.startsWith(".anamnesis-")));
      expect(inZip.map((path) => path.slice(root.length + 1))).toEqual(onDisk);

      // And the bytes, not just the names — a page read back out of the
      // archive has to be the page.
      const page = onDisk.find((path) => path.endsWith(".json") && path !== "project.json")!;
      expect(Buffer.from(unpacked[`${root}/${page}`]).equals(await readFile(join(app.world!.path, ...page.split("/"))))).toBe(true);

      // Smaller than the folder it came from, or the compression is not
      // happening at all.
      const rawBytes = (await Promise.all(onDisk.map((path) => stat(join(app.world!.path, ...path.split("/")))))).reduce((sum, s) => sum + s.size, 0);
      expect((await stat(target)).size).toBeLessThan(rawBytes);
    } finally {
      await rm(destination, { recursive: true, force: true });
    }
  }, 120_000);
});
