// The only import path components have into the theme store and
// theme-service. See CLAUDE.md's layer order.
import { useEffect } from "react";
import { FONT_LIBRARY, type FontCategory, type LibraryFont } from "../constants/font-library";
import { BUILT_IN_THEMES, FONT_SLOTS, type FontSlot, type FontSlotKey } from "../constants/themes";
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

const CATEGORY_LABEL: Record<FontCategory, { label: string; hint: string }> = {
  serif: { label: "Serif", hint: "for reading" },
  sans: { label: "Sans-serif", hint: "for menus and body text" },
  display: { label: "Display", hint: "for titles" },
  hand: { label: "Handwriting", hint: "for a journal page" },
  mono: { label: "Monospace", hint: "for code and keys" },
};

const ALL_CATEGORIES: readonly FontCategory[] = ["serif", "sans", "display", "hand", "mono"];

/**
 * The families a slot offers, grouped, in the order its picker shows them.
 *
 * **Every slot offers every family.** It used to offer only the categories in
 * `slot.cats` — so Monospace was reachable from the Code slot and nowhere
 * else, and Handwriting was hidden from Interface on the grounds that a menu
 * set in Gloria Hallelujah is unreadable. That is true and it was still the
 * wrong call: it is the app deciding what she is allowed to want, on a screen
 * whose entire purpose is her deciding what she wants. Wanting a monospace
 * interface is a real taste, and a mistake made here is undone by picking
 * again.
 *
 * `slot.cats` survives as the *order*, which is the half of it that was
 * actually useful: Interface still opens on Sans-serif, Code still opens on
 * Monospace. Everything else follows underneath.
 */
export function fontChoicesFor(slot: FontSlot): { cat: FontCategory; label: string; hint: string; fonts: LibraryFont[] }[] {
  const order = [...slot.cats, ...ALL_CATEGORIES.filter((cat) => !slot.cats.includes(cat))];
  return order
    .map((cat) => ({
      cat,
      ...CATEGORY_LABEL[cat],
      fonts: FONT_LIBRARY.filter((font) => font.cat === cat).sort((a, b) => a.family.localeCompare(b.family)),
    }))
    .filter((group) => group.fonts.length > 0);
}

