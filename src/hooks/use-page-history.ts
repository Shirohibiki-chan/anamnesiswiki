// Feeds the page-history panel: what old copies exist for one page, what one
// of them says, and putting one back (Phase 19).
//
// **Restoring is composed out of the two actions that already do this
// properly**, rather than being a third path onto the disk. Content goes
// through `updateNode`; a title change goes through `renameNode`, because a
// name is a filename and renaming one is a relocation with its own planner and
// its own history of getting it wrong. The two are folded into one undo entry,
// the way making a page from a template is.
import { useCallback, useEffect, useState } from "react";
import { listSnapshots, readSnapshot, snapshotNode } from "../services/filesystem-service";
import { restorePatch, type Snapshot } from "../services/snapshot-service";
import { useHistoryStore } from "../state/history-store";
import { useProjectStore } from "../state/project-store";
import type { Node } from "../constants/schema";

export type PageHistory = {
  /** Newest first. Null while the folder is still being read. */
  snapshots: Snapshot[] | null;
  /**
   * When the list was read, for rendering "2 hours ago" against.
   *
   * Taken here rather than in the panel because a component may not call
   * `Date.now()` while rendering — and one timestamp for the whole list is
   * right anyway: forty rows drawn against forty clocks disagree about what
   * "just now" means.
   */
  listedAt: number;
  /** The copy currently being looked at, read on demand. */
  selected: { snapshot: Snapshot; node: Node } | null;
  select: (snapshot: Snapshot) => void;
  restore: () => Promise<boolean>;
  /** True while a restore is being written. */
  isRestoring: boolean;
};

export function usePageHistory(nodeId: string | null): PageHistory {
  const rootPath = useProjectStore((state) => state.rootPath);
  const node = useProjectStore((state) => (nodeId ? state.nodes[nodeId] : undefined));
  const updateNode = useProjectStore((state) => state.updateNode);
  const bumpContentRevision = useProjectStore((state) => state.bumpContentRevision);
  const renameNode = useProjectStore((state) => state.renameNode);

  // One piece of state rather than three, and it carries the id it was read
  // for: a listing that arrives after the panel has been pointed at another
  // page belongs to neither, and clearing the old list on the way *into* the
  // effect would be a render cascade for the same answer.
  const [loaded, setLoaded] = useState<{ forNodeId: string; snapshots: Snapshot[]; at: number } | null>(null);
  const [selected, setSelected] = useState<{ snapshot: Snapshot; node: Node } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (!rootPath || !nodeId) return;
    let live = true;
    void listSnapshots(rootPath, nodeId).then((found) => {
      if (!live) return;
      setLoaded({ forNodeId: nodeId, snapshots: found, at: Date.now() });
      setSelected(null);
    });
    return () => {
      live = false;
    };
  }, [rootPath, nodeId]);

  const snapshots = loaded && loaded.forNodeId === nodeId ? loaded.snapshots : null;

  // Read one at a time rather than all of them up front: a page edited all week
  // has fifty copies, and the panel shows one.
  const select = useCallback(
    (snapshot: Snapshot) => {
      if (!rootPath || !nodeId) return;
      void readSnapshot(rootPath, nodeId, snapshot.name).then((found) => {
        if (found) setSelected({ snapshot, node: found });
      });
    },
    [nodeId, rootPath],
  );

  const restore = useCallback(async (): Promise<boolean> => {
    if (!selected || !node || !nodeId || !rootPath) return false;
    setIsRestoring(true);
    try {
      // **What is on the page right now becomes a version too, always.** The
      // interval would otherwise skip this copy whenever a page had been
      // copied a minute earlier, and "I restored the wrong one" would have no
      // way back on disk. Undo covers it inside a session; this covers the
      // rest.
      await snapshotNode(rootPath, node, Object.values(useProjectStore.getState().nodes));

      // Read before either half runs, so what gets folded is exactly this.
      const depth = useHistoryStore.getState().past.length;
      updateNode(nodeId, restorePatch(node, selected.node));
      // The editor reads its content when it mounts, so a page being looked at
      // while it is restored would otherwise keep the old words on screen —
      // and save them back on the next keystroke. See `contentRevisions`.
      bumpContentRevision(nodeId);
      if (selected.node.name !== node.name) await renameNode(nodeId, selected.node.name);
      useHistoryStore.getState().collapse(depth, `restoring "${node.name}"`);

      setLoaded({ forNodeId: nodeId, snapshots: await listSnapshots(rootPath, nodeId), at: Date.now() });
      return true;
    } finally {
      setIsRestoring(false);
    }
  }, [bumpContentRevision, node, nodeId, renameNode, rootPath, selected, updateNode]);

  return { snapshots, listedAt: loaded?.at ?? 0, selected, select, restore, isRestoring };
}
