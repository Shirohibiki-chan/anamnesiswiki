// The contents block, and the icon picker's Recent row. Phase 19.5.
//
// **What matters about the contents list is that it is not a copy.** It stores
// nothing and reads the document each time it draws, so the check worth making
// is that a heading written *after* the list was inserted turns up in it —
// anything that stored its rows would pass every other assertion here and fail
// that one.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  contentsRows,
  iconPickerOpen,
  openPage,
  pickIcon,
  recentIcons,
  searchIcons,
  typeAtLineStartInEditor,
  typeInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";

describe("listing a page's headings", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("lists the headings already on the page", async () => {
    await typeAtLineStartInEditor(app.window, "/contents");
    await app.window.getByText("A list of this page's headings, kept up to date").click();
    await app.window.waitForTimeout(900);

    const rows = await contentsRows(app.window);
    expect(rows.length).toBeGreaterThan(0);
    // The generated page opens with these two, whatever else it holds.
    expect(rows).toContain("Open Questions");
    expect(rows).toContain("Routine");
  });

  it("picks up a heading written after it", async () => {
    const before = await contentsRows(app.window);
    await typeAtLineStartInEditor(app.window, "## The Long Quiet");
    await app.window.waitForTimeout(900);

    const after = await contentsRows(app.window);
    expect(after).toContain("The Long Quiet");
    expect(after.length).toBe(before.length + 1);
  });

  it("survives a reload, still reading the page rather than remembering it", async () => {
    await app.window.reload();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(1000);

    expect(await contentsRows(app.window)).toContain("The Long Quiet");
  });

  it("keeps the icons picked lately across the top of the picker", async () => {
    // Into the writing first: the chord is the editor's, so it does nothing
    // until the caret is in a line.
    await typeInEditor(app.window, " ");
    await app.window.waitForTimeout(300);
    await app.window.keyboard.press("Control+:");
    await app.window.waitForTimeout(700);
    expect(await iconPickerOpen(app.window)).toBe(true);

    await searchIcons(app.window, "castle");
    await app.window.waitForTimeout(500);
    await pickIcon(app.window, "castle");
    await app.window.waitForTimeout(700);

    // Reopened, because the row has to outlive the popover — which is the only
    // reason this was not built with the rest of the picker.
    await app.window.keyboard.press("Control+:");
    await app.window.waitForTimeout(700);
    expect(await recentIcons(app.window)).toContain("castle");
  });
});
