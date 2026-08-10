// Where you've been, as a stack you can walk. Kept away from the store so the
// rules are testable without a project on disk — the store owns *when* a visit
// is recorded, this owns what the stack does when one is.
//
// This is not the undo history. `history-service.ts` reverses *edits*; this
// reverses *location*, and the two must never be wired to the same key or the
// same button. Pressing Back after renaming a page should take you to the page
// you were on before, with the rename intact.
//
// **Session-only, deliberately.** Nothing here is written to project.json.
// Reopening a project puts you back on the page you left, with nothing behind
// you — Back offering a page you last looked at nine days ago is a worse answer
// than Back being greyed out, and it would mean holding ids for pages that may
// not exist anymore across an app restart.

/**
 * A place you can be. `null` is a real location, not an absent one: it's the
 * project with nothing selected, which the breadcrumb's root link goes to and
 * which a delete can drop you into. Leaving it out would make Back a no-op from
 * exactly the position you most want to leave.
 */
export type NavLocation = string | null;

export type NavHistory = {
  /** Oldest first. */
  entries: NavLocation[];
  /** Where in `entries` you are now. -1 only while nothing has been visited. */
  index: number;
};

/**
 * How far back you can walk. Well past the point anyone keeps a mental thread —
 * this holds ids, not content, so the whole stack is a few kilobytes and the
 * cap is about the list staying meaningful rather than about memory.
 */
export const NAV_HISTORY_LIMIT = 50;

export const EMPTY_NAV_HISTORY: NavHistory = { entries: [], index: -1 };

export function locationAt(history: NavHistory): NavLocation {
  return history.index >= 0 ? history.entries[history.index] : null;
}

export function canGoBack(history: NavHistory): boolean {
  return history.index > 0;
}

export function canGoForward(history: NavHistory): boolean {
  return history.index >= 0 && history.index < history.entries.length - 1;
}

/**
 * Record arriving somewhere.
 *
 * Two rules, both of which exist because `selectNode` is called far more often
 * than the user actually goes anywhere:
 *
 * 1. **Arriving where you already are is not a visit.** The tree re-selects the
 *    current node whenever `selectedId` changes for any reason (see
 *    TreePanel's sync effect), so without this the stack would fill with the
 *    same id and Back would appear broken.
 * 2. **Going somewhere new after going back throws the forward stack away** —
 *    browser behaviour, and the only one that isn't surprising. You can't be in
 *    two futures at once.
 */
export function visit(history: NavHistory, location: NavLocation): NavHistory {
  if (history.index >= 0 && history.entries[history.index] === location) return history;
  const kept = history.entries.slice(0, history.index + 1);
  kept.push(location);
  const overflow = Math.max(0, kept.length - NAV_HISTORY_LIMIT);
  const entries = overflow > 0 ? kept.slice(overflow) : kept;
  return { entries, index: entries.length - 1 };
}

export function stepBack(history: NavHistory): NavHistory {
  return canGoBack(history) ? { entries: history.entries, index: history.index - 1 } : history;
}

export function stepForward(history: NavHistory): NavHistory {
  return canGoForward(history) ? { entries: history.entries, index: history.index + 1 } : history;
}

/**
 * Drop every trace of pages that no longer exist.
 *
 * **This is the part that has to be right.** A deleted page left in the stack
 * makes Back land on a blank page view with no way to tell what happened — the
 * same failure the store already guards `selectedId` and `homeNodeId` against.
 * Deletes cascade, so the caller passes the whole removed subtree, not just the
 * rows that were selected.
 *
 * Removing entries can leave the same location either side of the gap (A → B →
 * A, with B deleted), and two identical entries in a row make Back look broken
 * for the same reason rule 1 in `visit` exists. They collapse to one, and the
 * index rides along with whichever survivor it landed on.
 */
export function forgetNodes(history: NavHistory, removed: ReadonlySet<string>): NavHistory {
  if (removed.size === 0 || history.entries.length === 0) return history;

  const entries: NavLocation[] = [];
  let index = -1;

  history.entries.forEach((location, position) => {
    if (typeof location === "string" && removed.has(location)) return;
    const isDuplicate = entries.length > 0 && entries[entries.length - 1] === location;
    if (!isDuplicate) entries.push(location);
    // Everything at or before where you were drags the cursor along with it, so
    // it ends on the nearest survivor *behind* you rather than jumping forward
    // into pages you'd already backed out of.
    if (position <= history.index) index = entries.length - 1;
  });

  if (entries.length === 0) return EMPTY_NAV_HISTORY;
  // Every entry up to the cursor was deleted, so the nearest survivor is ahead.
  return { entries, index: index === -1 ? 0 : index };
}
