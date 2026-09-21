// The editor's own shortcuts, pressed in the real app — the ones the `?`
// sheet lists on its Keys and Markdown tabs (Queued Adjustments, 2026-09-21).
//
// **Those two lists are written by hand, and this is what keeps them honest.**
// The keys and the markdown rules are BlockNote's, not ours, so nothing in
// the app can read them off a registry; the sheet says so. What can be done
// is to press a few and see the formatting arrive, so a BlockNote upgrade that
// renamed a chord or dropped a rule fails here rather than on her screen.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  editorBoldText,
  editorHeadings,
  editorItalicText,
  makeBlankPage,
  typeInEditor,
  waitForWorld,
} from "./harness/screen";

describe("writing with the editor's shortcuts", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await makeBlankPage(app.window, "Shortcut Practice");
  });

  afterAll(async () => {
    await app?.close();
  });

  it("turns markdown into formatting as it is typed", async () => {
    await typeInEditor(app.window, "# A Big Heading");
    await app.window.keyboard.press("Enter");
    await app.window.keyboard.type("Some **loud** and *soft* words", { delay: 20 });
    await app.window.waitForTimeout(300);

    expect(await editorHeadings(app.window)).toEqual(["A Big Heading"]);
    expect(await editorBoldText(app.window)).toEqual(["loud"]);
    expect(await editorItalicText(app.window)).toEqual(["soft"]);
  });

  it("answers the chords the sheet lists", async () => {
    await app.window.keyboard.press("Enter");
    await app.window.keyboard.press("Control+b");
    await app.window.keyboard.type("bolded", { delay: 20 });
    await app.window.keyboard.press("Control+b");
    await app.window.keyboard.type(" and then ", { delay: 20 });
    await app.window.keyboard.press("Control+i");
    await app.window.keyboard.type("leaning", { delay: 20 });
    await app.window.keyboard.press("Control+i");
    await app.window.keyboard.press("Enter");
    await app.window.keyboard.press("Control+Alt+2");
    await app.window.keyboard.type("Second Heading", { delay: 20 });
    await app.window.waitForTimeout(300);

    expect(await editorBoldText(app.window)).toEqual(["loud", "bolded"]);
    expect(await editorItalicText(app.window)).toEqual(["soft", "leaning"]);
    expect(await editorHeadings(app.window)).toEqual(["A Big Heading", "Second Heading"]);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
