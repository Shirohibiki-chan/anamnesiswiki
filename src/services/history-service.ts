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
  /**
   * Names the one thing being edited — a field on a page, a meter in a block.
   * Consecutive entries carrying the same key fold into one; see mergeRepeat.
   * Absent means every call is its own entry, which is right for anything that
   * happens once per click.
   */
  mergeKey?: string;
  /** When it was recorded. Stamped by the store, and only read by the fold. */
  at?: number;
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

/**
 * Everything recorded since `depth` folded into one entry under a new label.
 *
 * For a click that reaches the user as one thing but is built out of two that
 * already record for themselves — making a page and pouring a template into
 * it. Composing the two is what keeps the picture copying and the disk writes
 * in one place with one set of tests; folding their entries afterwards is what
 * stops undo taking two presses to reverse one press.
 *
 * **Undone backwards, redone forwards.** The last thing done is the first
 * thing undone, or the reversal runs against a tree the other half hasn't put
 * back yet — a page's sub-pages have to go before the page does.
 *
 * `depth` is the stack's length read before the work started. One entry gets
 * folded too — it's still relabelled, so undo reads the same whether the click
 * happened to record once or twice; whether the built-in path or hers took an
 * extra step is not something the user should be able to feel. Nothing
 * recorded means nothing to do, which is also the honest answer when
 * `pushEntry`'s limit trimmed the stack in between and `depth` no longer
 * points where it did.
 */
export function collapseSince(stack: readonly HistoryEntry[], depth: number, label: string): HistoryEntry[] {
  if (depth < 0 || stack.length - depth < 1) return [...stack];
  const folded = stack.slice(depth);

  return [
    ...stack.slice(0, depth),
    {
      label,
      undo: async () => {
        for (const entry of [...folded].reverse()) await entry.undo();
      },
      redo: async () => {
        for (const entry of folded) await entry.redo();
      },
    },
  ];
}

/** "3 pages" / "1 page" — used to build labels, and easy to get wrong inline. */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * How long a run of edits to the same field keeps folding into one entry.
 *
 * The right-hand panel writes as the user moves rather than when they stop —
 * every keystroke in a text field, every pointer move on a meter — so without
 * this a sentence typed into Age is thirty entries and undo becomes a key you
 * hold down rather than a thing you press. Two seconds is a pause rather than
 * a hesitation: keep going and it stays one edit, stop to think and whatever
 * comes next is its own.
 *
 * **This is the panel's answer to a problem the tree never had.** Making a
 * page or dragging one is a discrete act that ends; typing does not, and an
 * undo stack that records the difference between two keystrokes is recording
 * something the user never did.
 */
export const HISTORY_MERGE_MS = 2000;

/**
 * The stack with `entry` folded into the one on top of it, or null if it does
 * not belong there.
 *
 * Two conditions and both are required: the same `mergeKey`, which names one
 * field on one page rather than a kind of edit, and inside the window. Anything
 * else — a different field, a different page, a gap — is a new entry.
 *
 * **The fold keeps the older undo and the newer redo**, which is the whole
 * point: a run of writes reverses to where the run started, not to the state
 * one keystroke ago. It keeps the newer label too, since a field renamed
 * mid-run should not be undone under its old name.
 */
export function mergeRepeat(
  stack: readonly HistoryEntry[],
  entry: HistoryEntry,
  now: number,
  window = HISTORY_MERGE_MS,
): HistoryEntry[] | null {
  if (entry.mergeKey === undefined) return null;

  const top = stack[stack.length - 1];
  if (!top || top.mergeKey !== entry.mergeKey || top.at === undefined) return null;
  if (now < top.at || now - top.at > window) return null;

  return [...stack.slice(0, -1), { ...entry, undo: top.undo, at: now }];
}
