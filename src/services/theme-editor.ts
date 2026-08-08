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
import { COLOR_TOKENS, GRADIENT_SLOTS, type GradientSlot } from "../constants/theme-tokens";

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

  return null;
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
export function serializeTheme(name: string, themeId: string, draft: ThemeDraft, today: string): string {
  const lines: string[] = [];
  lines.push(`/* Anamnesis theme — "${name}"`);
  lines.push(`   Made in Settings → Colours on ${today}.`);
  lines.push("");
  lines.push("   Plain CSS, so you can edit it here as well as in the app —");
  lines.push("   the pickers read this file back. Change a colour by hand and");
  lines.push("   press \"Check for new ones\" in Settings to see it. */");
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
