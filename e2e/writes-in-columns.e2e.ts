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
  addColumnLane,
  clickColumnLane,
  columnLanes,
  columnRowCount,
  editorText,
  removeColumnLane,
  ungroupColumns,
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

  it("does not turn a stray paragraph into a column", async () => {
    // **The failure she hit, and the reason the repair pass exists.** A row
    // draws every child of its own as a lane, so a paragraph that ends up in
    // one *is* a column — she got to five that way. Anything that is not a lane
    // is moved out onto the page instead.
    const before = await columnLanes(app.window);
    await clickColumnLane(app.window, 0);
    await app.window.keyboard.press("Escape");
    await app.window.keyboard.press("ArrowDown");
    await app.window.keyboard.press("Enter");
    await app.window.keyboard.press("Enter");
    await app.window.waitForTimeout(600);

    const lanes = await columnLanes(app.window);
    expect(lanes.length).toBe(before.length);
  });

  it("keeps the writing when a column is removed", async () => {
    // "Content just yeets itself if you remove a column" — it does not any
    // more. The lane's writing joins the lane beside it rather than going with
    // the lane.
    const before = await columnLanes(app.window);
    expect(before.length).toBe(2);
    await removeColumnLane(app.window, 1);

    // One lane left is not columns: the row comes apart and the writing lands
    // on the page, both lanes' worth of it.
    expect(await columnRowCount(app.window)).toBe(0);
    const text = await editorText(app.window);
    expect(text).toContain("Left hand side");
    expect(text).toContain("Right hand side");
  });

  it("offers three lanes as well", async () => {
    // The menu's other entry, and the reason the row stores a list of shares
    // rather than a single split: three lanes are two dividers over one row.
    //
    // A reload first: the test above took a row apart, and where the caret ends
    // up after that is not something this scenario should depend on.
    await app.window.reload();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.waitForTimeout(800);
    await typeAtLineStartInEditor(app.window, "/three columns");
    await app.window.getByText("Three lanes of writing, side by side").click();
    await app.window.waitForTimeout(800);

    expect(await columnRowCount(app.window)).toBe(1);
    const lanes = await columnLanes(app.window);
    expect(lanes.length).toBe(3);
    expect(Math.abs(lanes[0].width - lanes[2].width)).toBeLessThan(4);
  });

  it("adds a fourth lane from the row's own control, evenly", async () => {
    await addColumnLane(app.window);
    const lanes = await columnLanes(app.window);
    expect(lanes.length).toBe(4);
    // A lane added means the stored shares no longer cover the row, so it goes
    // back to even rather than leaving one lane a sliver. See column-service.
    expect(Math.abs(lanes[0].width - lanes[3].width)).toBeLessThan(4);
  });

  it("ungroups back to ordinary paragraphs, keeping everything", async () => {
    await clickColumnLane(app.window, 0);
    await app.window.keyboard.type("kept from the first lane");
    await app.window.waitForTimeout(300);
    await ungroupColumns(app.window);

    expect(await columnRowCount(app.window)).toBe(0);
    expect(await editorText(app.window)).toContain("kept from the first lane");
  });
});
