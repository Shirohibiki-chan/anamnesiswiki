// Turning colour-picker fiddling into a theme file, and back.
//
// The rule this whole module exists to keep: **there is one theme format.** A
// theme you build with the pickers in Settings and a theme you write by hand in
// Notepad are the same `.css` file in the same folder, and the app can't tell
// them apart. That's why the editor doesn't keep its own JSON somewhere and
// render CSS from it — the file *is* the state. Open one you made in Settings
// in the sandbox and it loads; open one from the sandbox in Settings and the
// pickers come up on its colours.
//
// Nothing here touches disk (filesystem-service does) or the document
// (theme-service does). This is the text ↔ values conversion and nothing else.
import { AUTO_TOKENS, COLOR_TOKENS, GRADIENT_SLOTS, type GradientSlot } from "../constants/theme-tokens";

/* --- Colours -------------------------------------------------------------- */

export type Rgb = { r: number; g: number; b: number };

/**
 * Whatever a token holds → `#rrggbb`, because `<input type="color">` accepts
 * nothing else. Handles the three shapes that actually turn up in a theme
 * file: `#abc`, `#aabbcc`, and `rgb()`/`rgba()` in either comma or space form.
 *
 * Returns null rather than a guess for anything else — a named colour or a
 * `color-mix()` is something the author wrote deliberately, and quietly
 * replacing it with the nearest hex would be the editor damaging a file it
 * didn't understand.
 */
export function toHex(value: string): string | null {
  const text = value.trim();

  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(text);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();

  const long = /^#([0-9a-f]{6})$/i.exec(text);
  if (long) return `#${long[1]}`.toLowerCase();

  const fn = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
      return rgbToHex({ r: parts[0], g: parts[1], b: parts[2] });
    }
  }

  const ok = fromOklab(text);
  if (ok) return ok;

  return null;
}

/**
 * `oklab(…)` / `oklch(…)` → `#rrggbb`.
 *
 * Here because the hover tokens are `color-mix(in oklab, …)`, and a browser
 * resolves a mix to `oklab(0.278 0.0039 -0.0144)` — not to a hex. Without this,
 * every hover swatch in Settings → Colours came up black while the app plainly
 * wasn't, which is the exact failure the `resolved` field in `ThemeDraft`
 * exists to prevent.
 *
 * It pays for itself twice over, because it isn't only our tokens: a
 * hand-written theme using `oklch()` — which is how anyone writing CSS in 2026
 * picks colours — used to read as black squares too, and "one theme format"
 * doesn't hold if the pickers can only see the half of CSS we happen to emit.
 *
 * Still deliberately narrow. Named colours and `color()` are left alone for the
 * reason in `toHex`: a value this can't read is one somebody wrote on purpose,
 * and the honest answer is to leave it rather than approximate it.
 */
function fromOklab(text: string): string | null {
  const match = /^(oklab|oklch)\(([^)]+)\)$/i.exec(text);
  if (!match) return null;

  // Alpha is dropped: these feed `<input type="color">`, which has no alpha
  // channel. The value written back keeps whatever the picker produced.
  const parts = match[2]
    .split("/")[0]
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;

  // `none` is a real component value (a powerless hue, say) and means zero here.
  const num = (raw: string, pct: number): number => {
    if (raw.toLowerCase() === "none") return 0;
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n)) return NaN;
    return raw.trim().endsWith("%") ? (n / 100) * pct : n;
  };

  const L = num(parts[0], 1);
  let a: number;
  let b: number;
  if (match[1].toLowerCase() === "oklch") {
    // Chroma's percentage reference is 0.4; hue is degrees.
    const c = num(parts[1], 0.4);
    const h = (num(parts[2], 1) * Math.PI) / 180;
    a = c * Math.cos(h);
    b = c * Math.sin(h);
  } else {
    a = num(parts[1], 0.4);
    b = num(parts[2], 0.4);
  }
  if (![L, a, b].every(Number.isFinite)) return null;

  return oklabToHex(L, a, b);
}

