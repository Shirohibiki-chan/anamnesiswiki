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

/**
 * The MIME type for a picture's filename, for building a `data:` URI.
 *
 * A short list rather than a lookup library: these are the formats the upload
 * path accepts, and an unknown extension gets `application/octet-stream`, which
 * a browser refuses to draw. That refusal is the right outcome — a picture
 * labelled as the wrong format would be a broken image somewhere else, later,
 * with nothing pointing back to here.
 */
const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

/**
 * A picture's bytes as a `data:` URI — the whole file written into an address.
 *
 * **This is what lets a picture uploaded here travel inside a `.lk`.** The
 * format stores addresses rather than data, so the only way to carry a file
 * from her disk is to make the file *be* the address. Verified against a real
 * LegendKeeper account 2026-08-14, for both media types LK writes.
 *
 * Costs a third in size on top of the file, and gzip won't win it back on a
 * PNG or a JPEG that is already compressed — which is why the caller asks
 * before doing this rather than doing it always.
 */
export function dataUriFor(fileName: string, bytes: Uint8Array): string {
  const extension = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
  const mime = MIME_BY_EXTENSION[extension] ?? "application/octet-stream";

  // Chunked rather than one spread into String.fromCharCode: a multi-megabyte
  // picture is millions of arguments in one call, which overflows the stack.
  let binary = "";
  const CHUNK = 0x8000;
  for (let at = 0; at < bytes.length; at += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(at, at + CHUNK));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}
