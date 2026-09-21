import { describe, expect, it } from "vitest";
import { BOLD_MARK, ITALIC_MARK, linkedWords, measuredLineWidth, plainText, richLines, runFont, textLinkAt, textPageIds, toggledMark } from "./board-text";

describe("richLines", () => {
  it("reads plain words as one run per line, an empty line as none", () => {
    expect(richLines("one\n\ntwo")).toEqual([[{ text: "one" }], [], [{ text: "two" }]]);
  });

  it("reads bold, italic and both", () => {
    expect(richLines("a **bold** and *slanted* and ***both*** end")).toEqual([
      [{ text: "a " }, { text: "bold", bold: true }, { text: " and " }, { text: "slanted", italic: true }, { text: " and " }, { text: "both", bold: true, italic: true }, { text: " end" }],
    ]);
  });

  it("leaves a star that is not a mark as a star", () => {
    expect(richLines("5 * 3 * 2")).toEqual([[{ text: "5 * 3 * 2" }]]);
    expect(richLines("**not closed")).toEqual([[{ text: "**not closed" }]]);
    expect(richLines("** spaced **")).toEqual([[{ text: "** spaced **" }]]);
    expect(richLines("a*b*c")).toEqual([[{ text: "a" }, { text: "b", italic: true }, { text: "c" }]]);
  });

  it("reads a link to a page and to a web address, and leaves any other bracket alone", () => {
    expect(richLines("see [Valera](anamnesis://page/v1) or [the site](https://x.org/a)")).toEqual([
      [{ text: "see " }, { text: "Valera", link: "anamnesis://page/v1" }, { text: " or " }, { text: "the site", link: "https://x.org/a" }],
    ]);
    expect(richLines("[not a link] and [nor](javascript:alert(1)) and [](https://x.org)")).toEqual([
      [{ text: "[not a link] and [nor](javascript:alert(1)) and [](https://x.org)" }],
    ]);
  });

  it("carries a mark over a line break the wrapping put in, and reads an address broken by one", () => {
    expect(richLines("**two\nlines**")).toEqual([[{ text: "two", bold: true }], [{ text: "lines", bold: true }]]);
    expect(richLines("[a long\nlabel](https://x.org/very\nlong)")).toEqual([[{ text: "a long", link: "https://x.org/verylong" }], [{ text: "label", link: "https://x.org/verylong" }]]);
  });

  it("marks bold words inside a link", () => {
    expect(richLines("[**bold** link](https://x.org)")).toEqual([[{ text: "bold", bold: true, link: "https://x.org" }, { text: " link", link: "https://x.org" }]]);
  });
});

describe("plainText and textPageIds", () => {
  it("strips the marks and keeps the lines", () => {
    expect(plainText("**Hello** [world](anamnesis://page/p1)\n*next*")).toBe("Hello world\nnext");
  });

  it("lists the pages linked, once each, and no web address", () => {
    expect(textPageIds("[a](anamnesis://page/p1) [b](https://x.org) [c](anamnesis://page/p1) [d](anamnesis://page/p2)")).toEqual(["p1", "p2"]);
    expect(textPageIds("nothing here")).toEqual([]);
  });
});

describe("measuring", () => {
  const measure = (text: string, font: string) => text.length * (font.startsWith("bold") || font.startsWith("italic bold") ? 12 : 10);

  it("puts the marks on the front of the font string", () => {
    expect(runFont("20px Excalifont", { text: "x", bold: true, italic: true })).toBe("italic bold 20px Excalifont");
    expect(runFont("20px Excalifont", { text: "x" })).toBe("20px Excalifont");
  });

  it("measures the marks hidden and a bold run bold", () => {
    expect(measuredLineWidth("ab", "20px F", measure)).toBe(20);
    expect(measuredLineWidth("**ab**", "20px F", measure)).toBe(24);
    expect(measuredLineWidth("a [b](https://x.org) c", "20px F", measure)).toBe(50);
  });
});

