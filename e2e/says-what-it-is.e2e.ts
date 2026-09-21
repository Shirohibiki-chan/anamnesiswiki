// Settings → About (Queued Adjustments, the other half of a Phase 12 bullet).
//
// Cheap on purpose: the panel is constants and one version string, so what
// is worth checking is that the section exists, that the version the shell
// reports is the one on screen, and that the licence list is there.
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openSettings, openSettingsSection, waitForWorld } from "./harness/screen";
import { REPO_ROOT } from "./harness/test-world";

describe("the About section", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openSettings(app.window);
    await openSettingsSection(app.window, "About");
  });

  afterAll(async () => {
    await app?.close();
  });

  it("names the version this build is", async () => {
    const { version } = JSON.parse(await readFile(`${REPO_ROOT}/package.json`, "utf8")) as { version: string };
    // The version is asked of the shell after the panel paints, so it lands a
    // moment after the rest of the words.
    await expect.poll(() => app.window.getByRole("dialog").innerText(), { timeout: 5_000 }).toContain(version);
    expect(await app.window.getByRole("dialog").innerText()).toContain("Anamnesis");
  });

  it("lists what it is built with, and the licences", async () => {
    const text = await app.window.getByRole("dialog").innerText();
    for (const name of ["Electron", "React", "BlockNote", "Excalidraw", "Lucide"]) expect(text).toContain(name);
    expect(text).toContain("MPL-2.0");
    expect(text).toContain("Open Font License");
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
