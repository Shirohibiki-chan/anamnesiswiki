// Side-by-side lanes of writing in the page. Phase 19.5.
//
// **The assertion that matters is that a lane holds ordinary writing.** Columns
// are built out of BlockNote's own nesting — a row block whose children are
// lanes, whose children are paragraphs — so the thing that would prove it wrong
// is text that goes in and comes back as something else, or lanes that stack
// instead of sitting beside each other.
//
// The widths are the other half. They live on the row as one prop, and the row
// writes them out as a stylesheet rather than touching the editor's own DOM —
// see ColumnLane.tsx, where doing the obvious thing froze the app. A drag that
// survives a reload is what proves the prop reached the disk.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clickColumnLane,
  columnLanes,
  columnRowCount,
  dragColumnDivider,
  focusColumnDivider,
  openPage,
  typeAtLineStartInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";

describe("writing in columns", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await typeAtLineStartInEditor(app.window, "/two columns");
    await app.window.getByText("Two lanes of writing, side by side").click();
    await app.window.waitForTimeout(800);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("puts two lanes beside each other, sharing the room evenly", async () => {
    const lanes = await columnLanes(app.window);
    expect(lanes.length).toBe(2);
    // Beside, not stacked: the second starts to the right of the first.
    expect(lanes[1].x).toBeGreaterThan(lanes[0].x + lanes[0].width - 1);
    expect(Math.abs(lanes[0].width - lanes[1].width)).toBeLessThan(4);
  });

  it("takes writing in each lane, and keeps it in the lane it was typed in", async () => {
    // The caret is left in the first lane by the menu item, which is the whole
    // reason each lane starts with a paragraph in it.
    await app.window.keyboard.type("Left hand side");
    await clickColumnLane(app.window, 1);
    await app.window.keyboard.type("Right hand side");
    await app.window.waitForTimeout(400);

    const lanes = await columnLanes(app.window);
    expect(lanes[0].text).toContain("Left hand side");
    expect(lanes[1].text).toContain("Right hand side");
  });

  it("splits the room where the divider is dragged", async () => {
    await dragColumnDivider(app.window, 0, 0.67);
    const lanes = await columnLanes(app.window);
    const row = lanes[0].width + lanes[1].width;
    expect(lanes[0].width / row).toBeGreaterThan(0.55);
    expect(lanes[0].width / row).toBeLessThan(0.8);
  });

  it("is still split that way after a reload", async () => {
    const before = await columnLanes(app.window);
    await app.window.reload();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(800);

    const lanes = await columnLanes(app.window);
    expect(lanes.length).toBe(2);
    expect(lanes[0].width).toBeCloseTo(before[0].width, -1);
    expect(lanes[0].text).toContain("Left hand side");
    expect(lanes[1].text).toContain("Right hand side");
  });

  it("moves the divider with the arrow keys as well", async () => {
    const before = await columnLanes(app.window);
    await focusColumnDivider(app.window, 0);
    await app.window.keyboard.press("ArrowLeft");
    await app.window.waitForTimeout(400);

    const lanes = await columnLanes(app.window);
    expect(lanes[0].width).toBeLessThan(before[0].width);
  });

  it("offers three lanes as well", async () => {
    // The menu's other entry, and the reason the row stores a list of shares
    // rather than a single split: three lanes are two dividers over one row.
    await app.window.keyboard.press("Escape");
    await typeAtLineStartInEditor(app.window, "/three columns");
    await app.window.getByText("Three lanes of writing, side by side").click();
    await app.window.waitForTimeout(800);

    expect(await columnRowCount(app.window)).toBe(2);
    const lanes = await columnLanes(app.window, 1);
    expect(lanes.length).toBe(3);
    expect(Math.abs(lanes[0].width - lanes[2].width)).toBeLessThan(4);
  });
});
