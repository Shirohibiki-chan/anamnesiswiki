// Deleting a project sends its folder to the recycle bin (2026-08-28).
//
// **The one action in the app that disposes of her writing**, so it is covered
// here rather than only in units: the units can say `trashPath` was called with
// the right path, and cannot say that the button reaches it, that the warning
// appears first, or that the tile actually leaves the screen afterwards.
//
// The scenario deletes a project the harness generated into a temp folder, and
// never touches a real one — see `docs/testing.md` for why that stays true.
import { access } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { waitForWorld } from "./harness/screen";

describe("deleting a project", () => {
  let app: RunningApp;
  let projectName: string;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    // Back to the start screen, where the project tiles are. The generated
    // world is listed there because the harness writes it into recents.
    await app.window.getByLabel("Switch project").click();
    await app.window.locator(".start").waitFor({ state: "visible", timeout: 20_000 });
    projectName = (await app.window.locator(".project-tile-cap b").first().innerText()).trim();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("warns before it does anything, and says the folder is what goes", async () => {
    const tile = app.window.locator(".project-tile").first();
    await tile.hover();
    await tile.locator(".project-tile-menu-btn").first().click();
    await app.window.getByRole("menuitem", { name: /Delete/ }).click();

    const dialog = app.window.locator(".confirm-dialog").first();
    await dialog.waitFor({ state: "visible", timeout: 10_000 });
    const text = await dialog.innerText();
    expect(text).toContain(projectName);
    expect(text.toLowerCase()).toContain("folder");
    expect(text.toLowerCase()).toContain("recycle bin");
  });

  it("takes the folder off the disk, and the tile off the screen", async () => {
    const folder = app.world!.path;
    await expect(access(folder)).resolves.toBeUndefined();

    await app.window.locator(".confirm-dialog .ui-btn-danger").click();
    await app.window.waitForTimeout(2500);

    // The folder itself, not just the tile. A tile can leave the screen because
    // the scan missed it; this is the assertion that says something was
    // actually disposed of. Where it went is `shell.trashItem`'s business —
    // the recycle bin is not readable from here, and a test that tried would be
    // testing Electron rather than this app.
    await expect(access(folder)).rejects.toThrow();

    const names = await app.window.locator(".project-tile-cap b").allInnerTexts();
    expect(names.map((name) => name.trim())).not.toContain(projectName);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
