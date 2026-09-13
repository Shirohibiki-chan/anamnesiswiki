// The example dashboard: a Dashboard page arrives with its blocks on it and
// its snippet switched on. Phase 30, step 4.
//
// **The assertion that matters is that the four pieces add up.** A capture
// box, Recently edited, Shortcuts and a row of links, laid out in the page
// body from the first moment, skinned by a real `.css` in the real snippets
// folder that the app wrote once and now treats as hers. Each of those was
// built and tested on its own; this is the one file that checks they meet.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  captureSavedNote,
  makePageOfTemplate,
  openPage,
  pageBlockTitles,
  pageSkinMarker,
  pageTemplateHook,
  panelBlockTitles,
  pressCapture,
  snippetStates,
  typeCapture,
  waitForWorld,
} from "./harness/screen";

const NAME = "My Desk";

describe("starting a dashboard", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("wrote the dashboard snippet into the snippets folder and switched it on", async () => {
    const file = path.join(app.projectsDir, "snippets", "dashboard.css");
    const css = await fs.readFile(file, "utf8");
    expect(css).toContain('[data-template="dashboard"]');
    expect(await snippetStates(app.window)).toContainEqual({ file: "dashboard.css", on: true });
  });

  it("makes a Dashboard page with its blocks in the body, not the sidebar", async () => {
    await makePageOfTemplate(app.window, NAME, "Dashboard");
    expect(await pageTemplateHook(app.window)).toBe("dashboard");
    const inPage = await pageBlockTitles(app.window);
    expect(inPage).toEqual(["Quick capture", "Recently edited", "Shortcuts", "Jump to"]);
    expect(await panelBlockTitles(app.window)).toEqual([]);
  });

  it("is reached by the snippet", async () => {
    // The shipped file sets no marker of its own, so a line is added to it
    // the way a person would edit it — and the live watch picks that up.
    const file = path.join(app.projectsDir, "snippets", "dashboard.css");
    await fs.appendFile(file, '\n[data-template="dashboard"] { --skin: dashboard; }\n', "utf8");
    await app.window.waitForTimeout(1500);
    expect(await pageSkinMarker(app.window)).toBe("dashboard");
  });

  it("captures a thought from the page body into the dashboard itself", async () => {
    await typeCapture(app.window, "the desk works");
    await pressCapture(app.window);
    expect(await captureSavedNote(app.window)).toBe(`Saved as the desk works under ${NAME}`);
    await openPage(app.window, "the desk works");
    await openPage(app.window, NAME);
  });

  it("does not write the snippet again once it has been deleted", async () => {
    const file = path.join(app.projectsDir, "snippets", "dashboard.css");
    await fs.unlink(file);
    await app.window.reload();
    await waitForWorld(app.window);
    await app.window.waitForTimeout(1500);
    await expect(fs.access(file)).rejects.toThrow();
  });
});
