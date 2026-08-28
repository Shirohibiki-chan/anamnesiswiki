// The rules for keeping old copies of a page: when one is due, what it is
// called, and which of the ones on disk should go (Phase 19).
//
// **Every decision here is pure, and that is the point.** This is the feature
// that exists because the app has already lost her pages once
// (`docs/handoff.md` §Storage), and the half of it that can be tested without a
// disk is the half where a mistake is silent — a retention rule that keeps the
// wrong end of the list throws away exactly the copy somebody came looking for.
// `filesystem-service.ts` does the reading and writing, as it does for
// everything else on disk; this says what it should do.
import { SNAPSHOT_INTERVAL_MS, SNAPSHOT_MAX_AGE_MS, SNAPSHOT_MAX_PER_NODE } from "../constants/limits";
import type { Node, Project } from "../constants/schema";

/** One copy on disk: the file's name, and when it was taken. */
export type Snapshot = {
  /** File name inside the node's history directory. */
  name: string;
  /** Epoch milliseconds, read back out of the name. */
  at: number;
};

const SUFFIX = ".json";

/**
 * The name a copy taken at this instant gets.
 *
 * An ISO timestamp with the characters Windows refuses (`:`) and the one that
 * would look like a second extension (`.`) swapped for `-`. Sorting the names
 * as strings therefore sorts them by time, which is what makes listing a
 * directory enough — no index file to keep in step, and nothing to rebuild if
 * one goes missing.
 */
export function snapshotName(at: number): string {
  return `${new Date(at).toISOString().replace(/[:.]/g, "-")}${SUFFIX}`;
}

/**
 * The instant a name describes, or null if it isn't one of ours.
 *
 * Anything unreadable is *not* treated as ancient and quietly deleted — it is
 * dropped from the list and left alone on disk. This directory is inside her
 * project, and a folder the app prunes is a folder that must never delete a
 * file it does not understand.
 */
export function snapshotTime(name: string): number | null {
  if (!name.endsWith(SUFFIX)) return null;
  const stem = name.slice(0, -SUFFIX.length);
  // 2026-08-27T05-12-03-123Z → 2026-08-27T05:12:03.123Z
  const iso = stem.replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "$1:$2:$3.$4Z");
  if (iso === stem) return null;
  const at = Date.parse(iso);
  return Number.isNaN(at) ? null : at;
}

/** The copies in a directory listing, newest first, with anything foreign dropped. */
export function readSnapshots(names: readonly string[]): Snapshot[] {
  const found: Snapshot[] = [];
  for (const name of names) {
    const at = snapshotTime(name);
    if (at !== null) found.push({ name, at });
  }
  return found.sort((a, b) => b.at - a.at);
}

/**
 * Is a copy due?
 *
 * **A page with no history is always due**, which is what puts a copy of the
 * state before the first edit of a session on disk. A clock that has gone
 * backwards (a machine correcting its time, a file synced from somewhere else)
 * also counts as due rather than never: the alternative is a page that stops
 * being copied until the clock catches up.
 */
export function isSnapshotDue(lastAt: number | null, now: number, interval = SNAPSHOT_INTERVAL_MS): boolean {
  if (lastAt === null) return true;
  if (now < lastAt) return true;
  return now - lastAt >= interval;
}

/**
 * The instant to stamp the next copy with.
 *
 * **Never the same as the last one, even inside a millisecond.** The name is
 * the identity — there is no index file — so two copies stamped identically
 * are one copy, and the older of the pair is gone. That is not hypothetical:
 * a save immediately followed by a delete takes two copies in the same tick,
 * and the delete's copy would land on top of the save's.
 *
 * Stepping forward by a millisecond rather than adding a counter keeps the
 * name sortable, which is the property the whole scheme rests on.
 */
export function nextSnapshotAt(lastAt: number | null, now: number): number {
  if (lastAt === null) return now;
  return Math.max(now, lastAt + 1);
}

/**
 * Which copies to delete, given everything currently in one node's directory.
 *
 * Two rules, and the count is applied after the age so the two cannot argue:
 * anything older than `maxAge` goes, and then anything past `maxPerNode` from
 * the top of what is left.
 *
 * **The newest copy is never returned**, whatever the numbers say. A rule that
 * can empty the directory is a rule that turns "I have not touched this page in
 * a year" into "there is nothing to go back to", which is the exact moment
 * somebody needs it.
 */
export function snapshotsToPrune(
  snapshots: readonly Snapshot[],
  now: number,
  options: { maxAge?: number; maxPerNode?: number } = {},
): Snapshot[] {
  const maxAge = options.maxAge ?? SNAPSHOT_MAX_AGE_MS;
  const maxPerNode = options.maxPerNode ?? SNAPSHOT_MAX_PER_NODE;

  const newestFirst = [...snapshots].sort((a, b) => b.at - a.at);
  const keepAtLeast = newestFirst.slice(0, 1);
  const rest = newestFirst.slice(1);

  const withinAge = rest.filter((snapshot) => now - snapshot.at < maxAge);
  const tooOld = rest.filter((snapshot) => now - snapshot.at >= maxAge);
  const overCount = withinAge.slice(Math.max(0, maxPerNode - keepAtLeast.length));

  return [...tooOld, ...overCount];
}

/**
 * What the README beside the copies says.
 *
 * Written as a file rather than only in the app, because the promise this
 * project makes is that her writing is legible without it — and somebody who
 * finds this folder in a backup should be able to work out what it is and use
 * it with nothing but a text editor.
 */
