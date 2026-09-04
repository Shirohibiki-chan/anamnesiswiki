// The contents list stores nothing and re-reads the document, so everything
// that can go wrong with it goes wrong here: a heading missed, a heading listed
// under the wrong name, or a heading found somewhere that is not one.
import { describe, expect, it } from "vitest";
import { headingsOf } from "./toc-service";

const heading = (id: string, text: unknown, level = 1, children?: unknown[]) => ({
  id,
  type: "heading",
  props: { level },
  content: text,
  children,
});

describe("headingsOf", () => {
  it("lists the headings in reading order, with their levels", () => {
    const found = headingsOf([
      heading("h1", [{ text: "Origins" }]),
      { id: "p1", type: "paragraph", content: [{ text: "Not a heading" }] },
      heading("h2", [{ text: "Later" }], 2),
    ]);
    expect(found).toEqual([
      { id: "h1", level: 1, text: "Origins" },
      { id: "h2", level: 2, text: "Later" },
    ]);
  });

  // Inline content is a list of runs, so a heading with one bold word in it is
  // three of them. Taking the first would list the heading as its first two
  // words.
  it("joins a heading written in several runs", () => {
    const found = headingsOf([heading("h1", [{ text: "The " }, { text: "Quiet", styles: { bold: true } }, { text: " Year" }])]);
    expect(found[0].text).toBe("The Quiet Year");
  });

  // A mention or a link is an object with its own content rather than a text
  // field, and a heading naming a page is an ordinary thing to write.
  it("reads through inline content that holds its own content", () => {
    const found = headingsOf([heading("h1", [{ text: "About " }, { type: "mention", content: [{ text: "Valera" }] }])]);
    expect(found[0].text).toBe("About Valera");
  });

  // BlockNote's toggle heading holds what is under it as children, so a
  // contents list that only read the top level would stop at the first
  // collapsible section.
  it("finds headings nested inside another block", () => {
    const found = headingsOf([
      heading("h1", [{ text: "Top" }], 1, [heading("h2", [{ text: "Inside" }], 2)]),
    ]);
    expect(found.map((entry) => entry.id)).toEqual(["h1", "h2"]);
  });

  // A row of blanks appearing as you press Enter is worse than a list that
  // fills in as you type.
  it("leaves out a heading with nothing written in it yet", () => {
    expect(headingsOf([heading("h1", []), heading("h2", [{ text: "   " }])])).toEqual([]);
  });

  it("survives anything that is not a document", () => {
    expect(headingsOf(undefined)).toEqual([]);
    expect(headingsOf([null, 3, "text", {}])).toEqual([]);
  });
});
