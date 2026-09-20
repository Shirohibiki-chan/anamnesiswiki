// Asking a web page what it is, for a bookmark card on a board. Phase 32,
// step 5. The service says what an address and a page's summary are; this
// does the fetching and puts the page's picture in the world's library.
import { useCallback } from "react";
import { extensionForMime } from "../services/board-pictures";
import { imageTypeOf, pageSummary, placeholderBookmark, type Bookmark } from "../services/bookmark-service";
import { hostFetch } from "../services/host-service";
import { assetFileName } from "../services/asset-urls";
import { useProjectStore } from "../state/project-store";

/**
 * How much of a page is read for its summary. The tags a card needs are
 * in the head, and a page is read whole otherwise — a video's page can be
 * megabytes of script after the part that matters.
 */
const SUMMARY_BYTES = 512 * 1024;

export function useBoardBookmarks(): { fetchBookmark: (url: string) => Promise<Bookmark> } {
  const uploadAsset = useProjectStore((state) => state.uploadAsset);

  /**
   * The bookmark for `url`, fetched: title, description, site and the
   * page's picture put into `assets/`. Never throws — a page that will not
   * answer, or answers with nothing, is a card drawn from its address, and
   * a picture that will not fetch is a card without one. `fetched` says
   * the page was asked, so the card stops saying it is on its way.
   */
  const fetchBookmark = useCallback(
    async (url: string): Promise<Bookmark> => {
      const fallback = { ...placeholderBookmark(url), fetched: true };
      let html: string;
      try {
        const response = await hostFetch(url);
        if (!response.ok) return fallback;
        const bytes = new Uint8Array(await response.arrayBuffer());
        html = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, SUMMARY_BYTES));
      } catch {
        return fallback;
      }
      const summary = pageSummary(url, html);
      let image: string | null = null;
      if (summary.image) {
        try {
          const response = await hostFetch(summary.image);
          if (response.ok) {
            const bytes = new Uint8Array(await response.arrayBuffer());
            const mimeType = imageTypeOf(bytes);
            if (mimeType) {
              const extension = extensionForMime(mimeType);
              image = assetFileName(await uploadAsset(bytes, extension, `${summary.title}.${extension}`));
            }
          }
        } catch {
          image = null;
        }
      }
      return { url, title: summary.title, description: summary.description, site: summary.site, image, fetched: true };
    },
    [uploadAsset],
  );

  return { fetchBookmark };
}
