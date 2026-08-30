// Turning a palette from somewhere else into an Anamnesis theme.
//
// The input is a JSON file of `name: "#hex"` pairs — the shape every palette
// tool and half the apps in the world export. It carries colours but no roles:
// it knows it has a `#00253D` in it, it doesn't know that's a window
// background, and its own names are about the app it came from rather than
// about this one. So this module works the roles out.
//
// Two rules shape everything below.
//
// **A palette isn't finished until it's measured.** All six built-in themes
// once failed the same contrast check because every one of them was picked by
// eye (see docs/handoff.md). An importer that hands the job to a machine and
// *still* guesses by eye would be the same mistake with more steps, so every
// text and border step here is solved for a contrast ratio rather than chosen.
// A theme that comes in through this door cannot be less readable than the
// floor, whatever the file said.
//
// **Names are a hint, not an instruction.** A key called `primary` is usually
// an accent and is sometimes near-white body text; a key called `warning` is
// sometimes a perfectly good cyan. So a matching name adds to a colour's score
// for a role, and the colour's own measurements decide whether it wins.
//
// Nothing here touches disk (filesystem-service does) or the document
// (theme-service does), and nothing here writes CSS (theme-editor does).
import { hexToRgb, rgbToHex, toHex, type Gradient } from "./theme-editor";

/* --- Measuring ------------------------------------------------------------ */

/** WCAG relative luminance. The basis of every decision in this file. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** Straight channel blend. `t` is how far from `from` towards `to`. */
export function mix(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const at = (x: number, y: number) => x + (y - x) * Math.max(0, Math.min(1, t));
  return rgbToHex({ r: at(a.r, b.r), g: at(a.g, b.g), b: at(a.b, b.b) });
}

/** How colourful, 0 (grey) to 1. Tells an accent from a background. */
function chroma(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

/** Position on the colour wheel, 0–360. Meaningless below about 0.05 chroma. */
function hue(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const raw = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return raw * 60;
}

/** Shortest way round the wheel, 0–180. */
function hueGap(a: string, b: string): number {
  const gap = Math.abs(hue(a) - hue(b)) % 360;
  return gap > 180 ? 360 - gap : gap;
}

/**
 * The quietest version of `text` that still clears `target` against *every*
 * surface it might sit on.
 *
 * Both surfaces, not just the panel, because a theme's window and its panels
 * are different colours and the darker one isn't reliably the harder one — the
 * pass that fixed all six themes found the worse of the two flipping between
 * them. Binary search rather than a fixed set of steps so the ramp lands on
 * the ratio instead of near it.
 */
function fadeToward(text: string, backdrop: string, surfaces: readonly string[], target: number): string {
  const worst = (hex: string) => Math.min(...surfaces.map((surface) => contrast(hex, surface)));
  // Already too close to call — the palette's own text colour is the best
  // available, and fading it further would only make things worse.
  if (worst(text) <= target) return text;

  let pass = 0;
  let fail = 1;
  for (let i = 0; i < 20; i += 1) {
    const mid = (pass + fail) / 2;
    if (worst(mix(text, backdrop, mid)) >= target) pass = mid;
    else fail = mid;
  }
  return mix(text, backdrop, pass);
}

/**
 * `surface` pulled back toward `floorSurface` until `text` clears `target` on
 * it. A surface only has to be light enough to read as a step; it never has to
 * be light enough to cost the text ramp its top.
 */
function roomFor(surface: string, floorSurface: string, text: string, target: number): string {
  if (contrast(text, surface) >= target) return surface;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i += 1) {
    const mid = (lo + hi) / 2;
    if (contrast(text, mix(surface, floorSurface, mid)) >= target) hi = mid;
    else lo = mid;
  }
  return mix(surface, floorSurface, hi);
}

/** A colour `ratio` away from `backdrop`, in the direction of `towards`. */
function stepFrom(backdrop: string, towards: string, ratio: number): string {
  let low = 0;
  let high = 1;
  for (let i = 0; i < 20; i += 1) {
    const mid = (low + high) / 2;
    if (contrast(mix(backdrop, towards, mid), backdrop) < ratio) low = mid;
    else high = mid;
  }
  return mix(backdrop, towards, high);
}

