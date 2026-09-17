// The two blocks a home page was missing: Recently edited and Shortcuts.
// Phase 30, step 3.
//
// **Both read an order the app already keeps, and the assertion is that they
// agree with it.** Shortcuts lists what the rail lists, in the rail's order;
// Recently edited moves a page to the top the moment it is written in. A
// block that kept a list of its own would pass "shows some pages" and fail
// both of these.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBlockToPanel,
  openBlockMenu,
  openPage,
  panelBlockRows,
  panelBlockTitles,
  setAsShortcut,
  typeInEditor,
  waitForWorld,
} from "./harness/screen";

const HOME = "Quietgate";
const EDITED = "Greyharbour";
const PINNED_FIRST = "Longford";
const PINNED_SECOND = "Kelspire";

describe("filling a home page", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, HOME);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("adds both blocks", async () => {
    await addBlockToPanel(app.window, "Recently Edited");
    await addBlockToPanel(app.window, "Shortcuts");
    const titles = await panelBlockTitles(app.window);
    expect(titles).toContain("Recently Edited");
    expect(titles).toContain("Shortcuts");
  });

  it("lists shortcuts in the rail's order, and nothing before any are set", async () => {
    expect(await panelBlockRows(app.window, "Shortcuts")).toEqual([]);
    await setAsShortcut(app.window, PINNED_FIRST);
    await setAsShortcut(app.window, PINNED_SECOND);
    await openPage(app.window, HOME);
    expect(await panelBlockRows(app.window, "Shortcuts")).toEqual([PINNED_FIRST, PINNED_SECOND]);
  });

  it("moves a page to the top of Recently edited when it is written in", async () => {
    await openPage(app.window, EDITED);
    await typeInEditor(app.window, "a fresh line");
    await app.window.waitForTimeout(600);
    await openPage(app.window, HOME);
    const rows = await panelBlockRows(app.window, "Recently Edited");
    expect(rows[0]).toBe(EDITED);
    // The home page itself never appears, however often its dashboard moves.
    expect(rows).not.toContain(HOME);
  });

  it("shows the count it is set to", async () => {
    expect((await panelBlockRows(app.window, "Recently Edited")).length).toBe(8);
    await openBlockMenu(app.window, "Recently Edited");
    await app.window.getByRole("button", { name: "5", exact: true }).click();
    await app.window.waitForTimeout(300);
    expect((await panelBlockRows(app.window, "Recently Edited")).length).toBe(5);
  });

  it("keeps both after a reload", async () => {
    await app.window.reload();
    await waitForWorld(app.window);
    await openPage(app.window, HOME);
    expect(await panelBlockRows(app.window, "Shortcuts")).toEqual([PINNED_FIRST, PINNED_SECOND]);
    expect((await panelBlockRows(app.window, "Recently Edited")).length).toBe(5);
  });
});
