// A dotted line under a page's name as it is written (Queued Adjustments,
// 2026-09-21) — the half of `/Link page names` that shows what could be
// linked without being asked.
//
// **A decoration, so the thing to check is that it is there and that it is
// only there.** Nothing goes into the file; the words stay words. The
// setting under Writing takes it away and brings it back without the page
// being reopened, which is the part that needed the live redraw.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  editorMentions,
  linkableMarks,
  makeBlankPage,
  openSettings,
  openSettingsSection,
  typeInEditor,
  waitForWorld,
} from "./harness/screen";

const NAMED = "Kalla Reyes";

describe("marking names that could be links", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await makeBlankPage(app.window, "Harbour Notes");
  });

  afterAll(async () => {
    await app?.close();
  });

  it("marks a page's name as it is typed, and links nothing", async () => {
    await typeInEditor(app.window, `Met ${NAMED} at the docks, and a kalla of no importance`);
    await expect.poll(() => linkableMarks(app.window), { timeout: 5_000 }).toEqual([NAMED]);
    expect(await editorMentions(app.window)).toEqual([]);
  });

  it("goes away when the setting is off, without reopening the page", async () => {
    await openSettings(app.window);
    await openSettingsSection(app.window, "Writing");
    const box = app.window.locator('[data-setting="link-marks"]').getByRole("checkbox");
    await box.uncheck();
    await app.window.getByRole("button", { name: "Close settings" }).click();
    await expect.poll(() => linkableMarks(app.window), { timeout: 5_000 }).toEqual([]);
  });

  it("comes back when it is on again", async () => {
    await openSettings(app.window);
    await openSettingsSection(app.window, "Writing");
    await app.window.locator('[data-setting="link-marks"]').getByRole("checkbox").check();
    await app.window.getByRole("button", { name: "Close settings" }).click();
    await expect.poll(() => linkableMarks(app.window), { timeout: 5_000 }).toEqual([NAMED]);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
