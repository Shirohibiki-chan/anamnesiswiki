// Resolves a project's own cover image (project.json's `coverImage`) to a
// displayable object URL, for the start screen — potentially dozens of
// projects, none of which are open.
//
// **A separate cache from asset-urls.ts, deliberately, not reuse.** That
// one's cache is cleared by `releaseAssetUrls()` whenever a project opens or
// closes, because a page's pictures stop mattering the moment its project
// isn't the open one. A cover thumbnail is the opposite: it's shown *because*
// nothing is open, and clearing it every time she opens any project would
// mean re-reading and re-blobbing every other project's cover the next time
// she's back at the start screen. This persists for the process's life —
// the number of distinct projects is small enough that an unrevoked object
// URL per one isn't a leak worth chasing, and a set or removed cover always
// mints a fresh filename (see filesystem-service's setProjectCoverImage
// callers), so a key here is never asked to point at two different pictures
// in one session.
import { readAssetImage } from "./filesystem-service";

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

function cacheKey(rootPath: string, fileName: string): string {
  return JSON.stringify([rootPath, fileName]);
}

/**
 * Null on any failure — a missing or unreadable cover file falls back to the
 * generated gradient exactly the way "no cover set" does, rather than a
 * broken-picture icon on what's meant to be a background treatment.
 */
export async function resolveProjectCoverUrl(rootPath: string, fileName: string): Promise<string | null> {
  const key = cacheKey(rootPath, fileName);
  const cached = cache.get(key);
  if (cached) return cached;

  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const read = readAssetImage(rootPath, fileName)
    .then((bytes) => {
      const url = URL.createObjectURL(new Blob([bytes]));
      cache.set(key, url);
      return url;
    })
    .catch(() => null)
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, read);
  return read;
}
