// Which pictures have been taken out of the library while still being used by a
// page. See constants/paths.ts ASSET_REMOVED_FILE for why this exists and why
// it's usually empty.
//
// Nothing here touches disk or React. The store owns when this is saved.

/** Filenames, in no particular order. Membership is the whole meaning. */
export type RemovedAssets = string[];

export const createRemovedAssets = (): RemovedAssets => [];

/**
 * Whatever is on disk, turned into something the app can trust.
 *
 * Anything that isn't a plain array of strings reads as "nothing is removed",
 * which is the state every project starts in — and the safe failure, since the
 * cost is a picture visible in the library that she'd hidden, not a picture
 * missing from a page.
 */
export function parseRemovedAssets(raw: unknown): RemovedAssets {
  if (!Array.isArray(raw)) return createRemovedAssets();
  return [...new Set(raw.filter((entry): entry is string => typeof entry === "string" && entry.length > 0))];
}

/**
 * Take a picture out of the library.
 *
 * Returns the same array when it was already out, so the store can skip a
 * write — the same contract the names, folders and sources files have.
 */
export function removeAsset(removed: RemovedAssets, fileName: string): RemovedAssets {
  if (removed.includes(fileName)) return removed;
  return [...removed, fileName];
}

/** Put one back, which is what undoing a removal does. */
export function restoreAsset(removed: RemovedAssets, fileName: string): RemovedAssets {
  if (!removed.includes(fileName)) return removed;
  return removed.filter((entry) => entry !== fileName);
}

export function isAssetRemoved(removed: RemovedAssets, fileName: string): boolean {
  return removed.includes(fileName);
}

/**
 * Drop names whose file is no longer there.
 *
 * This is how an entry ends its life. A picture stays listed here only while
 * some page still needs its bytes; once the last page lets go, `releaseAsset`
 * deletes the file and the next sweep clears the name — so the file doesn't
 * accumulate the history of everything ever removed.
 *
 * Same contract as the other three, including returning the *same array* when
 * there's nothing to drop, so opening a project doesn't rewrite the file.
 */
export function pruneRemovedAssets(removed: RemovedAssets, present: ReadonlySet<string>): RemovedAssets {
  const kept = removed.filter((fileName) => present.has(fileName));
  return kept.length === removed.length ? removed : kept;
}
