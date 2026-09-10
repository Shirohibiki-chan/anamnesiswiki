// The short tour, the first time somebody opens a world. Phase 26, step 2.
//
// **Almost none of this can be asked without the real app.** `tour-service.ts`
// proves the arithmetic — where a card goes beside a column, that the dimming
// leaves a hole and never doubles up, that a step with nothing to point at is
// dropped. What it cannot prove is that the tour appears at all on a fresh
// install, that the highlight lands on the element it names, that it does not
// come back on the next launch, and that it never appears for somebody who has
// been using the app for a month.
//
// The launch option is the interesting part of the setup: every other scenario
// in this suite starts with the tour marked seen, because a tutorial drawn over
// the window would swallow their first click. This one asks for it.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { waitForWorld } from "./harness/screen";

const CARD = ".tour-card";
const RING = ".tour-ring";

/**
 * A button in the tour's own card.
 *
 * Scoped to the card rather than found by name in the window: the sidebar has
 * a Back of its own at its foot, and a bare `getByRole` finds both.
 */
function tourButton(app: RunningApp, name: string) {
  return app.window.locator(CARD).getByRole("button", { name });
}

/** Where the highlight is, in window pixels. */
async function ringBox(app: RunningApp): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await app.window.locator(RING).boundingBox();
  if (!box) throw new Error("The tour is not drawing a highlight.");
  return box;
}

/** Where one of the app's own columns is, for comparing the highlight against. */
async function columnBox(app: RunningApp, anchor: string): Promise<{ x: number; y: number; width: number }> {
  const box = await app.window.locator(`[data-tour="${anchor}"]`).boundingBox();
  if (!box) throw new Error(`No element claims data-tour="${anchor}".`);
  return box;
}

describe("the short tour", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp({ showTour: true });
    await waitForWorld(app.window);
  }, 90_000);

  afterAll(async () => {
    await app?.close();
  });

  it("appears on its own the first time a world is open", async () => {
    await app.window.locator(CARD).waitFor({ state: "visible", timeout: 20_000 });
    expect(await app.window.locator(CARD).innerText()).toContain("1 of 4");
  });

  it("points at the rail, and the highlight is actually over it", async () => {
    // The assertion this file exists for. A tour that renders is not a tour
    // that points at the right thing, and a highlight in the corner of the
    // window is the failure this phase was held back to avoid.
    const ring = await ringBox(app);
    const rail = await columnBox(app, "rail");
    expect(Math.abs(ring.x - rail.x)).toBeLessThan(12);
    expect(Math.abs(ring.width - rail.width)).toBeLessThan(24);
  });

  it("does not cover the card it is asking you to read", async () => {
    const ring = await ringBox(app);
    const card = await app.window.locator(CARD).boundingBox();
    expect(card).not.toBeNull();
    // The card sits beside the highlight, never over it.
    expect(card!.x).toBeGreaterThanOrEqual(ring.x + ring.width);
  });

  it("walks forward through the columns, and back", async () => {
    await tourButton(app, "Next").click();
    expect(await app.window.locator(CARD).innerText()).toContain("2 of 4");
    const ring = await ringBox(app);
    const tree = await columnBox(app, "tree");
    expect(Math.abs(ring.x - tree.x)).toBeLessThan(12);

    // The way out is on the second step as much as the first. Somebody who did
    // not ask for a tutorial must never have to finish one to be rid of it.
    expect(await tourButton(app, "Skip").isVisible()).toBe(true);

    await tourButton(app, "Back").click();
    expect(await app.window.locator(CARD).innerText()).toContain("1 of 4");
  });

  it("leaves on Escape as well as on the button", async () => {
    expect(await tourButton(app, "Skip").isVisible()).toBe(true);
    await app.window.keyboard.press("Escape");
    await app.window.locator(CARD).waitFor({ state: "detached", timeout: 10_000 });
  });

  it("does not come back on the next launch", async () => {
    // Skipping counts as having been offered it. This is the assertion that
    // says so through a real restart rather than through the setting.
    await app.window.keyboard.press("Control+r");
    await waitForWorld(app.window);
    await app.window.waitForTimeout(2000);
    expect(await app.window.locator(CARD).count()).toBe(0);
  });
});

describe("somebody who has used the app before", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  }, 90_000);

  afterAll(async () => {
    await app?.close();
  });

  it("is never shown the tour", async () => {
    await app.window.waitForTimeout(2000);
    expect(await app.window.locator(CARD).count()).toBe(0);
  });
});
