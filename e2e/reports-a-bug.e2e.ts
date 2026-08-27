// Settings → Report a bug, in the app rather than in a unit test.
//
// **The part only a real build can answer is which build it is.** Everything
// else about a report — the wording, the trimming, the URL — is pure enough to
// test in `bug-report-service.test.ts` and is tested there. The shell's name is
// not: it comes from whichever `host-service` the build was compiled against,
// so a scenario running the packaged app is the only thing that can catch the
// day that resolution breaks and every report starts claiming to be the other
// shell. That matters more than usual here, because the two builds have shipped
// under one version number (`docs/plan.md` → Known Bugs) and this line is what
// tells them apart in a report.
//
// **Nothing here presses the button that opens a browser.** A scenario that
// launched a real browser on a test machine would be a scenario nobody could
// run twice; what the button does with the text is the service's business, and
// what the panel shows is this file's.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { openSettings, openSettingsSection, waitForWorld } from "./harness/screen";

describe("reporting a bug", () => {
  let app: RunningApp;
  let details: string;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openSettings(app.window);
    await openSettingsSection(app.window, "Report a bug");
    const block = app.window.locator(".bug-report-details");
    await block.waitFor({ state: "visible", timeout: 20_000 });
    details = await block.innerText();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("shows what the report will carry, rather than hiding it behind the button", () => {
    expect(details).toContain("Anamnesis");
  });

  it("names the shell it is actually running in", () => {
    expect(details).toContain("Electron build");
  });

  it("names the system it is running on", () => {
    // Whatever this machine is — the point is that the line was filled in from
    // the real user agent rather than left as the fallback.
    expect(details).not.toContain("an unknown system");
    expect(details).toMatch(/Running on \w/);
  });

  it("offers both ways out: the form and the clipboard", async () => {
    await expect(app.window.getByRole("button", { name: "Open a bug report" })).toBeTruthy();
    await expect(app.window.getByRole("button", { name: "Copy the details" })).toBeTruthy();
    expect(await app.window.getByRole("button", { name: "Open a bug report" }).isEnabled()).toBe(true);
  });

  it("says nothing to the console while doing it", () => {
    expect(app.errors).toEqual([]);
  });
});
