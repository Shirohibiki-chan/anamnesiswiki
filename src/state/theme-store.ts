// How the app looks, and everything that goes into deciding it. A store rather
// than component state because the settings screen is not the only reader: the
// theme has to be applied at launch, long before anyone opens Settings, and it
// has to survive that screen being closed.
import { create } from "zustand";
import { SNIPPETS_DIR, THEMES_DIR } from "../constants/paths";
import {
  BUILT_IN_THEMES,
  DEFAULT_TEXT_SCALE,
  DEFAULT_THEME_ID,
  FONT_SLOTS,
  type FontSlotKey,
} from "../constants/themes";
import * as appSettings from "../services/app-settings-service";
import { ensureCssDir, readCssDir } from "../services/filesystem-service";
import { showFolder } from "../services/dialog-service";
import {
  applyBootBackground,
  applyCustomThemeCss,
  applyFonts,
  applySnippetCss,
  applyTextScale,
  applyThemeId,
  cacheAppearance,
  labelForFile,
  readCachedAppearance,
  readSwatch,
  readThemeId,
  sanitizeCustomCss,
  themeIdForFile,
  type ThemeSwatch,
} from "../services/theme-service";

/** A `.css` file found in the themes or snippets folder, vetted and ready. */
export type CustomStylesheet = {
  /** Filename with extension. The identity — the settings file stores this. */
  file: string;
  label: string;
  /** The id its rules are written against, for `data-theme`. */
  themeId: string;
  css: string;
  /** Remote references that were stripped, for telling the user about. */
  blocked: string[];
  /** Three colours for the picker, or null if the file didn't set them. */
  swatch: ThemeSwatch | null;
};

export type ThemeStoreState = {
  themeId: string;
  /** Filename when the current theme is one of hers; null for a built-in. */
  themeFile: string | null;
  fonts: Partial<Record<FontSlotKey, string>>;
  textScale: number;
  enabledSnippets: string[];

  customThemes: CustomStylesheet[];
  snippets: CustomStylesheet[];
  /** Absolute paths, for the two "open folder" buttons. Empty until scanned. */
  themesDir: string;
  snippetsDir: string;
  isScanning: boolean;
  /**
   * Set when handing a folder to the OS file manager didn't work, so the
   * button can say so and show the path instead of doing nothing at all. One
   * field for both buttons — only one can be pressed at a time — with the
   * folder named so the message appears under the button that was pressed.
   */
  folderError: { folder: "themes" | "snippets"; path: string } | null;

  loadAppearance: () => Promise<void>;
  scanFolders: () => Promise<void>;
  selectTheme: (themeId: string, themeFile: string | null) => Promise<void>;
  setFont: (slot: FontSlotKey, family: string | null) => Promise<void>;
  setTextScale: (scale: number) => Promise<void>;
  toggleSnippet: (file: string) => Promise<void>;
  resetAppearance: () => Promise<void>;
  openThemesFolder: () => Promise<void>;
  openSnippetsFolder: () => Promise<void>;
};

function toStylesheet(file: { name: string; css: string }): CustomStylesheet {
  const { css, blocked } = sanitizeCustomCss(file.css);
  return {
    file: file.name,
    label: labelForFile(file.name),
    // A file that declares its own id wins — that's what a sandbox export
    // does, and its rules only match if we use the id it wrote. Falling back
    // to the filename means a file with no `[data-theme]` block still selects
    // cleanly instead of leaving the document on the previous theme's id.
    themeId: readThemeId(css) ?? themeIdForFile(file.name),
    css,
    blocked,
    swatch: readSwatch(css),
  };
}

const isBuiltIn = (id: string) => BUILT_IN_THEMES.some((theme) => theme.id === id);

