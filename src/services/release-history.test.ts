import { describe, expect, it } from "vitest";
import { parseReleaseHistory, recentReleases } from "./release-history";

// Shaped like RELEASES.md: an h1 and intro prose, then `---`-separated
// sections, newest first.
const SAMPLE = `# Release notes

Intro prose that belongs to no version.

---

## v0.3.0 — 2026-08-08

Opening paragraph.

### Themes

- **Seven themes.** Including *Abyssal*.

---

## v0.2.1 — 2026-07-31

- **The settings cog reaches an installed copy.**

## v0.2.0 — 2026-07-31

- **First published release.**
`;

describe("parseReleaseHistory", () => {
  it("returns one entry per version, newest first", () => {
    expect(parseReleaseHistory(SAMPLE).map((r) => r.version)).toEqual(["0.3.0", "0.2.1", "0.2.0"]);
  });

  it("keeps the date beside each version", () => {
    expect(parseReleaseHistory(SAMPLE)[0].date).toBe("2026-08-08");
  });

  it("drops the intro above the first version", () => {
    expect(parseReleaseHistory(SAMPLE)[0].body).not.toContain("belongs to no version");
  });

  it("keeps a section's own headings and bullets", () => {
    const body = parseReleaseHistory(SAMPLE)[0].body;
    expect(body).toContain("### Themes");
    expect(body).toContain("**Seven themes.**");
    expect(body).toContain("Opening paragraph.");
  });

  it("strips the horizontal rules that separate sections", () => {
    expect(parseReleaseHistory(SAMPLE)[0].body).not.toContain("---");
  });

  it("stops a section at the next version rather than running on", () => {
    expect(parseReleaseHistory(SAMPLE)[1].body).not.toContain("First published release");
  });

  it("reads a version with no date", () => {
    const [entry] = parseReleaseHistory("## v1.2.3\n\nBody.\n");
    expect(entry.version).toBe("1.2.3");
    expect(entry.date).toBeNull();
  });

  it("accepts a plain hyphen where the file uses an em-dash", () => {
    expect(parseReleaseHistory("## v1.2.3 - 2026-01-01\n")[0].date).toBe("2026-01-01");
  });

  it("ignores second-level headings that aren't versions", () => {
    expect(parseReleaseHistory("## Release notes\n\nProse.\n")).toEqual([]);
  });

  it("handles CRLF, since the file is edited on Windows", () => {
    expect(parseReleaseHistory("## v9.9.9 — today\r\n\r\nBody.\r\n")[0].version).toBe("9.9.9");
  });
});

describe("recentReleases", () => {
  it("takes the newest few", () => {
    expect(recentReleases(2, SAMPLE).map((r) => r.version)).toEqual(["0.3.0", "0.2.1"]);
  });

  it("returns everything when asked for more than there is", () => {
    expect(recentReleases(10, SAMPLE)).toHaveLength(3);
  });
});

describe("the bundled RELEASES.md", () => {
  // Guards the wiring rather than the parser: if the raw import breaks, or the
  // file's headings drift from `## v0.0.0 — date`, the panel goes blank and
  // nothing else in the app would notice.
  it("parses into at least one version", () => {
    const releases = parseReleaseHistory();
    expect(releases.length).toBeGreaterThan(0);
    expect(releases[0].version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(releases[0].body.length).toBeGreaterThan(0);
  });
});
