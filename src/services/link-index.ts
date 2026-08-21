// What points at what. Phase 18b.
//
// One service, deliberately: Backlinks, the tag index and the subpage index
// are the same question asked three ways, and Phase 24's graphs need exactly
// this data. Computed inside a component instead, it would be built twice and
// the two copies would disagree.
import { type BlockNoteDocument, type Node } from "../constants/schema";
import { getPropertySchema } from "./template-registry";

// Same loose shape search-service walks: BlockNoteDocument is `unknown[]` on
// purpose (see schema.ts), so every walker narrows it locally rather than the
// app pretending to know the editor's internal types.
type BlockNoteBlock = { content?: unknown; children?: unknown };

/**
 * Where one page's pointer at another came from.
 *
 * Kept per edge rather than thrown away because a Backlinks row that cannot
 * say *why* a page is in the list is the exact failure that sent her hunting
 * through the reference's settings menus — see docs/plan.md Phase 18b.
 */
export type MentionKind = "prose" | "property" | "manual";

export type Mention = {
  /** The page doing the pointing. */
  fromId: string;
  kind: MentionKind;
  /** For `property`, the field's label — "Friends", "ENEMIES". */
  label?: string;
};

export type LinkIndex = {
  /** Every page that points at the key, deduplicated, in tree order. */
  mentionsOf: Map<string, Mention[]>;
  /** Direct children of the key, in the order the tree holds them. */
  childrenOf: Map<string, string[]>;
  /** Page ids carrying the key, which is a lowercased tag. */
  taggedWith: Map<string, string[]>;
};

// ---- Extracting one page's outgoing edges ----

function inlineMentions(content: unknown, into: Set<string>): void {
  if (!Array.isArray(content)) return;
  for (const item of content as { type?: string; props?: { nodeId?: unknown }; content?: unknown }[]) {
    if (!item || typeof item !== "object") continue;
    if (item.type === "mention" && typeof item.props?.nodeId === "string") into.add(item.props.nodeId);
    // A link's inline content nests one level down, the same as search's
    // inlineText walk — a mention inside a link would be missed otherwise.
    if (Array.isArray(item.content)) inlineMentions(item.content, into);
  }
}

function documentMentions(doc: BlockNoteDocument, into: Set<string>): void {
  if (!Array.isArray(doc)) return;
  for (const block of doc as BlockNoteBlock[]) {
    inlineMentions(block.content, into);
    if (Array.isArray(block.children)) documentMentions(block.children as BlockNoteDocument, into);
  }
}

/**
 * The pages one page points at, and how.
 *
 * Property references are read through the template schema rather than by
 * looking for values that happen to be arrays of strings: a multi-select
 * stores option ids, which are UUIDs exactly like node ids, so "it looks like
 * an id" would eventually turn a chip into a phantom backlink.
 */
export function outgoingEdges(node: Node): Map<string, { kind: MentionKind; label?: string }> {
  const out = new Map<string, { kind: MentionKind; label?: string }>();

  const prose = new Set<string>();
  for (const tab of node.tabs) documentMentions(tab.content, prose);
  for (const id of prose) if (id !== node.id) out.set(id, { kind: "prose" });

  const specs = [...getPropertySchema(node.templateKey), ...(node.customProperties ?? [])];
  for (const spec of specs) {
    if (spec.type !== "refs") continue;
    const value = node.properties[spec.key];
    if (!Array.isArray(value)) continue;
    for (const id of value) {
      if (typeof id !== "string" || id === node.id) continue;
      // Prose wins when a page points at the same target both ways: it is the
      // more specific answer, and one page should be one row.
      if (!out.has(id)) out.set(id, { kind: "property", label: spec.label });
    }
  }

  for (const block of node.blocks ?? []) {
    if (block.kind !== "collection" || block.source !== "manual") continue;
    for (const id of block.targetIds ?? []) {
      if (typeof id !== "string" || id === node.id) continue;
      if (!out.has(id)) out.set(id, { kind: "manual" });
    }
  }

  return out;
}

// ---- The index, cached the way search-service caches its text ----

// `nodes` is replaced on every keystroke, so an index rebuilt per render walks
// every page of prose in the world per character typed. Same shape and same
// hazard as search-service's tab-text cache, and solved the same way: keyed on
// the record's identity so the store's next immutable update evicts it, held
// weakly so a closed project isn't kept alive by it, and with a per-node inner
// cache so the pages that didn't change are not re-walked.
const indexCache = new WeakMap<Record<string, Node>, LinkIndex>();
const edgeCache = new WeakMap<Node, Map<string, { kind: MentionKind; label?: string }>>();

function edgesFor(node: Node): Map<string, { kind: MentionKind; label?: string }> {
  const cached = edgeCache.get(node);
  if (cached) return cached;
  const edges = outgoingEdges(node);
  edgeCache.set(node, edges);
  return edges;
}

/**
 * The whole project's index.
 *
 * Built in tree order — `Object.values` follows insertion order, which is load
 * order — so every list this produces is stable between renders rather than
 * reshuffling as the map is rebuilt.
 */
export function linkIndex(nodes: Record<string, Node>): LinkIndex {
  const cached = indexCache.get(nodes);
  if (cached) return cached;

  const mentionsOf = new Map<string, Mention[]>();
  const childrenOf = new Map<string, string[]>();
  const taggedWith = new Map<string, string[]>();

  for (const node of Object.values(nodes)) {
    if (node.parentId) {
      const siblings = childrenOf.get(node.parentId) ?? [];
      siblings.push(node.id);
      childrenOf.set(node.parentId, siblings);
    }

    for (const tag of node.tags) {
      const key = tag.toLowerCase();
      const pages = taggedWith.get(key) ?? [];
      pages.push(node.id);
      taggedWith.set(key, pages);
    }

    for (const [targetId, edge] of edgesFor(node)) {
      // A pointer at a page that has been deleted is not an edge. It would
      // otherwise render as a row with no name on it.
      if (!nodes[targetId]) continue;
      const list = mentionsOf.get(targetId) ?? [];
      list.push({ fromId: node.id, ...edge });
      mentionsOf.set(targetId, list);
    }
  }

  const index = { mentionsOf, childrenOf, taggedWith };
  indexCache.set(nodes, index);
  return index;
}

/** Pages carrying any of `tags`, deduplicated, in tree order. */
export function pagesWithAnyTag(index: LinkIndex, tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    for (const id of index.taggedWith.get(tag.toLowerCase()) ?? []) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
