// App-level settings that live outside any project folder (which project was
// open last, which ones are recent) — persisted via Tauri's key-value store
// in the app's own data dir, never inside a project folder.
import { load, type Store } from "@tauri-apps/plugin-store";
import { getDefaultProjectsDir } from "../constants/paths";
import type { Pin } from "./pins";
import { isProjectGroup, type ProjectGroup } from "./project-groups";
import { isProjectRef, type ProjectRef } from "./project-refs";

const SETTINGS_FILE = "app-settings.json";

export type RecentProject = {
  path: string;
  name: string;
  lastOpenedAt: number;
};

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) storePromise = load(SETTINGS_FILE);
  return storePromise;
}

export async function getLastOpenedProject(): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>("lastOpenedProject")) ?? null;
}

export async function setLastOpenedProject(path: string | null): Promise<void> {
  const store = await getStore();
  if (path) {
    await store.set("lastOpenedProject", path);
  } else {
    await store.delete("lastOpenedProject");
  }
  await store.save();
}

/**
 * The folder a project sits *in*, for showing under its name in the recent
 * list. Nothing else distinguishes two projects with the same name — and two
 * of them is normal, since importing the same world twice keeps its name both
 * times — while the full path is a 60-character string that wraps to three
 * lines and buries the one segment that differs.
 *
 * Pure string work on purpose: no disk access, so this can't fail on a project
 * that has since been moved or deleted, which is exactly when the recent list
 * still has to render it.
 */
export function describeProjectLocation(path: string): string {
  // Reuse whichever separator the path already uses — releases build for macOS
  // and Linux too, and backslashes in a posix path would read as damage.
  const separator = path.includes("\\") ? "\\" : "/";
  const segments = path.split(/[\\/]/).filter(Boolean);
  // Drop the project's own folder — its name is already the line above this.
  const parent = segments.slice(0, -1);
  if (parent.length === 0) return path;
  return truncateTail(parent, separator);
}

/**
 * A folder's own path, shortened the same way as `describeProjectLocation`
 * above — for the rail's Projects folder line, which names the folder
 * directly rather than pairing it with a name already shown on the line
 * above. The one difference from `describeProjectLocation` is exactly that:
 * this keeps the folder's own last segment rather than dropping it, because
 * there's nothing else on screen naming which folder this is.
 */
export function describeFolderLocation(path: string): string {
  const separator = path.includes("\\") ? "\\" : "/";
  const segments = path.split(/[\\/]/).filter(Boolean);
  if (segments.length === 0) return path;
  return truncateTail(segments, separator);
}

// Keeps the last two segments whole and ellipsis-prefixes whatever came
// before them — the shared core of both functions above. Two, not one: one
// segment loses exactly the disambiguating context `describeProjectLocation`
// exists for, per its own test ("tells apart two projects that share a
// name" needs both `Anamnesis` and `testval2`, not just the nearer of them).
function truncateTail(segments: string[], separator: string): string {
  const tail = segments.slice(-2);
  const prefix = segments.length > tail.length ? `…${separator}` : "";
  return prefix + tail.join(separator);
}

/**
 * The pinned projects, in the order they sit in on the start screen.
 *
 * App settings rather than the project file, unlike the id itself: which
 * projects she keeps at the top of *this* screen is a fact about how she works
 * here, not about the project. A pinned project handed to someone else, or
 * opened on another machine, has no business arriving pre-pinned.
 *
 * Stored as one ordered array rather than a flag per project, because the
 * order is the feature — see `pins.ts`.
 */
export async function getPinnedProjects(): Promise<Pin[]> {
  const store = await getStore();
  const stored = (await store.get<unknown>("pinnedProjects")) ?? [];
  if (!Array.isArray(stored)) return [];
  // Read defensively, the same way preferences are: this is an ordinary JSON
  // file that outlives the version that wrote it, and one malformed entry must
  // not cost her the rest of the row.
  return stored.filter(isProjectRef);
}

export async function setPinnedProjects(pins: readonly Pin[]): Promise<void> {
  const store = await getStore();
  await store.set("pinnedProjects", pins);
  await store.save();
}

/**
 * The groups on the start screen, each carrying what is filed under it.
 *
 * Here rather than in the project files for the reason pins are: a group is a
 * fact about how she keeps her own library, not about any project in it, and
 * one handed to someone else has no business arriving pre-filed. The
 * membership rule itself is `project-groups.ts`'s.
 */
