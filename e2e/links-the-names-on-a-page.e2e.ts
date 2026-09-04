// Linking the page names written on a page, in bulk. Phase 19.5.
//
// **This is the one command in the app that rewrites writing already done**,
// and the two things that make that acceptable are both checked here: nothing
// is written until the dialog has been through, and one press of undo takes the
// whole pass back. A version of this feature that silently linked forty names
// and needed forty undos would pass a test that only counted the links.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  autoLinkOffers,
  editorMentions,
  openPage,
  typeAtLineStartInEditor,
  untickAutoLink,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Quietgate";
// Two pages the generator always writes, whatever the seed.
const FIRST = "Greyharbour";
const SECOND = "Longford";

describe("linking the names written on a page", () => {
  let app: RunningApp;

  async function openTheDialog() {
    await typeAtLineStartInEditor(app.window, "/link page names");
    await app.window.waitForTimeout(500);
    await app.window.getByText("Find names written on this page and offer to link them").click();
    await app.window.waitForTimeout(900);
  }

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await typeAtLineStartInEditor(app.window, `${FIRST} and ${SECOND} are both south of here.`);
    await app.window.waitForTimeout(600);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("offers what it would link, and writes nothing until it is told to", async () => {
    const before = await editorMentions(app.window);
    await openTheDialog();

    const offers = await autoLinkOffers(app.window);
    expect(offers.some((offer) => offer.includes(FIRST))).toBe(true);
    expect(offers.some((offer) => offer.includes(SECOND))).toBe(true);

    // Backing out leaves the page exactly as it was — the whole point of the
    // dialog being in the way.
    await app.window.getByRole("button", { name: "Cancel" }).click();
    await app.window.waitForTimeout(600);
    expect(await editorMentions(app.window)).toEqual(before);
  });

  it("links only what is left ticked", async () => {
    await openTheDialog();
    await untickAutoLink(app.window, SECOND);
    await app.window.getByRole("button", { name: /^Link/ }).click();
    await app.window.waitForTimeout(1000);

    const after = await editorMentions(app.window);
    expect(after).toContain(FIRST);
    expect(after).not.toContain(SECOND);
  });

  it("takes the whole pass back in one undo", async () => {
    await app.window.keyboard.press("Control+z");
    await app.window.waitForTimeout(900);
    expect(await editorMentions(app.window)).not.toContain(FIRST);
  });

  it("never offers a name that is already a link", async () => {
    // Link both this time, then ask again: a second pass has nothing to find,
    // because the words are inside links now rather than in prose.
    await openTheDialog();
    await app.window.getByRole("button", { name: /^Link/ }).click();
    await app.window.waitForTimeout(1000);
    expect(await editorMentions(app.window)).toContain(FIRST);

    await typeAtLineStartInEditor(app.window, "/link page names");
    await app.window.waitForTimeout(500);
    await app.window.getByText("Find names written on this page and offer to link them").click();
    await app.window.waitForTimeout(900);

    // Nothing left to offer, so the dialog does not open at all.
    expect(await autoLinkOffers(app.window)).toEqual([]);
  });
});
