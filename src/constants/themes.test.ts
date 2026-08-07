import { describe, expect, it } from "vitest";
// Read off disk rather than `import "../index.css?raw"`: vitest.config.ts
// carries no Vite plugins, so a raw CSS import resolves to the empty string
// and every assertion below would pass on nothing. The suppression is the same
// one vite.config.ts uses for `process` — this project has no @types/node.
// @ts-expect-error node:fs is untyped here
import { readFileSync } from "node:fs";
import { BUILT_IN_THEMES, DEFAULT_THEME_ID, TEXT_SCALE_MAX, TEXT_SCALE_MIN } from "./themes";

// This list and the `[data-theme]` blocks in index.css are two halves of the
// same thing kept in two files, and nothing else notices when they drift. A
// row with no block behind it isn't an error anywhere — it's a theme you can
// select that does nothing, which reads as the picker being broken.
//
// Comments are stripped first, because index.css *talks about* `[data-theme]`
// blocks as well as declaring them — matching the prose would make this pass
// for a theme that only exists in a sentence.
// Relative to the repo root, which is where vitest runs.
const INDEX_CSS = String(readFileSync("src/index.css", "utf8")).replace(/\/\*[\s\S]*?\*\//g, "");

const hasBlock = (id: string) => new RegExp(`\\[data-theme="${id}"\\]\\s*\\{`).test(INDEX_CSS);

describe("BUILT_IN_THEMES", () => {
  it.each(BUILT_IN_THEMES.filter((theme) => theme.id !== "dark").map((theme) => theme.id))(
    "%s has a block in index.css",
    (id) => {
      expect(hasBlock(id)).toBe(true);
    },
  );

  // `dark` is the exception on purpose: the base token values in `@theme` are
  // the dark theme, and a block restating them would be a second copy to keep
  // in step. See the comment above the themes section in index.css.
  it("dark deliberately has no block of its own", () => {
    expect(hasBlock("dark")).toBe(false);
  });

  it("selects a theme that exists by default", () => {
    expect(BUILT_IN_THEMES.some((theme) => theme.id === DEFAULT_THEME_ID)).toBe(true);
  });

  it("has no duplicate ids", () => {
    const ids = BUILT_IN_THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // The default is the first row for a reason — it's what someone who never
  // opens Settings ends up with, and a picker whose first row isn't the one
  // that's on looks like it's lying.
  it("lists the default first", () => {
    expect(BUILT_IN_THEMES[0]?.id).toBe(DEFAULT_THEME_ID);
  });
});

describe("text scale bounds", () => {
  it("has a usable range with the default inside it", () => {
    expect(TEXT_SCALE_MIN).toBeLessThan(TEXT_SCALE_MAX);
    expect(TEXT_SCALE_MIN).toBeLessThanOrEqual(1);
    expect(TEXT_SCALE_MAX).toBeGreaterThanOrEqual(1);
  });
});
