import { describe, expect, it } from "vitest";
import { familyFromStack, fontStackFor, labelForFile, readSwatch, readThemeId, sanitizeCustomCss, themeIdForFile } from "./theme-service";

// The DOM half of theme-service isn't covered here — there's no jsdom setup in
// this project (see CLAUDE.md §Commands) and `document.head.append` is not
// where the interesting decisions are. What is interesting is what a
// user-written stylesheet is allowed to contain, which is all pure string work.

describe("sanitizeCustomCss", () => {
  it("leaves an ordinary theme alone", () => {
    const css = '[data-theme="mine"] {\n  --color-bg: #0d1221;\n}';
    const result = sanitizeCustomCss(css);
    expect(result.css).toBe(css);
    expect(result.blocked).toEqual([]);
  });

  // The whole reason this function exists: a stylesheet is allowed to make
  // network requests, the app ships with no CSP, and nothing about the app may
  // phone home. See CLAUDE.md §Policy Boundary.
  it("strips a remote font import and says so", () => {
    const result = sanitizeCustomCss('@import url("https://fonts.googleapis.com/css2?family=Inter");\nbody { color: red; }');
    expect(result.css).not.toContain("fonts.googleapis.com");
    expect(result.css).toContain("body { color: red; }");
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0]).toContain("fonts.googleapis.com");
  });

  it("strips a remote background image", () => {
    const result = sanitizeCustomCss(".page { background: url(https://example.com/paper.png); }");
    expect(result.css).toBe(".page { background: none; }");
    expect(result.blocked).toEqual(["https://example.com/paper.png"]);
  });

  it.each([
    ["protocol-relative", "url(//cdn.example.com/x.woff2)"],
    ["http", "url(http://example.com/x.png)"],
    ["a bare relative path", "url(paper.png)"],
    ["file", "url(file:///C:/Users/shiro/paper.png)"],
  ])("blocks %s", (_label, url) => {
    const result = sanitizeCustomCss(`.x { background: ${url}; }`);
    expect(result.css).toBe(".x { background: none; }");
    expect(result.blocked).toHaveLength(1);
  });

  it.each([
    ["a data URI", "url(data:image/png;base64,iVBORw0KGgo=)"],
    ["the app's own bundle", 'url("/fonts/library/cinzel-400.woff2")'],
  ])("allows %s", (_label, url) => {
    const css = `.x { background: ${url}; }`;
    const result = sanitizeCustomCss(css);
    expect(result.css).toBe(css);
    expect(result.blocked).toEqual([]);
  });

  it("reports each distinct host once however many times it appears", () => {
    const result = sanitizeCustomCss(
      ".a { background: url(https://example.com/x.png); }\n.b { background: url(https://example.com/x.png); }",
    );
    expect(result.blocked).toEqual(["https://example.com/x.png"]);
  });

  // A stripped url leaves `background: none` rather than `background: ;`, so
  // the browser drops one property instead of discarding the whole rule and
  // whatever else was in it.
  it("leaves the surrounding declaration intact", () => {
    const result = sanitizeCustomCss(".x { background: url(https://e.com/a.png) no-repeat center; color: red; }");
    expect(result.css).toBe(".x { background: none no-repeat center; color: red; }");
  });

  it("survives an @import with no trailing semicolon", () => {
    const result = sanitizeCustomCss('@import url("https://example.com/a.css")');
    expect(result.css.trim()).toBe("");
    expect(result.blocked).toHaveLength(1);
  });
});

describe("readThemeId", () => {
  // This is what lets a sandbox export work unedited — its rules are written
  // against the id it chose, so selecting the file has to put that id on the
  // document or nothing in it matches.
  it("finds the id a sandbox export declares", () => {
    expect(readThemeId('/* Anamnesis theme */\n[data-theme="sea-glass"] {\n  --color-bg: #001;\n}')).toBe("sea-glass");
  });

  it.each([
    ["single quotes", "[data-theme='sea-glass'] {}"],
    ["no quotes", "[data-theme=sea-glass] {}"],
    ["spaces around the equals", '[data-theme = "sea-glass"] {}'],
  ])("copes with %s", (_label, css) => {
    expect(readThemeId(css)).toBe("sea-glass");
  });

  it("returns null for a stylesheet that doesn't declare one", () => {
    expect(readThemeId(":root { --color-bg: #001; }")).toBeNull();
  });
});

describe("themeIdForFile", () => {
  it.each([
    ["Sea Glass.css", "sea-glass"],
    ["my_theme.CSS", "my-theme"],
    ["  spaced  out .css", "spaced-out"],
    [".css", "custom"],
  ])("%s → %s", (file, expected) => {
    expect(themeIdForFile(file)).toBe(expected);
  });
});

describe("labelForFile", () => {
  it.each([
    ["sea-glass.css", "Sea glass"],
    ["my_theme.css", "My theme"],
    ["Foxian.css", "Foxian"],
  ])("%s → %s", (file, expected) => {
    expect(labelForFile(file)).toBe(expected);
  });
});

