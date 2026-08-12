// What each picture in the library is called.
//
// A name is a *label on a file*, never the file's own name — the same shape as
// folders, for the same reason. See constants/paths.ts ASSET_NAMES_FILE: the
// filename is a UUID that every page showing the picture holds, so renaming the
// file would mean rewriting all of them, and a rewrite that stops halfway is a
// broken picture on a page nobody was looking at.
//
// Nothing here touches disk or React. The store owns when this is saved.
import { ASSET_REF_PREFIX } from "../constants/paths";

/** Keyed by the picture's filename, which is its id. */
export type AssetNames = Record<string, string>;

export const createAssetNames = (): AssetNames => ({});

/**
 * A name is the one thing here a user typed, so it takes the same treatment as
 * a page title: trimmed, and refused if that leaves nothing. An empty string
 * would render as a blank strip that still looks like a name box.
 *
 * Capped well above anything anyone types deliberately, and only to stop a
 * pasted paragraph becoming a name — the tile clamps what it draws, but the
 * file would still carry the paragraph forever.
 */
export const MAX_ASSET_NAME = 120;

/**
 * Whatever is on disk, turned into something the app can trust.
 *
 * Anything that isn't a string keyed by a string is dropped rather than
 * repaired: this file is hand-editable and sits in her project folder, and a
 * half-understood entry is worse than a missing one — a missing name shows an
 * unnamed picture, which is the state everything starts in anyway.
 */
export function parseAssetNames(raw: unknown): AssetNames {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return createAssetNames();
  const names: AssetNames = {};
  for (const [fileName, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, MAX_ASSET_NAME);
    if (trimmed) names[fileName] = trimmed;
  }
  return names;
}

/**
 * Name a picture, or take its name away with an empty string.
 *
 * Returns the same object when nothing changed, so the store can skip a write
 * — committing a name box without editing it is the common case, and it
 * shouldn't touch the disk.
 */
export function nameAsset(names: AssetNames, fileName: string, name: string): AssetNames {
  const trimmed = name.trim().slice(0, MAX_ASSET_NAME);
  const current = names[fileName];
  if (trimmed === (current ?? "")) return names;
  const next = { ...names };
  if (trimmed) next[fileName] = trimmed;
  else delete next[fileName];
  return next;
}

/**
 * Drop names for pictures that aren't there any more.
 *
 * Same contract as the folders' prune, including returning the *same object*
 * when there's nothing to drop: the store writes only when this changes, and a
 * fresh object every load would write the file on every project open.
 */
export function pruneAssetNames(names: AssetNames, present: ReadonlySet<string>): AssetNames {
  const kept = Object.keys(names).filter((fileName) => present.has(fileName));
  if (kept.length === Object.keys(names).length) return names;
  const next: AssetNames = {};
  for (const fileName of kept) next[fileName] = names[fileName];
  return next;
}

/**
 * The name a tile shows, or "" for a picture that hasn't got one.
 *
 * The fallback is deliberately empty rather than the filename. A filename here
 * is a UUID — 36 characters of hex that identify the file to the app and to
 * nobody else — and printing that over the picture is worse than printing
 * nothing, because it looks like an answer.
 */
export function assetDisplayName(names: AssetNames, fileName: string): string {
  return names[fileName] ?? "";
}

/**
 * A name suggested by the file she picked, for a fresh upload.
 *
 * Just the stem: "Valera sword.png" becomes "Valera sword". The extension is a
 * fact about the format and the tile has no room to spend on it — and the
 * picture is right there, so nobody is reading the caption to find out whether
 * it's a PNG.
 *
 * Only ever a *starting* name. It's written into the names file at upload and
 * is hers to change from that moment; nothing re-derives it later.
 */
export function suggestedAssetName(originalFileName: string): string {
  const stem = originalFileName.replace(/\.[^.\\/]+$/, "");
  return stem.trim().slice(0, MAX_ASSET_NAME);
}

/**
 * A picture's name for searching and sorting, which is the name if it has one
 * and the empty string otherwise — so unnamed pictures group together rather
 * than scattering through the list under their UUIDs.
 */
export function sortKey(names: AssetNames, fileName: string): string {
  return assetDisplayName(names, fileName).toLocaleLowerCase();
}

/**
 * The filename inside an `anamnesis-asset:` reference, for callers holding a
 * reference rather than a listing entry.
 *
 * Here rather than imported from asset-urls.ts so this file stays free of
 * anything that resolves a picture to something displayable — this one is
 * about text.
 */
export function fileNameOfRef(ref: string): string | null {
  return ref.startsWith(ASSET_REF_PREFIX) ? ref.slice(ASSET_REF_PREFIX.length) : null;
}
