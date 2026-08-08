// How the app looks, and everything that goes into deciding it. A store rather
// than component state because the settings screen is not the only reader: the
// theme has to be applied at launch, long before anyone opens Settings, and it
// has to survive that screen being closed.
import { create } from "zustand";
import { SNIPPETS_DIR, THEMES_DIR } from "../constants/paths";
import {
  BUILT_IN_THEMES,
  DEFAULT_CONTENT_SCALE,
  DEFAULT_TEXT_SCALE,
  DEFAULT_THEME_ID,
  FONT_SLOTS,
  type FontSlotKey,
} from "../constants/themes";
import * as appSettings from "../services/app-settings-service";
import {
  backupCssFile,
  deleteCssFile,
  ensureCssDir,
  readCssDir,
  sanitizeSegment,
  watchCssDirs,
  writeCssFile,
  type StopWatching,
} from "../services/filesystem-service";
import { showFolder } from "../services/dialog-service";
import type { GradientSlot } from "../constants/theme-tokens";
import {
  freeFileName,
  patchTheme,
  readThemeDraft,
  seedFromDocument,
  seedGradient,
  serializeTheme,
  type Gradient,
  type ThemeDraft,
} from "../services/theme-editor";
import {
  applyBootBackground,
  applyContentScale,
  applyCustomThemeCss,
  applyFonts,
  applySnippetCss,
  applyTextScale,
  applyThemeId,
  cacheAppearance,
  labelForFile,
  readCachedAppearance,
  readSwatch,
  readThemeFonts,
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
  /** What's applied to the document: the file with remote references stripped. */
  css: string;
  /**
   * The file exactly as it is on disk, vetting and all still in it.
   *
   * Kept alongside the vetted copy because this is what an edit is written
   * back to. Patching the vetted one and saving that would quietly bake the
   * vetting into her file — a `url(…)` the app declined to fetch would come
   * back as `none` in her own stylesheet, permanently, the first time she
   * touched a colour picker. What the app refuses to *load* and what it's
   * entitled to *change* are different questions.
   */
  raw: string;
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
  /**
   * What each font token resolves to with her overrides taken off — i.e. what
   * the current theme itself asks for. Derived, never saved: it's here so the
   * picker can say *which* font "whatever the theme uses" means, which it
   * couldn't before and which made the other themes' faces unnameable without
   * hunting through the list.
   */
  themeFonts: Record<string, string>;
  textScale: number;
  contentScale: number;
  enabledSnippets: string[];

  customThemes: CustomStylesheet[];
  snippets: CustomStylesheet[];
  /**
   * The selected custom theme's editable values, for the colour and gradient
   * pickers. Null whenever a built-in is selected — those aren't files, so
   * there's nothing to write and nothing to edit.
   *
   * Kept beside `customThemes` rather than derived per render because a colour
   * picker is a controlled input and reparsing the file on every drag frame is
   * both wasteful and lossy for a value mid-edit.
   */
  draft: ThemeDraft | null;
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
  /**
   * A delete that didn't happen — file locked, permissions, drive gone.
   * Separate from `folderError` because it carries a different apology and a
   * different next step, but it exists for the same reason: the "Open folder"
   * buttons used to swallow their rejection and do nothing, twice, with no way
   * to tell that from a slow file manager. A destructive button that silently
   * doesn't destroy is the same failure with higher stakes.
   */
  deleteError: { file: string; path: string } | null;
  /**
   * Where the copy of a theme file taken before this session's first edit went,
   * so the Colours panel can point at it rather than describe it.
   */
  backupFolder: string | null;
  /** Set when that copy couldn't be made, so the panel stops promising one. */
  backupFailed: boolean;

  loadAppearance: () => Promise<void>;
  scanFolders: () => Promise<void>;
  selectTheme: (themeId: string, themeFile: string | null) => Promise<void>;
  setFont: (slot: FontSlotKey, family: string | null) => Promise<void>;
  setTextScale: (scale: number) => Promise<void>;
  setContentScale: (scale: number) => Promise<void>;
  toggleSnippet: (file: string) => Promise<void>;
  resetAppearance: () => Promise<void>;
  openThemesFolder: () => Promise<void>;
  openSnippetsFolder: () => Promise<void>;

  /** Copies whatever theme is on into a new editable file, and selects it. */
  createTheme: (name: string) => Promise<void>;
  /** Removes a theme's file from the folder. Confirm before calling. */
  deleteTheme: (file: string) => Promise<void>;
  setThemeColor: (token: string, hex: string) => void;
  /** Switches a gradient on with sensible starting colours, or off. */
  toggleGradient: (slot: GradientSlot, on: boolean) => void;
  setGradient: (key: string, gradient: Gradient | null) => void;
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
    raw: file.css,
    blocked,
    swatch: readSwatch(css),
  };
}

