// Music and video on a page: which links are players, and what a player is
// drawn from. Phase 31. See docs/plan.md.
//
// **Four services and the list is closed** — YouTube, YouTube Music, Spotify
// and SoundCloud. Her call, 2026-09-13, lifting a line that had stood since
// Phase 18 on the condition that a player looks like it belongs in the page.
// A fifth service is a conversation first, not a row added to `PATTERNS`.
//
// **The block is a link with a memory.** What is stored is the address she
// pasted, what it resolved to (service, kind, id), and what the service said
// about it once — title, author, a thumbnail put in `assets/` — so the block
// draws whole with the internet off. The player itself is drawn from those
// each time and never stored; `playerUrl` is the one place that knows what
// each service's embed address looks like.
//
// Pure: nothing here fetches. `hooks/use-media.ts` does the asking.

export type MediaService = "youtube" | "youtube-music" | "spotify" | "soundcloud";

/**
 * What a link points at, in the service's own words. A YouTube `video` and
 * `playlist`; Spotify's six; a SoundCloud `track` or `set` (its word for a
 * playlist). What the kind decides: the player's shape and its address.
 */
export type MediaKind = "video" | "playlist" | "track" | "album" | "artist" | "episode" | "show" | "set";

/** A link recognised as one of the four services'. */
export type MediaLink = {
  service: MediaService;
  kind: MediaKind;
  /** The service's own id for it — a video id, a Spotify id, a SoundCloud path. */
  id: string;
  /** The address as pasted, tidied to `https://` and with the tracking stripped. */
  url: string;
};

/**
 * What a media block stores, whether in the writing (as the block's props)
 * or in the sidebar (as `Block.media`). Flat strings so it fits both.
 */
export type MediaInfo = {
  url: string;
  service: MediaService;
  kind: MediaKind;
  mediaId: string;
  /** What the service called it, once asked. Empty until then. */
  title: string;
  author: string;
  /** The filename in `assets/` of its thumbnail, or empty for none. */
  thumbnail: string;
  /** True once the service has been asked and answered; false is "ask again when online". */
  fetched: boolean;
};

const SERVICE_LABELS: Record<MediaService, string> = {
  youtube: "YouTube",
  "youtube-music": "YouTube Music",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
};

/** The service's name as it prints on the card. */
export function serviceLabel(service: MediaService): string {
  return SERVICE_LABELS[service];
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{10,}$/;
const SPOTIFY_KINDS: ReadonlySet<string> = new Set(["track", "album", "playlist", "artist", "episode", "show"]);

function hostOf(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\.|^m\./, "");
}

/**
 * The link one of the four services hands out, recognised, or null for
 * anything else — including the services' own pages that are not something
 * to play (a channel, a user, a search).
 *
 * Every form each service's Share button and address bar produce: `youtu.be`,
 * `watch?v=`, `shorts/`, `live/`, `embed/`, `playlist?list=` and the same on
 * `music.youtube.com`; `open.spotify.com/<kind>/<id>` with or without the
 * `intl-xx` segment, and the `spotify:` URI; `soundcloud.com/<user>/<track>`
 * and `/<user>/sets/<set>`. Query strings are dropped from the stored address
 * — `si=`, `t=`, `feature=` are tracking and a moment, not the recording.
 */
