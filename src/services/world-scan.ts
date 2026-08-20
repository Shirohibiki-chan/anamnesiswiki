// The rules behind finding worlds on disk (Phase 27) — the parts that are
// decisions rather than reads.
//
// Deliberately touches nothing: `filesystem-service.ts` is the only file that
// goes to disk (CLAUDE.md §4). It does the walking and hands the results here.
import { SNIPPETS_DIR, THEMES_DIR } from "../constants/paths";
import type { ProjectSort } from "./preferences-service";

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
  /** The filename in this world's own `assets/`, or null if she hasn't set one. */
  coverImage: string | null;
  /** The page she was last on inside this world, or null if none is recorded. */
  selectedName: string | null;
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
  coverImage: string | null;
  selectedName: string | null;
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

/**
 * Whether two paths name the same project folder, by the rule above.
 *
 * Exported because pins have to ask the same question and must get the same
 * answer: a pin that thinks `C:\Users\...` and `C:\users\...` are two
 * projects is a pin that silently stops matching the project it is on.
 */
export function isSameProjectPath(a: string, b: string): boolean {
  return normalizePath(a) === normalizePath(b);
}

/**
 * Where a project sits on disk, split so a narrow row can drop the middle of it
 * rather than the end.
 *
 * The folder *containing* the project, not the project's own folder — the row
 * is already showing the project's name, and repeating it as the last word of
 * its own path says nothing.
 *
 * Split into a `head` that may be clipped and a `tail` that must not be. A
 * plain ellipsis eats the end of a string, which on a path is the only part
 * that tells two projects apart: `C:\Users\shiro\Documents\Anam…` and
 * `C:\Users\shiro\Documents\Anot…` read as the same place. Keeping the last
 * folder whole and collapsing what leads up to it says the useful half.
 *
 * Separators are left as they were given. This runs on Windows and on macOS,
 * the two disagree, and a path rewritten to look tidy is a path she can't
 * match against what her file manager shows her.
 */
export type ProjectLocation = { head: string; tail: string };

export function locationOf(path: string): ProjectLocation {
  const trimmed = path.replace(/[\\/]+$/, "");
  const cut = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  // No separator at all: a bare name, with nowhere above it to report.
  if (cut < 0) return { head: "", tail: "" };
  const parent = trimmed.slice(0, cut);
  const split = Math.max(parent.lastIndexOf("/"), parent.lastIndexOf("\\"));
  // The parent is the drive or the root itself — there is no middle to drop,
  // so all of it is the part that must survive.
  if (split < 0) return { head: "", tail: parent };
  // The separator goes on the front of the tail, not the back of the head, so
  // that clipping the head leaves the slash standing: `…Doc…\\Projects` still
  // reads as a path with a piece missing, where `…Doc…Projects` reads as one
  // folder with a strange name.
  return { head: parent.slice(0, split), tail: parent.slice(split) };
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
 *
 * The order it comes out in is the default one; the start screen re-sorts it
 * when she has asked for something else. Built in the default order rather
 * than unordered so that every caller which never asks — the rail's recent
 * list, the tests, anything added later — gets a sensible list for free.
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
    add({ path: world.path, id: null, name: world.name, modifiedAt: null, coverImage: null, selectedName: null });
  }

  return sortWorlds([...byPath.values()], "active");
}

/**
 * The list in the order she asked for.
 *
 * **Every order ends in the same two tie-breaks — name, then path.** That is
 * what stops the list reshuffling between two looks at the same screen:
 * `Array.prototype.sort` is stable, but the input is a `Map`'s values built
 * from a directory read, so "stable" only promises to preserve an order that
 * was never meaningful. Two projects touched in the same millisecond, or two
 * sharing a name, have to be settled by something that does not change.
 *
 * **Missing timestamps sort as 0, which puts them last under `active` and
 * first under `oldest`.** A project that has never been opened and whose
 * `project.json` would not read has nothing to sort *on*; both ends of the
 * list are honest places for it, and the alternative — holding it out of the
 * order — is a project she cannot find by scrolling to either end.
 */
export function sortWorlds(worlds: readonly ListedWorld[], sort: ProjectSort): ListedWorld[] {
  const byName = (a: ListedWorld, b: ListedWorld) =>
    a.name.localeCompare(b.name) || a.path.localeCompare(b.path);

  const compare: Record<ProjectSort, (a: ListedWorld, b: ListedWorld) => number> = {
    active: (a, b) => b.activeAt - a.activeAt || byName(a, b),
    oldest: (a, b) => a.activeAt - b.activeAt || byName(a, b),
    name: byName,
    // Reversed on the name only. The path stays ascending, because it is the
    // tie-break rather than the thing being sorted — flipping it too would
    // make two same-named projects swap places for no reason the screen shows.
    "name-desc": (a, b) => b.name.localeCompare(a.name) || a.path.localeCompare(b.path),
  };

  return [...worlds].sort(compare[sort]);
}

/**
 * The filter box on the start screen, as a rule rather than an `includes` in a
 * component.
 *
 * **Name first, then the path.** Typing is nearly always aimed at a name, but
 * two projects can share one and the folder is then the only thing that tells
 * them apart — so a query that matches nothing by name still gets a chance
 * against where the project lives.
 *
 * **Every word has to land, in any order.** "val 3" finds `Valeraverse3`, and
 * so does "3 val". Matching the query as one string would fail both, which is
 * how a filter box teaches someone to stop using it.
 *
 * An empty or blank query is not a filter, and returns the list it was given.
 */
export function filterWorlds(worlds: readonly ListedWorld[], query: string): ListedWorld[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...worlds];

  return worlds.filter((world) => {
    const name = world.name.toLowerCase();
    const path = world.path.toLowerCase();
    return words.every((word) => name.includes(word) || path.includes(word));
  });
}
