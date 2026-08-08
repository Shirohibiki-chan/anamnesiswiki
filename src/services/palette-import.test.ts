import { describe, expect, it } from "vitest";
import { contrast, readPalette, relativeLuminance, themeFromPalette } from "./palette-import";

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

  it("reads a light palette as a light theme", () => {
    const built = themeFromPalette(readPalette('{"background":"#fbf8f2","ink":"#20242c","accent":"#8a5a2b","line":"#e3ddd2"}'));
    const colors = built?.colors ?? {};
    expect(relativeLuminance(colors["--color-bg"])).toBeGreaterThan(0.7);
    expect(relativeLuminance(colors["--color-text-primary"])).toBeLessThan(0.2);
    expect(contrast(colors["--color-text-muted"], colors["--color-bg"])).toBeGreaterThanOrEqual(4.5);
  });
});
