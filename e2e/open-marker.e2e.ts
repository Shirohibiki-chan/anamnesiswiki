// What the app leaves behind in a world's folder when it stops.
//
// **This is the bug that made the marker famous.** A project carries a small
// file saying somebody has it open, refreshed every thirty seconds and believed
// for two minutes after the last write. Removing it is an effect's cleanup,
// which runs when you leave a project — and never runs when the window is
// closed, because nothing unmounts on the way out. So quitting left a marker
// that still looked fresh, and relaunching inside the staleness window met the
// app's own leavings and reported the world as open somewhere else.
//
// Reported from use twice: once on 2026-08-21, and again on 2026-08-26 on a
// different machine, which is when it was traced. Both times it looked like the
// app was wrong about something it could see perfectly well.
//
// Checked here rather than in a unit test because the thing that was broken is
// the shutdown itself: every piece worked in isolation, and what did not happen
// was the app being told it was going away.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { waitForWorld } from "./harness/screen";

/** The name is `src/constants/paths.ts`'s, repeated because the suite is outside the app. */
const OPEN_MARKER_FILE = ".anamnesis-open.json";

async function markerExists(worldPath: string): Promise<boolean> {
  try {
    await stat(join(worldPath, OPEN_MARKER_FILE));
    return true;
  } catch {
    return false;
  }
}

describe("the open marker", () => {
  let app: RunningApp;
  let worldPath: string;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    worldPath = app.world!.path;
  });

  afterAll(async () => {
    await app?.close();
  });

  it("is written while the world is open, and says who by", async () => {
    expect(await markerExists(worldPath)).toBe(true);

    // Shape matters as much as presence: a marker the next launch cannot parse
    // is treated as nobody's, which would hide a broken write behind the very
    // staleness rule this exists to avoid leaning on.
    const raw = await readFile(join(worldPath, OPEN_MARKER_FILE), "utf8");
    const claim = JSON.parse(raw) as { sessionId?: unknown; refreshedAt?: unknown };
    expect(typeof claim.sessionId).toBe("string");
    expect(typeof claim.refreshedAt).toBe("number");
  });

  // **Quit the app, not the harness.** `app.close()` also deletes the world it
  // generated, so asserting the marker is gone after it passes whether or not
  // anything works — measured, by removing the fix and watching this test go
  // green anyway. Closing the Electron app on its own leaves the folder there
  // to be looked at, which is the only version of this check worth having.
  it("is gone once the app has closed", async () => {
    await app.electron.close();
    expect(await markerExists(worldPath)).toBe(false);
  });
});
