// Ctrl+R, which is the one shortcut that throws the whole app away and builds
// it again.
//
// **Worth a scenario rather than a unit test, because the interesting part is
// what a fresh load finds on disk.** A project carries a marker saying somebody
// has it open, and a reload is not a close — so if the key does not clear that
// marker on the way out, the page that comes back reads the one the page before
// it left and refuses to open the world, with "Open it anyway" as the only way
// past. Nothing below asserts that directly: the world simply has to come back,
// and it cannot if the claim was left behind.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { projectName, waitForWorld } from "./harness/screen";

describe("reloading the window", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("comes back to the same world", async () => {
    // A marker on the window object, so the wait below is for *this* page
    // going away rather than for a moment to pass. Without it a fast reload
    // and no reload at all look identical from here, and the test would pass
    // on a key that does nothing — which is the bug it exists to catch.
    await app.window.evaluate(() => {
      (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
    });

    await app.window.keyboard.press("Control+r");

    await app.window.waitForFunction(
      () => !(window as unknown as { __beforeReload?: boolean }).__beforeReload,
    );
    await waitForWorld(app.window);

    expect(await projectName(app.window)).toBe(app.world?.name);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
