// Known Bug, reported from use 2026-08-21: a click on a listed world did
// nothing she could see, and the world stayed shut. Whatever the cause that
// day, two things about the start screen made it worse — a world that could
// not be read was indistinguishable from one that was gone, and either
// failure dropped the world off the list, so the next click was against an
// entry that was no longer there. Now a world that is there but damaged says
// what is wrong and stays listed; one that is gone says so and is forgotten.
import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { waitForWorld } from "./harness/screen";

const START = ".start";
const TILE = ".project-tile";
const ERROR_LINE = ".start-error";

describe("a world that won't open", () => {
  let app: RunningApp;
  let projectFile: string;
  let goodProject: string;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    projectFile = join(app.world!.path, "project.json");
    goodProject = await readFile(projectFile, "utf8");
    await app.window.getByLabel("Switch project").click();
    await app.window.locator(START).waitFor({ state: "visible", timeout: 20_000 });
  });

  afterAll(async () => {
    await app?.close();
  });

  it("says what is wrong with a damaged one, and keeps it on the list", async () => {
    await writeFile(projectFile, "{ not json", "utf8");
    // The list is scanned off the disk after the screen appears; counted
    // before the first tile is there, it is zero on a slow enough runner.
    await app.window.locator(TILE).first().waitFor({ state: "visible", timeout: 10_000 });
    const tiles = await app.window.locator(TILE).count();
    await app.window.locator(TILE).first().click();
    const line = app.window.locator(ERROR_LINE);
    await line.waitFor({ state: "visible", timeout: 10_000 });
    const said = await line.innerText();
    expect(said).toContain("Couldn't open");
    expect(said).toContain("project.json");
    expect(said).toContain("still in the list");
    expect(await app.window.locator(TILE).count()).toBe(tiles);
  });

  it("opens once the file is mended", async () => {
    await writeFile(projectFile, goodProject, "utf8");
    await app.window.locator(TILE).first().click();
    await waitForWorld(app.window);
    await app.window.getByLabel("Switch project").click();
    await app.window.locator(START).waitFor({ state: "visible", timeout: 20_000 });
  });

  it("says a gone one has moved or been deleted, and forgets it", async () => {
    await app.window.locator(TILE).first().waitFor({ state: "visible", timeout: 10_000 });
    const tiles = await app.window.locator(TILE).count();
    // Out of the projects folder altogether, or the scan finds it under its
    // new name and lists it again.
    const elsewhere = join(dirname(app.projectsDir), "moved-away-world");
    await rename(app.world!.path, elsewhere);
    await app.window.locator(TILE).first().click();
    const line = app.window.locator(ERROR_LINE);
    await line.waitFor({ state: "visible", timeout: 10_000 });
    expect(await line.innerText()).toContain("moved or been deleted");
    await expect.poll(() => app.window.locator(TILE).count(), { timeout: 10_000 }).toBe(tiles - 1);
    await rename(elsewhere, app.world!.path);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
