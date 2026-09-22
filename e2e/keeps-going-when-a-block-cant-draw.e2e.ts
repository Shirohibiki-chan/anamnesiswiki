// Known Bug: the error boundary at the root turned a blank window into a
// screen that says what happened — and could offer nothing but a restart,
// since it wraps the whole app. One bad block on one page took the session
// down with it. Now the page, the panel and every block in it sit behind a
// boundary of their own: the block that cannot be drawn is named where it
// was, its menu still works, and the rest of the app carries on.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  blockHoldingPartNotice,
  crashScreenShown,
  openPage,
  panelBlockTitles,
  partNotices,
  pickBlockMenuItem,
  retryPartNotice,
  treeRow,
  waitForPartNotice,
  waitForWorld,
} from "./harness/screen";

/** Every page file under a world, however deep. */
async function pageFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "assets") await walk(full);
      } else if (entry.name.endsWith(".json") && entry.name !== "project.json" && !entry.name.startsWith("_s")) {
        out.push(full);
      }
    }
  }
  await walk(root);
  return out;
}

describe("a block that cannot be drawn", () => {
  let app: RunningApp;
  let page = "";
  let blocksOnPage = 0;

  beforeAll(async () => {
    app = await launchApp({
      // A meter block whose meters are not a list — the shape a stray edit
      // or a conflict copy could leave, and one the block's own drawing
      // chokes on. Found on disk rather than chosen, since the generated
      // world decides which pages get meters.
      prepare: async (world) => {
        for (const file of await pageFiles(world.path)) {
          let node: { name?: string; templateKey?: string; blocks?: { kind: string; meters?: unknown }[] };
          try {
            node = JSON.parse(await readFile(file, "utf8"));
          } catch {
            continue;
          }
          const meter = node.blocks?.find((block) => block.kind === "meter");
          if (!node.name || node.templateKey === "folder" || !meter) continue;
          meter.meters = 5 as unknown as undefined;
          page = node.name;
          blocksOnPage = node.blocks!.length;
          await writeFile(file, JSON.stringify(node, null, 2), "utf8");
          return;
        }
        throw new Error("the generated world has no page with a meter block");
      },
    });
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("draws the rest of the page, and says which block failed", async () => {
    await openPage(app.window, page);
    await waitForPartNotice(app.window);
    const notices = await partNotices(app.window);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain("This block couldn't be drawn");
    // Not the whole-window screen, and every other block still drawn.
    expect(await crashScreenShown(app.window)).toBe(false);
    expect((await panelBlockTitles(app.window)).length).toBe(blocksOnPage);
  });

  it("leaves the rest of the app working", async () => {
    await treeRow(app.window, "Greyharbour").first().click();
    await expect.poll(() => partNotices(app.window), { timeout: 10_000 }).toEqual([]);
    await openPage(app.window, page);
    await waitForPartNotice(app.window);
  });

  it("comes back when Try Again finds the same fault", async () => {
    await retryPartNotice(app.window);
    await app.window.waitForTimeout(300);
    expect(await partNotices(app.window)).toHaveLength(1);
  });

  it("can be removed through its own menu", async () => {
    const titles = await panelBlockTitles(app.window);
    const failed = await blockHoldingPartNotice(app.window);
    expect(failed).toBeTruthy();
    await pickBlockMenuItem(app.window, failed!, "Remove Block");
    await expect.poll(() => partNotices(app.window), { timeout: 10_000 }).toEqual([]);
    expect((await panelBlockTitles(app.window)).length).toBe(titles.length - 1);
  });

  it("recorded the fault for a bug report, and nothing else went wrong", () => {
    // The one error is the block's own; a boundary catching it is React
    // reporting it to the console, which is the point.
    expect(app.errors.length).toBeGreaterThan(0);
    expect(app.errors.every((line) => /map is not a function|The above error|PartBoundary|componentStack|Error boundary|recreating/i.test(line))).toBe(true);
  });
});
