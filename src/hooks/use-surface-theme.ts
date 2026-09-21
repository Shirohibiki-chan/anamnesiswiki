// Which of two looks — light or dark — the app's current theme wants, read
// off a surface. Lifted out of use-board-view.ts for Phase 31, where the
// players need the same answer: Spotify has a dark look and an artwork-
// coloured one, and SoundCloud's player takes the page's accent.
import { useEffect, useState } from "react";

/**
 * The app's themes carry no light/dark flag — a theme is a set of tokens and
 * nothing more — so the answer is read off the surface's background: a dark
 * surface gets the dark look. Measured when the caller mounts and again
 * whenever the theme moves — see `useSurfaceTheme`.
 */
export function surfaceThemeFor(element: Element | null): "light" | "dark" {
  if (!element) return "dark";
  const color = getComputedStyle(element).backgroundColor;
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!match) return "dark";
  const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5 ? "light" : "dark";
}

/**
 * The page's accent as `#rrggbb`, read off the surface's computed colour.
 *
 * Read as a colour rather than as the token's text because a theme may write
 * the token as `rgb()`, a name, or another `var()`; setting `color` to it and
 * asking the browser back is what resolves all of those to one form.
 */
export function surfaceAccentFor(element: Element | null): string {
  if (!element) return "#6b7280";
  const probe = document.createElement("span");
  // The bold accent, not `--color-accent`, which is the 15% tint the menus
  // use for a hovered row — see the note on it in index.css.
  probe.style.color = "var(--color-accent-light)";
  element.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!match) return "#6b7280";
  const hex = (n: string) => Number(n).toString(16).padStart(2, "0");
  return `#${hex(match[1])}${hex(match[2])}${hex(match[3])}`;
}

/**
 * Watches for the theme moving. A theme is applied by three things and
 * nothing else — `data-theme` on the root, tokens set in the root's own
 * `style` (the theme editor, the font scale), and the `<style>` elements in
 * the head that a custom theme or a snippet writes into — so those are what
 * is watched, and `measure` runs again on any of them. Measuring is a
 * computed style, which is cheap enough to do on every change without
 * guessing which ones matter.
 */
export function watchTheme(measure: () => void): () => void {
  const observer = new MutationObserver(measure);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style", "class"] });
  observer.observe(document.head, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}

/** The look a surface is drawn in, following the theme while it is on screen. */
export function useSurfaceTheme(surface: Element | null): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">(() => surfaceThemeFor(surface));
  useEffect(() => {
    const measure = () => setTheme(surfaceThemeFor(surface));
    measure();
    if (!surface) return;
    return watchTheme(measure);
  }, [surface]);
  return theme;
}

/** The theme and the accent together, for a player that takes both. */
export function useSurfaceLook(surface: Element | null): { theme: "light" | "dark"; accent: string } {
  const [look, setLook] = useState(() => ({ theme: surfaceThemeFor(surface), accent: surfaceAccentFor(surface) }));
  useEffect(() => {
    const measure = () => {
      const next = { theme: surfaceThemeFor(surface), accent: surfaceAccentFor(surface) };
      setLook((current) => (current.theme === next.theme && current.accent === next.accent ? current : next));
    };
    measure();
    if (!surface) return;
    return watchTheme(measure);
  }, [surface]);
  return look;
}