/* --- Reading the file ----------------------------------------------------- */

export type PaletteEntry = { key: string; hex: string };

/**
 * Every colour in a JSON file, with the key it was found under.
 *
 * Walks nested objects because plenty of exports group their colours, and
 * takes the leaf key rather than a path since that's the part that carries the
 * meaning. Duplicates are dropped on first sight — a palette that names the
 * same colour twice hasn't offered two colours, and counting it twice would
 * let a repeated value outvote the rest of the file.
 */
export function readPalette(text: string): PaletteEntry[] {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    return [];
  }

  const entries: PaletteEntry[] = [];
  const seen = new Set<string>();
  const walk = (value: unknown, key: string, depth: number): void => {
    if (typeof value === "string") {
      const hex = toHex(value);
      if (hex && !seen.has(hex)) {
        seen.add(hex);
        entries.push({ key: key.toLowerCase(), hex });
      }
      return;
    }
    if (depth < 4 && value !== null && typeof value === "object") {
      for (const [childKey, child] of Object.entries(value as Record<string, unknown>)) walk(child, childKey, depth + 1);
    }
  };
  walk(data, "", 0);
  return entries;
}

/* --- Working out the roles ------------------------------------------------ */

/**
 * Name hints, per role. Matched as substrings, so `bgColor` and `background`
 * both count. Order matters only within a list: an exact key beats a partial
 * one, and an earlier word beats a later one.
 */
const HINTS = {
  bg: ["background", "backdrop", "canvas", "bg"],
  text: ["textprimary", "foreground", "text", "copy", "ink"],
  accent: ["accent", "brand", "primary", "highlight", "secondary"],
  info: ["info", "link", "notice"],
  secret: ["secret", "spoiler", "purple", "violet"],
  danger: ["error", "danger", "destructive", "critical"],
} as const;

/** Keys that mean something too specific to be borrowed as the app's accent. */
const NOT_ACCENT = ["error", "danger", "destructive", "critical", "warning", "success", "disabled", "neutral", "background", "text"];

const hintScore = (entry: PaletteEntry, words: readonly string[]): number => {
  const exact = words.indexOf(entry.key);
  if (exact >= 0) return 1 - exact * 0.05;
  const partial = words.findIndex((word) => entry.key.includes(word));
  return partial >= 0 ? 0.6 - partial * 0.05 : 0;
};

export type PaletteTheme = {
  /** Token → `#rrggbb`, ready for serializeTheme. */
  colors: Record<string, string>;
  gradients: Record<string, Gradient>;
  /** Plain-language lines about what was guessed. Written into the file. */
  notes: string[];
};

/**
 * The floor every derived text step is solved for, against **all four**
 * surfaces — see the long note beside the text tokens in index.css, which this
 * has to agree with or an imported theme reads dimmer than a built-in one.
 *
 * `muted` used to be 4.6, a whisker over the AA minimum for small text, and it
 * was solved against the window and the panel only. Both were too generous:
 * counts, dates and hints are the smallest type in the app, and a good half of
 * them are drawn on `--color-panel-edge`, which is lighter than either surface
 * the floor was checking.
 *
 * `placeholder` still sits below the other two on purpose: an empty field's
 * prompt has to read as *not filled in*, and that holds whether the theme was
 * hand-written or imported.
 */
const TEXT_FLOOR = { secondary: 8, muted: 6.5, placeholder: 4.5 };

/** Where the three border weights land against the window, as contrast ratios. */
const BORDER_STEPS = { strong: 1.9, plain: 1.45, subtle: 1.18 };

/**
 * A palette, mapped onto the tokens the app actually uses.
 *
 * Returns null for a file with nothing usable in it — one colour can't make a
 * theme, and inventing five more from it would be this module writing the
 * theme rather than importing one.
 */