export async function getProjectGroups(): Promise<ProjectGroup[]> {
  const store = await getStore();
  const stored = (await store.get<unknown>("projectGroups")) ?? [];
  if (!Array.isArray(stored)) return [];
  return stored.filter(isProjectGroup);
}

export async function setProjectGroups(groups: readonly ProjectGroup[]): Promise<void> {
  const store = await getStore();
  await store.set("projectGroups", groups);
  await store.save();
}

/**
 * The projects folded away out of the library.
 *
 * A list of the archived ones rather than a flag on each project, because the
 * whole point of the archive is that it touches nothing on disk: a project she
 * has archived may sit on a drive that is not plugged in, and writing a flag
 * into a project file to hide it from a screen would be the one way to make
 * "archive" able to fail.
 */
export async function getArchivedProjects(): Promise<ProjectRef[]> {
  const store = await getStore();
  const stored = (await store.get<unknown>("archivedProjects")) ?? [];
  if (!Array.isArray(stored)) return [];
  return stored.filter(isProjectRef);
}

export async function setArchivedProjects(archived: readonly ProjectRef[]): Promise<void> {
  const store = await getStore();
  await store.set("archivedProjects", archived);
  await store.save();
}

export async function getRecentProjects(): Promise<RecentProject[]> {
  const store = await getStore();
  return (await store.get<RecentProject[]>("recentProjects")) ?? [];
}

export async function addRecentProject(path: string, name: string): Promise<void> {
  const store = await getStore();
  const existing = (await store.get<RecentProject[]>("recentProjects")) ?? [];
  const withoutThis = existing.filter((p) => p.path !== path);
  // Uncapped on purpose (Phase 27). This list used to be trimmed to eight and
  // used as the only way a world reached the start screen, which is how her
  // ninth world ended up reachable only through the folder picker. It is now a
  // record of when each world was last opened — the start screen finds worlds
  // by scanning the projects folder, and asks this only for the order to put
  // them in.
  const updated = [{ path, name, lastOpenedAt: Date.now() }, ...withoutThis];
  await store.set("recentProjects", updated);
  await store.save();
}

/**
 * Custom keyboard shortcuts, as whatever is actually in the file. Returned
 * unvalidated on purpose: this module's job is reading and writing the store,
 * and deciding whether a binding is still usable belongs with the rules that
 * say so — see shortcut-service's `parseOverrides`.
 *
 * Only *changed* shortcuts are stored, never the full set, so a default that
 * moves in a later version reaches everyone who never touched that one.
 */
export async function getShortcutOverrides(): Promise<unknown> {
  const store = await getStore();
  return (await store.get("shortcutOverrides")) ?? {};
}

export async function setShortcutOverrides(overrides: Record<string, unknown>): Promise<void> {
  const store = await getStore();
  if (Object.keys(overrides).length === 0) {
    await store.delete("shortcutOverrides");
  } else {
    await store.set("shortcutOverrides", overrides);
  }
  await store.save();
}

/**
 * Where new and imported projects get written. Stored only when the user has
 * actually chosen one — an absent value means "wherever the default is now",
 * so a default that moves in a later version follows anyone who never set it,
 * the same reasoning as the shortcut overrides above.
 */
export async function getProjectsDir(): Promise<string> {
  const store = await getStore();
  return (await store.get<string>("projectsDir")) ?? (await getDefaultProjectsDir());
}

/** Null clears the setting, putting the folder back to the built-in default. */
export async function setProjectsDir(path: string | null): Promise<void> {
  const store = await getStore();
  if (path) {
    await store.set("projectsDir", path);
  } else {
    await store.delete("projectsDir");
  }
  await store.save();
}

/** Whether the folder above is the user's own choice rather than the default. */
export async function hasCustomProjectsDir(): Promise<boolean> {
  const store = await getStore();
  return (await store.get<string>("projectsDir")) != null;
}

/**
 * How the app looks: which theme, which fonts, how big the text. App-level and
 * not per-project on purpose — she has one pair of eyes and several worlds.
 *
 * `themeFile` is the filename when the choice is one of hers, and null for a
 * built-in. Stored beside the id rather than instead of it because a custom
 * theme needs both: the file to load, and the id inside it to put on the
 * document. Stored as a *name*, not a path, so moving the projects folder
 * doesn't orphan the choice.
 */
