// Named checkpoints (Queued Adjustments, 2026-09-21): "mark this state, name
// it, come back to it" — the last unbuilt item of the six raised on
// 2026-08-27. Phase 19 kept copies on a timer and cleared them out on one;
// this keeps a copy under a name and never clears it out.
//
// The file name is the identity, so what is checked here is what lands on
// disk as much as what the panel shows: a kept copy is a file with the name
// after the stamp, and taking the name away is a rename back.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openPage, treeRow, waitForWorld } from "./harness/screen";

const PANEL = ".page-history";
const PAGE = "Longford";
const LABEL = "Before the storm";

/** Every file under the world's history folder, by name, wherever it is. */
async function historyFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith(".json")) out.push(entry.name);
    }
  }
  await walk(root);
  return out;
}

describe("keeping a version under a name", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    if ((await app.window.locator(PANEL).count()) === 0) return;
    await app.window.keyboard.press("Escape");
    await app.window.locator(PANEL).waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
  });

  async function openHistory(): Promise<void> {
    await treeRow(app.window, PAGE).first().click({ button: "right" });
    await app.window.getByRole("button", { name: "Earlier Versions" }).click();
    await app.window.locator(PANEL).waitFor({ state: "visible", timeout: 20_000 });
    await app.window
      .locator(`${PANEL} .page-history-row, ${PANEL} .page-history-empty`)
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
  }

  it("keeps a copy of the page as it is now, under the name given", async () => {
    await openHistory();
    await app.window.locator(PANEL).getByRole("button", { name: "Keep a Copy Now" }).click();
    const prompt = app.window.getByRole("dialog", { name: "Keep a Copy Now" });
    await prompt.waitFor({ state: "visible", timeout: 10_000 });
    await prompt.getByLabel("Name").fill(LABEL);
    await prompt.getByRole("button", { name: "Continue" }).click();

    await expect.poll(() => app.window.locator(`${PANEL} .page-history-label`).allInnerTexts(), { timeout: 10_000 }).toEqual([LABEL]);
    const files = await historyFiles(app.world!.path);
    expect(files.some((name) => name.includes(` ~ ${LABEL}.json`))).toBe(true);
  });

  it("offers to stop keeping the named one, and does", async () => {
    await openHistory();
    // The named copy is the newest and so the first row, which is highlighted.
    await app.window.locator(PANEL).getByRole("button", { name: "Stop Keeping" }).click();
    await expect.poll(() => app.window.locator(`${PANEL} .page-history-label`).count(), { timeout: 10_000 }).toBe(0);
    const files = await historyFiles(app.world!.path);
    expect(files.some((name) => name.includes(" ~ "))).toBe(false);
    // And the copy is still there, only unnamed.
    expect(await app.window.locator(`${PANEL} .page-history-row`).count()).toBeGreaterThanOrEqual(1);
  });

  it("names an existing version from the list", async () => {
    await openHistory();
    await app.window.locator(PANEL).getByRole("button", { name: "Keep This Version" }).click();
    const prompt = app.window.getByRole("dialog", { name: "Keep This Version" });
    await prompt.waitFor({ state: "visible", timeout: 10_000 });
    await prompt.getByLabel("Name").fill("The one to go back to");
    await prompt.getByRole("button", { name: "Continue" }).click();
    await expect.poll(() => app.window.locator(`${PANEL} .page-history-label`).allInnerTexts(), { timeout: 10_000 }).toEqual([
      "The one to go back to",
    ]);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
