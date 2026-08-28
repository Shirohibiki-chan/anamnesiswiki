// Feeds the tree-history panel: what old copies of `project.json` exist, what
// arrangement one of them describes, and putting it back (Phase 19).
//
// **The page equivalent is `use-page-history.ts` and this deliberately looks
// like it**, down to the order of the steps in `restore`. What differs is what
// a copy is allowed to bring back: a page's copy is its own contents, while
// this one describes *other* pages by id, half of which may since have been
// deleted — so the patch is built by `restoreProjectPatch` against the pages
// that exist now rather than applied as it was written.
import { useCallback, useEffect, useState } from "react";
import { listProjectSnapshots, readProjectSnapshot, snapshotProjectFile } from "../services/filesystem-service";
import { restoreProjectPatch, type Snapshot } from "../services/snapshot-service";
import { useProjectStore } from "../state/project-store";
import type { Project } from "../constants/schema";

export type ProjectHistory = {
  /** Newest first. Null while the folder is still being read. */
  snapshots: Snapshot[] | null;
  /** When the list was read, for rendering "2 hours ago" against. */
  listedAt: number;
  /** The copy currently being looked at, with what it would put back. */
  selected: { snapshot: Snapshot; project: Project; pages: number; missing: number } | null;
  select: (snapshot: Snapshot) => void;
  restore: () => Promise<boolean>;
  isRestoring: boolean;
};

export function useProjectHistory(): ProjectHistory {
  const rootPath = useProjectStore((state) => state.rootPath);
  const project = useProjectStore((state) => state.project);
  const restoreProjectArrangement = useProjectStore((state) => state.restoreProjectArrangement);

  const [loaded, setLoaded] = useState<{ snapshots: Snapshot[]; at: number } | null>(null);
  const [selected, setSelected] = useState<ProjectHistory["selected"]>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (!rootPath) return;
    let live = true;
    void listProjectSnapshots(rootPath).then((found) => {
      if (!live) return;
      setLoaded({ snapshots: found, at: Date.now() });
      setSelected(null);
    });
    return () => {
      live = false;
    };
  }, [rootPath]);

  const select = useCallback(
    (snapshot: Snapshot) => {
      if (!rootPath) return;
      void readProjectSnapshot(rootPath, snapshot.name).then((found) => {
        if (!found) return;
        // Counted here rather than in the panel so the panel can say plainly
        // how many of the pages this copy arranged are still around — the one
        // number that tells her whether an old arrangement is worth putting
        // back at all.
        const current = useProjectStore.getState().nodes;
        const mentioned = new Set([...found.rootOrder, ...Object.values(found.childOrder ?? {}).flat()]);
        let missing = 0;
        for (const id of mentioned) if (!current[id]) missing += 1;
        setSelected({ snapshot, project: found, pages: mentioned.size, missing });
      });
    },
    [rootPath],
  );

  const restore = useCallback(async (): Promise<boolean> => {
    if (!selected || !project || !rootPath) return false;
    setIsRestoring(true);
    try {
      // What the tree looks like right now becomes a version too, always — the
      // same guarantee the page panel makes, and for the same reason: choosing
      // the wrong copy must not be a one-way door.
      await snapshotProjectFile(rootPath);

      const known = new Set(Object.keys(useProjectStore.getState().nodes));
      restoreProjectArrangement(restoreProjectPatch(project, selected.project, known));

      setLoaded({ snapshots: await listProjectSnapshots(rootPath), at: Date.now() });
      return true;
    } finally {
      setIsRestoring(false);
    }
  }, [project, restoreProjectArrangement, rootPath, selected]);

  return {
    snapshots: loaded?.snapshots ?? null,
    listedAt: loaded?.at ?? 0,
    selected,
    select,
    restore,
    isRestoring,
  };
}
