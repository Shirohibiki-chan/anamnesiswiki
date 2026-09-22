// Known Bugs, 2026-09-21: "Enter at the end of a fresh Note page's last line
// does nothing." It was never the last line. Every callout is an isolating
// block, so ProseMirror let a click on its coloured edge — the padding left
// of the words — put an invisible caret *beside* the block; Enter on that
// threw and nothing appeared, and Ctrl+End could not move it. Now a caret
// that lands there is put into the words instead, and drawn.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { clickFirstCalloutEdge, editorLineCount, firstCalloutText, makePageOfTemplate, waitForWorld } from "./harness/screen";

describe("a click beside a callout's words", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await makePageOfTemplate(app.window, "Edge Case", "Note");
  });

  afterAll(async () => {
    await app?.close();
  });

  it("puts the caret in the words, where typing then lands", async () => {
    await clickFirstCalloutEdge(app.window);
    // The browser reports the click's caret a tick later, and the editor
    // moves it into the words on that report; a key sent inside that tick
    // is a thing only a test can do.
    await app.window.waitForTimeout(50);
    await app.window.keyboard.type("Hm. ", { delay: 20 });
    expect(await firstCalloutText(app.window)).toMatch(/^Hm\. For anything/);
  });

  it("lets Ctrl+End reach the end of the page and Enter add a line there", async () => {
    const before = await editorLineCount(app.window);
    await app.window.keyboard.press("Control+End");
    // The browser moves its caret and the editor reads it back a moment
    // later; a hand on a keyboard is never faster than that.
    await app.window.waitForTimeout(150);
    await app.window.keyboard.press("Enter");
    await expect.poll(() => editorLineCount(app.window)).toBe(before + 1);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
