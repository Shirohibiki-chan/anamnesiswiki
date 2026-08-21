import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { releaseNotesFor } from "./release-notes.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Shaped like RELEASES.md: an h1 and intro prose, then `---`-separated
// sections, newest first.
const SAMPLE = `# Release notes

Intro prose that belongs to no version.

---

## v0.3.0 — 2026-08-08

Opening paragraph.

### Themes

- **Seven themes.**

---

## v0.2.1 — 2026-07-31

- **The settings cog reaches an installed copy.**
`;

describe("releaseNotesFor", () => {
  it("returns the asked-for section and no other", () => {
    const notes = releaseNotesFor("0.3.0", SAMPLE);
    expect(notes).toContain("Opening paragraph.");
    expect(notes).toContain("### Themes");
    expect(notes).not.toContain("settings cog");
    expect(notes).not.toContain("belongs to no version");
  });

  it("drops the version heading, since GitHub and the update panel both title it", () => {
    expect(releaseNotesFor("0.3.0", SAMPLE)).not.toContain("## v0.3.0");
  });

  it("strips the rules that separate sections in the file", () => {
    expect(releaseNotesFor("0.3.0", SAMPLE)).not.toContain("---");
  });

  it("reads a version that isn't the newest", () => {
    expect(releaseNotesFor("0.2.1", SAMPLE)).toContain("settings cog");
  });

  it("says nothing rather than guessing when the version isn't there", () => {
    expect(releaseNotesFor("9.9.9", SAMPLE)).toBeNull();
  });

  it("handles CRLF, since the file is edited on Windows", () => {
    expect(releaseNotesFor("1.0.0", "## v1.0.0 — today\r\n\r\nBody.\r\n")).toBe("Body.");
  });

  it("accepts a plain hyphen where the file uses an em-dash", () => {
    expect(releaseNotesFor("1.0.0", "## v1.0.0 - today\n\nBody.\n")).toBe("Body.");
  });
});

// Guards the wiring, not the parser. The release workflow runs this script
// against the real file, and a heading that drifts from `## v0.0.0 — date`
// would stop the build — better here, where it's a failing test, than at the
// moment of tagging.
describe("the real RELEASES.md", () => {
  const markdown = readFileSync(join(repoRoot, "RELEASES.md"), "utf8");

  it("has a section for the version in package.json", () => {
    const { version } = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    const notes = releaseNotesFor(version, markdown);
    expect(notes, `RELEASES.md has no section for ${version}`).toBeTruthy();
    expect(notes.length).toBeGreaterThan(200);
  });

  // GitHub renders a release body — and the app's update panel renders
  // `latest.json`'s copy of it — with a single newline as a hard line break.
  // So wrapping this file at 78 columns ships the wrapping to the reader as a
  // narrow ragged column. It happened on v0.4.0 and was fixed by hand after
  // publishing, including re-uploading `latest.json`; this stops it recurring.
  // Only the current version's section is checked — everything already
  // published stays as it was written.
  it("doesn't hard-wrap the current version's section", () => {
    const { version } = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    const lines = releaseNotesFor(version, markdown).split("\n");
    const wrapped = lines.filter((line, i) => {
      const text = line.trim();
      // A line that opens something new is fine; only a continuation of the
      // line above it means the source was wrapped.
      if (i === 0 || text === "" || text === "---") return false;
      if (text.startsWith("#") || text.startsWith("- ") || text.startsWith("* ")) return false;
      const previous = lines[i - 1].trim();
      return previous !== "" && previous !== "---" && !previous.startsWith("#");
    });
    expect(
      wrapped,
      `RELEASES.md wraps the v${version} section. One line per paragraph and per bullet — GitHub and the update panel turn every newline into a line break.`,
    ).toEqual([]);
  });

  it("doesn't run one version's notes into the next", () => {
    // Every section stops somewhere: the whole file parsed as one version
    // would be the failure, and it shows up as a section far longer than the
    // file's own top-to-bottom length can allow for two of them.
    const { version } = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(releaseNotesFor(version, markdown).length).toBeLessThan(markdown.length);
  });
});
