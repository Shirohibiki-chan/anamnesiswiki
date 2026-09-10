// Phase 28 — what actually lands on the paper.
//
// **The print dialog is native and cannot be clicked, but the rendering can
// be checked without it.** `emulateMedia({ media: "print" })` makes the page
// lay itself out exactly as it would for the printer, so every assertion here
// is against the real stylesheet applied to a real world — which is the only
// way to catch the thing that was actually wrong before: not that the styles
// were absent, but that the app's own scroll cage meant only one screenful
// reached the sheet.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openFirstMatch, waitForWorld } from "./harness/screen";

/** What the browser computes for one property, at whatever media is active. */
async function styleOf(app: RunningApp, selector: string, property: string): Promise<string | null> {
  return app.window.evaluate(
    ([sel, prop]) => {
      const element = document.querySelector(sel as string);
      return element ? getComputedStyle(element).getPropertyValue(prop as string) : null;
    },
    [selector, property],
  );
}

async function isDisplayed(app: RunningApp, selector: string): Promise<boolean> {
  return (await styleOf(app, selector, "display")) !== "none" && (await app.window.locator(selector).count()) > 0;
}

describe("printing a page", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    // A page with real writing in it rather than the empty one — the point is
    // what happens to prose, headings and blocks.
    await openFirstMatch(app.window, "Every Meter");
    await app.window.emulateMedia({ media: "print" });
  }, 120_000);

  afterAll(async () => {
    // Left alone, the next scenario in this file would inherit print media.
    await app?.window.emulateMedia({ media: "screen" }).catch(() => {});
    await app?.close();
  });

  it("takes the interface off the paper", async () => {
    // The last two sit *inside* the writing rather than around it, so they
    // survived the first sweep and were still on the paper when it was looked
    // at: the graph button beside the name, and a callout's colour dot.
    for (const selector of [
      ".left-rail",
      ".app-layout-tree",
      ".app-layout-properties",
      ".page-tabs",
      ".page-title-breadcrumb",
      ".page-title-graph-button",
      ".editor-callout-color",
    ]) {
      expect({ selector, shown: await isDisplayed(app, selector) }).toEqual({ selector, shown: false });
    }
  });

  it("keeps the page's title and its writing", async () => {
    expect(await isDisplayed(app, ".page-title")).toBe(true);
    expect(await isDisplayed(app, ".bn-editor")).toBe(true);
  });

  // The bug this whole file exists for. `html, body, #root` are a fixed-height
  // scroll cage on screen and `.app-layout-page` is the real scroller, so a
  // page taller than the window printed as one sheet with the rest cut off.
  //
  // **Checked as "nothing is hidden inside anything", not as "the document
  // got taller".** Removing the reading-column cap rewraps the prose wider,
  // so a page that overflowed on screen can genuinely fit on paper — the
  // first version of this test asserted the document grew and failed on a
  // page that had simply become shorter.
  it("hides nothing inside a scroller, so the whole page reaches the paper", async () => {
    const clipped = await app.window.evaluate(() => {
      const names = ["html", "body", "#root", ".app-frame", ".app-layout", ".app-layout-center", ".app-layout-page", ".page-view-shell", ".page-view"];
      return names
        .map((selector) => {
          const el = selector === "html" ? document.documentElement : (document.querySelector(selector) as HTMLElement | null);
          if (!el) return null;
          // One pixel of slack for sub-pixel rounding on a scaled display.
          return el.scrollHeight > el.clientHeight + 1 ? `${selector} (${el.scrollHeight} in ${el.clientHeight})` : null;
        })
        .filter(Boolean);
    });
    expect(clipped).toEqual([]);
  });

  // The other half of the same claim: on screen this page *is* clipped, so the
  // test above is measuring something real rather than a page that fits.
  it("is genuinely clipped on screen, which is what makes the above worth asserting", async () => {
    await app.window.emulateMedia({ media: "screen" });
    const hidden = await app.window.evaluate(() => {
      const el = document.querySelector(".app-layout-page") as HTMLElement;
      return el.scrollHeight - el.clientHeight;
    });
    await app.window.emulateMedia({ media: "print" });
    expect(hidden).toBeGreaterThan(100);
  });

  // Every shipped theme but one is dark, and a dark theme on paper is a solid
  // black rectangle.
  it("prints on white, whichever theme the app is wearing", async () => {
    for (const selector of ["body", ".app-layout-page", ".page-view"]) {
      expect({ selector, background: await styleOf(app, selector, "background-color") }).toEqual({
        selector,
        background: "rgb(255, 255, 255)",
      });
    }
    const ink = await styleOf(app, ".page-title", "color");
    // Near-black rather than the near-white the dark themes use.
    expect(ink).toMatch(/^rgba?\((\d+), (\d+), (\d+)/);
    const [red] = ink!.match(/\d+/g)!.map(Number);
    expect(red).toBeLessThan(80);
  });

  it("gives the writing the whole sheet instead of a screen's reading column", async () => {
    expect(await styleOf(app, ".page-view", "max-width")).toBe("none");
  });
});
