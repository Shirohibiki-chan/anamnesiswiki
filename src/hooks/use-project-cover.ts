// A project's own cover picture as a displayable URL, once she's set one.
// See services/project-cover-images.ts for why this has its own cache rather
// than reusing use-node-image.ts's — that one is scoped to the open project
// and cleared when it changes, and a cover thumbnail on the start screen is
// shown *because* nothing is open.
import { useEffect, useState } from "react";
import { resolveProjectCoverUrl } from "../services/project-cover-images";

/** Null while there's no cover set, or none read yet — either way, the caller draws the generated gradient instead. */
export function useProjectCoverUrl(rootPath: string, fileName: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!fileName) {
        if (!cancelled) setUrl(null);
        return;
      }
      const result = await resolveProjectCoverUrl(rootPath, fileName);
      if (!cancelled) setUrl(result);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [rootPath, fileName]);

  return url;
}
