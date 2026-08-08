import { describe, expect, it } from "vitest";
import { readThemeId, sanitizeCustomCss, readSwatch } from "./theme-service";
import {
  deriveTokens,
  freeFileName,
  gradientCss,
  matchedBackgrounds,
  parseGradient,
  patchTheme,
  readThemeDraft,
  rgba,
  seedFromDocument,
  seedGradient,
  serializeTheme,
  stepLightness,
  toHex,
  type ThemeDraft,
} from "./theme-editor";
import { AUTO_TOKENS, GRADIENT_SLOTS } from "../constants/theme-tokens";

describe("toHex", () => {
  it.each([
    ["#0d1221", "#0d1221"],
    ["#ABC", "#aabbcc"],
    ["  #0D1221  ", "#0d1221"],
    ["rgb(13, 18, 33)", "#0d1221"],
    ["rgba(13, 18, 33, 0.5)", "#0d1221"],
    ["rgb(13 18 33 / 50%)", "#0d1221"],
  ])("%s → %s", (input, expected) => {
    expect(toHex(input)).toBe(expected);
  });

  // A named colour or a color-mix() is something the author wrote on purpose.
  // Null lets the caller leave it alone instead of replacing it with a guess.
  it.each(["rebeccapurple", "color-mix(in srgb, red, blue)", "var(--color-bg)", ""])("leaves %s alone", (input) => {
    expect(toHex(input)).toBeNull();
  });

  // The hover tokens are `color-mix(in oklab, …)`, and a browser hands back the
  // *resolved* mix — `oklab(…)`, never a hex. Reading it is what stops every
  // hover swatch in Settings coming up black. See fromOklab in theme-editor.ts.
  describe("oklab and oklch", () => {
    it.each([
      ["oklab(0 0 0)", "#000000"],
      ["oklab(1 0 0)", "#ffffff"],
      ["oklch(0 0 0)", "#000000"],
      ["oklch(1 0 0)", "#ffffff"],
    ])("%s → %s", (input, expected) => {
      expect(toHex(input)).toBe(expected);
    });

    // Both values below were read out of a real browser — the oklab string is
    // what Chrome resolves the token to, and the hex is what Chrome paints for
    // that string. So these pin the conversion to the engine's own answer
    // rather than to ours, and they fail if it drifts.
    it("matches the browser on --color-hover for the dark theme", () => {
      // color-mix(in oklab, #1a1a22 92%, #e8e8ee)
      expect(toHex("oklab(0.27835 0.0039016 -0.0143933)")).toBe("#272830");
    });

    it("returns the accent exactly when the mix is a no-op", () => {
      // color-mix(in oklab, #5eead4 24%, transparent) keeps the hue and drops
      // only the alpha, so this has to land back on the accent to the byte.
      expect(toHex("oklab(0.854872 -0.125014 -0.00232285)")).toBe("#5eead4");
    });

    it("reads percentages and slash alpha, and ignores the alpha", () => {
      expect(toHex("oklab(50% 0 0)")).toBe(toHex("oklab(0.5 0 0)"));
      expect(toHex("oklab(0.5 0 0 / 0.24)")).toBe(toHex("oklab(0.5 0 0)"));
      expect(toHex("oklch(0.5 0 0 / 24%)")).toBe(toHex("oklch(0.5 0 0)"));
    });

    it("treats a powerless component as zero rather than giving up", () => {
      expect(toHex("oklch(0.5 0 none)")).toBe(toHex("oklch(0.5 0 0)"));
    });

    it("clamps rather than returning something out of gamut", () => {
      const hex = toHex("oklch(0.9 0.4 140)");
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });

    it.each(["oklab(0.5 0)", "oklab(a b c)", "oklab()"])("still refuses %s", (input) => {
      expect(toHex(input)).toBeNull();
    });
  });
});

