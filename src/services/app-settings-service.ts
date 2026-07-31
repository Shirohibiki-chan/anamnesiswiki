// App-level settings that live outside any project folder (which project was
// open last, which ones are recent) — persisted via Tauri's key-value store
// in the app's own data dir, never inside a project folder.
import { load, type Store } from "@tauri-apps/plugin-store";
import { RECENT_PROJECTS_COUNT } from "../constants/limits";
import { getDefaultProjectsDir } from "../constants/paths";

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

export async function getRecentProjects(): Promise<RecentProject[]> {
  const store = await getStore();
  return (await store.get<RecentProject[]>("recentProjects")) ?? [];
}

export async function addRecentProject(path: string, name: string): Promise<void> {
  const store = await getStore();
  const existing = (await store.get<RecentProject[]>("recentProjects")) ?? [];
  const withoutThis = existing.filter((p) => p.path !== path);
  const updated = [{ path, name, lastOpenedAt: Date.now() }, ...withoutThis].slice(0, RECENT_PROJECTS_COUNT);
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

export async function removeRecentProject(path: string): Promise<void> {
  const store = await getStore();
  const existing = (await store.get<RecentProject[]>("recentProjects")) ?? [];
  await store.set(
    "recentProjects",
    existing.filter((p) => p.path !== path),
  );
  await store.save();
}
