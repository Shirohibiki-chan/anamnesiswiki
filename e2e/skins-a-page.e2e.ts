// A page gets a style name, and the name lands where a snippet can aim at it.
// Phase 30, step 2.
//
// **The attribute is the assertion.** Nothing in the app draws anything from
// the name; the whole feature is one `data-style` on the page view's root so
// a `.css` in the snippets folder can say `[data-style="dashboard"] …`. So
// the checks read the attribute off the root, and a menu that saved the name
// somewhere the root never showed would fail here.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  enableSnippet,
  openPage,
  pageSkinMarker,
  pageStyleName,
  pageTemplateHook,
  setStyleName,
  styleNamesOffered,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";
const OTHER = "Greyharbour";

describe("skinning a page", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("carries no style but does say what kind of page it is", async () => {
    expect(await pageStyleName(app.window)).toBeNull();
    expect(await pageTemplateHook(app.window)).toBe("location");
  });

  it("puts a typed name on the page's root, normalised", async () => {
    await setStyleName(app.window, PAGE, "Zen Home");
    expect(await pageStyleName(app.window)).toBe("zen-home");
  });

  it("offers the name on another page rather than making her retype it", async () => {
    await openPage(app.window, OTHER);
    expect(await styleNamesOffered(app.window, OTHER)).toContain("zen-home");
    await app.window.getByRole("button", { name: "zen-home", exact: true }).click();
    await app.window.waitForTimeout(300);
    expect(await pageStyleName(app.window)).toBe("zen-home");
  });

  it("is reached by a snippet aimed at the name, and only there", async () => {
    // A real file in the real snippets folder, picked up by the live watch —
    // the whole route a person's own snippet takes.
    const dir = path.join(app.projectsDir, "snippets");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "zen.css"), '[data-style="zen-home"] { --skin: zen; }', "utf8");
    await app.window.waitForTimeout(1500);
    await enableSnippet(app.window, "zen.css");

    await openPage(app.window, PAGE);
    expect(await pageSkinMarker(app.window)).toBe("zen");
    // A page without the name is untouched by it.
    await openPage(app.window, "Longford");
    expect(await pageSkinMarker(app.window)).toBe("");
  });

  it("is still there after a reload", async () => {
    await app.window.reload();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    expect(await pageStyleName(app.window)).toBe("zen-home");
  });

  it("clears back to nothing", async () => {
    await setStyleName(app.window, PAGE, "");
    expect(await pageStyleName(app.window)).toBeNull();
  });
});
