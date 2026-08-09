import { describe, expect, it } from "vitest";
import { summariseReleaseNotes } from "./release-notes";

describe("summariseReleaseNotes", () => {
  it("returns null when the release had no notes", () => {
    expect(summariseReleaseNotes(null)).toBeNull();
    expect(summariseReleaseNotes(undefined)).toBeNull();
    expect(summariseReleaseNotes("   \n\n  ")).toBeNull();
  });

  it("stops at the first blank line", () => {
    const body = "Anamnesis looks however you want it to now.\n\n### Themes\n\n- Seven themes.";
    expect(summariseReleaseNotes(body)).toBe("Anamnesis looks however you want it to now.");
  });

  // RELEASES.md hard-wraps its prose at ~78 characters, so the paragraph
  // arrives as several lines that were written as one sentence.
  it("rejoins a hard-wrapped paragraph into one line", () => {
    const body = "There are seven themes instead of\none, and you can build your own\nfrom inside Settings.";
    expect(summariseReleaseNotes(body)).toBe(
      "There are seven themes instead of one, and you can build your own from inside Settings.",
    );
  });

  // Whether the `## v0.3.0 — 2026-08-08` line gets pasted into the release
  // along with the section is a coin flip, and it must not become the summary.
  it("skips a heading above the paragraph", () => {
    expect(summariseReleaseNotes("## v0.3.0 — 2026-08-08\n\nSearch reads your writing now.")).toBe(
      "Search reads your writing now.",
    );
  });

  it("skips a heading that isn't separated from the paragraph by a blank line", () => {
    expect(summariseReleaseNotes("# What's new\nSearch reads your writing now.")).toBe(
      "Search reads your writing now.",
    );
  });

  it("skips a horizontal rule in any spelling", () => {
    expect(summariseReleaseNotes("---\n\nFirst words.")).toBe("First words.");
    expect(summariseReleaseNotes("***\n\nFirst words.")).toBe("First words.");
    expect(summariseReleaseNotes("___\n\nFirst words.")).toBe("First words.");
  });

  it("returns null when the body is nothing but structure", () => {
    expect(summariseReleaseNotes("## v0.3.0\n\n---")).toBeNull();
  });

  describe("inline markdown", () => {
    it("unwraps bold, emphasis and code", () => {
      expect(summariseReleaseNotes("**Seven themes**, all *yours*, from a `.css` file.")).toBe(
        "Seven themes, all yours, from a .css file.",
      );
      expect(summariseReleaseNotes("__Bold__ and _emphasised_ too.")).toBe("Bold and emphasised too.");
    });

    it("keeps a link's words and drops its address", () => {
      expect(summariseReleaseNotes("Read the [full notes](https://example.com/x) for more.")).toBe(
        "Read the full notes for more.",
      );
    });

    it("drops images entirely — there's nothing to show for one", () => {
      expect(summariseReleaseNotes("![a screenshot](https://example.com/a.png) Themes are here.")).toBe(
        "Themes are here.",
      );
    });

    it("leaves snake_case alone", () => {
      expect(summariseReleaseNotes("The setting is called project_home now.")).toBe(
        "The setting is called project_home now.",
      );
    });

    it("unescapes a deliberately escaped marker", () => {
      expect(summariseReleaseNotes("A literal \\*star\\* stays a star.")).toBe("A literal *star* stays a star.");
    });

    it("never emits markup, whatever the body contains", () => {
      const summary = summariseReleaseNotes('<script>alert(1)</script> and <b>bold</b>');
      // Passed through as characters, unchanged — the panel renders this as a
      // text node, so it can only ever be read, never run.
      expect(summary).toBe('<script>alert(1)</script> and <b>bold</b>');
    });
  });

  // A body that opens with bullets rather than prose still has to read.
  describe("a body that opens with a list", () => {
    it("keeps one item per line and swaps the marker for a bullet", () => {
      expect(summariseReleaseNotes("- **Seven themes.**\n- Search reads your writing.")).toBe(
        "• Seven themes.\n• Search reads your writing.",
      );
    });

    it("handles numbered lists the same way", () => {
      expect(summariseReleaseNotes("1. First thing\n2. Second thing")).toBe("• First thing\n• Second thing");
    });
  });

  it("copes with Windows line endings", () => {
    expect(summariseReleaseNotes("First paragraph.\r\n\r\n### Later\r\n\r\n- A bullet")).toBe("First paragraph.");
  });
});