/**
 * Oklab → LMS → linear sRGB → `#rrggbb`, the standard matrices from Björn
 * Ottosson's definition. Kept inline rather than pulled in as a dependency:
 * it's nine constants and a cube, and this app bundles nothing it can write
 * once.
 *
 * Out-of-gamut components are clamped rather than gamut-mapped. These are theme
 * surfaces, not photographs; the difference is invisible at swatch size and a
 * proper mapping is a lot of maths for a 20px square.
 */
function oklabToHex(L: number, a: number, b: number): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const [r, g, bb] = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055;
    return Math.max(0, Math.min(1, v)) * 255;
  });

  return rgbToHex({ r, g, b: bb });
}

export function hexToRgb(hex: string): Rgb {
  const safe = toHex(hex) ?? "#000000";
  return {
    r: parseInt(safe.slice(1, 3), 16),
    g: parseInt(safe.slice(3, 5), 16),
    b: parseInt(safe.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")}`;
}

/** `("#5eead4", 0.15)` → `"rgba(94, 234, 212, 0.15)"`. */
export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

/**
 * The tokens nobody should have to keep in step by hand.
 *
 * Each of these is the same colour as one that *is* in the picker, at an alpha
 * — the accent's two tints and each callout's background wash. Left editable
 * they'd be five more swatches, four of which look identical in a 20px square,
 * and the first time one drifted out of step you'd get a theme whose selected
 * tree row is a different hue from its buttons for no visible reason.
 *
 * They're written into the file all the same, so it stays a plain stylesheet
 * anyone can read and edit by hand.
 */
export function deriveTokens(colors: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const accent = colors["--color-accent-light"];
  if (accent) {
    out["--color-accent-faint"] = rgba(accent, 0.15);
    out["--color-accent-faint-border"] = rgba(accent, 0.3);
  }
  for (const kind of ["info", "quote", "secret"] as const) {
    const edge = colors[`--color-callout-${kind}`];
    // Quote is the neutral one and its wash has always been a plain white
    // film rather than a tint of its own grey — tinting it makes the "just a
    // quote" callout look like it means something.
    if (edge) out[`--color-callout-${kind}-bg`] = kind === "quote" ? "rgba(255, 255, 255, 0.035)" : rgba(edge, 0.12);
  }
  return out;
}

/* --- Matching the other backgrounds to the panel -------------------------- */

/** sRGB hex → Oklab. The inverse of the conversion in `fromOklab`. */
function toOklab(hex: string): { L: number; a: number; b: number } {
  const { r, g, b } = hexToRgb(hex);
  // Undo the sRGB transfer function; the matrices below work in light, not in
  // the gamma-encoded numbers a hex actually holds.
  const lin = [r, g, b].map((n) => {
    const v = n / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]);
  const m = Math.cbrt(0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]);
  const s = Math.cbrt(0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/**
 * The same hue and colourfulness, moved up or down in lightness.
 *
 * Oklab rather than a naive `#rrggbb` nudge so a step off a saturated colour
 * stays that colour — lightening a navy in sRGB by adding to each channel walks
 * it toward grey, which is how a "matching" set of surfaces ends up looking
 * like it came from three different themes.
 */
export function stepLightness(hex: string, delta: number): string {
  const { L, a, b } = toOklab(hex);
  return oklabToHex(Math.max(0, Math.min(1, L + delta)), a, b);
}

/** Whether a colour reads as light, on the same 0.62 line `--color-hover-pole` uses. */
export function isLight(hex: string): boolean {
  return toOklab(hex).L > 0.62;
}

/**
 * The other three backgrounds, worked out from the panel colour.
 *
 * **This is a starting point, not a rule.** It runs when she presses "Match the
 * others to Panels" and writes ordinary values she can then edit; nothing keeps
 * following afterwards. That was the point of choosing a button over automatic
 * derivation — the four backgrounds stay four independent colours, and this is
 * a way to fill three of them in at once rather than a fifth thing deciding
 * what they are.
 *
 * The offsets come from the shipped themes rather than from taste. Across all
 * six darks the ordering is the same: the window sits *below* the panel, a box
 * on a panel sits slightly above it, and a menu sits above that. So the three
 * are steps along one axis, and which way that axis points is decided by
 * whether the panel is light or dark — the same question, and the same 0.62
 * line, that `--color-hover-pole` asks in `index.css`.
 *
 * Inverted for a light panel this gives what Daylight already does by hand: a
 * window slightly off-white behind panels that are lighter than it, and boxes a
 * touch darker than the panel they sit on. It also fixes what Daylight gets
 * wrong — its `--color-panel-edge` is the same `#ffffff` as its panel, which is
 * the collision that made hover invisible there in the first place.
 */
export function matchedBackgrounds(panel: string): Record<string, string> {
  // The two cases are written out rather than folded into one signed step,
  // because they genuinely differ rather than mirroring. On a dark theme
  // "raised" means lighter, so a box and a menu climb away from the panel and
  // the window sits below it. On a light theme the panel is usually near white
  // and there's no headroom to climb into: the shipped Daylight puts its window
  // *and* its boxes below the panel, boxes lower than window, and keeps menus
  // hard against the panel so a popover still reads as white. These offsets are
  // that arrangement, and its dark equivalent, written down.
  const steps = isLight(panel)
    ? { "--color-bg": -0.035, "--color-panel-alt": -0.06, "--color-panel-edge": -0.012 }
    : { "--color-bg": -0.06, "--color-panel-alt": 0.035, "--color-panel-edge": 0.075 };

  return Object.fromEntries(Object.entries(steps).map(([token, delta]) => [token, separated(panel, delta)]));
}

/**
 * A step that is guaranteed to land somewhere else, by turning round and then
 * by reaching further when it can't go any further the way it was pointed.
 *
 * Two ways a step lands back where it started. A pure white panel has no
 * headroom above it, so anything that wants to be lighter clamps and comes back
 * identical. And near black, a step of 0.035 in lightness is smaller than one
 * 8-bit code point, so it rounds away to nothing.
 *
 * Either is the collision this whole run of work started with — Daylight's own
 * `--color-panel-edge` is the same `#ffffff` as its panel, and a surface equal
 * to the surface beneath it is a surface that isn't there. Generating a fresh
 * one would have been the same bug arriving from a new direction, so this
 * function's only job is to make that impossible.
 */
function separated(panel: string, delta: number): string {
  for (const d of [delta, -delta, delta * 2, -delta * 2, delta * 4, -delta * 4]) {
    const stepped = stepLightness(panel, d);
    if (stepped !== panel) return stepped;
  }
  // Only reachable from pure black or pure white, where every small step
  // rounds away. A visible surface beats a faithful one.
  return isLight(panel) ? stepLightness(panel, -0.08) : stepLightness(panel, 0.08);
}

/* --- Gradients ------------------------------------------------------------ */

export type GradientStop = { color: string; alpha: number };

export type Gradient = {
  on: boolean;
  type: "linear" | "radial";
  angle: number;
  origin: string;
  from: GradientStop;
  to: GradientStop;
  /**
   * Set when the value in the file isn't a shape these controls can express —
   * a three-stop gradient, a `conic-gradient`, anything hand-tuned. The editor
   * shows it as untouchable and writes it back byte for byte rather than
   * flattening someone's work into two stops.
   */
  raw?: string;
};

export function gradientCss(gradient: Gradient): string {
  const from = rgba(gradient.from.color, gradient.from.alpha);
  const to = rgba(gradient.to.color, gradient.to.alpha);
  return gradient.type === "radial"
    ? `radial-gradient(circle at ${gradient.origin}, ${from}, ${to})`
    : `linear-gradient(${gradient.angle}deg, ${from}, ${to})`;
}

/** A slot's starting point when it's first switched on, seeded from the theme's own colours. */
export function seedGradient(slot: GradientSlot, colors: Record<string, string>): Gradient {
  const stop = (token: string, alpha: number | undefined): GradientStop => ({
    color: toHex(colors[token] ?? "") ?? "#000000",
    alpha: alpha ?? 1,
  });
  return {
    on: true,
    type: "linear",
    angle: slot.angle,
    origin: "center",
    from: stop(slot.from, slot.fromAlpha),
    to: stop(slot.to, slot.toAlpha),
  };
}

/**
 * Reads one of our own gradient values back into controls.
 *
 * Deliberately narrow: it matches the two shapes `gradientCss` writes and
 * nothing else. Anything richer comes back as `raw`, which is the honest
 * answer — these controls have two stops and an angle, and pretending to have
 * parsed a three-stop radial would mean the next keystroke silently discarded
 * a stop.
 */
export function parseGradient(value: string): Gradient {
  const text = value.trim();
  const fallback = (): Gradient => ({
    on: true,
    type: "linear",
    angle: 90,
    origin: "center",
    from: { color: "#000000", alpha: 1 },
    to: { color: "#000000", alpha: 1 },
    raw: text,
  });

  const colorPart = "(#[0-9a-f]{3,8}|rgba?\\([^)]*\\))";
  const linear = new RegExp(`^linear-gradient\\(\\s*(-?[\\d.]+)deg\\s*,\\s*${colorPart}\\s*,\\s*${colorPart}\\s*\\)$`, "i").exec(text);
  const radial = new RegExp(`^radial-gradient\\(\\s*circle at ([a-z ]+?)\\s*,\\s*${colorPart}\\s*,\\s*${colorPart}\\s*\\)$`, "i").exec(
    text,
  );

  const match = linear ?? radial;
  if (!match) return fallback();

  const from = readStop(match[2]);
  const to = readStop(match[3]);
  if (!from || !to) return fallback();

  return linear
    ? { on: true, type: "linear", angle: Number(match[1]), origin: "center", from, to }
    : { on: true, type: "radial", angle: 90, origin: match[1].trim(), from, to };
}

function readStop(value: string): GradientStop | null {
  const hex = toHex(value);
  if (!hex) return null;
  const fn = /^rgba?\(([^)]+)\)$/i.exec(value.trim());
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { color: hex, alpha: parts.length > 3 && Number.isFinite(parts[3]) ? parts[3] : 1 };
  }
  // An 8-digit hex carries its own alpha; toHex drops it, so read it here.
  const withAlpha = /^#[0-9a-f]{6}([0-9a-f]{2})$/i.exec(value.trim());
  return { color: hex, alpha: withAlpha ? parseInt(withAlpha[1], 16) / 255 : 1 };
}

/* --- The whole theme ------------------------------------------------------ */

export type ThemeDraft = {
  /**
   * What the file itself declares. Only these get written back — a theme is
   * allowed to be four lines long, and turning someone's four-line file into a
   * twenty-five-line one the first time they touch a picker is the editor
   * rewriting work it was only asked to read.
   */
  colors: Record<string, string>;
  /**
   * What every token *resolves to* right now, which for anything the file
   * doesn't declare is whatever it inherits from the base tokens. This is what
   * the pickers display. The two are separate because "the file doesn't set
   * this" and "this is black" are completely different statements, and showing
   * the second when the first is true is how you get a panel full of black
   * squares above an app that plainly isn't black.
   */
  resolved: Record<string, string>;
  gradients: Record<string, Gradient>;
};

const declaration = (token: string, css: string): string | undefined =>
  new RegExp(`${token}\\s*:\\s*([^;}]+)`).exec(css)?.[1]?.trim();

/**
 * Pulls the editable parts of a theme file into pickers. Silent about the rest.
 *
 * `resolve` reads a token's current computed value — the store hands it
 * `getComputedStyle(document.documentElement)`, and it must be called with the
 * theme already applied or it resolves the previous one.
 */
export function readThemeDraft(css: string, resolve: (token: string) => string = () => ""): ThemeDraft {
  const colors: Record<string, string> = {};
  const resolved: Record<string, string> = {};
  for (const token of COLOR_TOKENS) {
    const value = declaration(token, css);
    const hex = value ? toHex(value) : null;
    if (hex) colors[token] = hex;
    resolved[token] = hex ?? toHex(resolve(token)) ?? "#000000";
  }

  const gradients: Record<string, Gradient> = {};
  for (const slot of GRADIENT_SLOTS) {
    const value = declaration(`--gradient-${slot.key}`, css);
    if (value) gradients[slot.key] = parseGradient(value);
  }

  return { colors, resolved, gradients };
}

/**
 * Everything the current theme resolves to, as a starting point for a new one.
 *
 * Read off the document rather than out of a file because the theme being
 * copied is usually a built-in, whose CSS the app never holds as text — and
 * because a theme file that only sets four tokens still *looks* like a
 * complete theme on screen, so copying what's on screen is what someone
 * pressing "make a copy of this" means.
 */
export function seedFromDocument(read: (token: string) => string): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const token of COLOR_TOKENS) {
    // The auto tokens are the exception to "a copy has to be complete", and
    // AUTO_TOKENS says why: writing them out is what would break them.
    if (AUTO_TOKENS.includes(token)) continue;
    const hex = toHex(read(token));
    if (hex) colors[token] = hex;
  }
  return colors;
}

