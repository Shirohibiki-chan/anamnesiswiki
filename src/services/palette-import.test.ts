import { describe, expect, it } from "vitest";
// @ts-expect-error node:fs is untyped here — same suppression as themes.test.ts
import { readFileSync } from "node:fs";
import { contrast, readPalette, relativeLuminance, themeFromPalette } from "./palette-import";
import { hexToRgb } from "./theme-editor";

/**
 * A real export from the user's other project (CharSnap), which is what
 * prompted the importer. Kept verbatim — the point of this fixture is that it
 * was written by an app that knows nothing about Anamnesis, so its key names
 * are all slightly wrong for us on purpose.
 */
const CHARSNAP = JSON.stringify({
  background: "#00253D",
  blue: "#172554",
  circularsEnd: "#7f60f9",
  circularsStart: "#6ddcff",
  dark: "#293EC2",
  darker: "#045C8C",
  darkest: "#002B54",
  error: "#dc2626",
  lightDark: "#024459",
  lightestDark: "#1D3285",
  link: "#5566fb",
  mid: "#6BFFA4",
  midDark: "#24A9B3",
  neutral: "#34343a",
  warning: "#1CE6D6",
  primary: "#B5F9FF",
  secondary: "#66D2FF",
  toLeftBorder: "#6ddcff",
  toRightBorder: "#7f60f9",
});

const theme = () => {
  const built = themeFromPalette(readPalette(CHARSNAP));
  if (!built) throw new Error("expected a theme");
  return built;
};

describe("readPalette", () => {
  it("reads every colour, lowercasing the keys", () => {
    const entries = readPalette(CHARSNAP);
    expect(entries.find((entry) => entry.key === "background")?.hex).toBe("#00253d");
    expect(entries.find((entry) => entry.key === "circularsstart")?.hex).toBe("#6ddcff");
  });

  it("keeps a repeated colour once, under the name it was first seen with", () => {
    const entries = readPalette(CHARSNAP);
    expect(entries.filter((entry) => entry.hex === "#6ddcff")).toHaveLength(1);
    expect(entries.some((entry) => entry.key === "toleftborder")).toBe(false);
  });

  it("finds colours nested inside groups", () => {
    const entries = readPalette(JSON.stringify({ ui: { surface: { background: "#101010" } }, accent: "#ff8800" }));
    expect(entries).toEqual([
      { key: "background", hex: "#101010" },
      { key: "accent", hex: "#ff8800" },
    ]);
  });

  it("ignores anything that isn't a colour, and bad JSON", () => {
    expect(readPalette('{"name":"My theme","size":12,"bg":"#123456"}')).toEqual([{ key: "bg", hex: "#123456" }]);
    expect(readPalette("not json at all")).toEqual([]);
  });
});

