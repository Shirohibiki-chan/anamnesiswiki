import { describe, expect, it } from "vitest";
import { slashOpensCommandMenu } from "./slash-trigger";

/**
 * A transaction standing at `caret` in a block whose text is `line`.
 *
 * The block is placed at an arbitrary offset in a longer document, because the
 * function has to work off the *block's* start rather than the document's — a
 * bug that only shows up on the second paragraph is exactly the kind this
 * fixture is shaped to catch.
 */
function at(line: string, caret = line.length, blockStart = 40) {
  return {
    selection: { empty: true, from: blockStart + caret, $from: { parentOffset: caret } },
    doc: { textBetween: (from: number, to: number) => line.slice(from - blockStart, to - blockStart) },
  };
}

describe("when a typed slash means a command", () => {
  it("opens on a line that is nothing but the slash", () => {
    expect(slashOpensCommandMenu(at("/"))).toBe(true);
  });

  it("opens when the slash has not landed in the document yet", () => {
    // Whether the character is already inserted when the editor asks is an
    // implementation detail of a library we do not control, so an empty line is
    // the same situation as a line holding just the slash.
    expect(slashOpensCommandMenu(at(""))).toBe(true);
  });

  it("stays shut for a slash inside a word", () => {
    expect(slashOpensCommandMenu(at("and/"))).toBe(false);
    expect(slashOpensCommandMenu(at("12/"))).toBe(false);
  });

  it("stays shut for a slash after a sentence, and after a space", () => {
    // Both of these opened the menu before 2026-08-28 — the first is what was
    // measured in the built app, and the second is why "after whitespace" was
    // not good enough either.
    expect(slashOpensCommandMenu(at("at this scale./"))).toBe(false);
    expect(slashOpensCommandMenu(at("some words /"))).toBe(false);
  });

  it("reads the line it is on, not the document", () => {
    // Same text, a block further down. The block's own start is what counts.
    expect(slashOpensCommandMenu(at("/", 1, 900))).toBe(true);
    expect(slashOpensCommandMenu(at("and/", 4, 900))).toBe(false);
  });

  it("stays shut while text is selected", () => {
    // Typing over a selection is replacing words, not starting a command.
    const tr = at("/");
    expect(slashOpensCommandMenu({ ...tr, selection: { ...tr.selection, empty: false } })).toBe(false);
  });
});