describe("toggledMark", () => {
  it("wraps the selected words, and unwraps them again", () => {
    const wrapped = toggledMark({ value: "make it bold now", start: 8, end: 12 }, BOLD_MARK);
    expect(wrapped).toEqual({ value: "make it **bold** now", start: 10, end: 14 });
    expect(toggledMark(wrapped, BOLD_MARK)).toEqual({ value: "make it bold now", start: 8, end: 12 });
  });

  it("unwraps a selection that has the marks inside it", () => {
    expect(toggledMark({ value: "a *b* c", start: 2, end: 5 }, ITALIC_MARK)).toEqual({ value: "a b c", start: 2, end: 3 });
  });

  it("keeps the spaces at the selection's edges outside the marks", () => {
    expect(toggledMark({ value: "one two three", start: 3, end: 8 }, BOLD_MARK)).toEqual({ value: "one **two** three", start: 6, end: 9 });
  });

  it("tells bold from italic by counting the stars, and puts both on together", () => {
    const both = toggledMark({ value: "**Hello**", start: 0, end: 9 }, ITALIC_MARK);
    expect(both).toEqual({ value: "***Hello***", start: 1, end: 10 });
    expect(toggledMark(both, ITALIC_MARK)).toEqual({ value: "**Hello**", start: 0, end: 9 });
    expect(toggledMark({ value: "***Hello***", start: 0, end: 11 }, BOLD_MARK)).toEqual({ value: "*Hello*", start: 0, end: 7 });
    expect(toggledMark({ value: "*Hello*", start: 0, end: 7 }, BOLD_MARK)).toEqual({ value: "***Hello***", start: 2, end: 9 });
  });

  it("puts an empty pair at the caret with nothing selected, and takes it away again", () => {
    const pair = toggledMark({ value: "ab", start: 1, end: 1 }, BOLD_MARK);
    expect(pair).toEqual({ value: "a****b", start: 3, end: 3 });
    expect(toggledMark(pair, BOLD_MARK)).toEqual({ value: "ab", start: 1, end: 1 });
  });
});

describe("linkedWords", () => {
  it("links the selected words, or puts the label in at the caret", () => {
    expect(linkedWords({ value: "see Valera now", start: 4, end: 10 }, "anamnesis://page/v1", "Valera")).toEqual({
      value: "see [Valera](anamnesis://page/v1) now",
      start: 33,
      end: 33,
    });
    expect(linkedWords({ value: "see  now", start: 4, end: 4 }, "https://x.org", "x.org")).toEqual({ value: "see [x.org](https://x.org) now", start: 26, end: 26 });
    // A space taken into the selection stays a space, outside the link.
    expect(linkedWords({ value: "see Valera now", start: 3, end: 11 }, "https://x.org", "x")).toEqual({ value: "see [Valera](https://x.org) now", start: 27, end: 27 });
  });
});

describe("textLinkAt", () => {
  const measure = (text: string) => text.length * 10;
  const font = () => "20px F";
  const box = { type: "text", text: "go [here](anamnesis://page/p1) now\nplain", x: 100, y: 50, width: 120, height: 50, fontSize: 20, lineHeight: 1.25, textAlign: "left" };

  it("finds the link under the point and nothing beside it", () => {
    expect(textLinkAt([box], { x: 100 + 35, y: 55 }, measure, font)).toBe("anamnesis://page/p1");
    expect(textLinkAt([box], { x: 100 + 5, y: 55 }, measure, font)).toBeNull();
    expect(textLinkAt([box], { x: 100 + 35, y: 50 + 30 }, measure, font)).toBeNull();
    expect(textLinkAt([box], { x: 10, y: 10 }, measure, font)).toBeNull();
  });

  it("lays a centred line from the middle", () => {
    const centred = { ...box, textAlign: "center" };
    // The line is 12 characters drawn, 120 wide: it fills the box.
    expect(textLinkAt([centred], { x: 100 + 35, y: 55 }, measure, font)).toBe("anamnesis://page/p1");
    const wide = { ...centred, width: 220 };
    expect(textLinkAt([wide], { x: 100 + 35, y: 55 }, measure, font)).toBeNull();
    expect(textLinkAt([wide], { x: 100 + 50 + 35, y: 55 }, measure, font)).toBe("anamnesis://page/p1");
  });

  it("turns the point back by the box's angle", () => {
    const turned = { ...box, angle: Math.PI / 2 };
    // Turned a quarter, the box's first line runs down its right side.
    const centre = { x: 160, y: 75 };
    expect(textLinkAt([turned], { x: centre.x + 25 - 5, y: centre.y - 60 + 35 }, measure, font)).toBe("anamnesis://page/p1");
  });

  it("skips a deleted box and one with no link in it", () => {
    expect(textLinkAt([{ ...box, isDeleted: true }], { x: 135, y: 55 }, measure, font)).toBeNull();
    expect(textLinkAt([{ ...box, text: "no link" }], { x: 135, y: 55 }, measure, font)).toBeNull();
  });
});