const isBuiltIn = (id: string) => BUILT_IN_THEMES.some((theme) => theme.id === id);

/**
 * The pending disk write for the theme being edited.
 *
 * Module-level rather than store state for the same reason autosave.ts is a
 * plain service (CLAUDE.md rule 8): the timer has to survive re-renders, and a
 * colour picker dragged across a gradient fires dozens of changes a second.
 * The document is updated on every one of those; the file is written once the
 * hand stops moving.
 */
let pendingWrite: { dir: string; file: string; css: string } | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
const WRITE_DELAY_MS = 400;

/**
 * Files this run of the app has already kept a copy of.
 *
 * Module-level for the same reason as the timer, and per *session* rather than
 * per edit: the copy worth having is the one from before she started changing
 * things today, not the one from thirty seconds ago.
 */
const backedUp = new Set<string>();

/**
 * The live watch on the themes and snippets folders, and which two folders it
 * covers. Module-level for the same reason as the timer above: there must only
 * ever be one, and it has to outlive every render of the settings screen —
 * hand-editing a theme with Settings closed still has to move the window.
 */
let stopWatching: StopWatching | null = null;
// Two fields rather than one joined key, because there is no separator a path
// can't contain — and the first attempt reached for `\0`, which is true of
// paths and also makes git call this file binary.
let watchedThemesDir = "";
let watchedSnippetsDir = "";

/**
 * When the app itself last wrote a theme file.
 *
 * The watcher can't tell her save from ours, and ours arrive in bursts — a
 * colour picker being dragged writes every time the hand pauses. Reacting to
 * our own write would make every one of those trigger a rescan, and a rescan
 * flushes the pending write, which is precisely what the debounce exists to
 * avoid. So changes landing in the moment after the app wrote are treated as
 * the echo they almost always are.
 */
let lastSelfWrite = 0;
const SELF_WRITE_QUIET_MS = 800;

