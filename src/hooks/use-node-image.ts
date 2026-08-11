// Resolves a Node.image / Node.banner filename (see schema.ts) to a
// displayable Blob object URL. Reads through filesystem-service directly
// rather than the store, since this is read-only display data, not app state
// — see CLAUDE.md's layer order ("hooks may import from state/ and
// services/").
//
// The status matters to callers: a filename is set well before its bytes are
// read, and treating "still loading" as "no image" made PageBanner flash its
// empty "Add banner" prompt on every page switch. A missing or unreadable
// file also used to fail silently, leaving the slot looking simply empty.
import { useCallback, useEffect, useState } from "react";
import { assetFileName } from "../services/asset-urls";
import { openExternalUrl, pickImageSavePath } from "../services/dialog-service";
import * as fsService from "../services/filesystem-service";
import { useProjectRootPath } from "./use-project";

export type NodeImageStatus = "empty" | "loading" | "ready" | "error";

// Re-exported so components can ask "is this picture ours, or a link to
// somebody's website?" without importing a service — same pattern as
// use-editor's WIKILINK_TRIGGER. See CLAUDE.md's layer order.
export { isAssetRef as isLocalImage } from "../services/asset-urls";

export function useNodeImage(imageFileName: string | undefined): { url: string | null; status: NodeImageStatus } {
  const rootPath = useProjectRootPath();
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<NodeImageStatus>("empty");

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      if (!rootPath || !imageFileName) {
        if (!cancelled) {
          setUrl(null);
          setStatus("empty");
        }
        return;
      }

      setStatus("loading");
      try {
        const bytes = await fsService.readAssetImage(rootPath, imageFileName);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([bytes]));
        setUrl(objectUrl);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setUrl(null);
        setStatus("error");
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [rootPath, imageFileName]);

  return { url, status };
}

/**
 * "Save a copy" for a picture sitting in a page (Phase 16), replacing
 * BlockNote's own Download button.
 *
 * Theirs calls `window.open()` on the resolved URL, which is wrong here twice:
 * a Tauri window doesn't open new ones, and opening a `blob:` in a tab isn't a
 * download even where it works. A desktop app saves through the OS's save
 * dialog, which is what this does.
 *
 * An *embedded* picture has no bytes here to copy — it lives on someone
 * else's server — so it opens in the browser instead. Fetching it to save it
 * would be the app making a request it was never asked to make; the browser
 * is already the tool for that, and its own Save Image As is one click away.
 */
export function useSaveImageCopy(): (url: string, suggestedName?: string) => Promise<void> {
  const rootPath = useProjectRootPath();

  return useCallback(
    async (url: string, suggestedName?: string) => {
      const fileName = assetFileName(url);
      if (fileName === null) {
        await openExternalUrl(url);
        return;
      }
      if (!rootPath) return;

      // The block's own name is what the user sees on it, so that's what the
      // save dialog should suggest. The stored filename is a UUID and would be
      // a strange thing to offer; it's only the fallback because a picture
      // that arrived by drag or paste may not carry a name at all.
      const destination = await pickImageSavePath(suggestedName?.trim() || fileName);
      if (!destination) return;
      const bytes = await fsService.readAssetImage(rootPath, fileName);
      await fsService.writeRawFile(destination, bytes);
    },
    [rootPath],
  );
}
