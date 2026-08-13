import { describe, expect, it } from "vitest";
import { CODE_LANGUAGES, DEFAULT_CODE_LANGUAGE, normalizeCodeLanguage } from "./code-languages";

describe("code languages", () => {
  it("offers plain text first, since that's what a prompt is", () => {
    expect(Object.keys(CODE_LANGUAGES)[0]).toBe(DEFAULT_CODE_LANGUAGE);
    expect(DEFAULT_CODE_LANGUAGE).toBe("text");
  });

  it("keeps the languages a lorebook actually travels as", () => {
    expect(CODE_LANGUAGES).toHaveProperty("json");
    expect(CODE_LANGUAGES).toHaveProperty("yaml");
    expect(CODE_LANGUAGES).toHaveProperty("regexp");
  });

  describe("normalizeCodeLanguage", () => {
    it("passes a language we offer straight through", () => {
      expect(normalizeCodeLanguage("json")).toBe("json");
    });

    it("case-folds, because other tools write JSON and Json as freely as json", () => {
      expect(normalizeCodeLanguage("JSON")).toBe("json");
      expect(normalizeCodeLanguage("  YAML  ")).toBe("yaml");
    });

    // The point is that the block survives. An unhighlighted code block still
    // holds its text; dropping it or keeping a name nothing recognises doesn't.
    it("falls back to plain text for anything else", () => {
      expect(normalizeCodeLanguage("brainfuck")).toBe("text");
      expect(normalizeCodeLanguage("")).toBe("text");
      expect(normalizeCodeLanguage(undefined)).toBe("text");
      expect(normalizeCodeLanguage(42)).toBe("text");
    });

    it("never returns a name the dropdown can't show", () => {
      for (const input of ["json", "nope", "", "TypeScript", null]) {
        expect(normalizeCodeLanguage(input) in CODE_LANGUAGES).toBe(true);
      }
    });
  });
});
