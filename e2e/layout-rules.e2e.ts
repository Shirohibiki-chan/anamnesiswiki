// Layout, measured rather than looked at.
//
// **Every rule starts as a count and only becomes a rule when the count is
// zero.** A check that goes red on the day it is written teaches everyone to
// ignore it, and a suite people ignore is worse than no suite — so what is
// recorded below is what each screen has *today*. A change that adds to a
// number fails; a change that removes from one is expected to lower the number
// in the same commit.
//
// **The numbers only ever go down.** Raising one to make a build pass is
// converting a bug report into permission, and it is the one edit to this file
// that needs a reason written beside it.
//
// **Every screen is swept twice, wide and narrow.** Width is where this app's
// layout bugs actually live: the three fixes merged before this suite existed
// were a field as wide as its card, end words truncating with nowhere to go,
// and a fallback for a browser that cannot grow a text box — all of them a
// panel too narrow for its contents, none of them visible at a comfortable
// 1280. A sweep at one width is a sweep that agrees with whoever's monitor it
// ran on.
//
// The findings themselves are printed on every run, whether or not anything
// fails, because a count says a screen is wrong and only the list says where.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, MIN_WINDOW, resizeWindow, type RunningApp } from "./harness/launch-app";
import { countByRule, describeFindings, findLayoutProblems, type LayoutRule } from "./harness/layout";
import { openPage, treeRow, waitForWorld } from "./harness/screen";

/**
 * The window as it opens, and as narrow as the app will let anyone drag it.
 *
 * **NARROW tracks the app's own minimum and is not a round number of its own.**
 * It was 900 until Phase 21 put a rail down the left of the window, and 948
 * until 2026-09-05 widened that rail to fit the labels its icons needed
 * (`minWidth` in electron/main.js, and the reasoning is there). Sweeping a width
 * the app will not open is not a sweep — it failed that way once, handing the
 * three panels room the app never actually gives them.
 */
const WIDE = { width: 1364, height: 800 };
const NARROW = { width: MIN_WINDOW.width, height: 640 };

const RULES: LayoutRule[] = [
  "dead-end-truncation",
  "off-the-edge",
  "sideways-scroll",
  "covered-control",
  "tiny-target",
];

/**
 * What each screen is allowed to have, per rule, as of 2026-08-26.
 *
 * Recorded from a first run rather than chosen. An absent rule means zero, and
 * a zero is a rule that screen genuinely passes and must keep passing.
 *
 * **The keys carry the width, so they move when the sweeps move.** They have
 * read @900/@1280, then @948/@1328 after Phase 21 added the rail, and now
 * @984/@1364 after the rail widened to hold its labels. The allowances
 * themselves are unchanged throughout — a key that no longer matches silently
 * becomes an allowance of zero, which is a green suite turning red for a reason
 * that has nothing to do with the screen it names.
 */
const ALLOWED: Record<string, Partial<Record<LayoutRule, number>>> = {
  // Five icon controls in the tree, none big enough to be an easy target: the
  // expand chevron at 14×14, the colour dot, the ⋯ menu and the + at 16×16, and
  // the header's small icon button at 20×20. Present on every screen, since the
  // tree is.
  "a folder @1364": { "tiny-target": 5 },
  // **`covered-control` was 1 here until 2026-08-26, on all four screens
  // below.** It was the same control every time: the top bar needed 391px in a
  // 340px centre column, so its last button — the properties toggle — sat past
  // the column's edge with the properties panel painted over it. Fixed then by
  // a container query in shell.css that dropped the search button's label;
  // fixed for good in Phase 21, which moved search out to the rail entirely and
  // took the query with it. Zero since, and it stays zero.
  "a folder @984": { "tiny-target": 5 },
  // **`dead-end-truncation` is zero everywhere as of 2026-08-26, which makes it
  // the second rule here that is a rule rather than a count.** The one finding
  // was this screen's block title, ellipsised with nothing behind it; it wraps
  // now (blocks.css). What is left is a meter's 8px drag track and an 11×11 ×
  // for removing one.
  "every meter at once @1364": { "tiny-target": 7 },
  "every meter at once @984": { "tiny-target": 7 },
  "a name too long for a filename @1364": { "tiny-target": 8 },
  // The second of this screen's two was never a bug: the page tab strip
  // scrolls sideways, and its add-tab button was simply scrolled out of it
  // rather than covered by anything. The rule could not tell those apart and
  // now can — see the note beside it in harness/layout.ts.
  "a name too long for a filename @984": { "tiny-target": 8 },
  "nine levels down @1364": { "tiny-target": 7 },
  "nine levels down @984": { "tiny-target": 7 },
  // **Clean, and the only screen that is.** It is also the first thing anybody
  // ever sees, so keeping this at nothing is worth more than it looks.
  "the start screen @1364": {},
  "the start screen @984": {},
};

/** Sweeps what is on screen at both widths and checks each against its allowance. */
async function sweep(app: RunningApp, screen: string): Promise<void> {
  for (const size of [WIDE, NARROW]) {
    await resizeWindow(app, size.width, size.height);
    const where = `${screen} @${size.width}`;
    const findings = await findLayoutProblems(app.window);
    const counts = countByRule(findings);
    console.log(`\n${where}:\n${describeFindings(findings)}`);
    for (const rule of RULES) {
      const allowed = ALLOWED[where]?.[rule] ?? 0;
      expect(
        counts[rule],
        `${where} — ${rule}: ${counts[rule]} found, ${allowed} allowed. ` +
          "Lower the number in ALLOWED if you fixed some; never raise it.",
      ).toBeLessThanOrEqual(allowed);
    }
  }
}

describe("layout, inside a world", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("a folder", async () => {
    await treeRow(app.window, "Characters").click();
    await sweep(app, "a folder");
  });

  // The generator writes this page precisely because it is the worst case for a
  // panel: every meter face there is, with labels deliberately too long for the
  // row they sit in.
  it("every meter at once", async () => {
    await openPage(app.window, "Every Meter Face At Once, With Labels Too Long For The Row");
    await sweep(app, "every meter at once");
  });

  it("a name too long for a filename", async () => {
    await openPage(
      app.window,
      "A Page Whose Name Runs On Considerably Past The Point Where Any Sensible Filesystem Would Still Be Interested In Storing It Verbatim",
    );
    await sweep(app, "a name too long for a filename");
  });

  it("nine levels down", async () => {
    await openPage(app.window, "Deep Nesting Test");
    await sweep(app, "nine levels down");
  });

  // **The fifth question, and the cheapest one.** Resizing a window is when a
  // layout throws — a measurement against an element that has gone, a hook
  // reading a width that is briefly zero — and none of the checks above would
  // notice. This has watched every screen above, at both widths.
  it("threw nothing at the console while being measured", () => {
    expect(app.errors).toEqual([]);
  });
});

// A separate app, because the start screen is only reachable by not opening a
// world — and it is the first thing anyone ever sees.
describe("layout, before a world is open", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp({ openWorld: false });
    await app.window.locator(".start-screen, main").first().waitFor({ state: "visible" });
  });

  afterAll(async () => {
    await app?.close();
  });

  it("the start screen", async () => {
    await sweep(app, "the start screen");
  });

  it("threw nothing at the console while being measured", () => {
    expect(app.errors).toEqual([]);
  });
});
