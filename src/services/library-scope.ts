// What the start screen's grid is showing right now — everything, one group,
// or the archive.
//
// One rule in one place because the answer has to agree with itself in three
// spots: the grid, the count beside its heading, and the pinned row above it.
// A project folded away that still appeared in the loudest row on the screen
// would make the archive a lie.
import { isInGroup, type ProjectGroup } from "./project-groups";
import { hasRef, type ProjectRef } from "./project-refs";
import type { ListedWorld } from "./world-scan";

/**
 * The chip that is on, as one string rather than a tagged union.
 *
 * `all` and `archived` are the two reserved values and everything else is a
 * group's id, which is a UUID — so the two can't collide, and a chip row can
 * ask `scope === chip.id` without a comparison helper standing between it and
 * the obvious code. The reserved pair is exported rather than typed inline for
 * the same reason every other magic string here is: two spellings of "archived"
 * is a filter that silently shows nothing.
 */
export const SCOPE_ALL = "all";
export const SCOPE_ARCHIVED = "archived";
export type LibraryScope = string;

/**
 * The projects a scope shows, out of everything the scan found.
 *
 * **Archived projects are out of every scope but the archive's own** —
 * including out of the groups they are still filed under. Archive is "I am
 * done with this for now" and a group is "this is one of my Valera worlds";
 * they compose rather than compete (her call, 2026-08-14), and composing means
 * the fold wins while it is on. Unarchiving puts a project back in its groups
 * with nothing to redo, because nothing was ever unfiled.
 *
 * A scope naming a group that no longer exists shows everything rather than
 * nothing. It happens for one render after a group is deleted from the chip
 * that is currently on, and an empty grid there reads as "your projects are
 * gone".
 */
export function scopeProjects(
  worlds: readonly ListedWorld[],
  scope: LibraryScope,
  library: { groups: readonly ProjectGroup[]; archived: readonly ProjectRef[] },
): ListedWorld[] {
  if (scope === SCOPE_ARCHIVED) return worlds.filter((world) => hasRef(library.archived, world));

  const live = worlds.filter((world) => !hasRef(library.archived, world));
  if (scope === SCOPE_ALL) return live;

  const group = library.groups.find((candidate) => candidate.id === scope);
  if (!group) return live;
  return live.filter((world) => isInGroup(group, world));
}

/**
 * Whether a scope still names something that exists.
 *
 * The archive chip is only on screen while something is in it, and a group can
 * be deleted while its own chip is the one selected — both leave the screen
 * pointing at a chip that isn't there, and the answer to that is to fall back
 * to All rather than to draw a row with nothing pressed in it.
 */
export function isScopeAvailable(
  scope: LibraryScope,
  library: { groups: readonly ProjectGroup[]; archived: readonly ProjectRef[] },
): boolean {
  if (scope === SCOPE_ALL) return true;
  if (scope === SCOPE_ARCHIVED) return library.archived.length > 0;
  return library.groups.some((group) => group.id === scope);
}
