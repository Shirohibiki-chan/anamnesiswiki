// A change made in the moment after opening a page has to survive. 2026-09-08.
//
// **This is a regression test with a date on it rather than a feature's
// scenario.** Every call that writes `project.json` writes the whole file, and
// the ones fired most often — selection, expanded state — went through a 300ms
// debounce that captured the project as it was when the navigation happened.
// Anything written *immediately* in that window was overtaken by the pending
// save and quietly undone: the change looked made, because the screen reads
// memory, and the older file came back on the next load. Found through the
// graph's *Put it back* on 2026-09-07 and fixed at its source the day after —
// `scheduleProjectSave` now reads the store when it fires.
//
// **The shortcuts strip is the subject because it is the plainest victim**, and
// because the fix was made for the graph: a bug fixed in one caller's terms is
// worth proving in another's.
//
// **The two actions happen in one tick of the page's own clock**, through
// `openAndUnpinShortcutTogether`. Driving them as two Playwright clicks would
// put a network round trip between them and reproduce the race only on a slow
// machine, which is a test that passes for the wrong reason most of the time.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  openAndUnpinShortcutTogether,
  openPage,
  pinRowAsShortcut,
  shortcutNames,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Characters";
const OTHER = "Locations";

/** Long enough for the debounced write of `project.json` to have fired. */
const SETTLED_MS = 1500;

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
  await clearTreeSearch(app.window);
}

describe("a change made just after navigating", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("keeps a shortcut that was set, across a reload", async () => {
    expect(await shortcutNames(app.window)).toEqual([]);

    await pinRowAsShortcut(app.window, PAGE);
    await clearTreeSearch(app.window);
    expect(await shortcutNames(app.window)).toEqual([PAGE]);

    await app.window.waitForTimeout(SETTLED_MS);
    await reload(app);

    expect(await shortcutNames(app.window)).toEqual([PAGE]);
  });

  // The one that was broken. Removing the shortcut writes immediately; opening
  // the page it points at had a save already waiting that still held the
  // shortcut, and that save landed last.
  it("keeps a shortcut removed in the moment a page was opened", async () => {
    // Somewhere else first, so opening the shortcut is a real navigation.
    await openPage(app.window, OTHER);
    await clearTreeSearch(app.window);
    await app.window.waitForTimeout(SETTLED_MS);

    await openAndUnpinShortcutTogether(app.window, PAGE);
    expect(await shortcutNames(app.window)).toEqual([]);

    await app.window.waitForTimeout(SETTLED_MS);
    await reload(app);

    // Before the fix this came back, because the navigation's pending save
    // still held it and wrote last.
    expect(await shortcutNames(app.window)).toEqual([]);
  });
});
