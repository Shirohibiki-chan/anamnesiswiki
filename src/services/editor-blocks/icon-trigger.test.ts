import { describe, expect, it } from "vitest";
import { iconMenuOpens } from "./icon-trigger";

/**
 * A transaction standing at `caret` in a block whose text is `line`.
 *
 * The same fixture the slash trigger's tests use, and placed at an offset in a
 * longer document for the same reason: the rule reads from the *block's* start,
 * and a bug that only shows on the second paragraph is what that catches.
 */
function at(line: string, caret = line.length, blockStart = 40) {
  return {
    selection: { empty: true, from: blockStart + caret, $from: { parentOffset: caret } },
    doc: { textBetween: (from: number, to: number) => line.slice(from - blockStart, to - blockStart) },
  };
}

describe("when a typed colon is reaching for an icon", () => {
  it("opens in the middle of a sentence, which is the whole point of it", () => {
    // The thing `/` cannot do. An icon belongs inside a line already being
    // written, and this is the gesture that puts one there.
    expect(iconMenuOpens(at("she drew her :"))).toBe(true);
  });

  it("opens on an empty line, and before the colon has landed", () => {
    expect(iconMenuOpens(at(":"))).toBe(true);
    expect(iconMenuOpens(at(""))).toBe(true);
    expect(iconMenuOpens(at("she drew her "))).toBe(true);
  });

  it("stays shut after a word, which is where a colon is punctuation", () => {
    expect(iconMenuOpens(at("Note:"))).toBe(false);
    expect(iconMenuOpens(at("Chapter 4:"))).toBe(false);
    expect(iconMenuOpens(at("The bargain:"))).toBe(false);
  });

  it("stays shut inside a time", () => {
    // The case a rule about the *following* character would miss entirely:
    // nothing has been typed after the colon yet when this is asked.
    expect(iconMenuOpens(at("10:"))).toBe(false);
  });

  it("stays shut on a second colon straight after the first", () => {
    // `::` is somebody typing punctuation deliberately, and the menu opened by
    // the first one is already there to be dismissed.
    expect(iconMenuOpens(at("::"))).toBe(false);
  });

  it("is not a trigger when text is being replaced", () => {
    expect(
      iconMenuOpens({
        selection: { empty: false, from: 44, $from: { parentOffset: 4 } },
        doc: { textBetween: () => "she " },
      }),
    ).toBe(false);
  });

  it("reads from the start of its own block, not the document", () => {
    // A colon at the very start of the *second* paragraph: the prefix inside
    // this block is empty even though there is text before it in the document.
    expect(iconMenuOpens(at(":", 1, 400))).toBe(true);
  });
});
