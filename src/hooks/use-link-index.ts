// The only import path components have into link-index.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { useMemo } from "react";
import type { Block, Node } from "../constants/schema";
import { linkIndex } from "../services/link-index";
import { collectionRows, type CollectionRow } from "../services/collection-service";
import { usePinnedIds } from "./use-project";
import { useStorylines } from "./use-storyline";
import { useBoards } from "./use-board";

export type { CollectionRow } from "../services/collection-service";

/**
 * The pages a collection block should list.
 *
 * Every source resolves through the one index, which is the point of Phase
 * 18b — Backlinks, the tag index and the subpage index are the same question,
 * and Phase 24's graphs read the same data. The branches themselves are in
 * `collection-service.ts`, shared with the exports, so a block publishes the
 * list it shows.
 */
export function useCollection(nodes: Record<string, Node>, node: Node | undefined, block: Block): CollectionRow[] {
  // Read here rather than taken as an argument — see `useStorylines`. A scene
  // standing for a page is a connection, and every caller of this would
  // otherwise have to know that and pass it.
  const storylines = useStorylines();
  const boards = useBoards();
  const pinnedIds = usePinnedIds();
  return useMemo(() => {
    if (!node) return [];
    const index = linkIndex(nodes, storylines, boards);
    return collectionRows({ nodes, node, block, index, pinnedIds });
  }, [nodes, node, block, storylines, boards, pinnedIds]);
}
