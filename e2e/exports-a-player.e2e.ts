// A player leaves with the page. Phase 31, step 3, 2026-09-21.
//
// What only the real app can answer: that a player pasted into a page is
// written into the Markdown the app exports as its link on a line of its
// own with the caption under it — the form the importer reads back — and
// that the sidebar's player goes out under its own heading. The parsing
// half of the round trip is unit-tested in markdown-parse.test.ts against
// exactly these lines; this is the writing half, through the real export.
import { readdir, readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBlockToPanel,
  captionMedia,
  clickLastLineInEditor,
  giveMediaLink,
  makePageOfTemplate,
  pasteTextInEditor,
  searchTree,
  treeRow,
  typeInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Playlist Page";
const VIDEO = "https://youtu.be/dQw4w9WgXcQ";
const TRACK = "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC";
const MODAL = ".export-modal";

describe("exporting a page with players", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await makePageOfTemplate(app.window, PAGE, "Note");
    await typeInEditor(app.window, "");
    await app.window.keyboard.press("Control+a");
    await app.window.keyboard.press("Backspace");
    await clickLastLineInEditor(app.window);
    await pasteTextInEditor(app.window, VIDEO);
    await app.window.locator(".media-embed").first().waitFor({ state: "visible" });
    await captionMedia(app.window, 0, "Her theme");
    await addBlockToPanel(app.window, "Music or Video");
    await giveMediaLink(app.window, TRACK);
    await app.window.locator(".block-media .media-player-spotify").first().waitFor({ state: "visible" });
    // Long enough for the autosave, which is what the export reads.
    await app.window.waitForTimeout(2500);
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  it("writes the page's player as its link with the caption under it, and the sidebar's under its heading", async () => {
    const destination = await mkdtemp(join(tmpdir(), "anamnesis-players-"));
    try {
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

      await searchTree(app.window, PAGE);
      await treeRow(app.window, PAGE).first().click({ button: "right" });
      await app.window.locator(".tree-context-menu").first().waitFor({ state: "visible", timeout: 10_000 });
      await app.window.getByText("Export", { exact: true }).click();
      await app.window.getByText("As Markdown", { exact: true }).click();
      const modal = app.window.locator(MODAL);
      await modal.waitFor({ state: "visible", timeout: 10_000 });
      await app.window.getByRole("button", { name: "Choose Where to Save", exact: true }).click();
      await expect.poll(() => modal.locator(".export-modal-path").count(), { timeout: 20_000 }).toBe(1);
      const written = (await modal.locator(".export-modal-path").innerText()).trim();

      const files = await readdir(written);
      const note = await readFile(join(written, files.find((name) => name.endsWith(".md"))!), "utf8");
      expect(note).toContain("https://www.youtube.com/watch?v=dQw4w9WgXcQ\n*Her theme*");
      expect(note).toContain("**Spotify track**\n\nhttps://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC");

      await app.window.getByRole("button", { name: "Done", exact: true }).click();
      await modal.waitFor({ state: "detached", timeout: 10_000 });
    } finally {
      await rm(destination, { recursive: true, force: true });
    }
  });
});
