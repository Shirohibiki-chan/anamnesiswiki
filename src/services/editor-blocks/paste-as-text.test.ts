import { describe, expect, it } from "vitest";
import { paragraphsFromPlainText } from "./paste-as-text";

describe("the paragraphs plain text describes", () => {
  it("keeps a single line break inside the paragraph it is in", () => {
    expect(paragraphsFromPlainText("One.\nStill one.")).toEqual(["One.\nStill one."]);
  });

  it("starts a new paragraph at a blank line", () => {
    expect(paragraphsFromPlainText("One.\nStill one.\n\nTwo.")).toEqual(["One.\nStill one.", "Two."]);
  });

  it("keeps an empty paragraph left there on purpose", () => {
    // What `copy-as-text.ts` writes for a paragraph, an empty one, a paragraph.
    expect(paragraphsFromPlainText("One.\n\n\n\nTwo.")).toEqual(["One.", "", "Two."]);
  });

  it("reads the line endings every source uses the same way", () => {
    expect(paragraphsFromPlainText("One.\r\n\r\nTwo.")).toEqual(["One.", "Two."]);
    expect(paragraphsFromPlainText("One.\rTwo.")).toEqual(["One.\nTwo."]);
  });

  it("leaves the characters alone that Markdown would have eaten", () => {
    // Nothing here parses or escapes; these are only here to say so, since
    // this is the file that would be the place to start doing either.
    const snippet = `"You have *TEN SECONDS,*" she says, and <Kalla> hears it.`;
    expect(paragraphsFromPlainText(snippet)).toEqual([snippet]);
    expect(paragraphsFromPlainText("# 1 fan")).toEqual(["# 1 fan"]);
  });

  it("gives one paragraph for text with no breaks at all", () => {
    expect(paragraphsFromPlainText("Just a few words.")).toEqual(["Just a few words."]);
  });
});
