// Which projects sit at the top of the start screen, and in what order.
//
// All of it pure, and all of it a list rather than a flag on a project: the
// order *is* the feature — pinning without arranging is a favourites list that
// sorts itself, which is the thing the row exists to escape.
//
// A pin is a record rather than a bare id because a project may not have an id
// yet. Ids are minted when a project is opened, so a project the scan found and
// she has never opened has none, and refusing to pin it would make the pinned
// row unusable for exactly the projects the library was built to surface.
import { isSameProjectPath, type ListedWorld } from "./world-scan";

/**
 * One pinned project, as app settings remember it.
 *
 * The name is stored alongside for the manage window, which has to be able to
 * name a pin whose folder wouldn't read just now — an external drive that
 * isn't plugged in. Nothing else reads it; the row draws the name off the
 * listing, so a renamed project shows its new name there.
 */
export type Pin = {
  id: string | null;
  path: string;
  name: string;
};

export function pinFor(world: ListedWorld): Pin {
  return { id: world.id, path: world.path, name: world.name };
}

/**
 * Whether a pin and a listed project are the same project.
 *
 * **The id decides when both have one**, which is the whole reason ids exist:
 * a project keeps its pin through a move or a rename. The path is the fallback
 * for a project that has never been opened and so has no id anywhere — not a
 * second opinion about identity, but the only opinion available. Same shape as
 * `coverFor`, which falls back the same way for the same reason.
 */
export function matchesPin(pin: Pin, world: ListedWorld): boolean {
  if (pin.id !== null && world.id !== null) return pin.id === world.id;
  return isSameProjectPath(pin.path, world.path);
}

export function isPinned(pins: readonly Pin[], world: ListedWorld): boolean {
  return pins.some((pin) => matchesPin(pin, world));
}

/** Appended, not prepended: a new pin goes at the end, where she put it. */
export function addPin(pins: readonly Pin[], world: ListedWorld): Pin[] {
  if (isPinned(pins, world)) return [...pins];
  return [...pins, pinFor(world)];
}

export function removePin(pins: readonly Pin[], world: ListedWorld): Pin[] {
  return pins.filter((pin) => !matchesPin(pin, world));
}

/** Moves one pin to a new index, closing the gap behind it. */
export function movePin(pins: readonly Pin[], from: number, to: number): Pin[] {
  if (from === to || from < 0 || to < 0 || from >= pins.length || to >= pins.length) return [...pins];
  const next = [...pins];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * The pinned projects, in pin order, as the listing knows them.
 *
 * **A pin that resolves to nothing is skipped, never dropped.** Its project is
 * on a drive that isn't plugged in as often as it is gone, and forgetting a pin
 * because a folder didn't read once would quietly empty the row she arranged.
 * The pin stays in settings; only the card goes missing, and it comes back with
 * the drive. Removing one is something she does on purpose in the manage
 * window.
 */
export function resolvePins(pins: readonly Pin[], worlds: readonly ListedWorld[]): ListedWorld[] {
  const found: ListedWorld[] = [];
  for (const pin of pins) {
    const world = worlds.find((candidate) => matchesPin(pin, candidate));
    if (world) found.push(world);
  }
  return found;
}

/** Everything not pinned, in the order it was given. */
export function unpinned(pins: readonly Pin[], worlds: readonly ListedWorld[]): ListedWorld[] {
  return worlds.filter((world) => !isPinned(pins, world));
}

/**
 * The pins with whatever the listing has since learned written back into them,
 * or `null` when there is nothing to learn.
 *
 * Two things drift. A project pinned before it was ever opened has no id in its
 * pin; the first time she opens it, it gains one, and the pin has to pick that
 * up or it stays keyed on a path forever. And a project matched by id may have
 * moved or been renamed since, which leaves a stale path and name in the pin —
 * harmless while the id matches, and the only thing left to match on if the id
 * ever goes missing.
 *
 * Returns `null` rather than an equal copy so the caller can skip the write.
 * This runs on every scan, and a settings file rewritten every few seconds for
 * no change is a file that will eventually be rewritten during a crash.
 */
export function healPins(pins: readonly Pin[], worlds: readonly ListedWorld[]): Pin[] | null {
  let changed = false;
  const healed = pins.map((pin) => {
    const world = worlds.find((candidate) => matchesPin(pin, candidate));
    if (!world) return pin;
    const next = { id: world.id ?? pin.id, path: world.path, name: world.name };
    if (next.id === pin.id && next.path === pin.path && next.name === pin.name) return pin;
    changed = true;
    return next;
  });
  return changed ? healed : null;
}
