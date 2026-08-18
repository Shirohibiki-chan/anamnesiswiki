// The rules behind finding worlds on disk (Phase 27) — the parts that are
// decisions rather than reads.
//
// Deliberately touches nothing: `filesystem-service.ts` is the only file that
// goes to disk (CLAUDE.md §4). It does the walking and hands the results here.
import { SNIPPETS_DIR, THEMES_DIR } from "../constants/paths";

/**
 * How far below the projects folder a world is still found.
 *
 * Two, not one: her worlds already sit at mixed depths (`TEStval/Valeraverse`
 * beside a plain `Valeraverse`), because a world is a folder and folders get
 * tidied into other folders. One level would miss those, which is the same
 * "your world is invisible" bug this whole feature exists to fix.
 *
 * Not unbounded, and that's the load-bearing half. A world's own folder holds a
 * directory per nestable page plus an `assets/` of hundreds of files, so an
 * unbounded walk of the projects folder is a walk of every page in every world
 * with one `project.json` per world to show for it. Depth is what keeps this a
 * listing rather than a crawl.
 */
export const WORLD_SCAN_DEPTH = 2;

/**
 * Directory names in the projects folder that are app data, not worlds.
 *
 * `themes/` and `snippets/` sit beside the worlds deliberately — a theme
 * belongs to no single world — which leaves the two indistinguishable by
 * position. They're skipped by name at the top level, and refused as names for
 * new worlds, so the skip can never hide a real world.
 */
const RESERVED_DIRS = new Set<string>([THEMES_DIR, SNIPPETS_DIR]);

export function isReservedWorldName(name: string): boolean {
  return RESERVED_DIRS.has(name.trim().toLowerCase());
}

/**
 * What "Open folder" should do with the folder she picked, given the worlds
 * found directly inside it.
 *
 * Unzipping a world commonly produces `Valeraverse/Valeraverse/`, and choosing
 * the outer folder used to report no project in it — correct, and useless. So
 * when the chosen folder isn't itself a world, look one level in: exactly one
 * world below it opens directly, several is a question worth asking rather
 * than a guess at which she meant.
 *
 * One level only. Two would start opening worlds she didn't point at.
 */
export type OpenFolderOutcome =
  | { kind: "world"; path: string }
  | { kind: "choose"; paths: string[] }
  | { kind: "none" };

export function decideAmongNestedWorlds(inside: string[]): OpenFolderOutcome {
  if (inside.length === 1) return { kind: "world", path: inside[0] };
  // Sorted so two runs over the same folder ask the same question in the same
  // order — `readDir` makes no promises about order, and a list that reshuffles
  // between two looks is a list she has to re-read every time.
  if (inside.length > 1) return { kind: "choose", paths: [...inside].sort() };
  return { kind: "none" };
}

/**
 * One world as it exists on disk, read cheaply — no tree walk, no page loads.
 *
 * `id` is nullable and that is not an oversight: a world saved before ids
 * existed only gets one when it's *opened*, because minting one is a write and
 * a listing must never write to every world on the disk. So a world that has
 * never been opened since ids shipped appears here with `id: null`, is listed
 * by path like everything else, and gains its id the first time she opens it.
 *
 * `modifiedAt` is `project.json`'s own timestamp, which tracks the world more
 * closely than it looks: that file carries the tree order, the expanded rows
 * and the selection, so it's rewritten by ordinary use rather than only by a
 * structural change.
 */
export type WorldFile = {
  path: string;
  id: string | null;
  name: string;
  modifiedAt: number | null;
};

/** A world the app has opened before, as app settings remember it. */
export type RememberedWorld = {
  path: string;
  name: string;
  lastOpenedAt: number;
};

