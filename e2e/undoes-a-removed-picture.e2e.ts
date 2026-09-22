// Known Bug: clearing or replacing a page's picture could not be undone.
// Everything else the right-hand panel does became undoable with Phase 19;
// this one did not, because clearing a picture deletes the file once nothing
// else points at it, so undo has to put the bytes back rather than a field.
// The way in was `captureAssets`, which a deleted page already used — not a
// second mechanism.
import { access, copyFile, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openPage, waitForWorld } from "./harness/screen";

const SLOT = ".property-image-slot";

/** Every page file in the world, with its parsed contents. */
async function pages(root: string): Promise<{ file: string; node: { name?: string; image?: string; templateKey?: string } }[]> {
  const out: { file: string; node: { name?: string; image?: string; templateKey?: string } }[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "assets") await walk(full);
      } else if (entry.name.endsWith(".json") && entry.name !== "project.json" && !entry.name.startsWith("_s")) {
        try {
          out.push({ file: full, node: JSON.parse(await readFile(full, "utf8")) });
        } catch {
          // Not a page.
        }
      }
    }
  }
  await walk(root);
  return out;
}

describe("undoing a removed picture", () => {
  let app: RunningApp;
  let page: string;
  let file: string;

  beforeAll(async () => {
    app = await launchApp({
      // A page whose portrait no other page shares, so removing it really
      // deletes the file — the case undo has to survive. The generated
      // world hands its portraits out from a small pool, so one page is
      // given a copy of its own before the app starts.
      prepare: async (world) => {
        const owner = (await pages(world.path)).find(({ node }) => node.image && node.name && node.templateKey !== "folder");
        if (!owner?.node.image) throw new Error("the generated world has no page with a portrait");
        const own = `own-${owner.node.image}`;
        await copyFile(join(world.path, "assets", owner.node.image), join(world.path, "assets", own));
        await writeFile(owner.file, JSON.stringify({ ...owner.node, image: own }, null, 2), "utf8");
        page = owner.node.name!;
        file = join(world.path, "assets", own);
      },
    });
    await waitForWorld(app.window);
    await openPage(app.window, page);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("deletes the file when the picture is removed and nothing else shows it", async () => {
    await expect(access(file)).resolves.toBeUndefined();
    const slot = app.window.locator(SLOT).first();
    await slot.hover();
    await slot.getByRole("button", { name: "Remove image" }).click();
    await expect.poll(() => access(file).then(() => true, () => false), { timeout: 10_000 }).toBe(false);
    expect(await app.window.locator(`${SLOT} img`).count()).toBe(0);
  });

  it("puts the picture back, file and all, on undo", async () => {
    await app.window.keyboard.press("Control+Shift+z");
    await expect.poll(() => access(file).then(() => true, () => false), { timeout: 10_000 }).toBe(true);
    await app.window.locator(`${SLOT} img`).first().waitFor({ state: "visible", timeout: 10_000 });
  });

  it("takes it away again on redo", async () => {
    await app.window.keyboard.press("Control+Shift+y");
    await expect.poll(() => access(file).then(() => true, () => false), { timeout: 10_000 }).toBe(false);
    expect(await app.window.locator(`${SLOT} img`).count()).toBe(0);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