export function parseMediaLink(text: string): MediaLink | null {
  const trimmed = text.trim();
  const spotifyUri = /^spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]+)$/.exec(trimmed);
  if (spotifyUri) {
    const kind = spotifyUri[1] as MediaKind;
    return { service: "spotify", kind, id: spotifyUri[2], url: `https://open.spotify.com/${kind}/${spotifyUri[2]}` };
  }
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = hostOf(url);
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    const id = segments[0];
    return id && YOUTUBE_ID.test(id) ? youtube("youtube", "video", id) : null;
  }
  if (host === "youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    const service: MediaService = host === "music.youtube.com" ? "youtube-music" : "youtube";
    const list = url.searchParams.get("list");
    if (segments[0] === "playlist" && list && YOUTUBE_ID.test(list)) return youtube(service, "playlist", list);
    const v = url.searchParams.get("v");
    if (segments[0] === "watch" && v && YOUTUBE_ID.test(v)) return youtube(service, "video", v);
    if ((segments[0] === "shorts" || segments[0] === "live" || segments[0] === "embed") && segments[1] && YOUTUBE_ID.test(segments[1])) {
      // A playlist's embed address is `embed/videoseries?list=`, which is
      // the one `embed/` that is not a video.
      if (segments[1] === "videoseries") return list && YOUTUBE_ID.test(list) ? youtube(service, "playlist", list) : null;
      return youtube(service, "video", segments[1]);
    }
    return null;
  }
  if (host === "open.spotify.com" || host === "play.spotify.com") {
    const parts = segments[0]?.startsWith("intl-") ? segments.slice(1) : segments;
    const kind = parts[0];
    const id = parts[1];
    if (!kind || !id || !SPOTIFY_KINDS.has(kind) || !SPOTIFY_ID.test(id)) return null;
    return { service: "spotify", kind: kind as MediaKind, id, url: `https://open.spotify.com/${kind}/${id}` };
  }
  if (host === "soundcloud.com" || host === "on.soundcloud.com") {
    if (host === "on.soundcloud.com") return null; // a short link that only resolves by following it
    const [user, second, third] = segments;
    if (!user || !second) return null;
    if (SOUNDCLOUD_RESERVED.has(user)) return null;
    if (second === "sets") {
      if (!third) return null;
      const id = `${user}/sets/${third}`;
      return { service: "soundcloud", kind: "set", id, url: `https://soundcloud.com/${id}` };
    }
    if (SOUNDCLOUD_RESERVED.has(second) || third) return null;
    const id = `${user}/${second}`;
    return { service: "soundcloud", kind: "track", id, url: `https://soundcloud.com/${id}` };
  }
  return null;
}

/** SoundCloud paths under a user that are pages about the user, not a recording. */
const SOUNDCLOUD_RESERVED: ReadonlySet<string> = new Set([
  "tracks", "albums", "sets", "reposts", "likes", "followers", "following", "popular-tracks", "comments",
  "discover", "search", "stream", "you", "upload", "charts", "pages", "terms-of-use", "settings", "messages",
]);

function youtube(service: MediaService, kind: "video" | "playlist", id: string): MediaLink {
  const host = service === "youtube-music" ? "music.youtube.com" : "www.youtube.com";
  const url = kind === "playlist" ? `https://${host}/playlist?list=${id}` : `https://${host}/watch?v=${id}`;
  return { service, kind, id, url };
}

/**
 * The one media link in a paste, or null. Only a lone address counts — a
 * sentence with a link in it is a sentence, and stays one; the plan's rule.
 */
export function mediaLinkIn(text: string): MediaLink | null {
  const trimmed = text.trim();
  if (/\s/.test(trimmed)) return null;
  return parseMediaLink(trimmed);
}

/** The block a freshly recognised link starts as, before the service has been asked. */
export function mediaInfoFor(link: MediaLink): MediaInfo {
  return { url: link.url, service: link.service, kind: link.kind, mediaId: link.id, title: "", author: "", thumbnail: "", fetched: false };
}

/** The link a stored block resolves to, for the functions below. */
export function linkOf(info: Pick<MediaInfo, "url" | "service" | "kind" | "mediaId">): MediaLink {
  return { service: info.service, kind: info.kind, id: info.mediaId, url: info.url };
}

/**
 * The address a service answers "describe this link" on — oEmbed, which all
 * three publish. YouTube Music has no endpoint of its own but its ids are
 * YouTube's, so its links are asked on youtube.com.
 */
export function oembedUrl(link: MediaLink): string {
  switch (link.service) {
    case "youtube":
    case "youtube-music": {
      const canonical = link.kind === "playlist" ? `https://www.youtube.com/playlist?list=${link.id}` : `https://www.youtube.com/watch?v=${link.id}`;
      return `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`;
    }
    case "spotify":
      return `https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}`;
    case "soundcloud":
      return `https://soundcloud.com/oembed?url=${encodeURIComponent(link.url)}&format=json`;
  }
}

