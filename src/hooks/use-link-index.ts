// The only import path components have into link-index.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { useMemo } from "react";
import type { Block, Node } from "../constants/schema";
import { linkIndex, pagesWithAnyTag, type Mention } from "../services/link-index";

/** One row of a collection: a page, and why it is in the list. */
export type CollectionRow = { node: Node; why?: Mention };

/**
 * The pages a collection block should list.
 *
 * Every source resolves through the one index, which is the point of Phase
 * 18b — Backlinks, the tag index and the subpage index are the same question,
 * and Phase 24's graphs read the same data.
 */
export function useCollection(nodes: Record<string, Node>, node: Node | undefined, block: Block): CollectionRow[] {
  return useMemo(() => {
    if (!node) return [];
    const index = linkIndex(nodes);
    const source = block.source ?? "manual";

    if (source === "mentions") {
      return (index.mentionsOf.get(node.id) ?? [])
        .filter((mention) => nodes[mention.fromId])
        .map((mention) => ({ node: nodes[mention.fromId], why: mention }));
    }

    if (source === "subpages") {
      return (index.childrenOf.get(node.id) ?? []).filter((id) => nodes[id]).map((id) => ({ node: nodes[id] }));
    }

    if (source === "tags") {
      // A block with no tags chosen shows nothing rather than everything —
      // "no filter" reading as "the whole project" is how a fresh block would
      // dump 75 pages into a sidebar.
      return pagesWithAnyTag(index, block.tags ?? [])
        .filter((id) => id !== node.id && nodes[id])
        .map((id) => ({ node: nodes[id] }));
    }

    // Manual keeps her order, not the tree's, and skips anything deleted.
    return (block.targetIds ?? []).filter((id) => nodes[id]).map((id) => ({ node: nodes[id] }));
  }, [nodes, node, block]);
}
