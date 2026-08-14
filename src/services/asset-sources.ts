// Where each picture in the library came from, for the ones that came from
// somewhere. See constants/paths.ts ASSET_SOURCES_FILE for why this is keyed by
// filename and why it exists at all — the short version is that a `.lk` file
// holds addresses rather than pictures, so a picture imported from LegendKeeper
// can only be exported back to LegendKeeper if we remembered its address.
//
// Nothing here touches disk or React. The store owns when this is saved.
import { ASSET_REF_PREFIX } from "../constants/paths";

/** Keyed by the picture's filename, which is its id. The value is a URL. */
export type AssetSources = Record<string, string>;

export const createAssetSources = (): AssetSources => ({});

/**
 * Whatever is on disk, turned into something the app can trust.
 *
 * **Only `http(s)` survives.** This file sits in her project folder and is
 * hand-editable, and its values are written back out into an export as
 * addresses — so anything that isn't plainly a web address is dropped rather
 * than carried. A missing entry costs one picture in a re-export; a `file:` or
 * `javascript:` value carried through would be put somewhere it could be
 * followed.
 */
export function parseAssetSources(raw: unknown): AssetSources {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return createAssetSources();
  const sources: AssetSources = {};
  for (const [fileName, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "string") continue;
    if (!/^https?:\/\//i.test(value.trim())) continue;
    sources[fileName] = value.trim();
  }
  return sources;
}

/**
 * Remember where a picture came from.
 *
 * Returns the same object when nothing changed, so the store can skip a write —
 * the same contract the names and folders files have, and for the same reason:
 * a fresh object on every load would write the file on every project open.
 *
 * Recorded once, at the moment the file lands in `assets/`, and never revised.
 * A picture's origin is a fact about the past.
 */
export function recordAssetSource(sources: AssetSources, fileName: string, url: string): AssetSources {
  if (!/^https?:\/\//i.test(url) || sources[fileName] === url) return sources;
  return { ...sources, [fileName]: url };
}

/**
 * Drop entries for pictures that aren't there any more. Same contract as the
 * names and folders prunes, including returning the same object unchanged.
 */
export function pruneAssetSources(sources: AssetSources, present: ReadonlySet<string>): AssetSources {
  const kept = Object.keys(sources).filter((fileName) => present.has(fileName));
  if (kept.length === Object.keys(sources).length) return sources;
  const next: AssetSources = {};
  for (const fileName of kept) next[fileName] = sources[fileName];
  return next;
}

/**
 * The address behind an image block's `url`, or undefined for a picture that
 * has none to go back to.
 *
 * Takes the raw prop rather than a filename because that's what the exporter
 * holds. A block pointing at a web address already *is* an address and is
 * returned as-is — an embedded picture goes back to LK unchanged, since LK can
 * fetch it from the same place we do. Only an `anamnesis-asset:` reference
 * needs the lookup, and only an imported one will find anything.
 */
export function sourceUrlFor(sources: AssetSources, url: unknown): string | undefined {
  if (typeof url !== "string" || !url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith(ASSET_REF_PREFIX)) return undefined;
  return sources[url.slice(ASSET_REF_PREFIX.length)];
}
