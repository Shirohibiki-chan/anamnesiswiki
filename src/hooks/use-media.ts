// Asking a service what a link is, for a player block. Phase 31. The
// service says which links are players and where to ask; this does the
// asking and puts the thumbnail in the world's library — the same split as
// use-board-bookmarks.ts, for the same reason.
import { useCallback, useEffect, useState } from "react";
import { extensionForMime } from "../services/board-pictures";
import { imageTypeOf } from "../services/bookmark-service";
import { hostFetch } from "../services/host-service";
import { assetFileName } from "../services/asset-urls";
import { linkOf, oembedUrl, readOembed, youtubeThumbnailUrl, type MediaInfo } from "../services/media-service";
import { useProjectStore } from "../state/project-store";

/** What a fetch writes back onto the block. */
export type MediaAnswer = Pick<MediaInfo, "title" | "author" | "thumbnail" | "fetched">;

export function useMediaFetch(): { fetchMedia: (info: MediaInfo) => Promise<MediaAnswer> } {
  const uploadAsset = useProjectStore((state) => state.uploadAsset);

  /**
   * The service's answer for `info`: title, author, and its thumbnail put
   * into `assets/`. Never throws. A service that will not answer leaves
   * `fetched` false, which is the block's cue to ask again next time it is
   * drawn online — the plan's rule — and keeps whatever the block already
   * had. A YouTube video whose description fails still gets its still, from
   * the address every video publishes one at.
   */
  const fetchMedia = useCallback(
    async (info: MediaInfo): Promise<MediaAnswer> => {
      const link = linkOf(info);
      const kept: MediaAnswer = { title: info.title, author: info.author, thumbnail: info.thumbnail, fetched: false };
      let answer: ReturnType<typeof readOembed> | null = null;
      try {
        const response = await hostFetch(oembedUrl(link));
        if (response.ok) {
          const text = new TextDecoder().decode(new Uint8Array(await response.arrayBuffer()));
          answer = readOembed(JSON.parse(text));
        }
      } catch {
        answer = null;
      }
      const thumbnailUrl =
        answer?.thumbnailUrl ?? ((link.service === "youtube" || link.service === "youtube-music") && link.kind === "video" ? youtubeThumbnailUrl(link.id) : null);
      let thumbnail = info.thumbnail;
      if (thumbnailUrl && !thumbnail) {
        try {
          const response = await hostFetch(thumbnailUrl);
          if (response.ok) {
            const bytes = new Uint8Array(await response.arrayBuffer());
            const mimeType = imageTypeOf(bytes);
            if (mimeType) {
              const extension = extensionForMime(mimeType);
              const name = (answer?.title || link.id).replace(/[\\/:*?"<>|]+/g, " ").trim() || "thumbnail";
              thumbnail = assetFileName(await uploadAsset(bytes, extension, `${name}.${extension}`)) ?? "";
            }
          }
        } catch {
          // A card without a picture is still the card.
        }
      }
      if (!answer) return { ...kept, thumbnail };
      return { title: answer.title || info.title, author: answer.author || info.author, thumbnail, fetched: true };
    },
    [uploadAsset],
  );

  return { fetchMedia };
}

/**
 * Whether the window believes it has the internet, kept current. What a
 * card draws where the player would be hangs on this: the still and the
 * words are the block's own and draw either way; the player is not.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
