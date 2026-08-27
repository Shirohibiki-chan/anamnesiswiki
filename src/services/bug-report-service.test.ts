import { describe, expect, it, vi } from "vitest";
import {
  collectBuildFacts,
  describeBuild,
  describeSystem,
  factsFromCrash,
  MAX_PREFILL,
  openBugReport,
  reportDetails,
  reportUrl,
  trimForUrl,
  type BuildFacts,
} from "./bug-report-service";
import { buildCrash } from "./crash-log-service";

const opened = vi.hoisted(() => ({ url: "" }));
const version = vi.hoisted(() => ({ value: "0.5.0" as string | null }));
vi.mock("./host-service", () => ({
  appVersion: async () => {
    if (version.value === null) throw new Error("no shell here");
    return version.value;
  },
  shellName: () => "Electron",
  openInBrowser: async (url: string) => {
    opened.url = url;
  },
  openKeyValueStore: async () => ({
    get: async () => undefined,
    set: async () => {},
    delete: async () => {},
    save: async () => {},
  }),
}));

const facts: BuildFacts = {
  version: "0.5.0",
  shell: "Electron",
  system: "Linux",
  userAgent: "Mozilla/5.0 (X11; Linux x86_64) Electron/38.0.0",
};

describe("naming the system", () => {
  it("reads the ones the user agent actually proves", () => {
    expect(describeSystem("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/128")).toBe("Windows");
    expect(describeSystem("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)")).toBe("macOS");
    expect(describeSystem("Mozilla/5.0 (X11; Linux x86_64)")).toBe("Linux");
  });

  it("says so rather than guessing when it can't tell", () => {
    expect(describeSystem("something nobody has seen")).toBe("an unknown system");
  });

  // Windows NT 10.0 is both Windows 10 and Windows 11, so the coarse answer is
  // the honest one — a report that names the wrong version sends its reader to
  // the wrong system.
  it("does not invent a version number", () => {
    expect(describeSystem("Mozilla/5.0 (Windows NT 10.0)")).not.toMatch(/1[01]/);
  });
});

describe("what the report says", () => {
  it("names the shell, because the version can't tell the two builds apart", () => {
    const built = describeBuild(facts);
    expect(built).toContain("Anamnesis 0.5.0");
    expect(built).toContain("Electron build");
    expect(built).toContain("Linux");
  });

  it("is just the build when nothing has crashed", () => {
    expect(reportDetails(facts, null)).toBe(describeBuild(facts));
  });

  it("appends the crash when there was one", () => {
    const crash = buildCrash("render", new TypeError("cannot read colour of undefined"));
    const details = reportDetails(facts, crash);
    expect(details).toContain("Anamnesis 0.5.0");
    expect(details).toContain("cannot read colour of undefined");
  });
});

describe("reporting a crash", () => {
  it("takes the build from the record, not from the shell that is falling over", () => {
    const crash = { ...buildCrash("render", new Error("boom")), version: "0.4.0" };
    const from = factsFromCrash({ ...crash, userAgent: "Mozilla/5.0 (X11; Linux x86_64)" });
    expect(from.version).toBe("0.4.0");
    expect(from.system).toBe("Linux");
    // The one thing a saved record cannot carry, because it was never written
    // into the file — it comes from the build doing the reporting.
    expect(from.shell).toBe("Electron");
  });
});

describe("fitting it into a link", () => {
  it("leaves a short report alone", () => {
    const details = describeBuild(facts);
    expect(trimForUrl(details)).toBe(details);
  });

  it("cuts a long one down and says it did", () => {
    const trimmed = trimForUrl(`start${"x".repeat(MAX_PREFILL * 2)}`);
    expect(trimmed.length).toBeLessThanOrEqual(MAX_PREFILL);
    expect(trimmed).toContain("clipboard");
    expect(trimmed.startsWith("start")).toBe(true);
  });

  it("keeps the whole URL inside what GitHub will follow", () => {
    // The point of the cap: percent-encoding a stack trace multiplies its
    // length, so the test is on the encoded URL rather than on the text.
    const url = reportUrl(`Anamnesis\n${"a stack frame at some/path.tsx:44\n".repeat(400)}`);
    expect(url.length).toBeLessThan(8000);
  });

  it("points the link at the form, so the prefilled field exists", () => {
    const url = new URL(reportUrl(describeBuild(facts)));
    expect(url.pathname).toBe("/Shirohibiki-chan/anamnesiswiki/issues/new");
    expect(url.searchParams.get("template")).toBe("bug_report.yml");
    expect(url.searchParams.get("build")).toContain("Anamnesis 0.5.0");
  });
});

describe("asking the shell", () => {
  it("takes the version and the shell's own name", async () => {
    version.value = "0.6.0";
    const collected = await collectBuildFacts();
    expect(collected.version).toBe("0.6.0");
    expect(collected.shell).toBe("Electron");
  });

  it("still produces a report when no shell can answer", async () => {
    version.value = null;
    const collected = await collectBuildFacts();
    expect(collected.version).toBe("unknown");
    expect(describeBuild(collected)).toContain("Electron build");
    version.value = "0.5.0";
  });
});

describe("opening it", () => {
  it("hands the browser a link and nothing else", async () => {
    await openBugReport(describeBuild(facts));
    expect(opened.url).toContain("issues/new?");
    expect(new URL(opened.url).searchParams.get("build")).toContain("Anamnesis 0.5.0");
  });
});