export type AppearanceSettings = {
  themeId: string;
  themeFile: string | null;
  fonts: Record<string, string>;
  /**
   * Whether `fonts` above applies at all.
   *
   * Faces normally belong to the theme, the way colours do, and the pickers
   * write them into its file. This switch is the other way of working — one
   * set of faces that outranks every theme — and it exists because that's a
   * legitimate thing to want for a reading font and used to be the only
   * behaviour. Absent means off, except for settings written before the switch
   * existed; theme-store's `loadAppearance` says how those are read.
   */
  fontsEveryTheme: boolean;
  /** The interface. Absent on settings written before the two were split. */
  textScale: number;
  /** The page body. Absent on settings written before the two were split — see theme-store. */
  contentScale: number;
  /** Snippet filenames that are switched on. Absent means none are. */
  enabledSnippets: string[];
  /**
   * Desaturates every project cover on the start screen — the generated
   * gradients and any picture she's set herself alike.
   *
   * Absent means "work it out the way a fresh install would": on for anyone
   * whose OS asks for higher contrast, off otherwise. That's a real default
   * to recompute, not a fixed `false` — see `defaultMutedCovers` in
   * theme-store.ts, used both when this key has never been written and by
   * "Put everything back to default".
   */
  mutedCovers: boolean;
};

export async function getAppearance(): Promise<Partial<AppearanceSettings>> {
  const store = await getStore();
  // Unvalidated, like the shortcut overrides above and for the same reason:
  // this module reads and writes the file, and deciding whether a theme id
  // still exists or a font is still bundled belongs with the code that knows.
  return (await store.get<Partial<AppearanceSettings>>("appearance")) ?? {};
}

export async function setAppearance(appearance: AppearanceSettings): Promise<void> {
  const store = await getStore();
  await store.set("appearance", appearance);
  await store.save();
}

/**
 * How wide the draggable columns are — the shell's two side panels and the
 * start screen's rail. App-level rather than per-project for the
 * same reason the appearance settings are: one screen, several worlds.
 *
 * Returned unvalidated, like the shortcut overrides above — deciding whether a
 * width is still usable belongs with the limits that say so, in
 * `layout-service`'s `parsePanelWidths`.
 */
export async function getPanelWidths(): Promise<unknown> {
  const store = await getStore();
  return (await store.get("panelWidths")) ?? {};
}

export async function setPanelWidths(widths: { tree: number; properties: number; rail: number }): Promise<void> {
  const store = await getStore();
  await store.set("panelWidths", widths);
  await store.save();
}

/**
 * How the app behaves rather than how it looks — app-level for the same reason
 * the widths above are.
 *
 * Returned unvalidated, like the widths and the shortcut overrides: deciding
 * whether a stored value still means anything belongs with the code that knows
 * what the values are, in `preferences-service`'s `parsePreferences`.
 */
export async function getPreferences(): Promise<unknown> {
  const store = await getStore();
  return (await store.get("preferences")) ?? {};
}

export async function setPreferences(preferences: Record<string, unknown>): Promise<void> {
  const store = await getStore();
  await store.set("preferences", preferences);
  await store.save();
}

/**
 * What the settings file has to be told when a project is renamed.
 *
 * **Not `addRecentProject` with the new path.** That stamps `lastOpenedAt`
 * with now, which would send a project she has merely *renamed* to the top of
 * a list ordered by when things were last opened, and mark a project she has
 * not opened in months as the most recent one. The entry is rewritten in
 * place instead, keeping the timestamp it had.
 *
 * **A project with no entry gets none made for it.** Never having been opened
 * is a fact the rail's Recently Opened depends on, and renaming something is
 * not opening it.
 *
 * The last-opened pointer moves too, or the next launch tries to auto-open a
 * path that no longer exists. `StartupRouter` falls through to the picker when
 * that happens, so this is the difference between landing where she left off
 * and landing on the start screen.
 */
export async function renameRecentProject(oldPath: string, newPath: string, name: string): Promise<void> {
  const store = await getStore();
  const existing = (await store.get<RecentProject[]>("recentProjects")) ?? [];
  const updated = existing.map((entry) => (entry.path === oldPath ? { ...entry, path: newPath, name } : entry));
  if (updated.some((entry, index) => entry !== existing[index])) {
    await store.set("recentProjects", updated);
  }

  if ((await store.get<string>("lastOpenedProject")) === oldPath) {
    await store.set("lastOpenedProject", newPath);
  }
  await store.save();
}

export async function removeRecentProject(path: string): Promise<void> {
  const store = await getStore();
  const existing = (await store.get<RecentProject[]>("recentProjects")) ?? [];
  await store.set(
    "recentProjects",
    existing.filter((p) => p.path !== path),
  );
  await store.save();
}