export function useTheme() {
  const themeId = useThemeStore((state) => state.themeId);
  const themeFile = useThemeStore((state) => state.themeFile);
  const fonts = useThemeStore((state) => state.fonts);
  const fontsEveryTheme = useThemeStore((state) => state.fontsEveryTheme);
  const themeFonts = useThemeStore((state) => state.themeFonts);
  const textScale = useThemeStore((state) => state.textScale);
  const contentScale = useThemeStore((state) => state.contentScale);
  const mutedCovers = useThemeStore((state) => state.mutedCovers);
  const enabledSnippets = useThemeStore((state) => state.enabledSnippets);
  const customThemes = useThemeStore((state) => state.customThemes);
  const snippets = useThemeStore((state) => state.snippets);
  const draft = useThemeStore((state) => state.draft);
  const themesDir = useThemeStore((state) => state.themesDir);
  const isScanning = useThemeStore((state) => state.isScanning);
  const folderError = useThemeStore((state) => state.folderError);
  const deleteError = useThemeStore((state) => state.deleteError);
  const importError = useThemeStore((state) => state.importError);
  const backupFolder = useThemeStore((state) => state.backupFolder);
  const backupFailed = useThemeStore((state) => state.backupFailed);

  const selectTheme = useThemeStore((state) => state.selectTheme);
  const setFont = useThemeStore((state) => state.setFont);
  const setFontsEveryTheme = useThemeStore((state) => state.setFontsEveryTheme);
  const setTextScale = useThemeStore((state) => state.setTextScale);
  const setContentScale = useThemeStore((state) => state.setContentScale);
  const setMutedCovers = useThemeStore((state) => state.setMutedCovers);
  const toggleSnippet = useThemeStore((state) => state.toggleSnippet);
  const scanFolders = useThemeStore((state) => state.scanFolders);
  const resetAppearance = useThemeStore((state) => state.resetAppearance);
  const openThemesFolder = useThemeStore((state) => state.openThemesFolder);
  const openSnippetsFolder = useThemeStore((state) => state.openSnippetsFolder);
  const createTheme = useThemeStore((state) => state.createTheme);
  const importTheme = useThemeStore((state) => state.importTheme);
  const deleteTheme = useThemeStore((state) => state.deleteTheme);
  const setThemeColor = useThemeStore((state) => state.setThemeColor);
  const matchBackgroundsToPanel = useThemeStore((state) => state.matchBackgroundsToPanel);
  const toggleGradient = useThemeStore((state) => state.toggleGradient);
  const setGradient = useThemeStore((state) => state.setGradient);

  // What the theme in force is called — built-in or one of hers. Three panels
  // want it now (the copy button suggests a name from it, and both font modes
  // say which theme they're about to change), so it's worked out once here
  // rather than three times against two different lists.
  const themeLabel =
    (themeFile ? customThemes.find((theme) => theme.file === themeFile)?.label : BUILT_IN_THEMES.find((t) => t.id === themeId)?.label) ??
    "Theme";

  return {
    themeId,
    themeFile,
    themeLabel,
    fonts,
    fontsEveryTheme,
    /**
     * Whether a face picked right now would have a file to be written into.
     * False on a built-in, which is the same thing that makes the Colours
     * panel offer a copy instead of pickers — deliberately the same condition,
     * since that's the whole point of the two panels finally agreeing.
     */
    canEditThemeFonts: draft !== null,
    textScale,
    contentScale,
    mutedCovers,
    enabledSnippets,
    customThemes,
    snippets,
    draft,
    themesDir,
    isScanning,
    folderError,
    deleteError,
    importError,
    backupFolder,
    backupFailed,
    slots: FONT_SLOTS,
    /**
     * The stack a slot is actually rendering in, for previewing the face in
     * place. Her everywhere-set only counts when it's switched on — it stays
     * saved while it's off, and a specimen showing a font that isn't on the
     * page would be the panel lying about the thing it exists to show.
     */
    stackFor: (slot: FontSlotKey) =>
      (fontsEveryTheme && fonts[slot] ? fontStackFor(fonts[slot]) : null) ?? themeFonts[slot] ?? null,
    /**
     * The face the selected theme's file names in a slot, or null if it names
     * none. Read from the draft — the file — rather than off the document,
     * because "this theme asks for nothing here" is exactly what the empty
     * option means and the document can't say it: something always resolves.
     */
    declaredFontFor: (slot: FontSlot) => {
      const stack = draft?.fonts[slot.token];
      return stack ? familyFromStack(stack) : null;
    },
    /**
     * What a slot falls back to with nothing declared for it — the app's own
     * face, for naming the empty option. Only knowable while the theme really
     * does declare nothing; once it declares one, that *is* what resolves.
     * Null also covers a slot handed to the OS on purpose, which `--font-mono`
     * does, so "your system's own" can be said instead of "ui-monospace".
     */
    fallbackFontFor: (slot: FontSlot) =>
      draft?.fonts[slot.token] ? null : themeFonts[slot.key] ? familyFromStack(themeFonts[slot.key]) : null,
    /**
     * What the theme itself asks for in a slot, for labelling the "leave it
     * alone" option in everywhere-mode. `family` is null when the theme names
     * no face and hands the choice to the OS — `--font-mono` does that on
     * purpose — so the two cases can be worded differently instead of printing
     * "ui-monospace".
     */
    themeFontFor: (slot: FontSlotKey) => ({
      stack: themeFonts[slot] ?? null,
      family: themeFonts[slot] ? familyFromStack(themeFonts[slot]) : null,
    }),
    selectTheme,
    setFont,
    setFontsEveryTheme,
    setTextScale,
    setContentScale,
    setMutedCovers,
    toggleSnippet,
    scanFolders,
    resetAppearance,
    openThemesFolder,
    openSnippetsFolder,
    createTheme,
    importTheme,
    deleteTheme,
    setThemeColor,
    matchBackgroundsToPanel,
    toggleGradient,
    setGradient,
  };
}