describe("themeFromPalette", () => {
  it("refuses a file with nothing usable in it", () => {
    expect(themeFromPalette(readPalette('{"name":"nope"}'))).toBeNull();
    expect(themeFromPalette(readPalette('{"only":"#ffffff"}'))).toBeNull();
  });

  it("takes the window colour from the key that names itself", () => {
    expect(theme().colors["--color-bg"]).toBe("#00253d");
  });

  it("prefers a colourful mid-tone as the accent over a near-white called 'primary'", () => {
    // #b5f9ff is the file's `primary` and is nearly white; #66d2ff is what an
    // accent actually looks like. This is the whole reason names only score.
    expect(theme().colors["--color-accent-light"]).toBe("#66d2ff");
  });

  it("never uses a colour named 'error' or 'warning' as the accent", () => {
    const colors = theme().colors;
    expect(colors["--color-accent-light"]).not.toBe("#dc2626");
    expect(colors["--color-accent-light"]).not.toBe("#1ce6d6");
    expect(colors["--color-destructive"]).toBe("#dc2626");
  });

  it("clears the readability floor at every text step, against both surfaces", () => {
    const { colors } = theme();
    const surfaces = [colors["--color-bg"], colors["--color-panel"]];
    const worst = (token: string) => Math.min(...surfaces.map((surface) => contrast(colors[token], surface)));

    expect(worst("--color-text-primary")).toBeGreaterThanOrEqual(10);
    expect(worst("--color-text-secondary")).toBeGreaterThanOrEqual(6.9);
    expect(worst("--color-text-muted")).toBeGreaterThanOrEqual(4.5);
    expect(worst("--color-text-placeholder")).toBeGreaterThanOrEqual(3);
  });

  it("holds the floor even when the palette's own text colour is unreadable", () => {
    // Every colour in here is dark. There is no readable text colour to find,
    // so one has to be made rather than the nearest miss being used.
    const built = themeFromPalette(readPalette('{"background":"#101418","panel":"#181d24","accent":"#2b3a4a"}'));
    const colors = built?.colors ?? {};
    expect(contrast(colors["--color-text-primary"], colors["--color-bg"])).toBeGreaterThan(12);
    expect(contrast(colors["--color-text-muted"], colors["--color-bg"])).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the three border weights in order and visible", () => {
    const { colors } = theme();
    const step = (token: string) => contrast(colors[token], colors["--color-bg"]);
    expect(step("--color-border-subtle")).toBeLessThan(step("--color-border"));
    expect(step("--color-border")).toBeLessThan(step("--color-border-strong"));
    expect(step("--color-border-subtle")).toBeGreaterThan(1.1);
  });

  it("keeps the three callout edges apart from each other", () => {
    const { colors } = theme();
    const edges = ["--color-callout-info", "--color-callout-quote", "--color-callout-secret"].map((token) => colors[token]);
    expect(new Set(edges).size).toBe(3);
    for (const edge of edges) expect(contrast(edge, colors["--color-panel"])).toBeGreaterThanOrEqual(3);
  });

  it("picks up a gradient the file already had", () => {
    const { gradients } = theme();
    expect(gradients.accent).toMatchObject({ on: true, from: { color: "#6ddcff" }, to: { color: "#7f60f9" } });
    expect(gradients.title?.on).toBe(true);
  });

  it("leaves gradients alone when the file has no pair in it", () => {
    const built = themeFromPalette(readPalette('{"background":"#101418","accent":"#66d2ff","text":"#eef4ff"}'));
    expect(built?.gradients).toEqual({});
  });

  // A theme with pale cyan body text was giving its *violet* Secret callout
  // pale cyan words, because the words were mixed toward the body text rather
  // than toward the light end of the theme. Colour-coding you can only see on
  // the 3px stripe isn't colour-coding.
  it("keeps a callout's words in its own edge's colour, not the body text's", () => {
    const { colors } = theme();
    const channels = (hex: string) => hexToRgb(colors[hex]);

    // Secret is violet: more blue than green, and the words have to agree.
    expect(channels("--color-callout-secret").b).toBeGreaterThan(channels("--color-callout-secret").g);
    expect(channels("--color-callout-secret-text").b).toBeGreaterThan(channels("--color-callout-secret-text").g);
    // Info is mint here: more green than blue, both on the edge and in the text.
    expect(channels("--color-callout-info").g).toBeGreaterThan(channels("--color-callout-info").b);
    expect(channels("--color-callout-info-text").g).toBeGreaterThan(channels("--color-callout-info-text").b);
  });

  it("keeps a callout's words a clear step off its edge", () => {
    const { colors } = theme();
    for (const kind of ["info", "quote", "secret"]) {
      const edge = colors[`--color-callout-${kind}`];
      const text = colors[`--color-callout-${kind}-text`];
      expect(edge).not.toBe(text);
      expect(contrast(text, colors["--color-panel"])).toBeGreaterThanOrEqual(10);
    }
  });

  it("reads a light palette as a light theme", () => {
    const built = themeFromPalette(readPalette('{"background":"#fbf8f2","ink":"#20242c","accent":"#8a5a2b","line":"#e3ddd2"}'));
    const colors = built?.colors ?? {};
    expect(relativeLuminance(colors["--color-bg"])).toBeGreaterThan(0.7);
    expect(relativeLuminance(colors["--color-text-primary"])).toBeLessThan(0.2);
    expect(contrast(colors["--color-text-muted"], colors["--color-bg"])).toBeGreaterThanOrEqual(4.5);
  });
});

/**
 * The floor the importer solves for, checked against the themes that ship.
 *
 * Here rather than in `constants/themes.test.ts` because `contrast` lives in
 * this file's subject and constants must not import a service (CLAUDE.md's
 * layer order). What it guards is `docs/handoff.md`'s rule: `--color-text-muted`
 * clears 4.5:1 and `--color-text-placeholder` 3:1, against *both* the window
 * and the panel, in every theme. All six were under it at once in 2026-08-07
 * because every one had been picked by eye and none had been measured — this is
 * the check that stops a seventh joining them.
 */
