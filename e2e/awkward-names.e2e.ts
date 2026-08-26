// The names that a filesystem cannot store as typed, opened in the real app.
//
// **The gap these exist to catch is between two truths that must not drift.** A
// page is named one thing and stored under another — sanitised, shortened, and
// suffixed when a sibling collides — and every one of those transformations is
// invisible until the moment the app puts a name on screen or reads a file back
// off disk. `scripts/make-test-world.test.ts` already checks the two agree
// about where files go. This checks the app then shows the person their own
// name rather than the filesystem's version of it.
//
// The names here are copied from HARD_CASES in `scripts/make-test-world.mjs`.
// Every world that generator writes contains all of them, at any page count.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  openPage,
  pageTitle,
  searchTree,
  treeRow,
  waitForWorld,
} from "./harness/screen";

const ILLEGAL_CHARACTERS = 'Who? What: "Where" <When> | How\\Why /Which*';
const EMOJI = "\u{1F702}\u{1F703}\u{1F704}\u{1F701} The Four Humours of Longmoor \u{1F3F4}‍☠️";
const TOO_LONG =
  "A Page Whose Name Runs On Considerably Past The Point Where Any Sensible Filesystem Would Still Be Interested In Storing It Verbatim";

describe("pages whose names the filesystem cannot take", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("shows a name full of illegal characters exactly as it was typed", async () => {
    await openPage(app.window, ILLEGAL_CHARACTERS);
    // Not the sanitised filename. Every one of these characters is stripped on
    // the way to disk, so seeing them here is the round trip working.
    expect(await pageTitle(app.window)).toBe(ILLEGAL_CHARACTERS);
  });

  it("keeps emoji whole", async () => {
    await openPage(app.window, EMOJI);
    // Shortening a name by characters rather than by code points is how an
    // emoji gets cut in half; a flag built from a joined sequence is the case
    // that breaks first, so it is the one in the name.
    expect(await pageTitle(app.window)).toBe(EMOJI);
  });

  it("shows a name too long to be a filename in full", async () => {
    await openPage(app.window, TOO_LONG);
    expect(await pageTitle(app.window)).toBe(TOO_LONG);
  });

  it("shows three colliding siblings under their shared name, with no suffix", async () => {
    await searchTree(app.window, "Duplicate Name");
    // Three rows, all named the same. The ` (2)` and ` (3)` that keep their
    // files apart belong to the filesystem and must never reach the tree —
    // `treeRow` matches the whole name, so a suffix on screen finds nothing.
    await expect.poll(() => treeRow(app.window, "Duplicate Name").count()).toBe(3);
    await clearTreeSearch(app.window);
  });

  it("opens a page whose name is one character", async () => {
    await openPage(app.window, "X");
    expect(await pageTitle(app.window)).toBe("X");
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
