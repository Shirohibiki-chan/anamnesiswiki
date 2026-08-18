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