describe("rgba", () => {
  it("writes a tint of a hex", () => {
    expect(rgba("#5eead4", 0.15)).toBe("rgba(94, 234, 212, 0.15)");
  });

  it("clamps rather than emitting an invalid alpha", () => {
    expect(rgba("#000000", 2)).toBe("rgba(0, 0, 0, 1)");
    expect(rgba("#000000", -1)).toBe("rgba(0, 0, 0, 0)");
  });
});

describe("deriveTokens", () => {
  // The point of deriving these: a theme whose selected tree row is a different
  // hue from its buttons looks broken, and keeping five alpha tokens in step by
  // hand is how that happens.
  it("keeps the accent tints on the accent", () => {
    const derived = deriveTokens({ "--color-accent-light": "#f0a868" });
    expect(derived["--color-accent-faint"]).toBe("rgba(240, 168, 104, 0.15)");
    expect(derived["--color-accent-faint-border"]).toBe("rgba(240, 168, 104, 0.3)");
  });

  it("tints each callout's background from its own edge", () => {
    const derived = deriveTokens({ "--color-callout-info": "#60a5fa", "--color-callout-secret": "#c4b5fd" });
    expect(derived["--color-callout-info-bg"]).toBe("rgba(96, 165, 250, 0.12)");
    expect(derived["--color-callout-secret-bg"]).toBe("rgba(196, 181, 253, 0.12)");
  });

  // Quote is the "no particular meaning" callout and its wash has always been a
  // neutral film. Tinting it would make it look like it meant something.
  it("leaves quote neutral", () => {
    expect(deriveTokens({ "--color-callout-quote": "#a1a1aa" })["--color-callout-quote-bg"]).toBe("rgba(255, 255, 255, 0.035)");
  });

  it("derives nothing from a colour that isn't set", () => {
    expect(deriveTokens({})).toEqual({});
  });
});

