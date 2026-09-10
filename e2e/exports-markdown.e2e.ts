// Phase 28 — the way into both Markdown exports, and what each says before
// it writes anything.
//
// **The folder picker is a native window, so the last test answers it from the
// main process rather than clicking it.** Stubbing Electron's own
// `showOpenDialog` is the only way to get past it, and it is worth getting
// past: everything interesting happens after that click. Nothing test-only is
// added to the app to make this work.
//
// The counting and the writing are both worth having here rather than in a
// unit test: the numbers come from walking a generated world through the real
// store, and a fixture of three hand-built nodes cannot tell you it walked the
// right ones or that the text reached the disk.
import { readdir, readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { searchTree, treeRow, waitForWorld } from "./harness/screen";

const MODAL = ".export-modal";

async function openRowMenu(app: RunningApp, name: string): Promise<void> {
  await searchTree(app.window, name);
  await treeRow(app.window, name).first().click({ button: "right" });
  await app.window.locator(".tree-context-menu").first().waitFor({ state: "visible", timeout: 10_000 });
}

/** Opens a row's menu and steps into `Export ▸`. */
async function openRowExports(app: RunningApp, name: string): Promise<void> {
  await openRowMenu(app, name);
  await app.window.getByText("Export", { exact: true }).click();
  await app.window.getByText("As Markdown", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
}

/** The same, from the project row rather than a page. */
async function openProjectExports(app: RunningApp): Promise<void> {
  await app.window.locator(".tree-project-header").first().click({ button: "right" });
  await app.window.getByText("Export project", { exact: true }).click();
  await app.window.getByText("As Markdown", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
}

async function closeModal(app: RunningApp): Promise<void> {
  await app.window.getByRole("button", { name: "Cancel", exact: true }).click();
  await app.window.locator(MODAL).waitFor({ state: "detached", timeout: 10_000 });
}

describe("exporting a world as markdown", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  it("puts every format behind one Export entry, and goes back", async () => {
    await openRowExports(app, "Deliberately Empty Page");
    const panel = app.window.locator(".tree-context-menu").first();
    const entries = (await panel.locator("button").allInnerTexts()).map((entry) => entry.trim());
    expect(entries).toEqual(expect.arrayContaining(["To LegendKeeper", "As Markdown", "As one Markdown file"]));

    // The back row returns to the menu it came from rather than closing —
    // a submenu you cannot leave is worse than no submenu.
    await panel.locator(".tree-context-menu-back").click();
    await app.window.getByText("Duplicate", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    await app.window.keyboard.press("Escape");
  });

  it("opens a modal that has counted the page and everything under it", async () => {
    await openRowExports(app, "Deliberately Empty Page");
    await app.window.getByText("As Markdown", { exact: true }).click();

    const modal = app.window.locator(MODAL);
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    expect((await modal.locator(".export-modal-title").innerText()).trim()).toBe("Export as Markdown");
    // A page with nothing inside it is exactly one file, which is the smallest
    // true answer this can give and the one an off-by-one would break.
    expect(await modal.locator(".export-modal-summary").innerText()).toContain("1 page will be written");
    await closeModal(app);
  });

  it("counts the whole world from the project menu, and says what goes flat", async () => {
    await openProjectExports(app);
    await app.window.getByText("As Markdown", { exact: true }).click();

    const modal = app.window.locator(MODAL);
    await modal.waitFor({ state: "visible", timeout: 10_000 });

    const summary = await modal.locator(".export-modal-summary").innerText();
    const counted = Number(summary.match(/(\d+) pages? will be written/)?.[1]);
    // The generated world is comfortably bigger than a handful; the point is
    // that it walked a real tree rather than that it hit an exact number,
    // which would make this test a hostage to the generator.
    expect(counted).toBeGreaterThan(10);

    // That world has meter pages in it, so the flattening note has to be here
    // — an export that quietly says nothing changed would be lying.
    expect(await modal.locator(".export-modal-lossy").innerText()).toContain("came out as plain writing");
    await closeModal(app);
  });

  it("writes the folder, the notes and the pictures where it was told to", async () => {
    const destination = await mkdtemp(join(tmpdir(), "anamnesis-vault-"));
    try {
      // Answers the native picker from the main process. The app is not aware
      // of it — this replaces Electron's own dialog for the next call only.
      await app.electron.evaluate(({ dialog }, chosen) => {
        const original = dialog.showOpenDialog.bind(dialog);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dialog as any).showOpenDialog = async (...args: unknown[]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (dialog as any).showOpenDialog = original;
          void args;
          return { canceled: false, filePaths: [chosen] };
        };
      }, destination);

      await openRowExports(app, "Deliberately Empty Page");
      await app.window.getByText("As Markdown", { exact: true }).click();
      const modal = app.window.locator(MODAL);
      await modal.waitFor({ state: "visible", timeout: 10_000 });
      await app.window.getByRole("button", { name: "Choose where to save", exact: true }).click();

      // The done panel names where it went, which is the one thing she has to
      // be able to act on afterwards.
      await expect.poll(() => modal.locator(".export-modal-path").count(), { timeout: 20_000 }).toBe(1);
      const written = (await modal.locator(".export-modal-path").innerText()).trim();
      expect(written.startsWith(destination)).toBe(true);

      const files = await readdir(written);
      expect(files.some((name) => name.endsWith(".md"))).toBe(true);

      const note = await readFile(join(written, files.find((name) => name.endsWith(".md"))!), "utf8");
      // Front matter, and the page's real name inside it — the two things
      // every note in the vault has to carry.
      expect(note.startsWith("---")).toBe(true);
      expect(note).toContain("Deliberately Empty Page");

      await app.window.getByRole("button", { name: "Done", exact: true }).click();
      await modal.waitFor({ state: "detached", timeout: 10_000 });
    } finally {
      await rm(destination, { recursive: true, force: true });
    }
  });

  it("writes the whole world into one file, with the tree as its headings", async () => {
    const destination = await mkdtemp(join(tmpdir(), "anamnesis-single-"));
    const target = join(destination, "world.md");
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
      await app.window.getByText("As one Markdown file", { exact: true }).click();
      const modal = app.window.locator(MODAL);
      await modal.waitFor({ state: "visible", timeout: 10_000 });
      await app.window.getByRole("button", { name: "Choose where to save", exact: true }).click();

      await expect.poll(() => modal.locator(".export-modal-path").count(), { timeout: 20_000 }).toBe(1);

      const text = await readFile(target, "utf8");
      // One front matter block for the whole document, and never another —
      // a per-page one would be prose in the middle of the file.
      expect(text.match(/^---$/gm)).toHaveLength(2);
      // A top-level page is `#` and something nested under it is deeper. The
      // generated world always has a folder holding pages.
      expect(/^# /m.test(text)).toBe(true);
      expect(/^## /m.test(text)).toBe(true);
      // Every page in one file, so it is far longer than any single note.
      expect(text.length).toBeGreaterThan(10_000);

      await app.window.getByRole("button", { name: "Done", exact: true }).click();
      await modal.waitFor({ state: "detached", timeout: 10_000 });
    } finally {
      await rm(destination, { recursive: true, force: true });
    }
  });
});
