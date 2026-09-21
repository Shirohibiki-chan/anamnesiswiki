// A board in the exports. Phase 32, step 7.
//
// What only the real app can answer: that the drawing library draws a
// PNG of a board — with a page card and a note swapped for shapes it can
// draw — and that the Markdown folder and the website carry it and point
// their page at it; that the one big file carries it inside itself; and
// that the LegendKeeper export says the board is left out. The picture
// export runs in the window, with the library's fonts and canvas, which
// is nothing a unit test has.
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBoardNote,
  clearTreeSearch,
  deselectOnBoard,
  drawBoardRectangleAt,
  finishBoardNote,
  makeBoard,
  putPageOnBoard,
  searchTree,
  treeRow,
  waitForBoardCards,
  waitForWorld,
} from "./harness/screen";

const MODAL = ".export-modal";

/** A page the generated world really has — see a-storyline-existing-pages. */
const PAGE = "Longford";

/** Opens the board row's menu and steps into `Export ▸`. */
async function openRowExports(app: RunningApp, name: string): Promise<void> {
  await searchTree(app.window, name);
  await treeRow(app.window, name).first().click({ button: "right" });
  await app.window.locator(".tree-context-menu").first().waitFor({ state: "visible", timeout: 10_000 });
  await app.window.getByText("Export", { exact: true }).click();
  await app.window.getByText("As Markdown", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
}

/** Answers the next native folder picker from the main process with `chosen`. */
async function answerFolderPicker(app: RunningApp, chosen: string): Promise<void> {
  await app.electron.evaluate(({ dialog }, folder) => {
    const original = dialog.showOpenDialog.bind(dialog);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dialog as any).showOpenDialog = async (...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dialog as any).showOpenDialog = original;
      void args;
      return { canceled: false, filePaths: [folder] };
    };
  }, chosen);
}

/** Answers the next native save picker from the main process with `chosen`. */
async function answerSavePicker(app: RunningApp, chosen: string): Promise<void> {
  await app.electron.evaluate(({ dialog }, file) => {
    const original = dialog.showSaveDialog.bind(dialog);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dialog as any).showSaveDialog = async (...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dialog as any).showSaveDialog = original;
      void args;
      return { canceled: false, filePath: file };
    };
  }, chosen);
}

/** Clicks the save button once the plan is up, and returns where the export says it went. */
async function saveExport(app: RunningApp): Promise<string> {
  const modal = app.window.locator(MODAL);
  await modal.waitFor({ state: "visible", timeout: 10_000 });
  await app.window.getByRole("button", { name: "Choose Where to Save", exact: true }).waitFor({ state: "visible", timeout: 20_000 });
  await app.window.getByRole("button", { name: "Choose Where to Save", exact: true }).click();
  await expect.poll(() => modal.locator(".export-modal-path").count(), { timeout: 60_000 }).toBe(1);
  const written = (await modal.locator(".export-modal-path").innerText()).trim();
  await app.window.getByRole("button", { name: "Done", exact: true }).click();
  await modal.waitFor({ state: "detached", timeout: 10_000 });
  return written;
}

function isPng(bytes: Buffer): boolean {
  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

describe("a board in the exports", () => {
  let app: RunningApp;
  const BOARD = "War room";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type(BOARD);
    await app.window.keyboard.press("Enter");
    await makeBoard(app.window);
    // A shape the library draws itself, and two things the app draws that
    // have to be swapped for the picture: a page card and a note.
    await drawBoardRectangleAt(app.window, { x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 });
    await putPageOnBoard(app.window, PAGE);
    await waitForBoardCards(app.window, 1);
    await addBoardNote(app.window, "teal");
    await app.window.keyboard.type("Siege plans", { delay: 20 });
    await finishBoardNote(app.window);
    await deselectOnBoard(app.window);
    // The board's file is written a moment after the last change.
    await app.window.waitForTimeout(2500);
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  it("goes into the Markdown folder as a PNG the page points at, and the summary says so", async () => {
    const destination = await mkdtemp(join(tmpdir(), "anamnesis-board-vault-"));
    try {
      await answerFolderPicker(app, destination);
      await openRowExports(app, BOARD);
      await app.window.getByText("As Markdown", { exact: true }).click();
      const modal = app.window.locator(MODAL);
      await expect.poll(() => modal.locator(".export-modal-lossy").innerText().catch(() => ""), { timeout: 20_000 }).toContain("1 board goes in as a picture");
      const written = await saveExport(app);

      const note = await readFile(join(written, `${BOARD}.md`), "utf8");
      const match = note.match(/!\[War room\]\((assets\/board-[^)]+\.png)\)/);
      expect(match).not.toBeNull();
      const png = await readFile(join(written, match![1]));
      expect(isPng(png)).toBe(true);
      // A drawing with three things on it is well past a blank tile.
      expect(png.length).toBeGreaterThan(2000);
    } finally {
      await rm(destination, { recursive: true, force: true });
    }
  });

  it("goes into the one big file as a picture written into the file itself", async () => {
    const destination = await mkdtemp(join(tmpdir(), "anamnesis-board-single-"));
    const target = join(destination, "world.md");
    try {
      await answerSavePicker(app, target);
      await openRowExports(app, BOARD);
      await app.window.getByText("As One Markdown File", { exact: true }).click();
      await saveExport(app);
      const text = await readFile(target, "utf8");
      expect(text).toContain("![War room](data:image/png;base64,");
    } finally {
      await rm(destination, { recursive: true, force: true });
    }
  });

  it("goes onto the website as a picture above the page", async () => {
    const destination = await mkdtemp(join(tmpdir(), "anamnesis-board-site-"));
    try {
      await answerFolderPicker(app, destination);
      await openRowExports(app, BOARD);
      await app.window.getByText("As a Website", { exact: true }).click();
      const written = await saveExport(app);
      const page = await readFile(join(written, `${BOARD}.html`), "utf8");
      const match = page.match(/<figure class="board-picture"><img src="(assets\/board-[^"]+\.png)"/);
      expect(match).not.toBeNull();
      expect(isPng(await readFile(join(written, match![1])))).toBe(true);
    } finally {
      await rm(destination, { recursive: true, force: true });
    }
  });

  it("is named as left out of the LegendKeeper file", async () => {
    await openRowExports(app, BOARD);
    await app.window.getByText("To LegendKeeper", { exact: true }).click();
    const modal = app.window.locator(MODAL);
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    expect(await modal.locator(".export-modal-lossy").innerText()).toContain("1 board goes across as an empty page");
    await app.window.getByRole("button", { name: "Cancel", exact: true }).click();
    await modal.waitFor({ state: "detached", timeout: 10_000 });
  });
});