/**
 * A filename nothing in the folder is using yet.
 *
 * Numbered rather than overwritten, because "Make a copy I can edit" pressed
 * twice means two themes — silently replacing the first would throw away work
 * with no warning and no undo. `sanitize` is passed in rather than imported so
 * this stays pure; the caller hands it filesystem-service's.
 */
export function freeFileName(name: string, taken: readonly string[], sanitize: (name: string) => string): string {
  const stem = sanitize(name.trim()) || "My theme";
  const used = new Set(taken.map((file) => file.toLowerCase()));
  const free = (candidate: string) => !used.has(candidate.toLowerCase());

  if (free(`${stem}.css`)) return `${stem}.css`;
  for (let n = 2; n < 100; n += 1) {
    if (free(`${stem} ${n}.css`)) return `${stem} ${n}.css`;
  }
  return `${stem} ${Date.now()}.css`;
}

/**
 * Where a generated theme file came from, when it wasn't the colour pickers.
 *
 * Only the importer passes this. A file that says it was made in Settings →
 * Colours when it was actually mapped out of somebody else's palette is a small
 * lie in the one place she'd go looking for the truth.
 */
export type ThemeOrigin = {
  /** Replaces the "Made in Settings → Colours" line under the theme's name. */
  made: string;
  /** Plain-language lines about anything that had to be guessed. */
  notes?: readonly string[];
};

