// Making a page and linking to it without leaving the sentence (Phase 19.5).
//
// **Both routes in, because the second one is the feature.** The `/` menu is a
// menu entry and would be hard to get wrong; typing `[[Some Page]]` for a page
// that does not exist yet is the one that has to work by itself, and it runs
// through code that used to deliberately do nothing. Nothing about either can
// be checked without the editor: the trigger is keystrokes, the dialog is a
// portal, and the result is a chip in a document.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  editorMentions,
  editorText,
  openPage,
  searchTree,
  typeInEditor,
  visibleTreeRows,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Deep Nesting Test";
const MADE = "The Salt Road";
const BRACKETED = "Ninefold Bell";
const DECLINED = "Never Written";

describe("making a page from inside the editor", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("makes one from the slash menu and links to it", async () => {
    await typeInEditor(app.window, "/new page");
    await app.window.getByText("Make a page and link to it from here").click();

    const dialog = app.window.getByRole("heading", { name: "New page" });
    await dialog.waitFor({ state: "visible", timeout: 10_000 });

    await app.window.keyboard.type(MADE);
    await app.window.getByRole("button", { name: "Make the page" }).click();
    await app.window.waitForTimeout(800);

    // The link is in the document...
    expect(await editorMentions(app.window)).toContain(MADE);
    // ...and the page is really there, which is the half a chip cannot prove.
    await searchTree(app.window, MADE);
    expect(await visibleTreeRows(app.window)).toContain(MADE);
  });

  it("offers the same dialog for a [[name]] nothing answers to", async () => {
    await openPage(app.window, PAGE);
    await typeInEditor(app.window, `[[${BRACKETED}]]`);

    await app.window.getByRole("heading", { name: "New page" }).waitFor({ state: "visible", timeout: 10_000 });

    // Pre-filled with what she already typed — being asked for the name a
    // second time is the feature failing to notice.
    await app.window.getByRole("button", { name: "Make the page" }).click();
    await app.window.waitForTimeout(800);

    expect(await editorMentions(app.window)).toContain(BRACKETED);
    // The brackets are gone, replaced by the chip rather than left beside it.
    expect(await editorText(app.window)).not.toContain(`[[${BRACKETED}]]`);
  });

  it("leaves what she typed alone when she backs out, and does not ask twice", async () => {
    await openPage(app.window, PAGE);
    await typeInEditor(app.window, `[[${DECLINED}]]`);
    await app.window.getByRole("heading", { name: "New page" }).waitFor({ state: "visible", timeout: 10_000 });

    await app.window.keyboard.press("Escape");
    await app.window.waitForTimeout(600);

    // Nothing was taken out of the document to ask the question, so backing out
    // costs her nothing.
    expect(await editorText(app.window)).toContain(`[[${DECLINED}]]`);

    // And the answer sticks. The text is still there, so a scan that did not
    // remember being told no would raise the dialog again on the next key —
    // which is a page she cannot type on.
    await app.window.keyboard.type(" and on she goes", { delay: 20 });
    await app.window.waitForTimeout(800);
    expect(await app.window.getByRole("heading", { name: "New page" }).count()).toBe(0);
    expect(await editorText(app.window)).toContain("and on she goes");
  });
});