/** What an oEmbed answer says that the block keeps: a title, who made it, and where its picture is. */
export function readOembed(json: unknown): { title: string; author: string; thumbnailUrl: string | null } {
  const record = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const text = (key: string) => (typeof record[key] === "string" ? (record[key] as string).trim() : "");
  const thumbnail = text("thumbnail_url");
  return {
    title: text("title"),
    author: text("author_name"),
    thumbnailUrl: /^https?:\/\//i.test(thumbnail) ? thumbnail : null,
  };
}

/**
 * Where a YouTube video's still lives when oEmbed could not be asked — the
 * service publishes one per video at a fixed address, so a card can have a
 * picture even when the description fetch fails.
 */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export type PlayerLook = {
  /** Which of the service's two colourings, read off the page's surface. */
  theme: "light" | "dark";
  /** The page's accent as `#rrggbb`, which SoundCloud's player takes. */
  accent: string;
};

/**
 * The address the player loads from, for the iframe.
 *
 * YouTube is the `youtube-nocookie` player, and it autoplays because it is
 * only ever loaded after the still was clicked — a player that loads and then
 * waits to be clicked again is two clicks for one play. Spotify's embed takes
 * `theme=0` for its dark look and nothing for its artwork-coloured one.
 * SoundCloud's takes a colour for its buttons and bar, without the `#`.
 */
export function playerUrl(link: MediaLink, look: PlayerLook): string {
  switch (link.service) {
    case "youtube":
    case "youtube-music":
      return link.kind === "playlist"
        ? `https://www.youtube-nocookie.com/embed/videoseries?list=${link.id}&autoplay=1&rel=0`
        : `https://www.youtube-nocookie.com/embed/${link.id}?autoplay=1&rel=0`;
    case "spotify":
      return `https://open.spotify.com/embed/${link.kind}/${link.id}${look.theme === "dark" ? "?theme=0" : ""}`;
    case "soundcloud": {
      const params = new URLSearchParams({
        url: link.url,
        color: look.accent.replace(/^#/, ""),
        auto_play: "false",
        hide_related: "true",
        show_comments: "false",
        show_user: "true",
        show_reposts: "false",
        show_teaser: "false",
        // The list variant for a set; the artwork-beside-the-bar one for a track.
        visual: "false",
      });
      return `https://w.soundcloud.com/player/?${params.toString()}`;
    }
  }
}

/**
 * The player's shape: a ratio for a video, a fixed height for the audio
 * players, which are bars of a height their service chose.
 *
 * Spotify: 152 for a track (its compact card), 352 for anything with a list
 * in it. SoundCloud: 166 for a track, 300 for a set's list.
 */
export function playerShape(link: MediaLink): { ratio: number } | { height: number } {
  switch (link.service) {
    case "youtube":
    case "youtube-music":
      return { ratio: 16 / 9 };
    case "spotify":
      return { height: link.kind === "track" || link.kind === "episode" ? 152 : 352 };
    case "soundcloud":
      return { height: link.kind === "track" ? 166 : 300 };
  }
}

/**
 * How wide a block starts, as a percentage of the writing column. A video
 * takes the column; a single track does not, because a bar the width of the
 * page reads as a page-wide bar. Everything with a list in it is a card tall
 * enough to want the room.
 */
export function defaultMediaWidth(link: MediaLink): number {
  if (link.service === "spotify" && (link.kind === "track" || link.kind === "episode")) return 60;
  if (link.service === "soundcloud" && link.kind === "track") return 60;
  return 100;
}

/** Whether a still is shown until played, which is YouTube's rule and nobody else's. */
export function playsFromStill(link: MediaLink): boolean {
  return link.service === "youtube" || link.service === "youtube-music";
}

/** What the card says where the player would be, with the internet off. */
export const OFFLINE_NOTICE = "Needs the internet to play";

/** The block's own name for its menu and its undo entry. */
export function mediaLabel(info: Pick<MediaInfo, "service" | "kind">): string {
  const service = serviceLabel(info.service);
  switch (info.kind) {
    case "video":
      return `${service} video`;
    case "playlist":
    case "set":
      return `${service} playlist`;
    case "track":
      return `${service} track`;
    case "album":
      return `${service} album`;
    case "artist":
      return `${service} artist`;
    case "episode":
      return `${service} episode`;
    case "show":
      return `${service} show`;
  }
}
