// Turning a theme choice into what the window actually looks like: parsing and
// vetting stylesheets the user wrote, and pushing the result at the document.
//
// Nothing here touches disk — reading the themes folder is filesystem-service's
// job (`readCssDir`). This file decides what a stylesheet is *allowed to be*,
// which is a separate question and the more interesting one.
import { FONT_LIBRARY, type FontCategory } from "../constants/font-library";
import {
  CONTENT_SCALE_MAX,
  CONTENT_SCALE_MIN,
  DEFAULT_CONTENT_SCALE,
  DEFAULT_TEXT_SCALE,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  type FontSlotKey,
} from "../constants/themes";

/* --- Vetting -------------------------------------------------------------- */

/**
 * A stylesheet can make network requests. `@import url(https://…)`,
 * `background: url(https://…)`, `@font-face { src: url(https://…) }` — all of
 * them are a fetch the moment the rule matches something, and the app ships
 * with no CSP to stop them.
 *
 * That is the Policy Boundary, not a hypothetical: a theme someone downloads
 * and drops in the folder would quietly tell a server every time she opened
 * her wiki, and she'd have no way to know. So remote references are stripped
 * before the CSS is ever injected, and the user is told which ones and by
 * name — silently changing what her file does would be its own kind of wrong.
 *
 * What survives:
 *   data:  — the bytes are in the file, so there's nothing to fetch
 *   /…     — the app's own bundle, which is where the 98 fonts live
 *
 * Everything else goes, including `file://` and bare relative paths: both
 * resolve against the webview's own origin rather than the theme file's
 * folder, so neither does what whoever wrote it expected anyway.
 *
 * This is a scanner, not a CSS parser — a `url(` inside a string literal would
 * be treated as a real one. That trade is deliberate: the failure mode of
 * being too eager is a theme that loses a background image, and the failure
 * mode of being too clever is a request that gets through.
 */
