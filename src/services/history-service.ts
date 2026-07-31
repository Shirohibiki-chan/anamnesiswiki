// The undo stack's bookkeeping, kept away from the store so the rules are
// testable without a project on disk. The store owns *when* things are
// recorded; this owns what the stack does when they are.
//
// An entry is a pair of closures rather than a diff. The code performing an
// operation already knows how to reverse it and has the values to hand, and
// reversing it means calling the same store actions that are exercised every
// day — a diff would mean a second implementation of the filesystem
// relocation logic, which is the one part of this app that has already lost
// the user's pages once.

export type HistoryEntry = {
  /** Plain-language, past tense, shown as "Undid <label>". */
  label: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
};

/**
 * How many operations back you can go. Deep enough to cover a bad five
 * minutes, shallow enough that the closures — which hold whole deleted
 * subtrees, image bytes included — can't quietly become the largest thing in
 * memory.
 */
export const HISTORY_LIMIT = 25;

/** Oldest first, so the end of the array is the next thing to undo. */
export function pushEntry(stack: readonly HistoryEntry[], entry: HistoryEntry, limit = HISTORY_LIMIT): HistoryEntry[] {
  const next = [...stack, entry];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

/** "3 pages" / "1 page" — used to build labels, and easy to get wrong inline. */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
