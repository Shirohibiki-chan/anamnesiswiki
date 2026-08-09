import { describe, expect, it } from "vitest";
import { parseReleaseNotes, plainText, type ReleaseNoteBlock } from "./release-notes";

// Most assertions here only care about shape and words, not which span carried
// which. These two keep the tests readable when that's the case.
function shape(blocks: ReleaseNoteBlock[]): string[] {
  return blocks.map((block) =>
    block.kind === "list" ? `${block.ordered ? "ol" : "ul"}(${block.items.length})` : block.kind,
  );
}

function words(block: ReleaseNoteBlock): string | string[] {
  return block.kind === "list" ? block.items.map(plainText) : plainText(block.spans);
}

describe("parseReleaseNotes", () => {
  it("returns nothing for a release with no notes", () => {
    expect(parseReleaseNotes(null)).toEqual([]);
    expect(parseReleaseNotes(undefined)).toEqual([]);
    expect(parseReleaseNotes("  \n\n ")).toEqual([]);
  });

  it("keeps headings, paragraphs and lists as separate blocks", () => {
    const blocks = parseReleaseNotes("Intro line.\n\n### Themes\n\n- One thing\n- Another thing");
    expect(shape(blocks)).toEqual(["paragraph", "heading", "ul(2)"]);
    expect(words(blocks[0])).toBe("Intro line.");
    expect(words(blocks[1])).toBe("Themes");
    expect(words(blocks[2])).toEqual(["One thing", "Another thing"]);
  });

  // RELEASES.md hard-wraps at ~78 characters. Both of these arrive as several
  // lines that were written as one.
  it("rejoins a hard-wrapped paragraph", () => {
    const blocks = parseReleaseNotes("There are seven themes instead of\none, and you can build\nyour own.");
    expect(shape(blocks)).toEqual(["paragraph"]);
    expect(words(blocks[0])).toBe("There are seven themes instead of one, and you can build your own.");
  });

  it("rejoins a bullet that runs over several lines", () => {
    const blocks = parseReleaseNotes(
      "- **Seven themes.** Midnight is what you\n  start on now. Anamnesis Dark is what\n  the app used to look like.\n- Change any colour.",
    );
    expect(shape(blocks)).toEqual(["ul(2)"]);
    expect(words(blocks[0])).toEqual([
      "Seven themes. Midnight is what you start on now. Anamnesis Dark is what the app used to look like.",
      "Change any colour.",
    ]);
  });

  it("separates a heading that has no blank line under it", () => {
    expect(shape(parseReleaseNotes("### Undo\nYou can undo in the sidebar now."))).toEqual(["heading", "paragraph"]);
  });

  it("starts a new list after a blank line", () => {
    expect(shape(parseReleaseNotes("- One\n\n- Two"))).toEqual(["ul(1)", "ul(1)"]);
  });

  it("reads numbered lists as ordered", () => {
    const blocks = parseReleaseNotes("1. First\n2) Second");
    expect(shape(blocks)).toEqual(["ol(2)"]);
    expect(words(blocks[0])).toEqual(["First", "Second"]);
  });

  it("drops horizontal rules", () => {
    expect(shape(parseReleaseNotes("First.\n\n---\n\nSecond."))).toEqual(["paragraph", "paragraph"]);
  });

  it("copes with Windows line endings", () => {
    expect(shape(parseReleaseNotes("Intro.\r\n\r\n### Themes\r\n\r\n- One"))).toEqual([
      "paragraph",
      "heading",
      "ul(1)",
    ]);
  });

  // The panel's own headline already reads "Anamnesis 0.3.0 is available", so a
  // pasted-in version heading would say it twice.
  describe("the version heading", () => {
    it("drops it when the whole section was pasted in", () => {
      const blocks = parseReleaseNotes("## v0.3.0 — 2026-08-08\n\nAnamnesis looks however you want.");
      expect(shape(blocks)).toEqual(["paragraph"]);
    });

    it("drops it without the v too", () => {
      expect(shape(parseReleaseNotes("## 0.3.0\n\nText."))).toEqual(["paragraph"]);
    });

    it("keeps a real heading that happens to lead", () => {
      expect(shape(parseReleaseNotes("### Themes, and making your own\n\n- One"))).toEqual(["heading", "ul(1)"]);
    });
  });

  describe("inline formatting", () => {
    it("marks bold, emphasis and code", () => {
      const blocks = parseReleaseNotes("**Seven themes**, all *yours*, from a `.css` file.");
      expect(blocks[0].kind === "paragraph" && blocks[0].spans).toEqual([
        { kind: "strong", text: "Seven themes" },
        { kind: "text", text: ", all " },
        { kind: "em", text: "yours" },
        { kind: "text", text: ", from a " },
        { kind: "code", text: ".css" },
        { kind: "text", text: " file." },
      ]);
    });

    it("formats inside a bullet and a heading too", () => {
      const blocks = parseReleaseNotes("### *Midnight*\n\n- **Bold** start");
      expect(blocks[0].kind === "heading" && blocks[0].spans).toEqual([{ kind: "em", text: "Midnight" }]);
      expect(blocks[1].kind === "list" && blocks[1].items[0][0]).toEqual({ kind: "strong", text: "Bold" });
    });

    // Links keep their words and lose their address — nothing in a release
    // body should be able to send someone anywhere.
    it("reduces a link to its words", () => {
      const blocks = parseReleaseNotes("Read the [full notes](https://example.com/x) for more.");
      expect(words(blocks[0])).toBe("Read the full notes for more.");
      expect(JSON.stringify(blocks)).not.toContain("example.com");
    });

    it("drops images — there's nothing to show for one", () => {
      expect(words(parseReleaseNotes("![shot](https://example.com/a.png) Themes are here.")[0])).toBe(
        "Themes are here.",
      );
    });

    // Underscores aren't emphasis here on purpose: these notes are full of
    // `_folder.json` and `snake_case`, and nobody writing them uses `_this_`.
    it("leaves underscores alone", () => {
      expect(words(parseReleaseNotes("A folder now holds _folder.json and project_home.")[0])).toBe(
        "A folder now holds _folder.json and project_home.",
      );
    });

    it("keeps an escaped marker as the character itself", () => {
      expect(words(parseReleaseNotes("A literal \\*star\\* stays a star.")[0])).toBe("A literal *star* stays a star.");
    });

    it("keeps a sentence in one span rather than splitting it at an escape", () => {
      const blocks = parseReleaseNotes("Cost \\$5 and \\*that\\* is all.");
      expect(blocks[0].kind === "paragraph" && blocks[0].spans).toHaveLength(1);
    });

    // The whole safety argument in one test: what comes back is data, and its
    // text is carried verbatim. The component renders spans as elements, so
    // characters like these can only ever be read.
    it("never turns anything into markup", () => {
      const blocks = parseReleaseNotes("<script>alert(1)</script> and <b>bold</b>");
      expect(words(blocks[0])).toBe("<script>alert(1)</script> and <b>bold</b>");
      expect(blocks.every((block) => block.kind === "paragraph" || block.kind === "heading")).toBe(true);
    });
  });
});