export function sanitizeCustomCss(css: string): { css: string; blocked: string[] } {
  const blocked: string[] = [];
  const note = (what: string) => {
    if (!blocked.includes(what)) blocked.push(what);
  };

  // `@import` goes entirely rather than having its url rewritten. An import is
  // a whole stylesheet arriving from somewhere we didn't look at, and there's
  // no local case for one: a theme is a single file by design.
  let out = css.replace(/@import[^;}]*;?/gi, (match) => {
    note(match.trim().slice(0, 80));
    return "";
  });

  out = out.replace(/url\(\s*(["']?)([^)"']*)\1\s*\)/gi, (match, _quote: string, target: string) => {
    const value = target.trim();
    const local = value.startsWith("data:") || (value.startsWith("/") && !value.startsWith("//"));
    if (local) return match;
    note(value.slice(0, 80) || "(empty url)");
    // `none` rather than deletion so the declaration stays syntactically whole
    // and the browser drops just that one property instead of the whole rule.
    return "none";
  });

  return { css: out, blocked };
}

/**
 * The theme id a stylesheet declares, from the first `[data-theme="…"]` in it.
 *
 * This is what makes a sandbox export work unedited: the sandbox writes
 * `[data-theme="my-theme"] { … }`, so selecting that file has to put
 * `my-theme` on the document or none of its rules match. A file without one
 * still works — see `themeIdForFile` — it just styles whatever it styles.
 */
export function readThemeId(css: string): string | null {
  return /\[data-theme\s*=\s*["']?([^"'\]]+)["']?\]/.exec(css)?.[1]?.trim() || null;
}

/** `"Sea Glass.css"` → `"sea-glass"`. The fallback when a file declares none. */
export function themeIdForFile(fileName: string): string {
  return (
    fileName
      .replace(/\.css$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "custom"
  );
}

/** `"sea-glass.css"` → `"Sea glass"`. Only ever a display label. */
export function labelForFile(fileName: string): string {
  const stem = fileName.replace(/\.css$/i, "").replace(/[-_]+/g, " ").trim();
  if (!stem) return fileName;
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

export type ThemeSwatch = { bg: string; panel: string; accent: string };

/**
 * Three colours out of a theme file, for the dot strip beside its name in the
 * picker. Built-in themes don't need this — a swatch element carrying their
 * `data-theme` inherits the real tokens — but a custom theme's stylesheet
 * isn't in the document until it's selected, so its colours have to be read
 * out of the text.
 *
 * Null unless all three are found, since two dots and a hole looks like a bug
 * rather than like a theme that didn't say.
 */
export function readSwatch(css: string): ThemeSwatch | null {
  const read = (token: string) => new RegExp(`${token}\\s*:\\s*([^;}]+)`).exec(css)?.[1]?.trim();
  const bg = read("--color-bg");
  const panel = read("--color-panel");
  const accent = read("--color-accent-light");
  return bg && panel && accent ? { bg, panel, accent } : null;
}

/* --- Font stacks ---------------------------------------------------------- */

// What to fall back to if a family somehow isn't there. Per category, because
// a missing display face landing on Times is a different kind of wrong from a
// missing mono face landing on it.
const CATEGORY_FALLBACK: Record<FontCategory, string> = {
  serif: "serif",
  display: "serif",
  sans: "sans-serif",
  hand: "cursive",
  mono: "monospace",
};

/** `"Domine"` → `'"Domine", serif'`. Null for a family we don't bundle. */
export function fontStackFor(family: string): string | null {
  const entry = FONT_LIBRARY.find((f) => f.family === family);
  if (!entry) return null;
  return `"${family}", ${CATEGORY_FALLBACK[entry.cat]}`;
}

/* --- Applying ------------------------------------------------------------- */

const THEME_STYLE_ID = "anamnesis-custom-theme";
const SNIPPET_STYLE_ID = "anamnesis-snippets";

/**
 * Both style elements are created on demand and then left alone, in this
 * order, at the end of `<head>`: a custom theme has to outrank the bundled
 * stylesheet, and a snippet has to outrank the theme it's adjusting. That
 * ordering is the entire mechanism — neither file needs `!important`, and one
 * that uses it anyway still works.
 */
function styleElement(id: string): HTMLStyleElement {
  const existing = document.getElementById(id);
  if (existing instanceof HTMLStyleElement) return existing;

  const element = document.createElement("style");
  element.id = id;
  document.head.append(element);
  return element;
}

/** Which built-in or custom theme's rules apply. */
export function applyThemeId(id: string): void {
  document.documentElement.dataset.theme = id;
}

/**
 * The selected custom theme's stylesheet, already vetted, or `""` for a
 * built-in. Set via `textContent`, which takes the string as text and never as
 * markup — a `</style>` inside a theme file closes nothing.
 */
export function applyCustomThemeCss(css: string): void {
  styleElement(THEME_STYLE_ID).textContent = css;
}

/** Every enabled snippet, concatenated. Same vetting, same injection. */
export function applySnippetCss(css: string): void {
  // Touching this creates the element if the theme one hasn't yet, which would
  // put snippets *before* the theme. Ask for the theme element first so the
  // order above holds however these two are called.
  styleElement(THEME_STYLE_ID);
  styleElement(SNIPPET_STYLE_ID).textContent = css;
}

/**
 * Her font choices, as inline properties on the root element — so they beat
 * both the base tokens and any theme's, which is right: a font she picked in
 * Settings shouldn't be undone by switching theme. An unset slot is removed
 * rather than blanked, so the theme's own choice comes back.
 */
export function applyFonts(fonts: Partial<Record<FontSlotKey, string>>, slots: readonly { key: FontSlotKey; token: string }[]): void {
  for (const slot of slots) {
    const family = fonts[slot.key];
    const stack = family ? fontStackFor(family) : null;
    if (stack) {
      document.documentElement.style.setProperty(slot.token, stack);
    } else {
      document.documentElement.style.removeProperty(slot.token);
    }
  }
}

/**
 * Keeps `--boot-bg` in step with whatever the current theme's background is.
 *
 * `index.html` paints `html, body` from that variable, inline and unlayered, so
 * it outranks the themed `body` rule in `@layer base` — deliberately, because
 * it's also the only style that exists during the first paint and it can't
 * reference a token from a stylesheet that hasn't arrived. The consequence is
 * that body's background is *only* ever this variable, so it has to be updated
 * whenever the theme changes or body keeps the last theme's colour under an
 * app that has moved on.
 *
 * Read from the document rather than from the theme definition, so it's right
 * for a custom theme file we know nothing about.
 */
export function applyBootBackground(): string {
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim();
  if (bg) document.documentElement.style.setProperty("--boot-bg", bg);
  return bg;
}

/** Clamped here rather than trusted, since it round-trips through a settings file. */
export function applyTextScale(scale: number): void {
  const safe = Number.isFinite(scale) ? Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, scale)) : DEFAULT_TEXT_SCALE;
  document.documentElement.style.setProperty("--fs-scale", String(safe));
}

/** The page body's own multiplier. Wider floor than the UI's — see constants/themes.ts. */
export function applyContentScale(scale: number): void {
  const safe = Number.isFinite(scale) ? Math.min(CONTENT_SCALE_MAX, Math.max(CONTENT_SCALE_MIN, scale)) : DEFAULT_CONTENT_SCALE;
  document.documentElement.style.setProperty("--fs-scale-content", String(safe));
}

/* --- Surviving the launch ------------------------------------------------- */

/**
 * The appearance settings live in the Tauri store with everything else, and
 * reading that store is a round trip into Rust — which resolves a few frames
 * after the window already has pixels in it. For every other setting that's
 * invisible. For this one it's the app opening dark and turning light in front
 * of her, every single launch.
 *
 * So the applied result is *also* mirrored into localStorage, which the
 * webview can read synchronously before the first paint. The Tauri store stays
 * the one that's true; this is a photograph of it, and if the two ever
 * disagree the store wins on the next tick and overwrites this.
 *
 * Nothing else may read this key. It is a paint cache, not a settings file.
 */
const PAINT_CACHE_KEY = "anamnesis-appearance-paint-cache";

export type AppearanceSnapshot = {
  themeId: string;
  /** Null for a built-in. Here so a failed settings read can restore the choice, not just the pixels. */
  themeFile: string | null;
  themeCss: string;
  snippetCss: string;
  enabledSnippets: string[];
  fonts: Partial<Record<FontSlotKey, string>>;
  textScale: number;
  contentScale: number;
  /**
   * The theme's background colour, resolved. Stored rather than recomputed on
   * replay because replay happens before the stylesheets have loaded — reading
   * `--color-bg` at that moment gets nothing, which is the one case this whole
   * cache exists to cover.
   */
  bootBg: string;
};

export function cacheAppearance(snapshot: AppearanceSnapshot): void {
  try {
    localStorage.setItem(PAINT_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota, private mode, a webview with storage disabled. The only thing
    // lost is the head start; the store still applies a moment later.
  }
}

/**
 * Deliberately forgiving: this parses whatever is in localStorage, which is a
 * file on disk that a previous version of the app wrote. Anything unexpected
 * reads as "no cache", never as a launch that fails.
 */
export function readCachedAppearance(): Partial<AppearanceSnapshot> | null {
  try {
    const raw = localStorage.getItem(PAINT_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<AppearanceSnapshot>;
    return cached && typeof cached === "object" ? cached : null;
  } catch {
    return null;
  }
}

/**
 * Applies the cached snapshot, if there is one. Call this as early as the
 * renderer runs — before React, before anything is on screen.
 */
export function applyCachedAppearance(slots: readonly { key: FontSlotKey; token: string }[]): void {
  const cached = readCachedAppearance();
  if (!cached) return;

  // First, before anything else: this is the one that stops the window
  // flashing the previous theme's background.
  if (typeof cached.bootBg === "string" && cached.bootBg) {
    document.documentElement.style.setProperty("--boot-bg", cached.bootBg);
  }
  if (typeof cached.themeId === "string") applyThemeId(cached.themeId);
  if (typeof cached.themeCss === "string") applyCustomThemeCss(cached.themeCss);
  if (typeof cached.snippetCss === "string") applySnippetCss(cached.snippetCss);
  if (cached.fonts && typeof cached.fonts === "object") applyFonts(cached.fonts, slots);
  if (typeof cached.textScale === "number") applyTextScale(cached.textScale);
  if (typeof cached.contentScale === "number") applyContentScale(cached.contentScale);
}

/**
 * What the four font tokens resolve to *without* her overrides — i.e. what the
 * theme itself asks for.
 *
 * Read off the document rather than parsed out of the theme, because the theme
 * might be one of the built-ins (whose CSS we never hold as text) or a file
 * that inherits three of the four from the base tokens. The overrides are
 * inline properties on the root element, so they're cleared, the resolved
 * values read, and then the caller puts them back — which is why this is only
 * ever called from the store's single `apply()`, in the one place that is
 * about to reapply them anyway.
 */
export function readThemeFonts(slots: readonly { key: FontSlotKey; token: string }[]): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const slot of slots) {
    const stack = style.getPropertyValue(slot.token).trim();
    if (stack) out[slot.key] = stack;
  }
  return out;
}

/**
 * CSS's own family keywords. Not fonts — instructions to the browser to go and
 * find one. `--font-mono` deliberately starts with `ui-monospace` so each OS
 * contributes its own good mono, which is the right stack and a useless name:
 * telling someone their code font is "ui-monospace" answers nothing.
 */
const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
]);

/**
 * `'"Quicksand", sans-serif'` → `"Quicksand"`. The first *named* face in a
 * stack, unquoted, for saying out loud what something is actually set in.
 *
 * Null when the stack names none — see above. The caller says what it wants to
 * about that; what it mustn't do is print the keyword.
 */
export function familyFromStack(stack: string): string | null {
  const first = stack.split(",")[0]?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!first || GENERIC_FAMILIES.has(first.toLowerCase())) return null;
  return first;
}
