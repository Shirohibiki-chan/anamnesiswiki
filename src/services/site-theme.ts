// What the running theme looks like, read for the published site (Phase 1.5).
//
// **Read off the document rather than off the theme file**, for the reason
// `resolveTokenColor` gives: what is on screen is decided by the engine, and a
// theme may write `color-mix()` or `oklch()` that only the engine can turn
// into a colour a stranger's browser will agree on. So this is the one place
// the publisher touches the document, and it is a service rather than a hook
// because `theme-service.ts` already is — the site needs the same read.
//
// **Fonts come along as files.** A page that names "Newsreader" and does not
// carry it reads in Times on every machine but hers, which is not the app's
// look at all. The faces are found in the stylesheets the app already loaded,
// so there is no second list to keep in step with `fonts-library.css`, and the
// bytes are fetched through the host's own door. **A font that will not read
// is skipped, never fatal** — the site is still hers without it, and the
// planner's notes say when none came along.
import { SITE_COLOR_TOKENS, SITE_TEXT_TOKENS } from "../constants/site-style";
import { hostFetch } from "./host-service";
import type { SiteFont, SiteTheme } from "./site-plan";
import { resolveTokenColor } from "./theme-service";

/** The first family in a `font-family` stack, unquoted. */
export function firstFamily(stack: string): string {
  const first = stack.split(",")[0]?.trim() ?? "";
  return first.replace(/^["']|["']$/g, "");
}

type FaceSource = { family: string; style: string; weight: string; url: string };

/**
 * Every `@font-face` the document has loaded whose family is one of `families`.
 *
 * A stylesheet from another origin refuses to list its rules, and one of
 * ours never is — but the read is guarded anyway, because a theme she wrote
 * could `@import` anything.
 */
export function fontFacesFor(families: Set<string>, sheets: Iterable<CSSStyleSheet>): FaceSource[] {
  const found: FaceSource[] = [];
  const seen = new Set<string>();
  for (const sheet of sheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = firstFamily(rule.style.getPropertyValue("font-family"));
      if (!families.has(family)) continue;
      const src = rule.style.getPropertyValue("src");
      const match = src.match(/url\(\s*["']?([^"')]+)["']?\s*\)/);
      if (!match) continue;
      let url: string;
      try {
        url = new URL(match[1], sheet.href ?? document.baseURI).href;
      } catch {
        continue;
      }
      if (seen.has(url)) continue;
      seen.add(url);
      found.push({
        family,
        style: rule.style.getPropertyValue("font-style").trim() || "normal",
        weight: rule.style.getPropertyValue("font-weight").trim() || "400",
        url,
      });
    }
  }
  return found;
}

async function fetchFonts(faces: FaceSource[]): Promise<SiteFont[]> {
  const fonts: SiteFont[] = [];
  for (const face of faces) {
    try {
      const response = await hostFetch(face.url);
      if (!response.ok) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length === 0) continue;
      const fileName = decodeURIComponent(face.url.split("/").pop() ?? "") || `${face.family}-${face.weight}.woff2`;
      fonts.push({ family: face.family, style: face.style, weight: face.weight, fileName, bytes });
    } catch {
      // Skipped; see the file comment.
    }
  }
  return fonts;
}

/** The theme as it is on screen right now: its colours, and its typefaces as files. */
export async function readSiteTheme(): Promise<SiteTheme> {
  const tokens: Record<string, string> = {};
  for (const token of SITE_COLOR_TOKENS) tokens[token] = resolveTokenColor(token);

  const declared = getComputedStyle(document.documentElement);
  for (const token of SITE_TEXT_TOKENS) tokens[token] = declared.getPropertyValue(token).trim();

  // The mono stack is system fonts and carries nothing; the other three are
  // the app's own faces and are what the site has to bring.
  const families = new Set(["--font-ui", "--font-display", "--font-prose"].map((token) => firstFamily(tokens[token] ?? "")).filter(Boolean));
  const fonts = await fetchFonts(fontFacesFor(families, Array.from(document.styleSheets)));

  return { tokens, fonts };
}
