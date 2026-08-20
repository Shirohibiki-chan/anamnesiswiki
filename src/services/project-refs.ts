// How app settings point at a project, and how a stored pointer is matched
// back to one the scan found.
//
// Pins asked this question first and answered it well; groups and the archive
// ask exactly the same one. Three copies of "is this stored thing the same
// project as that listed thing" is three chances to answer it differently, and
// the failure looks like a project quietly losing its group after a rename —
// so the rule lives here once and `pins.ts` is built on it.
//
// **A pointer is a record, not a bare id.** Ids are minted when a project is
// *opened*, so a project the scan found and she has never opened has none —
// and those are exactly the projects the library was built to surface.
// Refusing to file one into a group would make groups useless for them.
import { isSameProjectPath, type ListedWorld } from "./world-scan";

/**
 * One project as app settings remember it.
 *
 * The name is stored alongside so a pointer can be *named* when its folder
 * wouldn't read just now — an external drive that isn't plugged in. Nothing
 * on screen draws a project's name from here when the listing has it, so a
 * renamed project shows its new name everywhere it is actually found.
 */
export type ProjectRef = {
  id: string | null;
  path: string;
  name: string;
};

export function refFor(world: ListedWorld): ProjectRef {
  return { id: world.id, path: world.path, name: world.name };
}

/**
 * Whether a stored pointer and a listed project are the same project.
 *
 * **The id decides when both have one**, which is the whole reason ids exist:
 * a project keeps its pin, its groups and its archive state through a move or
 * a rename. The path is the fallback for a project that has never been opened
 * and so has no id anywhere — not a second opinion about identity, but the
 * only opinion available. Same shape as `coverFor`, which falls back the same
 * way for the same reason.
 */
export function matchesRef(ref: ProjectRef, world: ListedWorld): boolean {
  if (ref.id !== null && world.id !== null) return ref.id === world.id;
  return isSameProjectPath(ref.path, world.path);
}

export function hasRef(refs: readonly ProjectRef[], world: ListedWorld): boolean {
  return refs.some((ref) => matchesRef(ref, world));
}

/** Appended, not prepended: a new entry goes at the end, where she put it. */
export function addRef(refs: readonly ProjectRef[], world: ListedWorld): ProjectRef[] {
  if (hasRef(refs, world)) return [...refs];
  return [...refs, refFor(world)];
}

export function removeRef(refs: readonly ProjectRef[], world: ListedWorld): ProjectRef[] {
  return refs.filter((ref) => !matchesRef(ref, world));
}

export function toggleRef(refs: readonly ProjectRef[], world: ListedWorld): ProjectRef[] {
  return hasRef(refs, world) ? removeRef(refs, world) : addRef(refs, world);
}

/**
 * The projects a list of pointers resolves to, in the order stored.
 *
 * **A pointer that resolves to nothing is skipped, never dropped.** Its
 * project is on a drive that isn't plugged in as often as it is gone, and
 * forgetting the entry because a folder didn't read once would quietly empty
 * a row or a group she arranged. Removing one is something she does on
 * purpose.
 */
export function resolveRefs(refs: readonly ProjectRef[], worlds: readonly ListedWorld[]): ListedWorld[] {
  const found: ListedWorld[] = [];
  for (const ref of refs) {
    const world = worlds.find((candidate) => matchesRef(ref, candidate));
    if (world) found.push(world);
  }
  return found;
}

/**
 * The pointers with whatever the listing has since learned written back into
 * them, or `null` when there is nothing to learn.
 *
 * Two things drift. A project filed away before it was ever opened has no id
 * in its pointer; the first time she opens it, it gains one, and the pointer
 * has to pick that up or it stays keyed on a path forever. And a project
 * matched by id may have moved or been renamed since, which leaves a stale
 * path and name — harmless while the id matches, and the only thing left to
 * match on if the id ever goes missing.
 *
 * Returns `null` rather than an equal copy so the caller can skip the write.
 * This runs on every scan, and a settings file rewritten every few seconds for
 * no change is a file that will eventually be rewritten during a crash.
 */
export function healRefs(refs: readonly ProjectRef[], worlds: readonly ListedWorld[]): ProjectRef[] | null {
  let changed = false;
  const healed = refs.map((ref) => {
    const world = worlds.find((candidate) => matchesRef(ref, candidate));
    if (!world) return ref;
    const next = { id: world.id ?? ref.id, path: world.path, name: world.name };
    if (next.id === ref.id && next.path === ref.path && next.name === ref.name) return ref;
    changed = true;
    return next;
  });
  return changed ? healed : null;
}

/**
 * Whether something read back out of the settings file is a usable pointer.
 *
 * Settings are an ordinary JSON file that outlives the version that wrote it,
 * so every reader of one is defensive — and one malformed entry must not cost
 * her the rest of the list it was in.
 */
export function isProjectRef(value: unknown): value is ProjectRef {
  if (typeof value !== "object" || value === null) return false;
  const ref = value as ProjectRef;
  return (
    typeof ref.path === "string" &&
    typeof ref.name === "string" &&
    (typeof ref.id === "string" || ref.id === null)
  );
}