describe("matching the other backgrounds to the panel", () => {
  const L = (hex: string) => {
    // Relative luminance is enough to assert an ordering, and doesn't require
    // exporting the Oklab internals just to test them.
    const [r, g, b] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  it("puts the window below the panel and the raised surfaces above it, on a dark panel", () => {
    const m = matchedBackgrounds("#151e2e"); // midnight
    expect(L(m["--color-bg"])).toBeLessThan(L("#151e2e"));
    expect(L(m["--color-panel-alt"])).toBeGreaterThan(L("#151e2e"));
    expect(L(m["--color-panel-edge"])).toBeGreaterThan(L(m["--color-panel-alt"]));
  });

  // A light panel is usually near white and has no headroom to climb into, so
  // everything sits at or below it — which is what the shipped Daylight does by
  // hand: panel ≥ menus > window > boxes.
  it("puts everything at or below a light panel, boxes lowest", () => {
    const m = matchedBackgrounds("#ffffff");
    expect(L(m["--color-panel-edge"])).toBeLessThan(L("#ffffff"));
    expect(L(m["--color-bg"])).toBeLessThan(L(m["--color-panel-edge"]));
    expect(L(m["--color-panel-alt"])).toBeLessThan(L(m["--color-bg"]));
  });

  // The reported bug: she set a pale panel and the other three stayed navy.
  it("gives a pale panel three pale siblings", () => {
    const m = matchedBackgrounds("#fee1e1");
    for (const hex of Object.values(m)) expect(L(hex)).toBeGreaterThan(0.5);
  });

  // Daylight's own --color-panel-edge is #ffffff, the same as its panel, which
  // is the collision that made hover invisible there. Matching must not
  // reproduce it.
  it("never returns a surface equal to the panel it came from", () => {
    for (const panel of ["#ffffff", "#000000", "#151e2e", "#fee1e1", "#9a9a9a"]) {
      for (const hex of Object.values(matchedBackgrounds(panel))) expect(hex).not.toBe(panel);
    }
  });

  it("keeps the panel's hue rather than walking it toward grey", () => {
    const m = matchedBackgrounds("#151e2e");
    // Blue stays the largest channel in every one of them.
    for (const hex of Object.values(m)) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(b).toBeGreaterThan(r);
      expect(b).toBeGreaterThan(g);
    }
  });

  it("stays in gamut at both ends instead of overflowing", () => {
    for (const panel of ["#ffffff", "#000000"]) {
      for (const hex of Object.values(matchedBackgrounds(panel))) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("stepLightness", () => {
  it("moves in the direction asked and reverses cleanly", () => {
    expect(stepLightness("#808080", 0.1)).not.toBe("#808080");
    // A step up then the same step down lands back within rounding.
    const there = stepLightness("#3b5a7a", 0.08);
    const back = stepLightness(there, -0.08);
    const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    channels(back).forEach((v, i) => expect(Math.abs(v - channels("#3b5a7a")[i])).toBeLessThanOrEqual(1));
  });

  it("clamps rather than wrapping past white or black", () => {
    expect(stepLightness("#ffffff", 0.5)).toBe("#ffffff");
    expect(stepLightness("#000000", -0.5)).toBe("#000000");
  });
});

describe("gradients", () => {
  it("round-trips a straight line", () => {
    const gradient = { on: true, type: "linear" as const, angle: 160, origin: "center", from: { color: "#0d1221", alpha: 1 }, to: { color: "#1f1f28", alpha: 0.5 } };
    const parsed = parseGradient(gradientCss(gradient));
    expect(parsed.type).toBe("linear");
    expect(parsed.angle).toBe(160);
    expect(parsed.from).toEqual({ color: "#0d1221", alpha: 1 });
    expect(parsed.to).toEqual({ color: "#1f1f28", alpha: 0.5 });
    expect(parsed.raw).toBeUndefined();
  });

  it("round-trips a glow", () => {
    const gradient = { on: true, type: "radial" as const, angle: 90, origin: "top right", from: { color: "#5eead4", alpha: 0.3 }, to: { color: "#5eead4", alpha: 0 } };
    const parsed = parseGradient(gradientCss(gradient));
    expect(parsed.type).toBe("radial");
    expect(parsed.origin).toBe("top right");
    expect(parsed.to.alpha).toBe(0);
  });

  // Anything richer than two stops is someone's hand-written work. Keeping the
  // text verbatim is the difference between "these controls can't show this"
  // and "the next keystroke threw away a stop".
  it.each([
    ["three stops", "linear-gradient(90deg, #000, #f00, #fff)"],
    ["a conic", "conic-gradient(from 0deg, #000, #fff)"],
    ["named colours", "linear-gradient(90deg, rebeccapurple, gold)"],
  ])("keeps %s exactly as written", (_label, css) => {
    const parsed = parseGradient(css);
    expect(parsed.raw).toBe(css);
  });

  it("seeds a slot from the theme's own colours", () => {
    const slot = GRADIENT_SLOTS.find((s) => s.key === "sel")!;
    const gradient = seedGradient(slot, { "--color-accent-light": "#5eead4" });
    expect(gradient.from).toEqual({ color: "#5eead4", alpha: 0.3 });
    expect(gradient.to).toEqual({ color: "#5eead4", alpha: 0.03 });
  });
});

describe("freeFileName", () => {
  const sanitize = (name: string) => name.replace(/[<>:"/\\|?*]/g, "");

  it("uses the name as given when nothing has it", () => {
    expect(freeFileName("Sea glass", [], sanitize)).toBe("Sea glass.css");
  });

  // Pressing "make a copy" twice means two themes. Overwriting the first would
  // throw away work with no warning and no undo.
  it("numbers rather than overwriting", () => {
    expect(freeFileName("Midnight copy", ["Midnight copy.css"], sanitize)).toBe("Midnight copy 2.css");
    expect(freeFileName("Midnight copy", ["Midnight copy.css", "Midnight copy 2.css"], sanitize)).toBe("Midnight copy 3.css");
  });

  // Windows filenames aren't case-sensitive, so "MINE.css" does collide.
  it("treats a differently-cased name as taken", () => {
    expect(freeFileName("mine", ["MINE.CSS"], sanitize)).toBe("mine 2.css");
  });

  it("falls back to a usable name when there's nothing left of it", () => {
    expect(freeFileName("///", [], sanitize)).toBe("My theme.css");
    expect(freeFileName("   ", [], sanitize)).toBe("My theme.css");
  });
});

describe("seedFromDocument", () => {
  it("takes what's on screen, whatever notation it's in", () => {
    const colors = seedFromDocument((token) => (token === "--color-bg" ? "rgb(13, 18, 33)" : "#151e2e"));
    expect(colors["--color-bg"]).toBe("#0d1221");
    expect(colors["--color-panel"]).toBe("#151e2e");
  });

  it("skips a token the document doesn't resolve", () => {
    expect(seedFromDocument(() => "")).toEqual({});
  });

  // The one deliberate hole in "a copy has to be complete". Writing hover out
  // would pin it to the panel colour at the moment of the copy, so the next
  // change to the backgrounds would leave it behind — which is the drift the
  // mixes exist to stop. See AUTO_TOKENS in constants/theme-tokens.ts.
  it("leaves the auto tokens out so a copy's hover keeps following its panels", () => {
    const colors = seedFromDocument(() => "#151e2e");
    for (const token of AUTO_TOKENS) expect(colors).not.toHaveProperty(token);
    expect(colors["--color-panel"]).toBe("#151e2e");
  });
});

// The contract that makes "both" work: what the pickers write has to be an
// ordinary theme file, and an ordinary theme file has to read back into the
// pickers. If serializeTheme's shape changes, this is what should fail.
describe("a theme made with the pickers", () => {
  const colors = {
    "--color-bg": "#0d1221",
    "--color-panel": "#151e2e",
    "--color-accent-light": "#5eead4",
    "--color-callout-info": "#60a5fa",
  };
  const draft: ThemeDraft = {
    colors,
    resolved: colors,
    gradients: {
      bg: { on: true, type: "linear", angle: 160, origin: "center", from: { color: "#0d1221", alpha: 1 }, to: { color: "#1f1f28", alpha: 1 } },
      title: { on: true, type: "linear", angle: 95, origin: "center", from: { color: "#e8e8ee", alpha: 1 }, to: { color: "#5eead4", alpha: 1 } },
    },
  };
  const css = serializeTheme("Sea glass", "sea-glass", draft, "2026-08-07");

  it("declares the id the app puts on the document", () => {
    expect(readThemeId(css)).toBe("sea-glass");
  });

  it("survives the same vetting a downloaded theme gets, untouched", () => {
    const result = sanitizeCustomCss(css);
    expect(result.blocked).toEqual([]);
    expect(result.css).toBe(css);
  });

  it("offers a swatch to the theme list", () => {
    expect(readSwatch(css)).toEqual({ bg: "#0d1221", panel: "#151e2e", accent: "#5eead4" });
  });

  it("writes the derived tints out too, so the file stands alone", () => {
    expect(css).toContain("--color-accent-faint: rgba(94, 234, 212, 0.15);");
    expect(css).toContain("--color-callout-info-bg: rgba(96, 165, 250, 0.12);");
  });

  // A text gradient is three properties that only work together — the image,
  // the clip and the transparent fill. One without the others is an invisible
  // title or a coloured box.
  it("gives a text gradient its clip and fill", () => {
    expect(css).toContain("--gradient-title: linear-gradient(95deg,");
    expect(css).toContain("--gradient-title-clip: text;");
    expect(css).toContain("--gradient-title-fill: transparent;");
  });

  // Only one built-in sets its own faces, so a copy of that one used to come
  // out in the base tokens' fonts — visibly not the theme it was copied from.
  // A copy is complete or it isn't a copy: the original isn't in the cascade
  // behind it.
  it("writes the faces a copied theme was using", () => {
    const withFonts = serializeTheme("Sea glass", "sea-glass", draft, "2026-08-07", {
      "--font-display": '"Domine", serif',
      "--font-ui": '"Lexend", sans-serif',
    });
    expect(withFonts).toContain('--font-display: "Domine", serif;');
    expect(withFonts).toContain('--font-ui: "Lexend", sans-serif;');
  });

  it("says nothing about fonts when it wasn't given any", () => {
    expect(css).not.toContain("--font-");
  });

  // The importer's file has to say where it came from and what it guessed. A
  // header claiming it was made in Settings → Colours would be wrong in the one
  // place she'd look to find out.
  it("names a different origin, and carries its notes, when it wasn't made in the pickers", () => {
    const imported = serializeTheme("Charsnap", "charsnap", draft, "2026-08-07", {}, {
      made: "Worked out from charsnap.json on 2026-08-07.",
      notes: ["Window colour taken from \"background\".", "Accent taken from \"secondary\"."],
    });
    expect(imported).toContain("Worked out from charsnap.json on 2026-08-07.");
    expect(imported).not.toContain("Made in Settings");
    expect(imported).toContain('/* Accent taken from "secondary". */');
  });

  it("won't let a note close the comment early", () => {
    const nasty = serializeTheme("X", "x", draft, "2026-08-07", {}, { made: "m", notes: ["key */ body { display: none }"] });
    // One `*/` in the whole note line: the one that ends it.
    expect(nasty.split("\n").find((line) => line.includes("display: none"))?.match(/\*\//g)).toHaveLength(1);
  });

  it("doesn't emit gradients that are switched off", () => {
    expect(css).not.toContain("--gradient-sidebar");
  });

  it("reads back into the same controls", () => {
    const reread = readThemeDraft(css);
    expect(reread.colors["--color-bg"]).toBe("#0d1221");
    expect(reread.colors["--color-accent-light"]).toBe("#5eead4");
    expect(reread.gradients.bg?.angle).toBe(160);
    expect(reread.gradients.bg?.from.color).toBe("#0d1221");
    expect(reread.gradients.title?.type).toBe("linear");
    expect(reread.gradients.sidebar).toBeUndefined();
  });

  // Round two: edit it, write it again, and it still says the same thing.
  it("survives a second trip through the pickers", () => {
    const again = serializeTheme("Sea glass", "sea-glass", readThemeDraft(css), "2026-08-07");
    expect(readThemeDraft(again)).toEqual(readThemeDraft(css));
  });
});

describe("readThemeDraft on a hand-written file", () => {
  // The other half of the contract — a file nobody generated has to load.
  const HAND_WRITTEN = `/* my theme */
[data-theme="mine"] {
  --color-bg: rgb(20, 16, 12);
  --color-panel: #1E1813;
  --color-accent-light: #f0a868;
  --gradient-bg: radial-gradient(circle at top left, rgba(240, 168, 104, 0.2), rgba(20, 16, 12, 0));
  --gradient-sidebar: linear-gradient(180deg, #111, #000, #222);
}`;

  it("normalises whatever notation the colours are in", () => {
    const draft = readThemeDraft(HAND_WRITTEN);
    expect(draft.colors["--color-bg"]).toBe("#14100c");
    expect(draft.colors["--color-panel"]).toBe("#1e1813");
  });

  it("loads a glow it didn't write", () => {
    const gradient = readThemeDraft(HAND_WRITTEN).gradients.bg;
    expect(gradient?.type).toBe("radial");
    expect(gradient?.origin).toBe("top left");
    expect(gradient?.from.alpha).toBeCloseTo(0.2);
  });

  it("marks a three-stop gradient as hers to keep", () => {
    expect(readThemeDraft(HAND_WRITTEN).gradients.sidebar?.raw).toBe("linear-gradient(180deg, #111, #000, #222)");
  });

  it("hands an unparseable gradient back byte for byte", () => {
    const draft = readThemeDraft(HAND_WRITTEN);
    expect(serializeTheme("Mine", "mine", draft, "2026-08-07")).toContain(
      "--gradient-sidebar: linear-gradient(180deg, #111, #000, #222);",
    );
  });

  it("ignores tokens it has no control for", () => {
    const draft = readThemeDraft('[data-theme="x"] { --font-display: "Cinzel", serif; --color-bg: #000; }');
    expect(Object.keys(draft.colors)).toEqual(["--color-bg"]);
  });
});

// "The file doesn't set this" and "this is black" are different statements, and
// the pickers have to show the second only when it's true. A theme is allowed
// to be four lines long and inherit the rest.
describe("declared versus resolved", () => {
  const SPARSE = '[data-theme="sparse"] { --color-bg: #14100c; }';
  const inherited: Record<string, string> = { "--color-panel": "#1f1f28", "--color-text-primary": "#e8e8ee" };
  const draft = readThemeDraft(SPARSE, (token) => inherited[token] ?? "");

  it("only counts what the file actually declares as declared", () => {
    expect(Object.keys(draft.colors)).toEqual(["--color-bg"]);
  });

  it("shows the inherited colour for everything else", () => {
    expect(draft.resolved["--color-bg"]).toBe("#14100c");
    expect(draft.resolved["--color-panel"]).toBe("#1f1f28");
    expect(draft.resolved["--color-text-primary"]).toBe("#e8e8ee");
  });

  // The whole point of keeping the two apart: editing one colour must not
  // rewrite a four-line theme into a twenty-five-line one.
  it("writes back only what was declared", () => {
    const css = serializeTheme("Sparse", "sparse", draft, "2026-08-07");
    expect(css).toContain("--color-bg: #14100c;");
    expect(css).not.toContain("--color-panel:");
    expect(css).not.toContain("--color-text-primary:");
  });

  it("starts writing a colour once it's been set", () => {
    const edited = { ...draft, colors: { ...draft.colors, "--color-panel": "#123456" } };
    expect(serializeTheme("Sparse", "sparse", edited, "2026-08-07")).toContain("--color-panel: #123456;");
  });

  it("falls back to black only when nothing resolves it either", () => {
    expect(readThemeDraft("").resolved["--color-bg"]).toBe("#000000");
  });
});

/**
 * The rule these all exist to hold: **an edit changes the values it was asked
 * to change and nothing else.** The pickers used to call `serializeTheme` for
 * every edit, which rebuilds a file from the tokens this module knows about —
 * so one click on a swatch replaced a hand-written theme with the app's version
 * of it. No warning, no undo. That must not be able to happen again quietly, so
 * it's pinned here rather than left to a comment.
 */
describe("patchTheme", () => {
  const HAND_WRITTEN = `/* Sea Glass — written by hand, don't @ me */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
}

[data-theme="sea-glass"] {
  /* the good blue */
  --color-bg: #071a1c;
  --color-accent-light: #5eead4;
  --font-display: "Cormorant", serif;
  --my-own-thing: 4px;
}

[data-theme="sea-glass"] .ui-btn {
  letter-spacing: 0.04em;
}
`;

  const draftOf = (colors: Record<string, string>, gradients: ThemeDraft["gradients"] = {}): ThemeDraft => ({
    colors,
    resolved: colors,
    gradients,
  });

  it("changes the value it was asked to and leaves every other byte alone", () => {
    const out = patchTheme(HAND_WRITTEN, "Sea Glass", "sea-glass", draftOf({ "--color-bg": "#101820" }), "2026-08-07");

    expect(out).toContain("--color-bg: #101820;");
    expect(out).not.toContain("#071a1c");
    // The things a rebuild would have thrown away.
    expect(out).toContain("/* Sea Glass — written by hand, don't @ me */");
    expect(out).toContain("@media (prefers-reduced-motion: reduce)");
    expect(out).toContain('--font-display: "Cormorant", serif;');
    expect(out).toContain("--my-own-thing: 4px;");
    expect(out).toContain("letter-spacing: 0.04em;");
    expect(out).toContain("/* the good blue */");
  });

  it("adds a token the file never mentioned, at the file's own indentation", () => {
    const out = patchTheme(HAND_WRITTEN, "Sea Glass", "sea-glass", draftOf({ "--color-panel": "#0d2325" }), "2026-08-07");
    expect(out).toContain("\n  --color-panel: #0d2325;");
    expect(out).toContain("--color-bg: #071a1c;");
  });

  it("writes into the theme's own block, not a later rule that shares the name", () => {
    const out = patchTheme(HAND_WRITTEN, "Sea Glass", "sea-glass", draftOf({ "--color-bg": "#101820" }), "2026-08-07");
    const block = /\[data-theme="sea-glass"\] \{([\s\S]*?)\}/.exec(out)?.[1] ?? "";
    expect(block).toContain("--color-bg: #101820;");
    expect(out.indexOf("--color-bg")).toBeLessThan(out.indexOf(".ui-btn"));
  });

  it("edits a theme written on :root", () => {
    const css = ":root {\n\t--color-bg: #000000;\n}\n";
    const out = patchTheme(css, "Plain", "plain", draftOf({ "--color-bg": "#111111" }), "2026-08-07");
    expect(out).toBe(":root {\n\t--color-bg: #111111;\n}\n");
  });

  it("appends a block rather than replacing a file it can't find one in", () => {
    const css = "/* nothing but a note to self */\n";
    const out = patchTheme(css, "Note", "note", draftOf({ "--color-bg": "#111111" }), "2026-08-07");
    expect(out).toContain("/* nothing but a note to self */");
    expect(out).toContain('[data-theme="note"] {');
    expect(out).toContain("--color-bg: #111111;");
  });

  it("takes a gradient's lines out when it's switched off, and only those", () => {
    const withGradients = `[data-theme="x"] {
  --color-bg: #000000;
  --gradient-title: linear-gradient(95deg, #fff, #000);
  --gradient-title-clip: text;
  --gradient-title-fill: transparent;
  --gradient-accent: linear-gradient(100deg, #111, #222);
}
`;
    const out = patchTheme(withGradients, "X", "x", draftOf({ "--color-bg": "#000000" }), "2026-08-07");
    expect(out).not.toContain("--gradient-title");
    expect(out).not.toContain("--gradient-accent");
    expect(out).toContain("--color-bg: #000000;");
  });

  it("keeps a hand-tuned tint but updates one the app itself wrote", () => {
    // `--color-accent-faint` here is the app's own derivation of #5eead4;
    // `--color-callout-info-bg` is not — somebody chose that alpha.
    const css = `[data-theme="x"] {
  --color-accent-light: #5eead4;
  --color-accent-faint: ${rgba("#5eead4", 0.15)};
  --color-callout-info: #60a5fa;
  --color-callout-info-bg: rgba(96, 165, 250, 0.5);
}
`;
    const out = patchTheme(
      css,
      "X",
      "x",
      draftOf({ "--color-accent-light": "#f0a868", "--color-callout-info": "#60a5fa" }),
      "2026-08-07",
    );
    expect(out).toContain(`--color-accent-faint: ${rgba("#f0a868", 0.15)};`);
    expect(out).toContain("--color-callout-info-bg: rgba(96, 165, 250, 0.5);");
  });

  it("survives being run over its own output", () => {
    const once = patchTheme(HAND_WRITTEN, "Sea Glass", "sea-glass", draftOf({ "--color-bg": "#101820" }), "2026-08-07");
    const twice = patchTheme(once, "Sea Glass", "sea-glass", draftOf({ "--color-bg": "#101820" }), "2026-08-07");
    expect(twice).toBe(once);
  });

  it("changes the last declaration when a token is set more than once", () => {
    const css = '[data-theme="x"] {\n  --color-bg: #aaaaaa;\n  --color-bg: #bbbbbb;\n}\n';
    const out = patchTheme(css, "X", "x", draftOf({ "--color-bg": "#cccccc" }), "2026-08-07");
    expect(out).toBe('[data-theme="x"] {\n  --color-bg: #aaaaaa;\n  --color-bg: #cccccc;\n}\n');
  });
});
