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
import { useEffect, useState } from "react";
import * as fsService from "../services/filesystem-service";
import { useProjectRootPath } from "./use-project";

export type NodeImageStatus = "empty" | "loading" | "ready" | "error";

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
