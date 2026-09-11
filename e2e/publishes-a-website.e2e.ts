// Phase 1.5 — the way into publishing a world as a website, what the modal
// says before it writes anything, and what actually reaches the disk.
//
// **The privacy half is the one worth driving through the real app.** The
// generated world has hidden pages, hidden tabs and Secret callouts scattered
// through it by chance, and the promise of this feature is that none of them
// reach the site. So the last test counts them in the world's own files on
// disk and checks the modal owned up to every one — the unit tests prove that
// what is counted is left out; this proves the count saw the whole world.
// (Checking the words themselves would be flakier than it sounds: the
// generator builds prose from a pool of sentences, so a secret's sentence is
// often also somebody else's public one.)
//
// The folder picker is answered from the main process, exactly as the
// Markdown scenario does it; see the note there.
import { readdir, readFile, stat } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { searchTree, treeRow, waitForWorld } from "./harness/screen";

const MODAL = ".export-modal";

async function openRowExports(app: RunningApp, name: string): Promise<void> {
  await searchTree(app.window, name);
  await treeRow(app.window, name).first().click({ button: "right" });
  await app.window.locator(".tree-context-menu").first().waitFor({ state: "visible", timeout: 10_000 });
  await app.window.getByText("Export", { exact: true }).click();
  await app.window.getByText("As a website", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
}

async function openProjectExports(app: RunningApp): Promise<void> {
  await app.window.locator(".tree-project-header").first().click({ button: "right" });
  await app.window.getByText("Export project", { exact: true }).click();
  await app.window.getByText("As a website", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
}

async function closeModal(app: RunningApp): Promise<void> {
  await app.window.getByRole("button", { name: "Cancel", exact: true }).click();
  await app.window.locator(MODAL).waitFor({ state: "detached", timeout: 10_000 });
}

/** Every file under a folder, recursively, as absolute paths. */
async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    if ((await stat(full)).isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

type StoredNode = { id?: string; name?: string; hidden?: boolean; tabs?: { hidden?: boolean; content?: unknown }[] };

function countSecrets(blocks: unknown): number {
  if (!Array.isArray(blocks)) return 0;
  let n = 0;
  for (const block of blocks as { type?: string; children?: unknown }[]) {
    if (block.type === "calloutSecret") n += 1;
    else n += countSecrets(block.children);
  }
  return n;
}

/**
 * What the world holds that must not be published, counted the way the
 * publisher counts: a hidden page once, with nothing inside it looked at;
 * hidden tabs and secrets only on pages that are themselves visible.
 */
async function countPrivate(dir: string, tally = { hiddenPages: 0, hiddenTabs: 0, secrets: 0 }): Promise<typeof tally> {
  const entries = await readdir(dir);
  const own = entries.find((entry) => entry === "_page.json" || entry === "_folder.json");
  if (own) {
    const node = JSON.parse(await readFile(join(dir, own), "utf8")) as StoredNode;
    if (node.hidden) {
      tally.hiddenPages += 1;
      return tally;
    }
  }
  for (const entry of entries) {
    if (entry.startsWith(".") || entry === "assets" || entry === "project.json" || entry === "_storyline.json") continue;
    const full = join(dir, entry);
    if ((await stat(full)).isDirectory()) {
      await countPrivate(full, tally);
      continue;
    }
    if (!entry.endsWith(".json")) continue;
    const node = JSON.parse(await readFile(full, "utf8")) as StoredNode;
    if (!node.id || !Array.isArray(node.tabs)) continue;
    if (node.hidden) {
      if (entry !== own) tally.hiddenPages += 1;
      continue;
    }
    for (const tab of node.tabs) {
      if (tab.hidden) tally.hiddenTabs += 1;
      else tally.secrets += countSecrets(tab.content);
    }
  }
  return tally;
}

describe("publishing a world as a website", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  it("offers the website beside the other formats, on a page and on the project", async () => {
    await openRowExports(app, "Deliberately Empty Page");
    await app.window.keyboard.press("Escape");
    await openProjectExports(app);
    await app.window.keyboard.press("Escape");
  });

  it("counts one page for an empty page, and says the theme is being read before it lets her save", async () => {
    await openRowExports(app, "Deliberately Empty Page");
    await app.window.getByText("As a website", { exact: true }).click();

    const modal = app.window.locator(MODAL);
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    expect((await modal.locator(".export-modal-title").innerText()).trim()).toBe("Publish as a website");
    expect(await modal.locator(".export-modal-summary").innerText()).toContain("1 page will be written");
    // The fonts arrive a moment after the modal opens; the button waits for
    // them rather than writing a site in the browser's own typeface.
    await app.window.getByRole("button", { name: "Choose where to save", exact: true }).waitFor({ state: "visible", timeout: 20_000 });
    await closeModal(app);
  });

  it("counts the whole world from the project menu and names what stays behind", async () => {
    await openProjectExports(app);
    await app.window.getByText("As a website", { exact: true }).click();

    const modal = app.window.locator(MODAL);
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    const summary = await modal.locator(".export-modal-summary").innerText();
    expect(Number(summary.match(/(\d+) pages? will be written/)?.[1])).toBeGreaterThan(10);

    // The generated world always has Secret callouts in it, so the note that
    // they are left out has to be here — a site that quietly said nothing
    // would be the bug this feature exists to prevent.
    const notes = await modal.locator(".export-modal-lossy").innerText();
    expect(notes).toMatch(/Secret callouts? (is|are) left out/);
    await closeModal(app);
  });

  it("writes the site, and owns up to every hidden page, tab and secret the world holds", async () => {
    const destination = await mkdtemp(join(tmpdir(), "anamnesis-site-"));
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

      await openProjectExports(app);
      await app.window.getByText("As a website", { exact: true }).click();
      const modal = app.window.locator(MODAL);
      await modal.waitFor({ state: "visible", timeout: 10_000 });
      await app.window.getByRole("button", { name: "Choose where to save", exact: true }).waitFor({ state: "visible", timeout: 20_000 });
      const notes = await modal.locator(".export-modal-lossy").innerText();
      await app.window.getByRole("button", { name: "Choose where to save", exact: true }).click();

      await expect.poll(() => modal.locator(".export-modal-path").count(), { timeout: 60_000 }).toBe(1);
      const written = (await modal.locator(".export-modal-path").innerText()).trim();
      expect(written.startsWith(destination)).toBe(true);

      const files = await walk(written);
      const names = files.map((file) => file.slice(written.length + 1).replace(/\\/g, "/"));
      // The front door, the look, the behaviour and the search all have to be there.
      expect(names).toEqual(expect.arrayContaining(["index.html", "site.css", "site.js", "search-index.js"]));
      // The theme's typefaces travelled — the whole point of reading them
      // from the running app rather than naming them.
      expect(names.some((name) => name.startsWith("fonts/") && name.endsWith(".woff2"))).toBe(true);
      // Pictures too: the generated world has portraits.
      expect(names.some((name) => name.startsWith("assets/"))).toBe(true);

      const html = await Promise.all(files.filter((file) => file.endsWith(".html")).map((file) => readFile(file, "utf8")));
      expect(html.length).toBeGreaterThan(10);
      // Every page reaches the stylesheet and both scripts.
      for (const page of html) {
        expect(page).toContain("site.css");
        expect(page).toContain("search-index.js");
      }

      // Now the promise: what the modal said stayed behind is what the world
      // actually holds, counted off its own files.
      const expected = await countPrivate(app.world!.path);
      // If the generator ever stops producing these, this test stops proving
      // anything, and it should say so rather than pass quietly.
      expect(expected.secrets).toBeGreaterThan(0);
      expect(expected.hiddenTabs).toBeGreaterThan(0);
      expect(expected.hiddenPages).toBeGreaterThan(0);
      expect(Number(notes.match(/(\d+) Secret callout/)?.[1])).toBe(expected.secrets);
      expect(Number(notes.match(/(\d+) hidden tab/)?.[1])).toBe(expected.hiddenTabs);
      expect(Number(notes.match(/(\d+) hidden page/)?.[1])).toBe(expected.hiddenPages);

      await app.window.getByRole("button", { name: "Done", exact: true }).click();
      await modal.waitFor({ state: "detached", timeout: 10_000 });
    } finally {
      await rm(destination, { recursive: true, force: true });
    }
  });
});