export function themeFromPalette(entries: PaletteEntry[]): PaletteTheme | null {
  if (entries.length < 2) return null;

  const notes: string[] = [];
  const used = new Set<string>();
  const take = (hex: string): string => {
    used.add(hex);
    return hex;
  };

  /* The window. Everything else is measured against it, so it's picked first
     and by name where possible — get this one wrong and every ratio below is
     answering the wrong question. */
  const byHint = [...entries].sort((a, b) => hintScore(b, HINTS.bg) - hintScore(a, HINTS.bg));
  const lit = [...entries].sort((a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex));
  const middle = relativeLuminance(lit[Math.floor(lit.length / 2)].hex);
  const named = hintScore(byHint[0], HINTS.bg) > 0 ? byHint[0] : null;
  // No named background: take the extreme end of the palette in whichever
  // direction the palette mostly is. A file that's nearly all dark colours is
  // a dark theme, and its background is its darkest.
  const bg = take((named ?? (middle < 0.25 ? lit[0] : lit[lit.length - 1])).hex);
  const dark = relativeLuminance(bg) < 0.35;
  const away = dark ? "#ffffff" : "#000000";
  notes.push(`Window colour taken from "${(named ?? { key: "the palette" }).key}" — ${bg}, so this is a ${dark ? "dark" : "light"} theme.`);

  /* Body text. A palette colour if one of them is genuinely readable on that
     window; otherwise a tint of the window's opposite, which always is. */
  const readable = entries
    .filter((entry) => !used.has(entry.hex) && chroma(entry.hex) < 0.65)
    .sort((a, b) => contrast(b.hex, bg) - contrast(a.hex, bg) || chroma(a.hex) - chroma(b.hex));
  const textPrimary = take(readable.length > 0 && contrast(readable[0].hex, bg) >= 8 ? readable[0].hex : mix(bg, away, 0.93));

  /* Panels. Barely-there steps away from the window rather than colours in
     their own right — a sidebar that's obviously a different colour from the
     window reads as a box sitting on the app instead of part of it. */
  const surface = (ratio: number): string => {
    const candidate = entries
      .filter((entry) => !used.has(entry.hex) && contrast(entry.hex, bg) < 2)
      .sort((a, b) => {
        const gap = Math.abs(contrast(a.hex, bg) - ratio) - Math.abs(contrast(b.hex, bg) - ratio);
        return Math.abs(gap) > 0.08 ? gap : hueGap(a.hex, bg) - hueGap(b.hex, bg);
      })[0];
    if (candidate && Math.abs(contrast(candidate.hex, bg) - ratio) < 0.22) return take(candidate.hex);
    return stepFrom(bg, away, ratio);
  };
  const panel = surface(1.12);
  /* Menus, dropdowns and chips: the lightest surface, and the one that decides
     how much room the text ramp has. Left to itself this picks whatever in the
     palette sits about 1.42 away from the window, and a palette that offers
     something lighter still gets taken — which is how Abyssal ended up with a
     `--color-panel-edge` its own `--color-text-primary` only managed 9.1:1 on,
     less headroom than any other theme's *secondary* step, and no room under
     it for four distinct steps. Pulled back toward the panel until primary has
     10.5 to work with, which every shipped theme clears. */
  const panelEdge = roomFor(surface(1.42), panel, textPrimary, 10.5);
  // Between the window and the panels, never picked from the palette: it's the
  // top bar and the inputs, and its whole job is to be a shade nobody notices.
  const panelAlt = mix(bg, panel, 0.4);

  /* The accent. Scored rather than named, because the key that means "accent"
     in someone else's app is as likely to be `primary`, `secondary` or `mid` —
     and `primary` is near-white about half the time. What actually makes an
     accent is being colourful and being visible against the window. */
  const accentBand = dark ? [0.2, 0.8] : [0.08, 0.55];
  const accents = entries
    .filter((entry) => !used.has(entry.hex) && !NOT_ACCENT.some((word) => entry.key.includes(word)))
    .map((entry) => {
      const luminance = relativeLuminance(entry.hex);
      const miss = Math.max(0, accentBand[0] - luminance, luminance - accentBand[1]);
      return { entry, score: chroma(entry.hex) * 2 + hintScore(entry, HINTS.accent) - miss * 3 };
    })
    .filter(({ entry }) => contrast(entry.hex, bg) >= 2.5)
    .sort((a, b) => b.score - a.score);
  const accentLight = take(accents.length > 0 ? accents[0].entry.hex : mix(bg, away, 0.7));
  notes.push(
    accents.length > 0
      ? `Accent taken from "${accents[0].entry.key}" — ${accentLight}. It's the links, the selected page and the buttons.`
      : `No colour in the file looked like an accent, so one was mixed from the window.`,
  );

  // The button's darker half — the *deepest* colour that still shares the
  // accent's hue, not merely a lower one. Two colours a shade apart make a
  // gradient nobody can see, which is the same as not having one.
  const deeper = entries
    .filter((entry) => !used.has(entry.hex) && hueGap(entry.hex, accentLight) < 40 && relativeLuminance(entry.hex) < relativeLuminance(accentLight))
    .sort((a, b) => contrast(a.hex, bg) + hueGap(a.hex, accentLight) / 40 - (contrast(b.hex, bg) + hueGap(b.hex, accentLight) / 40))
    .find((entry) => contrast(entry.hex, accentLight) >= 1.5 && contrast(entry.hex, bg) >= 1.5);
  const accentDark = deeper ? take(deeper.hex) : mix(accentLight, bg, 0.5);

  /* Callouts. Three edges that have to stay apart from each other *and* from
     the accent — three near-blues is no colour-coding at all. Each one has to
     clear 3:1 against the panel or it isn't an edge, it's a suggestion.
     Aimed at a hue rather than at a distance from the accent, so Info comes
     out blue and Secret comes out violet wherever the accent happens to sit —
     that's what the built-in themes do and it's what the icons imply. */
  const apart: string[] = [accentLight];
  const calloutFor = (words: readonly string[], targetHue: number): string => {
    const pick = entries
      .filter((entry) => !used.has(entry.hex) && contrast(entry.hex, panel) >= 3 && chroma(entry.hex) > 0.15)
      .filter((entry) => apart.every((other) => hueGap(entry.hex, other) > 25))
      .map((entry) => ({ entry, score: hintScore(entry, words) * 2 - hueGap(entry.hex, rotate("#ff0000", targetHue)) / 180 }))
      .sort((a, b) => b.score - a.score)[0];
    // Nothing left that's far enough from what's already chosen to read as its
    // own signal — take the hue we wanted, at a weight that works on this
    // background. Three distinguishable edges matter more than three of hers.
    const edge = pick ? take(pick.entry.hex) : stepFrom(bg, rotate(accentLight, targetHue - hue(accentLight)), 5);
    apart.push(edge);
    return edge;
  };
  // Secret goes first: violet is the stronger convention of the two, so it
  // gets first refusal on the purples rather than losing them to Info.
  const calloutSecret = calloutFor(HINTS.secret, 285);
  const calloutInfo = calloutFor(HINTS.info, 220);
  // Quote is the neutral one by design — it's "someone said this", not a
  // category — so it comes off the text ramp rather than out of the palette.
  const calloutQuote = fadeToward(textPrimary, bg, [panel, bg], 6);

  const dangerPick = entries
    .filter((entry) => hintScore(entry, HINTS.danger) > 0)
    .sort((a, b) => contrast(b.hex, panel) - contrast(a.hex, panel))[0];
  const destructive = dangerPick ? dangerPick.hex : stepFrom(bg, "#ff5c5c", 4);

  // A callout's words, as opposed to its edge. Always paler than the edge —
  // the stripe is a label and the text is text, and the built-in themes all
  // run the two several steps apart.
  //
  // Toward the far end of the theme rather than toward the body text, which is
  // the correction: mixing toward `textPrimary` dragged all three callouts to
  // that one hue, so a theme with pale cyan body text gave its *violet* Secret
  // pale cyan words. Colour-coding you can only see on the 3px stripe isn't
  // colour-coding. The step is taken up front as well as in the loop, or a
  // bright edge clears the floor on its own and the words come out the same
  // colour as the stripe.
  const calloutText = (edge: string): string => {
    let step = mix(edge, away, 0.35);
    for (let i = 0; i < 20 && contrast(step, panel) < 10; i += 1) step = mix(step, away, 0.15);
    return step;
  };

  /* Every surface quiet text can land on, hardest last. */
  const TEXT_SURFACES = [panel, bg, panelAlt, panelEdge];

  const colors: Record<string, string> = {
    "--color-bg": bg,
    "--color-panel": panel,
    "--color-panel-alt": panelAlt,
    "--color-panel-edge": panelEdge,

    "--color-text-primary": textPrimary,
    "--color-text-secondary": fadeToward(textPrimary, bg, TEXT_SURFACES, TEXT_FLOOR.secondary),
    "--color-text-muted": fadeToward(textPrimary, bg, TEXT_SURFACES, TEXT_FLOOR.muted),
    "--color-text-placeholder": fadeToward(textPrimary, bg, TEXT_SURFACES, TEXT_FLOOR.placeholder),

    "--color-accent-light": accentLight,
    "--color-accent-dark": accentDark,

    "--color-border-strong": stepFrom(bg, textPrimary, BORDER_STEPS.strong),
    "--color-border": stepFrom(bg, textPrimary, BORDER_STEPS.plain),
    "--color-border-subtle": stepFrom(bg, textPrimary, BORDER_STEPS.subtle),

    "--color-callout-info": calloutInfo,
    "--color-callout-info-text": calloutText(calloutInfo),
    "--color-callout-quote": calloutQuote,
    "--color-callout-quote-text": calloutText(calloutQuote),
    "--color-callout-secret": calloutSecret,
    "--color-callout-secret-text": calloutText(calloutSecret),
    "--color-destructive": destructive,
  };

  notes.push("The quieter text and the lines were worked out from those, so every one of them clears the readability floor the app holds its own themes to.");

  const gradients = gradientsFrom(entries, notes);
  return { colors, gradients, notes };
}