describe("the themes in index.css hold that same floor", () => {
  const CSS = String(readFileSync("src/index.css", "utf8")).replace(/\/\*[\s\S]*?\*\//g, "");

  const declarations = (block: string): Record<string, string> => {
    const found: Record<string, string> = {};
    for (const [, token, value] of block.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi)) found[token] = value.toLowerCase();
    return found;
  };

  const blockAfter = (opening: RegExp): string => {
    const at = opening.exec(CSS);
    if (!at) throw new Error(`no block for ${String(opening)}`);
    const start = at.index + at[0].length;
    return CSS.slice(start, CSS.indexOf("}", start));
  };

  // `dark` has no block of its own — the base values in `@theme` are the dark
  // theme — so it's tested as the base alone, which is also what every other
  // theme inherits anything it doesn't restate.
  const base = declarations(blockAfter(/@theme\s*\{/));
  const ids = [...CSS.matchAll(/\[data-theme="([\w-]+)"\]\s*\{/g)].map((match) => match[1]);

  /** Everything a theme resolves to: the base, with its own block over the top. */
  const tokensFor = (id: string): Record<string, string> =>
    id === "dark" ? base : { ...base, ...declarations(blockAfter(new RegExp(String.raw`\[data-theme="${id}"\]\s*\{`))) };

  it("finds every theme's block, including the base", () => {
    expect(Object.keys(base).length).toBeGreaterThan(10);
    expect(ids).toContain("abyssal");
    expect(ids.length).toBeGreaterThanOrEqual(5);
  });

  it.each(["dark", ...ids])("%s keeps quiet text readable on both surfaces", (id) => {
    const theme = tokensFor(id);
    const surfaces = [theme["--color-bg"], theme["--color-panel"]];
    const worst = (token: string) => Math.min(...surfaces.map((surface) => contrast(theme[token], surface)));

    expect(worst("--color-text-muted")).toBeGreaterThanOrEqual(4.5);
    expect(worst("--color-text-placeholder")).toBeGreaterThanOrEqual(3);
    expect(worst("--color-text-secondary")).toBeGreaterThanOrEqual(4.5);
    expect(worst("--color-text-primary")).toBeGreaterThanOrEqual(7);
  });

  it.each(["dark", ...ids])("%s keeps its three border weights in order", (id) => {
    const theme = tokensFor(id);
    const step = (token: string) => contrast(theme[token], theme["--color-panel"]);

    expect(step("--color-border-subtle")).toBeLessThan(step("--color-border"));
    expect(step("--color-border")).toBeLessThan(step("--color-border-strong"));
  });

  it.each(ids)("%s keeps its faintest border visible", (id) => {
    const theme = tokensFor(id);
    expect(contrast(theme["--color-border-subtle"], theme["--color-panel"])).toBeGreaterThan(1.1);
  });

  /**
   * `dark` is the one theme under that bar, at 1.097, and it's left there
   * rather than quietly retuned — it's the original palette and changing it is
   * a decision, not a tidy-up. This is a ratchet, not a pass: it may not get
   * fainter. Midnight's borders were the same kind of near-miss and were
   * reported from use as outlines you can't see; if this one ever is, the note
   * above Midnight's block in index.css says what to raise it to.
   */
  it("dark is the known-faintest, and may not get fainter", () => {
    const step = contrast(base["--color-border-subtle"], base["--color-panel"]);
    expect(step).toBeGreaterThan(1.09);
    expect(step).toBeLessThan(1.1);
  });

  /**
   * The same floor `themeFromPalette` is held to, applied to the themes that
   * ship. Midnight failed this by inheriting the near-black theme's callouts —
   * the third token group it was caught inheriting, after the borders and the
   * text ramp, and the third time it was found by using the app rather than by
   * looking. A theme that doesn't restate these now has to mean it.
   */
  it.each(["dark", ...ids])("%s keeps its three callouts apart and readable", (id) => {
    const theme = tokensFor(id);
    const edges = ["info", "quote", "secret"].map((kind) => theme[`--color-callout-${kind}`]);
    expect(new Set(edges).size).toBe(3);

    for (const kind of ["info", "quote", "secret"]) {
      const edge = theme[`--color-callout-${kind}`];
      const text = theme[`--color-callout-${kind}-text`];
      expect(contrast(edge, theme["--color-panel"])).toBeGreaterThanOrEqual(3);
      expect(contrast(text, theme["--color-panel"])).toBeGreaterThanOrEqual(10);
    }
  });

  /**
   * Quote's tint is the one that was wrong everywhere: flat white at 3% where
   * Info and Secret were their own hue at 12%, so the box wasn't faint, it was
   * absent. Alpha isn't a hex so `declarations` can't see these — matched out
   * of the raw CSS instead, and what's being asserted is the thing that was
   * broken: no callout tint may be a wash of undiluted white or black.
   */
  it("gives every quote callout a real tint rather than a wash of white", () => {
    const tints = [...CSS.matchAll(/--color-callout-quote-bg:\s*rgba\(([^)]+)\)/g)].map((match) =>
      match[1].split(",").map((part) => Number(part.trim())),
    );
    expect(tints.length).toBeGreaterThanOrEqual(6);

    for (const [r, g, b, alpha] of tints) {
      const neutralExtreme = (r === g && g === b && (r === 0 || r === 255));
      expect(neutralExtreme).toBe(false);
      expect(alpha).toBeGreaterThanOrEqual(0.1);
    }
  });
});
