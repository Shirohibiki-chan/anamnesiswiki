import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vitest";
import { plainTextOf } from "./copy-as-text";
import { editorSchema } from "./editor-schema";

/** A real document in the app's own schema, headless — the same trick callout-caret.test.ts uses. */
function docFor(content: object[]) {
  return BlockNoteEditor.create({ schema: editorSchema, initialContent: content as never }).prosemirrorState.doc;
}

/** The whole document as plain text, which is what Ctrl+A then Ctrl+C copies. */
function textOf(content: object[]): string {
  return plainTextOf(docFor(content).content);
}

const bold = (text: string) => ({ type: "text", text, styles: { bold: true } });
const plain = (text: string) => ({ type: "text", text, styles: {} });

describe("a selection copied as plain text", () => {
  it("leaves the marks off the words and keeps the lines apart", () => {
    const text = textOf([
      { type: "heading", props: { level: 1 }, content: [plain("Kaine")] },
      { type: "paragraph", content: [plain("She is "), bold("late"), plain(".")] },
    ]);
    expect(text).toBe("Kaine\n\nShe is late.");
    expect(text).not.toContain("#");
    expect(text).not.toContain("*");
  });

  it("keeps a bullet as the character it is drawn as, one item to a line", () => {
    expect(
      textOf([
        { type: "paragraph", content: [plain("Traits")] },
        { type: "bulletListItem", content: [plain("Stubborn")] },
        { type: "bulletListItem", content: [plain("Kind about it")] },
      ]),
    ).toBe("Traits\n\n• Stubborn\n• Kind about it");
  });

  it("numbers a numbered list, and starts again after something else", () => {
    expect(
      textOf([
        { type: "numberedListItem", content: [plain("Knock")] },
        { type: "numberedListItem", content: [plain("Wait")] },
        { type: "paragraph", content: [plain("Then:")] },
        { type: "numberedListItem", content: [plain("Leave")] },
      ]),
    ).toBe("1. Knock\n2. Wait\n\nThen:\n\n1. Leave");
  });

  it("indents a list inside a list", () => {
    expect(
      textOf([
        { type: "bulletListItem", content: [plain("Kin")], children: [{ type: "bulletListItem", content: [plain("Her brother")] }] },
      ]),
    ).toBe("• Kin\n  • Her brother");
  });

  it("draws a checkbox as a box, ticked or not", () => {
    expect(
      textOf([
        { type: "checkListItem", props: { checked: true }, content: [plain("Named her")] },
        { type: "checkListItem", props: { checked: false }, content: [plain("Drawn her")] },
      ]),
    ).toBe("☑ Named her\n☐ Drawn her");
  });

  it("keeps an empty paragraph somebody left on purpose", () => {
    expect(
      textOf([
        { type: "paragraph", content: [plain("One.")] },
        { type: "paragraph", content: [] },
        { type: "paragraph", content: [plain("Two.")] },
      ]),
    ).toBe("One.\n\n\n\nTwo.");
  });

  it("copies half a sentence as half a sentence", () => {
    const doc = docFor([{ type: "paragraph", content: [plain("She is late again.")] }]);
    // doc > blockGroup > blockContainer > paragraph: the words start at 3.
    const slice = doc.slice(3 + "She is ".length, 3 + "She is late".length);
    expect(plainTextOf(slice.content)).toBe("late");
  });

  it("leaves a picture with no caption behind, and brings one that has it", () => {
    expect(
      textOf([
        { type: "paragraph", content: [plain("Before.")] },
        { type: "image", props: { url: "assets/kaine.png" } },
        { type: "paragraph", content: [plain("After.")] },
      ]),
    ).toBe("Before.\n\nAfter.");
    expect(textOf([{ type: "image", props: { url: "assets/kaine.png", caption: "Kaine, in the rain" } }])).toBe("Kaine, in the rain");
  });

  it("lays a table out as rows of cells", () => {
    const cell = (text: string) => ({ type: "tableCell", content: [plain(text)] });
    expect(
      textOf([
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: [cell("Name"), cell("Age")] }, { cells: [cell("Kaine"), cell("29")] }],
          },
        },
      ]),
    ).toBe("Name\tAge\nKaine\t29");
  });
});
