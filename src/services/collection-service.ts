// The pages a collection block lists, from any of its sources. Phase 18b's
// four and Phase 30's two, in one place.
//
// **One resolver, because the sidebar and the exports have to agree.** Until
// Phase 30 the hook that draws a block and the export that writes one each
// carried their own copy of the four branches, with a note saying a fifth
// source would have to move both. It arrived as two, so they moved here: a
// Recently edited block publishes the list it shows because there is only one
// list.
import { RECENT_DEFAULT_LIMIT, UNIVERSE_TEMPLATE_KEY, type Block, type Node } from "../constants/schema";
import { pagesWithAnyTag, type LinkIndex, type Mention } from "./link-index";

/** One row of a collection: a page, and why it is in the list. */
export type CollectionRow = { node: Node; why?: Mention };

export type CollectionInput = {
  nodes: Record<string, Node>;
  /** The page the block sits on. */
  node: Node;
  block: Block;
  index: LinkIndex;
  /** The rail's pins, in the order they were pinned — `project.pinnedIds`. */
  pinnedIds: string[];
};

export function collectionRows({ nodes, node, block, index, pinnedIds }: CollectionInput): CollectionRow[] {
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

  if (source === "recent") {
    // **Not the page the block sits on.** A home page is edited every time
    // its dashboard is rearranged, and a Recently edited list that opens
    // with "Home" is a list that never says anything. Universes are left out
    // for the same reason: a container is touched whenever anything inside
    // it is arranged.
    return Object.values(nodes)
      .filter((candidate) => candidate.id !== node.id && candidate.templateKey !== UNIVERSE_TEMPLATE_KEY)
      .sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name))
      .slice(0, recentLimit(block))
      .map((candidate) => ({ node: candidate }));
  }

  if (source === "pinned") {
    // The rail's order, which is the order they were pinned in — the block
    // and the rail are two views of one list and must not be able to
    // disagree.
    return pinnedIds.filter((id) => nodes[id]).map((id) => ({ node: nodes[id] }));
  }

  // Manual keeps her order, not the tree's, and skips anything deleted.
  return (block.targetIds ?? []).filter((id) => nodes[id]).map((id) => ({ node: nodes[id] }));
}

/** How many a Recently edited block shows: its own count, else the default. */
export function recentLimit(block: Block): number {
  return block.limit && block.limit > 0 ? Math.floor(block.limit) : RECENT_DEFAULT_LIMIT;
}