export function historyReadme(): string {
  return [
    "This folder holds old copies of your pages, kept by Anamnesis.",
    "",
    "Each folder in here is named after one page's internal id, and each file",
    "inside it is a copy of that page as it was at the time in its filename.",
    "They are ordinary JSON files: the page's name is inside, near the top.",
    "",
    "The folder called 'project' is the same thing for project.json, which",
    "holds the order of the tree, the home page and the pinned pages.",
    "",
    "A copy is taken before a page is saved, at most once every few minutes,",
    "and before a page is deleted. Old ones are cleared out automatically.",
    "",
    "Deleting this folder loses the history and nothing else. Your pages are",
    "the .json files in the folders above this one.",
  ].join("\n");
}

/**
 * What a node keeps when an old copy of it is restored.
 *
 * **Where it is in the tree is not history.** `parentId` stays, so restoring
 * never moves a page — a copy taken before somebody dragged the page into
 * another folder would otherwise drag it back, which is a structural change
 * nobody asked for and one the relocation planner, not this, is responsible
 * for. `id` and `createdAt` stay because they are the page's identity rather
 * than its contents.
 *
 * **`templateKey` stays too, and that one is a real limitation.** A template
 * decides whether a node is stored as a file or as a directory of its own
 * (`alwaysDirectory`), so restoring one across a template change is a move on
 * disk wearing a content edit's clothes. Restoring what a page *said* is worth
 * having without that; changing what kind of page it is can be done afterwards
 * and deliberately.
 *
 * **`name` is not here either**, and for a different reason: a rename is a
 * file rename, which is `renameNode`'s job — see `use-page-history.ts`, which
 * asks for both and folds them into one undo.
 */
const KEPT_FROM_CURRENT = new Set(["id", "parentId", "templateKey", "createdAt", "updatedAt", "name"]);

/**
 * The patch that turns the current node back into the copy.
 *
 * **A field the copy does not have is set to `undefined`, not left alone.**
 * Restoring is "make it look like it did", and a page that had no colour then
 * and has one now has to come back without it — a patch that only carries what
 * the copy *has* would leave every field added since sitting on top of the
 * restored version. `JSON.stringify` drops `undefined`, so what lands on disk
 * is the old file again.
 */
export function restorePatch(current: Node, copy: Node): Partial<Omit<Node, "id">> {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(copy) as (keyof Node)[]) {
    if (KEPT_FROM_CURRENT.has(key)) continue;
    patch[key] = copy[key];
  }
  for (const key of Object.keys(current) as (keyof Node)[]) {
    if (KEPT_FROM_CURRENT.has(key) || key in patch) continue;
    patch[key] = undefined;
  }
  return patch as Partial<Omit<Node, "id">>;
}


/**
 * What the project keeps when an old copy of `project.json` is restored.
 *
 * **Only the arrangement comes back.** A world's identity (`id`,
 * `forkedFromId`), its name, when it was made and the picture the start screen
 * draws for it are not what this feature is for, and two of them are worse than
 * useless here: the id is what every in-world reference is written against, and
 * the name is the folder on disk, which is a rename rather than an edit and
 * belongs to the code that can move a directory.
 *
 * `selectedId` and `selectedName` stay too. Which page she had open an hour ago
 * is a fact about that hour, not something to be put back underneath her.
 */
const PROJECT_KEPT_FROM_CURRENT = new Set([
  "version",
  "id",
  "forkedFromId",
  "name",
  "createdAt",
  "coverImage",
  "selectedId",
  "selectedName",
]);

/** The ids a restored arrangement is allowed to mention. */
export type KnownIds = { has: (id: string) => boolean };

/**
 * The patch that puts the tree's arrangement back to what a copy recorded.
 *
 * **Every id in the copy is checked against the pages that exist now**, which
 * is the difference between this and `restorePatch`. A copy from last week
 * remembers pages that have since been deleted, and putting its lists back
 * verbatim would leave the tree ordered around pages that aren't there, a home
 * button pointing at nothing and a rail of pins that open blank. Filtering is
 * not a tidy-up here; it is what stops a restore breaking invariants the rest
 * of the app relies on (see `homeNodeId` in schema.ts).
 *
 * Pages made *since* the copy are not mentioned by it at all, and they are not
 * lost by that: an id missing from `rootOrder` falls back to creation order,
 * the same way a world that has never been reordered works.
 */
export function restoreProjectPatch(current: Project, copy: Project, known: KnownIds): Partial<Project> {
  const ids = (list: readonly string[] | undefined): string[] | undefined =>
    list?.filter((id) => known.has(id));

  const childOrder = copy.childOrder
    ? Object.fromEntries(
        Object.entries(copy.childOrder)
          .filter(([parentId]) => known.has(parentId))
          .map(([parentId, order]) => [parentId, order.filter((id) => known.has(id))]),
      )
    : undefined;

  const patch: Record<string, unknown> = {
    rootOrder: ids(copy.rootOrder) ?? [],
    childOrder,
    homeNodeId: copy.homeNodeId && known.has(copy.homeNodeId) ? copy.homeNodeId : null,
    pinnedIds: ids(copy.pinnedIds),
    expandedIds: ids(copy.expandedIds) ?? [],
  };

  // The same rule `restorePatch` follows: a field the copy did not have is
  // cleared rather than left standing, so restoring is "make it look like it
  // did" rather than "merge what it happened to mention".
  for (const key of Object.keys(current) as (keyof Project)[]) {
    if (PROJECT_KEPT_FROM_CURRENT.has(key) || key in patch) continue;
    patch[key] = undefined;
  }

  return patch as Partial<Project>;
}
