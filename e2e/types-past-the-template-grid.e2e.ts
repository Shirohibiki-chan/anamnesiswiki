// Typing on a new page sends the template offer away by itself (Queued
// Adjustments, asked for 2026-09-06).
//
// **The thing under test is what happens between two renders.** A blank page
// draws a tab and an editor it does not have yet, and the first word makes
// them real under the same id — so the words she typed have to still be on
// screen afterwards, and on disk, with the offer gone. A unit test can check
// the tab transform; only driving the real editor can check that the
// handover did not remount it and eat the keystroke.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  editorText,
  makeBlankPage,
  openPage,
  pageTabLabels,
  templateOfferShown,
  typeInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "A Loose Thought";
const WORDS = "Written before choosing anything";
const ANOTHER = "Still Deciding";

/** The file a top-level leaf page is saved as, or null if it is not there. */
async function findPageFile(root: string, name: string): Promise<string | null> {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      const found = await findPageFile(full, name);
      if (found) return found;
    } else if (entry.name === `${name}.json`) {
      return full;
    }
  }
  return null;
}

describe("typing on a new page", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("takes the offer away and keeps every word", async () => {
    await makeBlankPage(app.window, PAGE);
    expect(await templateOfferShown(app.window)).toBe(true);
    // The strip and the editor are already there, above the offer.
    expect(await pageTabLabels(app.window)).toEqual(["Overview"]);

    await typeInEditor(app.window, WORDS);
    await expect.poll(() => templateOfferShown(app.window), { timeout: 5_000 }).toBe(false);
    expect(await editorText(app.window)).toContain(WORDS);
    expect(await pageTabLabels(app.window)).toEqual(["Overview"]);
  });

  it("wrote them to the page's file", async () => {
    await app.window.waitForTimeout(1500);
    const file = await findPageFile(app.world!.path, PAGE);
    expect(file).not.toBeNull();
    const page = JSON.parse(await readFile(file!, "utf8")) as { tabs: { label: string; content: unknown[] }[] };
    expect(page.tabs.map((tab) => tab.label)).toEqual(["Overview"]);
    expect(JSON.stringify(page.tabs[0].content)).toContain(WORDS);
  });

  it("leaves the offer up on a page that is only looked at", async () => {
    await makeBlankPage(app.window, ANOTHER);
    // Clicking into the editor is not writing — the blank paragraph the editor
    // starts with must not count as a first word.
    await typeInEditor(app.window, "");
    await app.window.waitForTimeout(600);
    expect(await templateOfferShown(app.window)).toBe(true);

    // And it is still up when the page is come back to.
    await openPage(app.window, PAGE);
    expect(await templateOfferShown(app.window)).toBe(false);
    expect(await editorText(app.window)).toContain(WORDS);
    await openPage(app.window, ANOTHER);
    expect(await templateOfferShown(app.window)).toBe(true);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
