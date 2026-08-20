// Which projects sit at the top of the start screen, and in what order.
//
// All of it pure, and all of it a list rather than a flag on a project: the
// order *is* the feature — pinning without arranging is a favourites list that
// sorts itself, which is the thing the row exists to escape.
//
// Identity is `project-refs.ts`'s job, not this file's. A pin is one of its
// records because a project may not have an id yet — ids are minted when a
// project is opened — and groups and the archive key on projects the same way
// for the same reason. What's left here is the part that is only about pins:
// their order.
import type { ListedWorld } from "./world-scan";
import {
  addRef,
  hasRef,
  healRefs,
  matchesRef,
  refFor,
  removeRef,
  resolveRefs,
  type ProjectRef,
} from "./project-refs";

/** One pinned project, as app settings remember it. See `ProjectRef`. */
export type Pin = ProjectRef;

export const pinFor = refFor;
export const matchesPin = matchesRef;
export const isPinned = hasRef;
export const addPin = addRef;
export const removePin = removeRef;
export const resolvePins = resolveRefs;
export const healPins = healRefs;

/** Moves one pin to a new index, closing the gap behind it. */
export function movePin(pins: readonly Pin[], from: number, to: number): Pin[] {
  if (from === to || from < 0 || to < 0 || from >= pins.length || to >= pins.length) return [...pins];
  const next = [...pins];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Everything not pinned, in the order it was given. */
export function unpinned(pins: readonly Pin[], worlds: readonly ListedWorld[]): ListedWorld[] {
  return worlds.filter((world) => !isPinned(pins, world));
}