export const useThemeStore = create<ThemeStoreState>((set, get) => {
  /**
   * The queued edit, written.
   *
   * The copy is taken here rather than when the edit was made, and that timing
   * is the whole point: nothing has touched the file yet at this moment, so
   * what gets copied is what she wrote. Awaited before the write for the same
   * reason — a backup that lands after the change has backed up the change.
   */
  async function flushThemeWrite(): Promise<void> {
    if (writeTimer) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }
    const pending = pendingWrite;
    pendingWrite = null;
    if (!pending) return;

    if (!backedUp.has(pending.file)) {
      backedUp.add(pending.file);
      const folder = await backupCssFile(pending.dir, pending.file);
      // A backup that couldn't be made is worth saying out loud, because the
      // panel is about to promise her there's a copy. Not a reason to refuse
      // the edit she asked for, though.
      set(folder ? { backupFolder: folder, backupFailed: false } : { backupFailed: true });
    }

    // Stamped either side of the write: the watcher's clock starts when the
    // file changes, and the change is somewhere inside this await.
    lastSelfWrite = Date.now();
    await writeCssFile(pending.dir, pending.file, pending.css).catch(() => {});
    lastSelfWrite = Date.now();
  }

  /**
   * Keeps one watch running over the current pair of folders.
   *
   * Torn down and rebuilt only when the folders themselves change, which
   * happens when the projects folder is moved in Settings.
   */
  async function ensureWatching(themesDir: string, snippetsDir: string): Promise<void> {
    if (stopWatching && watchedThemesDir === themesDir && watchedSnippetsDir === snippetsDir) return;

    stopWatching?.();
    stopWatching = null;
    watchedThemesDir = "";
    watchedSnippetsDir = "";
    try {
      stopWatching = await watchCssDirs([themesDir, snippetsDir], () => {
        if (Date.now() - lastSelfWrite < SELF_WRITE_QUIET_MS) return;
        void get().scanFolders();
      });
      watchedThemesDir = themesDir;
      watchedSnippetsDir = snippetsDir;
    } catch {
      // No Tauri side to ask (`pnpm dev`), or the OS declined a watch on this
      // folder — a network drive, most likely. "Check for new ones" is still
      // there and still does the whole job, which is why this can be quiet:
      // the watcher removes a step rather than being the only way through.
    }
  }

  function queueThemeWrite(dir: string, file: string, css: string): void {
    pendingWrite = { dir, file, css };
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => void flushThemeWrite(), WRITE_DELAY_MS);
  }

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

    // Two passes over the fonts, and the order is the point. With the theme on
    // the document but her overrides cleared, the four tokens resolve to what
    // the *theme* asks for — which is the only moment that's readable, since
    // an override is an inline property on the same element and masks it. Then
    // the overrides go back on. Costs one extra style recalc, on a path that
    // runs when something changes and never per frame.
    applyFonts({}, FONT_SLOTS);
    const themeFonts = readThemeFonts(FONT_SLOTS);
    applyFonts(state.fonts, FONT_SLOTS);

    applyTextScale(state.textScale);
    applyContentScale(state.contentScale);
    // After the theme is on the document, not before — it reads the resolved
    // background back out, which is only right once the rules above have landed.
    const bootBg = applyBootBackground();

    if (JSON.stringify(themeFonts) !== JSON.stringify(state.themeFonts)) set({ themeFonts });

    cacheAppearance({
      themeId: state.themeId,
      themeFile: state.themeFile,
      themeCss,
      snippetCss,
      enabledSnippets: state.enabledSnippets,
      fonts: state.fonts,
      textScale: state.textScale,
      contentScale: state.contentScale,
      bootBg,
    });
  }

  /**
   * The whole edit path, in one place: turn the draft back into a stylesheet,
   * swap that text into the theme it belongs to, put it on the document, and
   * queue the disk write.
   *
   * The in-memory `customThemes` entry is updated rather than waiting for a
   * rescan, so a dragged colour picker moves the app under your hand. The file
   * is still what's true — the next scan reads it back, and this wrote it.
   */
  function writeDraft(draft: ThemeDraft): void {
    const state = get();
    const theme = state.customThemes.find((t) => t.file === state.themeFile);
    if (!theme || !state.themesDir) return;

    // Patched, not regenerated, and patched against `raw` — see the note on
    // `patchTheme`, and on `raw` in CustomStylesheet. Between them these two
    // are the difference between the pickers editing her file and the pickers
    // replacing it.
    const raw = patchTheme(theme.raw, theme.label, theme.themeId, draft, new Date().toISOString().slice(0, 10));
    const { css, blocked } = sanitizeCustomCss(raw);
    set({
      // `resolved` moves with the edit, so a picker she just dragged shows the
      // colour she picked rather than what the token used to inherit.
      draft: { ...draft, resolved: { ...draft.resolved, ...draft.colors } },
      customThemes: state.customThemes.map((t) => (t.file === theme.file ? { ...t, raw, css, blocked, swatch: readSwatch(css) } : t)),
    });
    apply();
    queueThemeWrite(state.themesDir, theme.file, raw);
  }

  /**
   * Reparses the pickers' values out of whichever theme is selected now.
   *
   * Must run *after* `apply()`, not before: it resolves every token it can't
   * find in the file against the document, and before the theme is applied the
   * document is still showing the previous one.
   */
  function syncDraft(): void {
    const state = get();
    const theme = state.themeFile ? state.customThemes.find((t) => t.file === state.themeFile) : null;
    if (!theme) return set({ draft: null });
    const style = getComputedStyle(document.documentElement);
    set({ draft: readThemeDraft(theme.raw, (token) => style.getPropertyValue(token)) });
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
        contentScale: state.contentScale,
        enabledSnippets: state.enabledSnippets,
      })
      .catch(() => {});
  }

  return {
    themeId: DEFAULT_THEME_ID,
    themeFile: null,
    fonts: {},
    themeFonts: {},
    textScale: DEFAULT_TEXT_SCALE,
    contentScale: DEFAULT_CONTENT_SCALE,
    enabledSnippets: [],
    customThemes: [],
    snippets: [],
    draft: null,
    themesDir: "",
    snippetsDir: "",
    isScanning: false,
    folderError: null,
    deleteError: null,
    backupFolder: null,
    backupFailed: false,

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
          contentScale: cached.contentScale,
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

      const textScale = typeof saved.textScale === "number" ? saved.textScale : DEFAULT_TEXT_SCALE;

      set({
        themeId: typeof saved.themeId === "string" && saved.themeId ? saved.themeId : DEFAULT_THEME_ID,
        themeFile: typeof saved.themeFile === "string" ? saved.themeFile : null,
        fonts,
        textScale,
        // Falls back to the UI's scale, not to 1. Before these were split there
        // was one slider driving both, so someone who had set it to 120% wants
        // 120% of each — landing the writing back on 100% would be the app
        // resizing their pages on upgrade for no reason they asked for.
        contentScale: typeof saved.contentScale === "number" ? saved.contentScale : textScale,
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
      // Any edit still sitting in the debounce goes to disk first. Otherwise a
      // scan reads the file as it was before the last few colour changes and
      // hands them straight back, which looks like the pickers snapping back.
      await flushThemeWrite();
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
        const selected = state.themeFile ? customThemes.find((theme) => theme.file === state.themeFile) : null;
        const lost = Boolean(state.themeFile) && !selected;

        // A theme file can change its own id — add a `[data-theme="…"]` block
        // where there wasn't one, or paste in a sandbox export that declares a
        // different name. The id lives on the document, and only `selectTheme`
        // was ever setting it, so after a rescan the app was still wearing the
        // *old* id while the file's rules were written against the new one.
        // Anything unscoped in the file applied and everything scoped didn't,
        // which reads as a reload that only half worked — and looked fixed the
        // moment you switched theme and back, because that path re-reads the id.
        const renamed = selected && selected.themeId !== state.themeId ? selected.themeId : null;

        set({
          customThemes,
          snippets,
          themesDir,
          snippetsDir,
          isScanning: false,
          ...(lost ? { themeId: DEFAULT_THEME_ID, themeFile: null } : {}),
          ...(renamed ? { themeId: renamed } : {}),
          // Snippets that have gone are dropped from the enabled list, but
          // only once they're confirmed missing by a completed scan.
          enabledSnippets: state.enabledSnippets.filter((file) => snippets.some((s) => s.file === file)),
        });
        apply();
        syncDraft();
        // Started from here rather than from `loadAppearance`, because this is
        // the only place that knows the folders exist — `ensureCssDir` above
        // has just created them, and a watch on a folder that isn't there yet
        // fails rather than waiting for it.
        void ensureWatching(themesDir, snippetsDir);
        // Persisted for the same reason as `lost`: the settings file records
        // the id as well as the filename, so a rescan that corrects one and
        // doesn't save it hands the stale one straight back on next launch.
        if (lost || renamed) await persist();
      } catch {
        // A projects folder that has moved or a drive that isn't mounted. The
        // built-in themes still work, so this is a smaller list, not a failure.
        set({ isScanning: false });
      }
    },

    async selectTheme(themeId, themeFile) {
      // Whatever was half-typed into the last theme's pickers goes to its own
      // file before the selection moves, or it's written to the new one.
      await flushThemeWrite();
      set({ themeId, themeFile: isBuiltIn(themeId) && !themeFile ? null : themeFile });
      apply();
      syncDraft();
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

    async setContentScale(scale) {
      set({ contentScale: scale });
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
      set({
        themeId: DEFAULT_THEME_ID,
        themeFile: null,
        fonts: {},
        textScale: DEFAULT_TEXT_SCALE,
        contentScale: DEFAULT_CONTENT_SCALE,
        enabledSnippets: [],
      });
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

    async createTheme(name) {
      const state = get();
      if (!state.themesDir) return;

      // Seeded from what's on screen, not from a file — the theme being copied
      // is usually a built-in, whose CSS the app never holds as text, and "make
      // a copy of this" plainly means the thing you're looking at.
      const style = getComputedStyle(document.documentElement);
      const colors = seedFromDocument((token) => style.getPropertyValue(token));
      const file = freeFileName(
        name,
        state.customThemes.map((theme) => theme.file),
        sanitizeSegment,
      );
      const themeId = themeIdForFile(file);
      const label = labelForFile(file);

      // From `themeFonts`, not from the computed style beside it, and the
      // difference is the point: a font she picked in Settings is an inline
      // property on the same element, so reading the document here would bake
      // *her override* into the copy as if the theme had asked for it.
      // `themeFonts` is what the theme itself asks for, measured in `apply()`
      // with the overrides taken off.
      const fonts: Record<string, string> = {};
      for (const slot of FONT_SLOTS) {
        const stack = state.themeFonts[slot.key];
        if (stack) fonts[slot.token] = stack;
      }

      // Seeded from the document, so every token is already declared — a theme
      // made here is complete rather than half-inherited, which is what "a copy
      // of this one" has to mean. That has to include the faces: only Midnight
      // sets its own, so a copy of it used to come out in the base tokens'
      // fonts and visibly wasn't the theme it was copied from.
      const css = serializeTheme(
        label,
        themeId,
        { colors, resolved: colors, gradients: {} },
        new Date().toISOString().slice(0, 10),
        fonts,
      );

      // Same echo suppression as the edit path: this scans deliberately on the
      // next line, and the watcher reporting the same event a moment later
      // would only do it again.
      lastSelfWrite = Date.now();
      await writeCssFile(state.themesDir, file, css);
      lastSelfWrite = Date.now();
      await get().scanFolders();
      await get().selectTheme(themeId, file);
    },

    async deleteTheme(file) {
      const state = get();
      if (!state.themesDir) return;

      // Before the delete, not after. A colour picker queues a debounced write
      // against a specific file, and a queued write landing after the file is
      // gone recreates it — a theme you deleted reappearing on the next scan,
      // which is worse than the delete having failed outright.
      await flushThemeWrite();
      set({ deleteError: null });
      try {
        lastSelfWrite = Date.now();
        await deleteCssFile(state.themesDir, file);
        lastSelfWrite = Date.now();
      } catch {
        // Locked by an editor, refused by permissions, drive unplugged. Say
        // so and name the path — the folder is hers and she can finish the job
        // in Explorer, which is strictly better than the button doing nothing.
        set({ deleteError: { file, path: state.themesDir } });
        return;
      }

      // The rescan is what actually drops it from the list, and it already
      // knows how to fall back to the default when the selected file has gone
      // — that path exists because the folder is hers and she can delete from
      // Explorer too. Deleting from in here is the same event arriving sooner,
      // so it goes through the same code rather than around it.
      await get().scanFolders();
    },

    // Both editors below take the same path: rewrite the file's text, put it
    // straight on the document so the change is instant, and let the disk catch
    // up. The file stays the source of truth — reopen Settings, or open the
    // file in Notepad, and it says the same thing.
    setThemeColor(token, hex) {
      const { draft } = get();
      if (!draft) return;
      writeDraft({ ...draft, colors: { ...draft.colors, [token]: hex } });
    },

    toggleGradient(slot, on) {
      const { draft } = get();
      if (!draft) return;
      if (!on) return get().setGradient(slot.key, null);

      // Seeded from what the app is *showing*, not from what this file happens
      // to declare. A theme file only has to name what it changes — a
      // hand-written one might set four tokens and inherit the rest — and
      // seeding a gradient from a token the file doesn't mention gave black,
      // in a slot whose surface was plainly some other colour on screen.
      const style = getComputedStyle(document.documentElement);
      const resolved = new Proxy(draft.colors, {
        get: (colors, token: string) => colors[token] ?? style.getPropertyValue(token).trim(),
      });
      get().setGradient(slot.key, seedGradient(slot, resolved));
    },

    setGradient(key, gradient) {
      const { draft } = get();
      if (!draft) return;
      const gradients = { ...draft.gradients };
      if (gradient) gradients[key] = gradient;
      else delete gradients[key];
      writeDraft({ ...draft, gradients });
    },
  };
});
