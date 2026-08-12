// Turns the `anamnesis-asset:<filename>` references stored in a page's image
// blocks (see constants/paths.ts's ASSET_REF_PREFIX) into something the
// webview will actually display, and back again.
//
// Why a cache rather than a read per render: BlockNote calls `resolveFileUrl`
// every time it renders a file block, and each call would otherwise read the
// file off disk again and mint a second object URL for the same bytes. A page
// with six portraits, re-rendered on every keystroke, would leak an object URL
// per picture per character typed — object URLs live until they're revoked or
// the page is unloaded, so nothing would ever reclaim them.
//
// Keyed by project root as well as filename, because the same filename in two
// projects is two different pictures, and switching projects must not show the
// old one.
import { ASSET_REF_PREFIX } from "../constants/paths";
import { readAssetImage } from "./filesystem-service";

const cache = new Map<string, string>();
// Reads in flight, so two blocks pointing at one picture don't both read it.
const pending = new Map<string, Promise<string>>();

function cacheKey(rootPath: string, fileName: string): string {
  return JSON.stringify([rootPath, fileName]);
}

export function assetRef(fileName: string): string {
  return `${ASSET_REF_PREFIX}${fileName}`;
}

/**
 * The extension to store a picked file under. Its own name first, since that's
 * what the user will recognise if they ever look in `assets/`, falling back to
 * the half of the MIME type that names the format.
 *
 * Components can't reach this file — CLAUDE.md's layer order — so ImageSlot and
 * PageBanner each carried their own copy of it. Both now go through
 * services/image-file.ts's `readImageFile`, which calls this one, via the
 * upload hook in use-assets.ts.
 */
export function extensionFor(file: File): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  if (match) return match[1].toLowerCase();
  return file.type.split("/")[1] ?? "png";
}

export function isAssetRef(url: string): boolean {
  return url.startsWith(ASSET_REF_PREFIX);
}

/** The filename inside an asset reference, or null if this isn't one. */
export function assetFileName(url: string): string | null {
  return isAssetRef(url) ? url.slice(ASSET_REF_PREFIX.length) : null;
}

/**
 * A displayable URL for whatever a page's image block is pointing at.
 *
 * Anything that isn't one of our references comes back untouched — that's a
 * web address or a data URL, and it is not this function's business to decide
 * whether it should be loaded. (Nothing in the app writes one; see
 * ASSET_REF_PREFIX.)
 *
 * A file that won't read resolves to the reference itself rather than
 * throwing. The block then renders as a broken picture, which is the honest
 * outcome — a picture whose file is missing — where a rejection would take out
 * BlockNote's render of the whole page.
 */
export async function resolveAssetUrl(rootPath: string | null, url: string): Promise<string> {
  const fileName = assetFileName(url);
  if (!rootPath || fileName === null) return url;

  const key = cacheKey(rootPath, fileName);
  const cached = cache.get(key);
  if (cached) return cached;

  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const read = readAssetImage(rootPath, fileName)
    .then((bytes) => {
      const objectUrl = URL.createObjectURL(new Blob([bytes]));
      cache.set(key, objectUrl);
      return objectUrl;
    })
    .catch(() => url)
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, read);
  return read;
}

/**
 * Drops every object URL this module is holding. Called when a project is
 * opened or closed: the pictures belong to the world that was open, and a blob
 * kept past that point is memory held for something nothing can display any
 * more.
 */
export function releaseAssetUrls(): void {
  for (const objectUrl of cache.values()) URL.revokeObjectURL(objectUrl);
  cache.clear();
  pending.clear();
}