export type ListedWorld = {
  path: string;
  id: string | null;
  name: string;
  lastOpenedAt: number | null;
  modifiedAt: number | null;
  /** What the default sort runs on — see `buildWorldList`. */
  activeAt: number;
  /**
   * True for a world living somewhere other than the projects folder.
   *
   * Shown in the same list rather than a section of its own (her call,
   * 2026-08-14): where a folder happens to sit isn't something she thinks
   * about, and making it the screen's main division would organise the list
   * around a fact about disks. The marker earns its place at one moment — when
   * a world has gone missing and the answer is that its drive isn't plugged
   * in.
   */
  isOutsideProjectsFolder: boolean;
};

/**
 * Path comparison for "is this world in the projects folder".
 *
 * Case is folded, which is right on Windows and macOS and slightly wrong on
 * Linux, where two paths differing only in case are two places. The cost of
 * being wrong is one world wearing or missing a marker; the cost of *not*
 * folding is her whole projects folder marked as elsewhere because the picker
 * handed back `C:\Users\...` where the setting says `C:\users\...`.
 */
function normalizePath(path: string): string {
  return path.replace(/[\\/]+/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function isInsideProjectsFolder(path: string, projectsDir: string): boolean {
  const dir = normalizePath(projectsDir);
  if (!dir) return false;
  const world = normalizePath(path);
  return world === dir || world.startsWith(`${dir}/`);
}

/**
 * The world list the start screen shows: everything found in the projects
 * folder, plus everything opened from outside it, in one list.
 *
 * **Recent stops being a whitelist and becomes a sort order.** It used to be
 * the only way a world reached this screen, capped at eight, which is how she
 * ended up with a ninth world reachable only through the folder picker. Now
 * the scan says what exists and the remembered list only says when she last
 * opened each one.
 *
 * **Deduplicated by path, never by id.** Two worlds wearing one id is a real
 * situation — it's what a folder copied in File Explorer looks like — and
 * collapsing them here would hide one of her worlds on the strength of a
 * bookkeeping field. Telling those two apart is the fork detector's job, and
 * it re-ids one of them rather than dropping it.
 *
 * **Newest first, on the most recent thing that happened to the world**,
 * whichever of "she opened it" and "its file changed" is later. Any ordering
 * that needs upkeep will be wrong within a month (her call, 2026-08-14), so
 * the default has to be right without being maintained. Name and then path
 * break ties, so two worlds touched in the same millisecond don't swap places
 * between two looks at the same screen.
 */
export function buildWorldList(input: {
  onDisk: WorldFile[];
  remembered: RememberedWorld[];
  projectsDir: string;
}): ListedWorld[] {
  const openedAt = new Map<string, number>();
  for (const world of input.remembered) {
    const key = normalizePath(world.path);
    // Keep the most recent, in case an older entry for the same folder
    // survived a path being written two ways.
    openedAt.set(key, Math.max(openedAt.get(key) ?? 0, world.lastOpenedAt));
  }

  const byPath = new Map<string, ListedWorld>();
  const add = (world: WorldFile) => {
    const key = normalizePath(world.path);
    if (byPath.has(key)) return;
    const lastOpenedAt = openedAt.get(key) ?? null;
    byPath.set(key, {
      ...world,
      lastOpenedAt,
      activeAt: Math.max(world.modifiedAt ?? 0, lastOpenedAt ?? 0),
      isOutsideProjectsFolder: !isInsideProjectsFolder(world.path, input.projectsDir),
    });
  };

  for (const world of input.onDisk) add(world);

  // A remembered world whose folder wouldn't read just now is still listed,
  // under the name we have for it. Unreadable is not the same as gone — a
  // world on an external drive reads as missing every time the drive is
  // unplugged — and quietly dropping it would make her own worlds flicker in
  // and out of the list. Clicking one that really has gone reports it and
  // forgets it, which is the path that already existed.
  for (const world of input.remembered) {
    add({ path: world.path, id: null, name: world.name, modifiedAt: null });
  }

  return [...byPath.values()].sort(
    (a, b) => b.activeAt - a.activeAt || a.name.localeCompare(b.name) || a.path.localeCompare(b.path),
  );
}
