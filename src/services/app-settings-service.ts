// App-level settings that live outside any project folder (which project was
// open last, which ones are recent) — persisted via Tauri's key-value store
// in the app's own data dir, never inside a project folder.
import { load, type Store } from "@tauri-apps/plugin-store";
import { RECENT_PROJECTS_COUNT } from "../constants/limits";

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

export async function removeRecentProject(path: string): Promise<void> {
  const store = await getStore();
  const existing = (await store.get<RecentProject[]>("recentProjects")) ?? [];
  await store.set(
    "recentProjects",
    existing.filter((p) => p.path !== path),
  );
  await store.save();
}