/**
 * A theme file, from nothing.
 *
 * **Only for a file that doesn't exist yet.** Editing one that does goes
 * through `patchTheme` below — see the note there, which is the more important
 * of the two.
 *
 * Shaped to match what the sandbox's "Show me the CSS" produces, down to the
 * header comment, because the two have to be interchangeable. Grouped and
 * commented rather than minimal: this is a file she may well open in Notepad,
 * and a wall of forty undifferentiated custom properties is not something
 * anyone edits twice.
 */
export function serializeTheme(
  name: string,
  themeId: string,
  draft: ThemeDraft,
  today: string,
  /**
   * `--font-*` → the stack the theme being copied asks for.
   *
   * Written out rather than left to inherit, and that's the whole point of the
   * parameter: only *one* built-in sets its own faces, so a copy of that one
   * came out in the base tokens' Inter/Fraunces/Newsreader instead of its own,
   * and "make a copy of this" produced something that didn't look like this.
   * A copy has to be complete for the same reason the colours are all written
   * out — the theme it was copied from is not in the cascade behind it.
   */
  fonts: Record<string, string> = {},
  origin?: ThemeOrigin,
): string {
  const lines: string[] = [];
  lines.push(`/* Anamnesis theme — "${name}"`);
  lines.push(`   ${origin?.made ?? `Made in Settings → Colours on ${today}.`}`);
  lines.push("");
  lines.push("   Plain CSS, so you can edit it here as well as in the app —");
  lines.push("   the pickers read this file back. Save it and the app follows");
  lines.push("   straight away; nothing needs pressing. */");
  // In the header, not buried beside the tokens they explain, because these are
  // guesses and the moment to read them is before deciding whether the theme is
  // any good — not after hunting for why one line is the colour it is.
  for (const note of origin?.notes ?? []) {
    lines.push("");
    // A note quotes key names out of somebody else's file, and a key holding
    // `*/` would end the comment early and spill the rest into the stylesheet.
    lines.push(`/* ${note.replace(/\*\//g, "*\\/")} */`);
  }
  lines.push("");
  lines.push(`[data-theme="${themeId}"] {`);

  const write = (token: string, value: string) => lines.push(`  ${token}: ${value};`);

  for (const [token, value] of Object.entries(draft.colors)) write(token, value);

  const derived = deriveTokens(draft.colors);
  if (Object.keys(derived).length > 0) {
    lines.push("");
    lines.push("  /* Worked out from the colours above — the same hues at lower");
    lines.push("     opacity. Change these if you want, but they're what keeps a");
    lines.push("     selected page the same colour as the buttons. */");
    for (const [token, value] of Object.entries(derived)) write(token, value);
  }

  const faces = Object.entries(fonts);
  if (faces.length > 0) {
    lines.push("");
    lines.push("  /* The faces this theme asks for. A font chosen in Settings →");
    lines.push("     Fonts and text still wins over these — they're what it");
    lines.push("     goes back to when you clear one. */");
    for (const [token, stack] of faces) write(token, stack);
  }

  const on = GRADIENT_SLOTS.filter((slot) => draft.gradients[slot.key]?.on);
  if (on.length > 0) {
    lines.push("");
    lines.push("  /* Gradients. Each one layers over the flat colour underneath,");
    lines.push("     so deleting a line here goes back to the plain surface. */");
    for (const slot of on) {
      const gradient = draft.gradients[slot.key];
      write(`--gradient-${slot.key}`, gradient.raw ?? gradientCss(gradient));
      // A text gradient is the image plus the two properties that punch the
      // letters out of it. Emitted together because one without the others is
      // either an invisible title or a coloured box — see index.css §Gradients.
      if (slot.text) {
        write(`--gradient-${slot.key}-clip`, "text");
        write(`--gradient-${slot.key}-fill`, "transparent");
      }
    }
  }

  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

/* --- Editing a file that already exists ----------------------------------- */

const escapeForRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Where a theme's own declarations live inside a file, as offsets into it.
 *
 * The named block first, `:root` second. A file that sets its colours on
 * `:root` is a perfectly ordinary hand-written theme — the app scopes it when
 * it loads it — and it would be absurd to refuse to edit one.
 */
function findBlock(css: string, themeId: string): { open: number; close: number } | null {
  const patterns = [new RegExp(`\\[data-theme\\s*=\\s*["']?${escapeForRegex(themeId)}["']?\\][^{}]*\\{`, "i"), /:root[^{}]*\{/i];

  for (const pattern of patterns) {
    const match = pattern.exec(css);
    if (!match) continue;
    const open = match.index + match[0].length;
    // Counted rather than matched to the next `}`, so a nested rule — a media
    // query, a `&:hover` — inside the block doesn't end it early.
    let depth = 1;
    for (let i = open; i < css.length; i += 1) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") {
        depth -= 1;
        if (depth === 0) return { open, close: i };
      }
    }
  }
  return null;
}

