// Groups on the start screen: a project filed under a name she chose.
//
// **Groups are in the app, not folders on disk** (her call, 2026-08-14).
// Real folders were considered and rejected, correctly: projects already sit
// at mixed depths, group directories would add another level for the scan to
// disambiguate, and organising would mean leaving for File Explorer. So a
// group is app state keyed on the project — which is what lets it survive a
// project being moved or renamed, and what keeps it from competing with pins
// and the archive, since none of the three is a location.
//
// **Membership lives inside the group rather than as a list of groups on each
// project.** A group has an order and a name of its own, and the screen always
// asks "what is in this group" rather than "what groups is this in" — except
// in the one menu that ticks them, which is a scan of at most a handful of
// groups. Storing it the other way round would mean the group's own name and
// order had nowhere to live.
import { MAX_GROUP_NAME_CHARS } from "../constants/limits";
import {
  hasRef,
  healRefs,
  isProjectRef,
  refFor,
  toggleRef,
  type ProjectRef,
} from "./project-refs";
import type { ListedWorld } from "./world-scan";

export type ProjectGroup = {
  id: string;
  name: string;
  members: ProjectRef[];
};

/**
 * A name fit to store, or `null` if there is nothing to store.
 *
 * Trimmed because a chip is drawn from it and leading space reads as a
 * misaligned chip; capped because the chip row is a row and one name is not
 * allowed to be the whole of it.
 */
export function cleanGroupName(name: string): string | null {
  const trimmed = name.trim().slice(0, MAX_GROUP_NAME_CHARS).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * A new group, appended.
 *
 * Appended rather than sorted by name, for the reason the pinned row is:
 * where a thing she made goes is her decision, and a list that rearranges
 * itself the moment she names something is a list she has to re-read.
 *
 * A blank name makes no group and returns the same list — the caller is a text
 * box, and an empty text box submitted by accident should cost nothing.
 *
 * **The first member can be passed in**, because the menu that makes most
 * groups is a project's own: naming a new group there means "file this one
 * under that", and handing back a group id for the caller to then file into
 * would be two steps for one intention — and a step that can be skipped is a
 * project that quietly didn't land in the group she just made for it.
 */
export function createGroup(
  groups: readonly ProjectGroup[],
  name: string,
  first?: ListedWorld,
): ProjectGroup[] {
  const cleaned = cleanGroupName(name);
  if (!cleaned) return [...groups];
  return [...groups, { id: crypto.randomUUID(), name: cleaned, members: first ? [refFor(first)] : [] }];
}

export function renameGroup(groups: readonly ProjectGroup[], id: string, name: string): ProjectGroup[] {
  const cleaned = cleanGroupName(name);
  if (!cleaned) return [...groups];
  return groups.map((group) => (group.id === id ? { ...group, name: cleaned } : group));
}

/**
 * Deletes the group, never what is in it.
 *
 * Worth being explicit about because the two are one click apart in the menu:
 * a group is a label, so removing it removes a label. Nothing on disk is
 * touched, and every project in it is still in the library the moment after.
 */
export function deleteGroup(groups: readonly ProjectGroup[], id: string): ProjectGroup[] {
  return groups.filter((group) => group.id !== id);
}

/** In or out of one group, leaving every other group alone. */
export function toggleGroupMember(
  groups: readonly ProjectGroup[],
  id: string,
  world: ListedWorld,
): ProjectGroup[] {
  return groups.map((group) => (group.id === id ? { ...group, members: toggleRef(group.members, world) } : group));
}

export function isInGroup(group: ProjectGroup, world: ListedWorld): boolean {
  return hasRef(group.members, world);
}

/**
 * Which groups a project is filed under, in the order the groups are in.
 *
 * **A group is a filter over the library rather than an arrangement of it.**
 * What order projects come out in is the sort pill's answer, on every chip —
 * a group that imposed its own would make that pill lie on all but All. So
 * membership is only ever asked as a yes or no, here and in `library-scope`.
 */
export function groupsOf(groups: readonly ProjectGroup[], world: ListedWorld): ProjectGroup[] {
  return groups.filter((group) => isInGroup(group, world));
}

/** `healRefs`, applied to every group's membership. Null when nothing drifted. */
export function healGroups(
  groups: readonly ProjectGroup[],
  worlds: readonly ListedWorld[],
): ProjectGroup[] | null {
  let changed = false;
  const healed = groups.map((group) => {
    const members = healRefs(group.members, worlds);
    if (!members) return group;
    changed = true;
    return { ...group, members };
  });
  return changed ? healed : null;
}

/** Read defensively out of the settings file — see `isProjectRef`. */
export function isProjectGroup(value: unknown): value is ProjectGroup {
  if (typeof value !== "object" || value === null) return false;
  const group = value as ProjectGroup;
  return (
    typeof group.id === "string" &&
    typeof group.name === "string" &&
    Array.isArray(group.members) &&
    group.members.every(isProjectRef)
  );
}
