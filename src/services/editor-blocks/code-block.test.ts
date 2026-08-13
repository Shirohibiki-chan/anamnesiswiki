// The one thing worth testing here: that the dropdown and the shipped grammars
// haven't drifted apart. Everything else in code-block.ts is configuration
// handed straight to BlockNote.
//
// Both directions matter and they fail differently. A language offered with no
// grammar renders as plain text with no error anywhere — the block looks
// broken and nothing says why. A grammar shipped for a language the dropdown
// doesn't offer is invisible, and just quietly sits in the build; that's the
// exact waste the hand-written list in code-block.ts exists to avoid, so it
// should fail here rather than be discovered by measuring the bundle again.
import { describe, expect, it } from "vitest";
import { CODE_LANGUAGES, DEFAULT_CODE_LANGUAGE } from "../../constants/code-languages";
import { HIGHLIGHTED_LANGUAGES } from "./code-block";

describe("code block languages", () => {
  it("ships a grammar for every language the dropdown offers", () => {
    // Plain text is the exception on purpose: BlockNote skips the highlighter
    // for it entirely, which is what keeps a prompt's characters literal.
    const needsGrammar = Object.keys(CODE_LANGUAGES).filter((key) => key !== DEFAULT_CODE_LANGUAGE);
    expect([...HIGHLIGHTED_LANGUAGES].sort()).toEqual(needsGrammar.sort());
  });

  it("doesn't ship a grammar the dropdown can't reach", () => {
    for (const language of HIGHLIGHTED_LANGUAGES) {
      expect(language in CODE_LANGUAGES).toBe(true);
    }
  });
});
