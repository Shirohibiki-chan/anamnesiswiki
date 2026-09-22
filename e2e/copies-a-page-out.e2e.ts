// What Ctrl+C leaves behind, and the setting that decides it (2026-09-22).
//
// The measurement on 2026-09-21 found copying out gives Markdown as its plain
// text — `# Heading`, `**bold**`, a backslash before every soft break — which
// is right for Discord and litter in a lorebook field. Both readings now
// exist and Settings -> Writing picks which one the keystroke does.
//
// **This is also the watch on `disableExtensions`.** The app replaces
// BlockNote's own copy handler by name; if an upgrade renames it, both would
// be live and plugin order would decide silently. The first case below fails
// the moment that happens.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  copiedFromEditor,
  makePageOfTemplate,
  openSettings,
  openSettingsSection,
  pickPlainCopy,
  typeInEditor,
  waitForWorld,
} from "./harness/screen";

/** A heading, a sentence and a list item: one of each thing the two readings disagree about. */
async function writeAPage(app: RunningApp): Promise<void> {
  await typeInEditor(app.window, "");
  await app.window.keyboard.press("Control+a");
  await app.window.keyboard.press("Backspace");
  await app.window.keyboard.type("# Kaine", { delay: 20 });
  await app.window.keyboard.press("Enter");
  await app.window.keyboard.type("She is late.", { delay: 20 });
  await app.window.keyboard.press("Enter");
  await app.window.keyboard.type("- Stubborn", { delay: 20 });
}

describe("copying a page out", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await makePageOfTemplate(app.window, "Copied Out", "Note");
    await writeAPage(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("gives the words themselves, with nothing added around them", async () => {
    await app.window.keyboard.press("Control+a");
    const { text } = await copiedFromEditor(app.window);
    expect(text).toContain("Kaine");
    expect(text).toContain("She is late.");
    // The bullet it is drawn as, not the one Markdown would read back.
    expect(text).toContain("• Stubborn");
    expect(text).not.toContain("#");
    expect(text).not.toContain("*");
  });

  it("keeps the formatting for anywhere that can show it", async () => {
    await app.window.keyboard.press("Control+a");
    const { html } = await copiedFromEditor(app.window);
    expect(html).toContain("Kaine");
    // Word, Google Docs and another page here read this one; the setting is
    // only ever about the plain-text half.
    expect(html.toLowerCase()).toContain("<h1");
  });

  it("gives Markdown instead when that is what the setting says", async () => {
    await openSettings(app.window);
    await openSettingsSection(app.window, "Writing");
    await pickPlainCopy(app.window, "markdown");
    await app.window.keyboard.press("Escape");
    await app.window.getByRole("dialog").waitFor({ state: "hidden" });

    await app.window.keyboard.press("Control+a");
    const { text } = await copiedFromEditor(app.window);
    expect(text).toContain("# Kaine");
    expect(text).toMatch(/[*-] Stubborn/);
  });

  it("offers the other way on the formatting bar", async () => {
    // Offered, not pressed: the button copies for real, and nothing in this
    // suite may touch the machine's clipboard. See docs/handoff.md.
    await app.window.keyboard.press("Control+a");
    // `waitFor` rather than a matcher: this suite's expect is Vitest's, which
    // has no toBeVisible, and an absent button fails it by timing out.
    await app.window.getByRole("button", { name: "Copy as Plain Text" }).first().waitFor({ state: "visible", timeout: 5_000 });
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
