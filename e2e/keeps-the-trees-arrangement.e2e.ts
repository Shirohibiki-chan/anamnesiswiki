// Earlier versions of `project.json` — the order of the pages, the home page,
// the pins (Phase 19).
//
// **The half of the safety net no page's history can cover.** The unit tests
// prove what a restore is allowed to bring back and that it drops ids whose
// pages have gone; what only the real app can show is that changing the tree
// writes a copy at all, and that the dialog on the project's own row finds it.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { treeRow, waitForWorld } from "./harness/screen";

const PANEL = ".page-history";
const PAGE = "Deep Nesting Test";

describe("keeping earlier versions of the tree", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  async function openTreeHistory(): Promise<void> {
    await app.window.locator(".tree-project-header").click({ button: "right" });
    await app.window.getByRole("button", { name: "Earlier versions of the tree" }).click();
    await app.window.locator(PANEL).waitFor({ state: "visible", timeout: 20_000 });
    // The panel paints before the folder has been read — same disk round trip
    // the page panel waits on, and the same two outcomes to wait for.
    await app.window
      .locator(`${PANEL} .page-history-row, ${PANEL} .page-history-empty`)
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
  }

  it("keeps a copy once the tree has been changed", async () => {
    // A deliberate change to project.json rather than a page: the home page
    // lives in that file and nowhere else, which is the point of this half.
    await treeRow(app.window, PAGE).first().click({ button: "right" });
    await app.window.getByRole("button", { name: "Set as project home" }).click();
    await app.window.waitForTimeout(1500);

    await openTreeHistory();

    expect(await app.window.locator(`${PANEL} .page-history-row`).count()).toBeGreaterThan(0);
  });

  // What the dialog is for: telling one arrangement from another before
  // replacing anything with it.
  it("says what the arrangement it is showing holds", async () => {
    // Lowercased before comparing: the section headings are drawn in small
    // caps by the stylesheet, so what innerText returns is the transformed
    // text rather than what the component wrote.
    const text = (await app.window.locator(PANEL).innerText()).toLowerCase();
    expect(text).toContain("arranged");
    expect(text).toContain("home page");
    expect(text).toContain("top level, in order");
  });

  it("promises not to touch the pages themselves", async () => {
    expect(await app.window.locator(`${PANEL} .page-history-note`).innerText()).toContain(
      "no page comes back or goes away",
    );
    await app.window.keyboard.press("Escape");
    await app.window.locator(PANEL).waitFor({ state: "detached", timeout: 10_000 });
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