export const useThemeStore = create<ThemeStoreState>((set, get) => {
  /**
   * Pushes the whole current state at the document in one go, and photographs
   * it for the next launch. Every action ends here rather than applying its
   * own one change — the snapshot the paint cache needs is the *combination*,
   * so assembling it once is both simpler and the only correct order.
   */
  function apply(): void {
    const state = get();
    const theme = state.themeFile ? state.customThemes.find((t) => t.file === state.themeFile) : null;
    const themeCss = theme?.css ?? "";
    const snippetCss = state.snippets
      .filter((snippet) => state.enabledSnippets.includes(snippet.file))
      .map((snippet) => `/* ${snippet.file} */\n${snippet.css}`)
      .join("\n\n");

    applyThemeId(state.themeId);
    applyCustomThemeCss(themeCss);
    applySnippetCss(snippetCss);
    applyFonts(state.fonts, FONT_SLOTS);
    applyTextScale(state.textScale);
    // After the theme is on the document, not before — it reads the resolved
    // background back out, which is only right once the rules above have landed.
    const bootBg = applyBootBackground();
    cacheAppearance({
      themeId: state.themeId,
      themeFile: state.themeFile,
      themeCss,
      snippetCss,
      enabledSnippets: state.enabledSnippets,
      fonts: state.fonts,
      textScale: state.textScale,
      bootBg,
    });
  }

  async function persist(): Promise<void> {
    const state = get();
    // Same reasoning as loadAppearance's catch: under `pnpm dev` there's no
    // settings store to write to, and a settings screen that throws every time
    // you touch a control would make the fast-iteration mode useless. The
    // change is already applied and cached either way.
    await appSettings
      .setAppearance({
        themeId: state.themeId,
        themeFile: state.themeFile,
        fonts: state.fonts as Record<string, string>,
        textScale: state.textScale,
        enabledSnippets: state.enabledSnippets,
      })
      .catch(() => {});
  }

  return {
    themeId: DEFAULT_THEME_ID,
    themeFile: null,
    fonts: {},
    textScale: DEFAULT_TEXT_SCALE,
    enabledSnippets: [],
    customThemes: [],
    snippets: [],
    themesDir: "",
    snippetsDir: "",
    isScanning: false,
    folderError: null,

    async loadAppearance() {
      // Three outcomes, and they are not the same thing:
      //
      //   settings read, has a saved appearance  → use it (the normal path)
      //   settings read, nothing saved yet       → defaults
      //   settings *couldn't be read*            → keep what the paint cache
      //                                            already put on screen
      //
      // That last one matters. main.tsx has already applied the last known
      // appearance synchronously, so overwriting it with defaults because a
      // read failed would make a corrupt settings file — or `pnpm dev`'s
      // browser-only mode, where there's no Tauri store at all — look like the
      // theme being silently reset, and then persist that reset into the cache.
      // Falling back to the last thing that worked is both less alarming and
      // more likely to be what she wants.
      const fromCache = (): Partial<appSettings.AppearanceSettings> => {
        const cached = readCachedAppearance();
        if (!cached) return {};
        return {
          themeId: cached.themeId,
          themeFile: cached.themeFile ?? null,
          fonts: cached.fonts as Record<string, string> | undefined,
          textScale: cached.textScale,
          enabledSnippets: cached.enabledSnippets,
        };
      };
      const saved = await appSettings.getAppearance().catch(fromCache);

      // Everything below is defended rather than trusted. This is a JSON file
      // that a previous version of the app wrote and the user can edit, and a
      // bad value here is the whole window — a themeId of `null` would clear
      // the attribute and a textScale of `"big"` would produce `calc(11px *
      // big)`, which drops every font size in the app.
      const fonts: Partial<Record<FontSlotKey, string>> = {};
      for (const slot of FONT_SLOTS) {
        const family = saved.fonts?.[slot.key];
        if (typeof family === "string" && family) fonts[slot.key] = family;
      }

      set({
        themeId: typeof saved.themeId === "string" && saved.themeId ? saved.themeId : DEFAULT_THEME_ID,
        themeFile: typeof saved.themeFile === "string" ? saved.themeFile : null,
        fonts,
        textScale: typeof saved.textScale === "number" ? saved.textScale : DEFAULT_TEXT_SCALE,
        enabledSnippets: Array.isArray(saved.enabledSnippets) ? saved.enabledSnippets.filter((f) => typeof f === "string") : [],
      });

      // Applied before the scan and again after it. The built-in half of the
      // choice is available now and the custom half needs a disk read, and
      // waiting for the second would mean sitting on the default theme for the
      // length of a directory listing on every launch.
      apply();
      await get().scanFolders();
    },

    async scanFolders() {
      set({ isScanning: true });
      try {
        const parent = await appSettings.getProjectsDir();
        // Created rather than merely looked for. An empty folder that exists
        // is an instruction — the "open folder" button lands somewhere, and
        // what to do next is obvious once you're standing in it.
        const themesDir = await ensureCssDir(parent, THEMES_DIR);
        const snippetsDir = await ensureCssDir(parent, SNIPPETS_DIR);
        const [themeFiles, snippetFiles] = await Promise.all([readCssDir(themesDir), readCssDir(snippetsDir)]);

        const customThemes = themeFiles.map(toStylesheet);
        const snippets = snippetFiles.map(toStylesheet);

        // A theme whose file has been deleted since it was chosen falls back
        // to the default rather than leaving the app on a `data-theme` nothing
        // defines, which renders as the base tokens plus whichever of her
        // fonts were inline — recognisably broken, and hard to explain.
        const state = get();
        const stillThere = state.themeFile && customThemes.some((theme) => theme.file === state.themeFile);
        const lost = state.themeFile && !stillThere;

        set({
          customThemes,
          snippets,
          themesDir,
          snippetsDir,
          isScanning: false,
          ...(lost ? { themeId: DEFAULT_THEME_ID, themeFile: null } : {}),
          // Snippets that have gone are dropped from the enabled list, but
          // only once they're confirmed missing by a completed scan.
          enabledSnippets: state.enabledSnippets.filter((file) => snippets.some((s) => s.file === file)),
        });
        apply();
        if (lost) await persist();
      } catch {
        // A projects folder that has moved or a drive that isn't mounted. The
        // built-in themes still work, so this is a smaller list, not a failure.
        set({ isScanning: false });
      }
    },

    async selectTheme(themeId, themeFile) {
      set({ themeId, themeFile: isBuiltIn(themeId) && !themeFile ? null : themeFile });
      apply();
      await persist();
    },

    async setFont(slot, family) {
      const fonts = { ...get().fonts };
      // Removed rather than set to a marker value, so "back to the theme's
      // own choice" and "never touched" are the same state.
      if (family) fonts[slot] = family;
      else delete fonts[slot];
      set({ fonts });
      apply();
      await persist();
    },

    async setTextScale(scale) {
      set({ textScale: scale });
      apply();
      await persist();
    },

    async toggleSnippet(file) {
      const enabled = get().enabledSnippets;
      set({ enabledSnippets: enabled.includes(file) ? enabled.filter((f) => f !== file) : [...enabled, file] });
      apply();
      await persist();
    },

    async resetAppearance() {
      set({ themeId: DEFAULT_THEME_ID, themeFile: null, fonts: {}, textScale: DEFAULT_TEXT_SCALE, enabledSnippets: [] });
      apply();
      await persist();
    },

    // Both of these used to be a bare `await showFolder(dir)`, and when the
    // call was refused the rejection went nowhere: the button did nothing,
    // every time, with no way to tell that from a slow file manager. Now the
    // failure names the folder, which is also the thing she needed from the
    // button in the first place.
    async openThemesFolder() {
      const { themesDir } = get();
      if (!themesDir) return;
      set({ folderError: null });
      await showFolder(themesDir).catch(() => set({ folderError: { folder: "themes", path: themesDir } }));
    },

    async openSnippetsFolder() {
      const { snippetsDir } = get();
      if (!snippetsDir) return;
      set({ folderError: null });
      await showFolder(snippetsDir).catch(() => set({ folderError: { folder: "snippets", path: snippetsDir } }));
    },
  };
});
