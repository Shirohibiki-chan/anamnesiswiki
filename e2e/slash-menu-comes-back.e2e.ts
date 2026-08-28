// The `/` menu reopening when the cursor comes back to a slash that was typed
// and left, and — just as important — not reopening when it shouldn't.
//
// **Reported from use, in those words: it drives you insane.** The editor only
// opens these menus on freshly *typed* text, so a line left sitting with a `/`
// at the front was inert; the only way on was to delete it and type it again.
//
// **The second scenario is the one that keeps this feature bearable.** Reopening
// on any slash at all would mean the menu appearing while she moves the caret
// through `and/or`, a date, or a path — an interruption she never asked for,
// several times a paragraph. That is a worse app than the one that did nothing.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openPage, suggestionMenuOpen, typeInEditor, typeAtLineStartInEditor, waitForWorld } from "./harness/screen";

const PAGE = "Deep Nesting Test";
// Another page the generator always writes — see scripts/make-test-world.mjs.
const OTHER_PAGE = "Quietgate";

describe("the slash menu coming back", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  /** Moves the caret off the current spot and straight back onto it. */
  async function leaveAndReturn() {
    await app.window.keyboard.press("ArrowLeft");
    await app.window.waitForTimeout(200);
    await app.window.keyboard.press("ArrowRight");
    await app.window.waitForTimeout(700);
  }

  it("opens again when the cursor returns to an abandoned slash", async () => {
    await typeAtLineStartInEditor(app.window, "/");
    await app.window.waitForTimeout(700);
    expect(await suggestionMenuOpen(app.window)).toBe(true);

    await app.window.keyboard.press("Escape");
    await app.window.waitForTimeout(400);
    expect(await suggestionMenuOpen(app.window)).toBe(false);

    await leaveAndReturn();
    expect(await suggestionMenuOpen(app.window)).toBe(true);
  });

  it("stays shut for a slash that is part of what she wrote", async () => {
    // A different page, so this starts on writing of its own rather than on the
    // slash the scenario above deliberately left lying about. Isolation matters
    // here more than usual: typing onto that slash really would be an abandoned
    // command with a long query, and the menu would be right to open.
    await openPage(app.window, OTHER_PAGE);
    await typeInEditor(app.window, " and/or");
    await app.window.waitForTimeout(700);

    // It does not even open while typing now — a slash only means a command at
    // the start of a line, as of 2026-08-28.
    expect(await suggestionMenuOpen(app.window)).toBe(false);

    await leaveAndReturn();
    expect(await suggestionMenuOpen(app.window)).toBe(false);
  });
});
