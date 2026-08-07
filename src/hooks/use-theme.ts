// The only import path components have into the theme store and
// theme-service. See CLAUDE.md's layer order.
import { useEffect } from "react";
import { FONT_LIBRARY, type LibraryFont } from "../constants/font-library";
import { FONT_SLOTS, type FontSlot, type FontSlotKey } from "../constants/themes";
import { useThemeStore } from "../state/theme-store";
import { fontStackFor } from "../services/theme-service";

/**
 * Reads the saved appearance and applies it, once, at startup.
 *
 * Called from App rather than from the Settings screen, which is the whole
 * point — a theme has to be on before anything is drawn, and Settings is
 * usually never opened at all. There's a synchronous head start in main.tsx
 * (`applyCachedAppearance`) that covers the gap between first paint and this
 * resolving; this is the authoritative pass.
 */
export function useThemeBootstrap(): void {
  const loadAppearance = useThemeStore((state) => state.loadAppearance);
  useEffect(() => {
    void loadAppearance();
  }, [loadAppearance]);
}

/** The families a slot offers, grouped and ordered the way its picker shows them. */
export function fontChoicesFor(slot: FontSlot): { cat: string; label: string; fonts: LibraryFont[] }[] {
  const CATEGORY_LABEL: Record<string, string> = {
    serif: "Serif — for reading",
    sans: "Sans-serif",
    display: "Display — for titles",
    hand: "Handwriting",
    mono: "Monospace",
  };
  return slot.cats
    .map((cat) => ({
      cat,
      label: CATEGORY_LABEL[cat] ?? cat,
      fonts: FONT_LIBRARY.filter((font) => font.cat === cat).sort((a, b) => a.family.localeCompare(b.family)),
    }))
    .filter((group) => group.fonts.length > 0);
}

export function useTheme() {
  const themeId = useThemeStore((state) => state.themeId);
  const themeFile = useThemeStore((state) => state.themeFile);
  const fonts = useThemeStore((state) => state.fonts);
  const textScale = useThemeStore((state) => state.textScale);
  const enabledSnippets = useThemeStore((state) => state.enabledSnippets);
  const customThemes = useThemeStore((state) => state.customThemes);
  const snippets = useThemeStore((state) => state.snippets);
  const isScanning = useThemeStore((state) => state.isScanning);

  const selectTheme = useThemeStore((state) => state.selectTheme);
  const setFont = useThemeStore((state) => state.setFont);
  const setTextScale = useThemeStore((state) => state.setTextScale);
  const toggleSnippet = useThemeStore((state) => state.toggleSnippet);
  const scanFolders = useThemeStore((state) => state.scanFolders);
  const resetAppearance = useThemeStore((state) => state.resetAppearance);
  const openThemesFolder = useThemeStore((state) => state.openThemesFolder);
  const openSnippetsFolder = useThemeStore((state) => state.openSnippetsFolder);

  return {
    themeId,
    themeFile,
    fonts,
    textScale,
    enabledSnippets,
    customThemes,
    snippets,
    isScanning,
    slots: FONT_SLOTS,
    /** The CSS stack for a slot's current family, for previewing it in place. */
    stackFor: (slot: FontSlotKey) => (fonts[slot] ? fontStackFor(fonts[slot]) : null),
    selectTheme,
    setFont,
    setTextScale,
    toggleSnippet,
    scanFolders,
    resetAppearance,
    openThemesFolder,
    openSnippetsFolder,
  };
}
