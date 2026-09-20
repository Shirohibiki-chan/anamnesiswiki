// A bookmark on a board: a web address pasted onto it, drawn as a card with
// the page's title, description and picture. Phase 32, step 5.
//
// **The card is drawn from what was fetched once, kept on the element.** The
// library's embed element carries the address as its link and the app's own
// data in `customData` — the one place inside an element the app reads, by
// the plan's named exception — so the card draws whole with the internet
// off, and a world handed to a player draws it too. The picture is a file
// in the world's library like any other (step 4), named here by its asset.
//
// Pure: what counts as an address, what a page's HTML says about itself,
// and what a picture's first bytes say it is. The fetching is the hook's.
/** What a bookmark card draws, as `customData.bookmark` on the element. */
export type Bookmark = {
  url: string;
  title: string;
  description: string;
  /** The site's name, or its host when the page names none. */
  site: string;
  /** The filename in `assets/` of the page's picture, or null for none. */
  image: string | null;
  /** False until the page has been asked; a card still fetching draws its address. */
  fetched: boolean;
};

/**
 * The one web address in a paste, or null. Only a lone address counts —
 * a sentence with an address in it is a sentence, and is left to the
 * library, which makes it text.
 */
export function webAddressIn(text: string): string | null {
  const trimmed = text.trim();
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return url.hostname ? url.href : null;
  } catch {
    return null;
  }
}

/** The host of an address without its `www.`, which is what a card shows until the site names itself. */
export function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The bookmark a card draws while its page is still being asked, and for good if the asking fails. */
export function placeholderBookmark(url: string): Bookmark {
  return { url, title: siteOf(url), description: "", site: siteOf(url), image: null, fetched: false };
}

/**
 * What a page says about itself, read off its HTML: Open Graph first,
 * since that is what every site writes for exactly this card, then the
 * plain `<title>` and description. `image` is the picture's address,
 * resolved against the page's, for the caller to fetch.
 */
export function pageSummary(url: string, html: string): { title: string; description: string; site: string; image: string | null } {
  const meta = metaTags(html);
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const title = clean(meta.get("og:title") ?? meta.get("twitter:title") ?? titleTag ?? "") || siteOf(url);
  const description = clean(meta.get("og:description") ?? meta.get("twitter:description") ?? meta.get("description") ?? "");
  const site = clean(meta.get("og:site_name") ?? "") || siteOf(url);
  const picture = meta.get("og:image") ?? meta.get("og:image:url") ?? meta.get("twitter:image") ?? null;
  let image: string | null = null;
  if (picture) {
    try {
      const resolved = new URL(decodeEntities(picture.trim()), url);
      if (resolved.protocol === "http:" || resolved.protocol === "https:") image = resolved.href;
    } catch {
      image = null;
    }
  }
  return { title, description, site, image };
}

/** Every `<meta>` tag's content by its `property` or `name`, the first of each winning. */
function metaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
      attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
    }
    const key = (attributes.get("property") ?? attributes.get("name"))?.toLowerCase();
    const content = attributes.get("content");
    if (key && content !== undefined && !tags.has(key)) tags.set(key, content);
  }
  return tags;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[entity.toLowerCase()] ?? whole;
  });
}

/** Entities decoded and whitespace collapsed, since a title split over lines in the HTML is one line on a card. */
function clean(text: string): string {
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

/**
 * What a picture's first bytes say it is, or null for anything that is
 * not a picture the board can draw — a server that answers a picture's
 * address with an HTML page, say, which happens.
 */
export function imageTypeOf(bytes: Uint8Array): string | null {
  const at = (index: number) => bytes[index] ?? -1;
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return "image/png";
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x38) return "image/gif";
  if (at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) {
    return "image/webp";
  }
  const head = new TextDecoder().decode(bytes.subarray(0, 256)).trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) return "image/svg+xml";
  return null;
}

/** The bookmark a board element carries, or null for any other element. */
export function bookmarkOf(element: unknown): Bookmark | null {
  const record = element as { type?: unknown; customData?: { bookmark?: unknown } } | null;
  if (record?.type !== "embeddable") return null;
  const bookmark = record.customData?.bookmark as Partial<Bookmark> | undefined;
  if (!bookmark || typeof bookmark.url !== "string") return null;
  return {
    url: bookmark.url,
    title: typeof bookmark.title === "string" ? bookmark.title : siteOf(bookmark.url),
    description: typeof bookmark.description === "string" ? bookmark.description : "",
    site: typeof bookmark.site === "string" ? bookmark.site : siteOf(bookmark.url),
    image: typeof bookmark.image === "string" && bookmark.image ? bookmark.image : null,
    fetched: bookmark.fetched === true,
  };
}

export function isBookmarkCard(element: unknown): boolean {
  return bookmarkOf(element) !== null;
}
