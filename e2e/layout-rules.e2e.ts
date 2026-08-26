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
// The findings themselves are printed on every run, whether or not anything
// fails, because a count says a screen is wrong and only the list says where.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { countByRule, describeFindings, findLayoutProblems, type LayoutRule } from "./harness/layout";
import { openPage, treeRow, waitForWorld } from "./harness/screen";

/**
 * What each screen is allowed to have, per rule, as of 2026-08-26.
 *
 * Recorded from a first run rather than chosen. A zero is a rule that screen
 * genuinely passes and must keep passing.
 */
const ALLOWED: Record<string, Partial<Record<LayoutRule, number>>> = {
  // Five icon buttons in the tree, none of them big enough to be an easy
  // target: the expand chevron at 14×14, the colour dot, the ⋯ menu and the +
  // at 16×16, and the header's small icon button at 20×20.
  "a folder": { "tiny-target": 5 },
  // The same five, plus a meter's 8px-tall drag track and an 11×11 × for
  // removing one. And the one truncation finding in the app: a block's title
  // ellipsised with nothing behind it, which is the exact shape of complaint
  // this rule was written for.
  "every meter at once": { "dead-end-truncation": 1, "tiny-target": 7 },
  "a name too long for a filename": { "tiny-target": 8 },
  "nine levels down": { "tiny-target": 7 },
  // **Clean, and the only screen that is.** It is also the first thing anybody
  // ever sees, so keeping this at nothing is worth more than it looks.
  "the start screen": {},
};

function allowanceFor(screen: string, rule: LayoutRule): number {
  return ALLOWED[screen]?.[rule] ?? 0;
}

const RULES: LayoutRule[] = [
  "dead-end-truncation",
  "off-the-edge",
  "covered-control",
  "tiny-target",
];

/** Sweeps whatever is on screen and checks it against what that screen may have. */
async function checkScreen(app: RunningApp, screen: string): Promise<void> {
  const findings = await findLayoutProblems(app.window);
  const counts = countByRule(findings);
  console.log(`\n${screen}:\n${describeFindings(findings)}`);
  for (const rule of RULES) {
    const allowed = allowanceFor(screen, rule);
    expect(
      counts[rule],
      `${screen} — ${rule}: ${counts[rule]} found, ${allowed} allowed. ` +
        "Lower the number in ALLOWED if you fixed some; never raise it.",
    ).toBeLessThanOrEqual(allowed);
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
    await checkScreen(app, "a folder");
  });

  // The generator writes this page precisely because it is the worst case for a
  // panel: every meter face there is, with labels deliberately too long for the
  // row they sit in.
  it("every meter at once", async () => {
    await openPage(app.window, "Every Meter Face At Once, With Labels Too Long For The Row");
    await checkScreen(app, "every meter at once");
  });

  it("a name too long for a filename", async () => {
    await openPage(
      app.window,
      "A Page Whose Name Runs On Considerably Past The Point Where Any Sensible Filesystem Would Still Be Interested In Storing It Verbatim",
    );
    await checkScreen(app, "a name too long for a filename");
  });

  it("nine levels down", async () => {
    await openPage(app.window, "Deep Nesting Test");
    await checkScreen(app, "nine levels down");
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
    await checkScreen(app, "the start screen");
  });
});