/** Changes a declaration's value where it already is, or adds it at the end. */
function setInBlock(block: string, token: string, value: string): string {
  const pattern = new RegExp(`(^|[;{\\s])(${escapeForRegex(token)})(\\s*:\\s*)([^;}]*)`, "g");
  // The last one, not the first: later declarations win in CSS, so the last is
  // the one on screen and therefore the one the picker was showing.
  let last: RegExpExecArray | null = null;
  for (let found = pattern.exec(block); found; found = pattern.exec(block)) last = found;

  if (last) {
    const at = last.index + last[1].length + last[2].length + last[3].length;
    return block.slice(0, at) + value + block.slice(at + last[4].length);
  }

  // New to this file. Matched to the indentation of whatever else is in there,
  // because she reads these files.
  const indent = /\n([ \t]+)\S/.exec(block)?.[1] ?? "  ";
  const body = block.replace(/\s+$/, "");
  const tail = /\s+$/.exec(block)?.[0] ?? "\n";
  return `${body}\n${indent}${token}: ${value};${tail}`;
}

/** Takes a declaration out, and its line with it. */
function removeFromBlock(block: string, token: string): string {
  return block.replace(new RegExp(`[ \\t]*${escapeForRegex(token)}\\s*:\\s*[^;}]*;?[ \\t]*\\r?\\n?`, "g"), "");
}

