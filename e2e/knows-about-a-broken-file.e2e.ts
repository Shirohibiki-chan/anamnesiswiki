// "I know about this one", on the warning that comes back every launch.
//
// **The load warning is the one notice a person cannot get away from.** It
// lists the files the load could not read, and a file that will never parse —
// a sync conflict copy somebody is keeping on purpose — puts it on screen
// every single time the world opens. Dismissing it lasts until the next
// launch, which is how a warning becomes something you learn to ignore.
//
// What this covers is the whole round trip, because the parts are useless
// separately: the acknowledgement has to survive a reload, and it has to stop
// applying the moment the file changes.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { waitForWorld } from "./harness/screen";

const WARNING = ".load-warning";

describe("a file the app can't read", () => {
  let app: RunningApp;
  let brokenFile: string;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    brokenFile = path.join(app.world!.path, "Kept On Purpose.json");
  });

  afterAll(async () => {
    await app?.close();
  });

  /** A reload is how the app re-reads the folder without restarting. */
  async function reload(): Promise<void> {
    await app.window.evaluate(() => {
      (window as unknown as { __reloading?: boolean }).__reloading = true;
    });
    await app.window.keyboard.press("Control+r");
    await app.window.waitForFunction(() => !(window as unknown as { __reloading?: boolean }).__reloading);
    await waitForWorld(app.window);
    await app.window.waitForTimeout(500);
  }

  it("says so, and names the file", async () => {
    await fs.writeFile(brokenFile, "{ this is not json", "utf8");
    await reload();

    await app.window.locator(WARNING).waitFor({ state: "visible", timeout: 20_000 });
    expect(await app.window.locator(WARNING).innerText()).toContain("Kept On Purpose.json");
  });

  it("stays quiet once it has been told the file is expected", async () => {
    await app.window.getByRole("button", { name: /I know about this one|I know about these/ }).click();
    await app.window.locator(WARNING).waitFor({ state: "detached", timeout: 20_000 });

    await reload();
    expect(await app.window.locator(WARNING).count()).toBe(0);
  });

  // The point of recording the file's state rather than just its name:
  // acknowledging one problem must not silence the next one in the same file.
  it("speaks up again when the file changes", async () => {
    await fs.writeFile(brokenFile, "{ a different kind of not json at all", "utf8");
    await reload();

    await app.window.locator(WARNING).waitFor({ state: "visible", timeout: 20_000 });
    expect(await app.window.locator(WARNING).innerText()).toContain("Kept On Purpose.json");
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
