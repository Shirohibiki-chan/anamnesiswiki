// Plain text pasted into a page arrives as the characters it was made of
// (2026-09-22).
//
// The measurement on 2026-09-21 found BlockNote reading every plain-text
// paste as Markdown, which for the prose this app is written for is not
// formatting being added but characters being deleted: the asterisks that
// mark an action, a name in angle brackets, a line that happens to start with
// a hash. All three cases are below, and so is the chord that asks for the
// Markdown reading on purpose.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  copiedFromEditor,
  editorHeadings,
  editorItalicText,
  editorLineCount,
  editorText,
  makePageOfTemplate,
  pasteAsMarkdownInEditor,
  pasteTextInEditor,
  typeInEditor,
  waitForWorld,
} from "./harness/screen";

/** The same shape as the writing this is for: an action marked with asterisks, inside dialogue. */
const ACTION = `"You have *TEN SECONDS,*" she says, and she *means* it.`;

describe("pasting text into a page", () => {
  let app: RunningApp;

  /** An empty page, so what is on it afterwards is only what was pasted. */
  async function onABlankPage(): Promise<void> {
    await typeInEditor(app.window, "");
    await app.window.keyboard.press("Control+a");
    await app.window.keyboard.press("Backspace");
  }

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await makePageOfTemplate(app.window, "Pasted Into", "Note");
  });

  afterAll(async () => {
    await app?.close();
  });

  it("keeps the asterisks that mark an action, and makes nothing italic", async () => {
    await onABlankPage();
    await pasteTextInEditor(app.window, ACTION);
    expect(await editorText(app.window)).toContain("*TEN SECONDS,*");
    expect(await editorItalicText(app.window)).toEqual([]);
  });

  it("keeps a name in angle brackets, which used to vanish", async () => {
    await onABlankPage();
    await pasteTextInEditor(app.window, "<Kalla> is still waiting.");
    expect(await editorText(app.window)).toContain("<Kalla>");
  });

  it("does not make a heading out of a line that starts with a hash", async () => {
    await onABlankPage();
    await pasteTextInEditor(app.window, "# 1 fan of hers");
    expect(await editorHeadings(app.window)).toEqual([]);
    expect(await editorText(app.window)).toContain("# 1 fan");
  });

  it("makes a paragraph at a blank line and keeps a single break inside one", async () => {
    await onABlankPage();
    await pasteTextInEditor(app.window, "One.\nStill one.\n\nTwo.");
    // Two paragraphs, not three lines and not one: the single break is a
    // line break inside the first.
    await expect.poll(() => editorLineCount(app.window)).toBe(2);
    expect(await editorText(app.window)).toContain("Still one.");
  });

  it("keeps an empty paragraph left there on purpose", async () => {
    await onABlankPage();
    await pasteTextInEditor(app.window, "One.\n\n\n\nTwo.");
    await expect.poll(() => editorLineCount(app.window)).toBe(3);
  });

  it("reads it as Markdown when the chord asks for that", async () => {
    await onABlankPage();
    await pasteAsMarkdownInEditor(app.window, ACTION);
    await expect.poll(() => editorItalicText(app.window)).toContain("TEN SECONDS,");
    expect(await editorText(app.window)).not.toContain("*TEN SECONDS,*");
  });

  it("goes back to plain text on the next paste", async () => {
    await onABlankPage();
    await pasteTextInEditor(app.window, ACTION);
    expect(await editorItalicText(app.window)).toEqual([]);
  });

  it("comes back out of the page as the text that went in", async () => {
    // The acceptance test the fidelity notes name: not "does it look right on
    // screen" but "paste it out and is it the same". Both halves of the
    // clipboard have to agree for this to pass.
    const written = ["One.", "Still one.", "", "Two.", "", "", "", "After a gap."].join("\n");
    await onABlankPage();
    await pasteTextInEditor(app.window, written);
    await app.window.keyboard.press("Control+a");
    expect((await copiedFromEditor(app.window)).text).toBe(written);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