describe("fontStackFor", () => {
  it("gives a bundled family its category's fallback", () => {
    expect(fontStackFor("Cinzel")).toBe('"Cinzel", serif');
    expect(fontStackFor("Lexend")).toBe('"Lexend", sans-serif');
    expect(fontStackFor("JetBrains Mono")).toBe('"JetBrains Mono", monospace');
    expect(fontStackFor("Caveat")).toBe('"Caveat", cursive');
  });

  // A saved setting naming a family that has since left the library. Null so
  // the caller can leave the token alone rather than writing a stack for a
  // face that isn't there.
  it("returns null for a family we don't bundle", () => {
    expect(fontStackFor("Comic Sans MS")).toBeNull();
  });
});

// The contract between the two halves of the feature: whatever the sandbox's
// "Show me the CSS" produces has to be usable as a theme file with no editing.
// This is a real export, trimmed. If the sandbox's exportCss() changes shape,
// this is what should fail.
describe("a sandbox export, unedited", () => {
  const EXPORT = `/* Anamnesis theme — "Sea Glass"
   Made in the theme sandbox on 2026-08-06.

   Save this file in Documents\\Anamnesis\\themes and it turns up in
   Settings → Theme. Nothing else needs doing to it. */

[data-theme="sea-glass"] {
  --color-bg: #0f0f14;
  --color-panel: #1a1a22;
  --color-accent-light: #5eead4;
  --color-accent-faint: rgba(20, 184, 166, 0.15);

  /* Gradients.
     On here: app background.
  */
  --gradient-bg: linear-gradient(160deg, #0f0f14, #1f1f28);

  --font-display: "Cinzel", serif;

  --fs-scale: 1.15;
  --fs-2xl: calc(2.275rem * var(--fs-scale));
}`;

  it("survives vetting untouched", () => {
    const result = sanitizeCustomCss(EXPORT);
    expect(result.blocked).toEqual([]);
    expect(result.css).toBe(EXPORT);
  });

  it("declares an id the app can put on the document", () => {
    expect(readThemeId(EXPORT)).toBe("sea-glass");
  });

  it("offers a swatch", () => {
    expect(readSwatch(EXPORT)).toEqual({ bg: "#0f0f14", panel: "#1a1a22", accent: "#5eead4" });
  });

  // Fonts belong inside the theme block, not a `:root` block beside it — a
  // `:root` rule in a theme file applies even when the theme is switched off.
  it("puts its font choice inside the theme block, not in :root", () => {
    expect(EXPORT).not.toContain(":root");
    const block = EXPORT.slice(EXPORT.indexOf("{"));
    expect(block).toContain("--font-display");
  });

  // Text size comes out as the multiplier the app's own slider sets, so the
  // two compose instead of the theme silently winning.
  it("expresses text size as --fs-scale", () => {
    expect(EXPORT).toContain("--fs-scale: 1.15;");
    expect(EXPORT).toContain("calc(2.275rem * var(--fs-scale))");
  });

  it("names a font the app actually bundles", () => {
    const family = /--font-display:\s*"([^"]+)"/.exec(EXPORT)?.[1];
    expect(family).toBe("Cinzel");
    expect(fontStackFor(family!)).toBe('"Cinzel", serif');
  });
});

describe("familyFromStack", () => {
  it.each([
    ['"Quicksand", sans-serif', "Quicksand"],
    ["'Domine', serif", "Domine"],
    ["  Lexend , sans-serif ", "Lexend"],
  ])("%s → %s", (stack, expected) => {
    expect(familyFromStack(stack)).toBe(expected);
  });

  // These are instructions to the browser, not fonts. `--font-mono` starts
  // with one on purpose so each OS supplies its own good mono — printing the
  // keyword back at someone tells them nothing.
  it.each([
    ["the mono default", 'ui-monospace, "Cascadia Mono", Consolas, monospace'],
    ["a bare generic", "serif"],
    ["nothing at all", ""],
  ])("gives no name for %s", (_label, stack) => {
    expect(familyFromStack(stack)).toBeNull();
  });
});

describe("readSwatch", () => {
  it("pulls three colours out of a theme file", () => {
    const css = '[data-theme="x"] { --color-bg: #0d1221; --color-panel: #151e2e; --color-accent-light: #5eead4; }';
    expect(readSwatch(css)).toEqual({ bg: "#0d1221", panel: "#151e2e", accent: "#5eead4" });
  });

  // Two dots and a hole reads as a bug rather than as a theme that didn't say.
  it("returns null when any of the three is missing", () => {
    expect(readSwatch('[data-theme="x"] { --color-bg: #0d1221; --color-panel: #151e2e; }')).toBeNull();
  });

  it("doesn't mistake --color-bg for --color-bg-something-else", () => {
    const css = "--color-background: #fff; --color-bg: #000; --color-panel: #111; --color-accent-light: #222;";
    expect(readSwatch(css)?.bg).toBe("#000");
  });
});