/** Nudges a colour to a different hue, keeping how light and how vivid it is. */
function rotate(hex: string, degrees: number): string {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const light = (max + min) / 2;
  const sat = max === min ? 0 : (max - min) / (light > 0.5 ? 2 - max - min : max + min);
  const h = ((hue(hex) + degrees) % 360) / 360;
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const channel = (t: number) => {
    const x = (t + 1) % 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return rgbToHex({ r: channel(h + 1 / 3) * 255, g: channel(h) * 255, b: channel(h - 1 / 3) * 255 });
}

/**
 * A gradient the file was already carrying.
 *
 * Plenty of palettes ship one as a pair of keys — `fooStart`/`fooEnd`,
 * `fooFrom`/`fooTo`. Two colours somebody deliberately put next to each other
 * are worth more than any pair this module could choose, so when a pair turns
 * up it goes on the buttons and the page title. Both are one line in the file
 * and easy to delete, which is the right trade for a guess that's usually the
 * nicest thing in the palette.
 */
function gradientsFrom(entries: readonly PaletteEntry[], notes: string[]): Record<string, Gradient> {
  const ends = new Map<string, string>();
  for (const entry of entries) {
    const match = /^(.*?)(end|to|right)$/.exec(entry.key);
    if (match && match[1]) ends.set(match[1], entry.hex);
  }

  for (const entry of entries) {
    const match = /^(.*?)(start|from|left)$/.exec(entry.key);
    const to = match && match[1] ? ends.get(match[1]) : undefined;
    if (!to || to === entry.hex) continue;

    notes.push(`The file had a gradient in it ("${entry.key}" to that group's end colour), so it's on the main buttons and the page title.`);
    const stops = { on: true as const, type: "linear" as const, origin: "center", from: { color: entry.hex, alpha: 1 }, to: { color: to, alpha: 1 } };
    return { accent: { ...stops, angle: 100 }, title: { ...stops, angle: 95 } };
  }
  return {};
}
