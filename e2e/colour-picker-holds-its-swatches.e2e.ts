// A page's colour picker holds every colour it offers. 2026-10-04.
//
// **What a unit test cannot see.** The panel was a fixed 232px, set before the
// full palette became eight 28px columns, so the last column — yellow,
// seafoam, grey — sat half outside the panel's edge. Only a real layout can
// say whether a tile is inside the box it belongs to.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { coloursOutsidePicker, openRowColourPicker, showEveryColour, waitForWorld } from "./harness/screen";

describe("the colour picker holds its colours", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp({ pages: 30 });
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("keeps the short row inside the panel", async () => {
    await openRowColourPicker(app.window, "Characters");
    expect(await coloursOutsidePicker(app.window)).toBe(0);
  });

  it("keeps the whole palette inside the panel", async () => {
    await showEveryColour(app.window);
    expect(await coloursOutsidePicker(app.window)).toBe(0);
  });
});
