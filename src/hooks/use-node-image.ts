// Resolves a Node.image filename (see schema.ts) to a displayable Blob object
// URL. Reads through filesystem-service directly rather than the store, since
// this is read-only display data, not app state — see CLAUDE.md's layer
// order ("hooks may import from state/ and services/").
import { useEffect, useState } from "react";
import * as fsService from "../services/filesystem-service";
import { useProjectRootPath } from "./use-project";

export function useNodeImage(imageFileName: string | undefined): string | null {
  const rootPath = useProjectRootPath();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      if (!rootPath || !imageFileName) {
        if (!cancelled) setUrl(null);
        return;
      }
      const bytes = await fsService.readAssetImage(rootPath, imageFileName);
      if (cancelled) return;
      objectUrl = URL.createObjectURL(new Blob([bytes]));
      setUrl(objectUrl);
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [rootPath, imageFileName]);

  return url;
}
