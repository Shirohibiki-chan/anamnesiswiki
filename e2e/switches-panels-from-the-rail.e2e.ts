// The rail down the left of the window, and the three panels it chooses. Phase 21.
//
// **What this guards is that the choice still reaches the sidebar.** It used to
// be local state inside TreeSidebar with a text tab strip on top of it; it is
// now state in AppLayout with an icon rail driving it, which is two components
// that have to agree. The scenario is cheap and the failure it catches — a rail
// that highlights a panel the sidebar is not showing — is invisible to a unit
// test, because neither component is unit tested at all.
//
// **It also pins the names.** The rail is icons only, so the sidebar's own
// header is the only place the words Templates and Assets appear on screen.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openRailPanel, sidebarPanelName, visibleTreeRows, waitForWorld } from "./harness/screen";

describe("switching panels from the rail", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("opens on the tree, which heads itself with the world's name", async () => {
    expect(await sidebarPanelName(app.window)).toBeNull();
    expect((await visibleTreeRows(app.window)).length).toBeGreaterThan(0);
  });

  it("shows the templates, named", async () => {
    await openRailPanel(app.window, "Templates");
    expect(await sidebarPanelName(app.window)).toBe("Templates");
    // The tree is gone rather than merely covered.
    expect(await visibleTreeRows(app.window)).toHaveLength(0);
  });

  it("shows the assets, named", async () => {
    await openRailPanel(app.window, "Assets");
    expect(await sidebarPanelName(app.window)).toBe("Assets");
  });

  it("goes back to the tree", async () => {
    await openRailPanel(app.window, "Project");
    expect(await sidebarPanelName(app.window)).toBeNull();
    expect((await visibleTreeRows(app.window)).length).toBeGreaterThan(0);
  });
});
