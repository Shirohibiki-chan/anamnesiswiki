// The only import path components have into the theme store and
// theme-service. See CLAUDE.md's layer order.
import { useEffect } from "react";
import { FONT_LIBRARY, type LibraryFont } from "../constants/font-library";
import { FONT_SLOTS, type FontSlot, type FontSlotKey } from "../constants/themes";
import { useThemeStore } from "../state/theme-store";
import { familyFromStack, fontStackFor } from "../services/theme-service";

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
  const themeFonts = useThemeStore((state) => state.themeFonts);
  const textScale = useThemeStore((state) => state.textScale);
  const contentScale = useThemeStore((state) => state.contentScale);
  const enabledSnippets = useThemeStore((state) => state.enabledSnippets);
  const customThemes = useThemeStore((state) => state.customThemes);
  const snippets = useThemeStore((state) => state.snippets);
  const draft = useThemeStore((state) => state.draft);
  const themesDir = useThemeStore((state) => state.themesDir);
  const isScanning = useThemeStore((state) => state.isScanning);
  const folderError = useThemeStore((state) => state.folderError);
  const deleteError = useThemeStore((state) => state.deleteError);

  const selectTheme = useThemeStore((state) => state.selectTheme);
  const setFont = useThemeStore((state) => state.setFont);
  const setTextScale = useThemeStore((state) => state.setTextScale);
  const setContentScale = useThemeStore((state) => state.setContentScale);
  const toggleSnippet = useThemeStore((state) => state.toggleSnippet);
  const scanFolders = useThemeStore((state) => state.scanFolders);
  const resetAppearance = useThemeStore((state) => state.resetAppearance);
  const openThemesFolder = useThemeStore((state) => state.openThemesFolder);
  const openSnippetsFolder = useThemeStore((state) => state.openSnippetsFolder);
  const createTheme = useThemeStore((state) => state.createTheme);
  const deleteTheme = useThemeStore((state) => state.deleteTheme);
  const setThemeColor = useThemeStore((state) => state.setThemeColor);
  const toggleGradient = useThemeStore((state) => state.toggleGradient);
  const setGradient = useThemeStore((state) => state.setGradient);

  return {
    themeId,
    themeFile,
    fonts,
    textScale,
    contentScale,
    enabledSnippets,
    customThemes,
    snippets,
    draft,
    themesDir,
    isScanning,
    folderError,
    deleteError,
    slots: FONT_SLOTS,
    /**
     * The stack a slot is actually rendering in — hers if she picked one,
     * otherwise the theme's own. Used both to preview the face in place and to
     * name it, so "whatever the theme uses" can say which font that is.
     */
    stackFor: (slot: FontSlotKey) => (fonts[slot] ? fontStackFor(fonts[slot]) : null) ?? themeFonts[slot] ?? null,
    /**
     * What the theme itself asks for in a slot, for labelling the "leave it
     * alone" option. `family` is null when the theme names no face and hands
     * the choice to the OS — `--font-mono` does that on purpose — so the two
     * cases can be worded differently instead of printing "ui-monospace".
     */
    themeFontFor: (slot: FontSlotKey) => ({
      stack: themeFonts[slot] ?? null,
      family: themeFonts[slot] ? familyFromStack(themeFonts[slot]) : null,
    }),
    selectTheme,
    setFont,
    setTextScale,
    setContentScale,
    toggleSnippet,
    scanFolders,
    resetAppearance,
    openThemesFolder,
    openSnippetsFolder,
    createTheme,
    deleteTheme,
    setThemeColor,
    toggleGradient,
    setGradient,
  };
}