/**
 * Puts the pickers' values into the file that's already on disk, and changes
 * nothing else in it.
 *
 * **This is the important function in this module.** The editor used to call
 * `serializeTheme` for every edit, which builds a file from the twenty-odd
 * tokens the pickers know about — so touching one colour in a theme somebody
 * had hand-written replaced the whole thing. Their rules, their comments, their
 * selectors, gone. No warning, no undo, and the app looked like it had worked.
 *
 * A theme file is allowed to be anything. The only safe assumption is that
 * every byte in it was put there on purpose, so the edit is surgical: find the
 * declaration, change its value, put the file back. What was never mentioned is
 * never touched, and nothing is removed except a gradient that was switched off
 * — which is the one case where removing the line *is* the edit.
 *
 * The derived tints get the same treatment for the same reason. They're
 * rewritten only when the file's current value is still the one this module
 * would have written for the colour that was there before; a value that doesn't
 * match is one somebody chose, and it stays. The cost is a theme whose
 * hand-tuned tint no longer matches its accent, which is visible, reversible
 * and hers. The alternative silently discards it.
 */
export function patchTheme(css: string, name: string, themeId: string, draft: ThemeDraft, today: string): string {
  const range = findBlock(css, themeId);
  // Nothing in here we can recognise as this theme's declarations — an empty
  // file, or one that's all comments. Appending a block is additive; replacing
  // the file is the bug this function exists to fix.
  if (!range) return `${css.replace(/\s+$/, "")}\n\n${serializeTheme(name, themeId, draft, today)}`.replace(/^\n+/, "");

  let block = css.slice(range.open, range.close);

  // What the file says right now, so the derived tints can tell "the app wrote
  // this" from "somebody chose this".
  const before: Record<string, string> = {};
  for (const token of COLOR_TOKENS) {
    const hex = toHex(declaration(token, block) ?? "");
    if (hex) before[token] = hex;
  }
  const ours = deriveTokens(before);

  for (const [token, value] of Object.entries(draft.colors)) block = setInBlock(block, token, value);

  for (const [token, value] of Object.entries(deriveTokens(draft.colors))) {
    const current = declaration(token, block)?.trim();
    if (current === undefined || current === ours[token]) block = setInBlock(block, token, value);
  }

  for (const slot of GRADIENT_SLOTS) {
    const gradient = draft.gradients[slot.key];
    const extras = slot.text ? [`--gradient-${slot.key}-clip`, `--gradient-${slot.key}-fill`] : [];
    if (gradient?.on) {
      block = setInBlock(block, `--gradient-${slot.key}`, gradient.raw ?? gradientCss(gradient));
      if (slot.text) {
        block = setInBlock(block, extras[0], "text");
        block = setInBlock(block, extras[1], "transparent");
      }
    } else {
      for (const token of [`--gradient-${slot.key}`, ...extras]) block = removeFromBlock(block, token);
    }
  }

  return css.slice(0, range.open) + block + css.slice(range.close);
}
