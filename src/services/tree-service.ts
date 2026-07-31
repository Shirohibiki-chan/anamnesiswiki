// Pure tree-shape logic — no disk, no React. Converts the flat node graph
// into the nested shape react-arborist wants, and computes each node's
// effective (cascaded) color. See docs/glossary.md §Color Cascade.
import Fuse from "fuse.js";
import { canHaveChildren } from "./template-registry";
import type { Node } from "../constants/schema";

export type TreeNodeData = {
  id: string;
  name: string;
  templateKey: string;
  children: TreeNodeData[] | null;
};

function sortByCreation(a: Node, b: Node): number {
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
}

// Sorts one sibling group by a manual order list, falling back to creation
// order for anything the list doesn't mention. Both cases matter: a project
// saved before drag-to-reorder existed has no list at all, and a node created
// after the last reorder isn't in its parent's list yet — those sort to the
// end by creation time rather than jumping to the front.
export function orderSiblings(siblings: Node[], order: string[] | undefined): Node[] {
  const sorted = [...siblings].sort(sortByCreation);
  if (!order || order.length === 0) return sorted;

  const position = new Map(order.map((id, index) => [id, index]));
  return sorted.sort((a, b) => {
    const posA = position.get(a.id);
    const posB = position.get(b.id);
    if (posA !== undefined && posB !== undefined) return posA - posB;
    if (posA !== undefined) return -1;
    if (posB !== undefined) return 1;
    return sortByCreation(a, b);
  });
}

export function buildTreeData(
  nodes: Record<string, Node>,
  rootOrder: string[],
  childOrder: Record<string, string[]> = {},
): TreeNodeData[] {
  const childrenByParent = new Map<string | null, Node[]>();
  for (const node of Object.values(nodes)) {
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }
  for (const [parentId, list] of childrenByParent) {
    childrenByParent.set(parentId, orderSiblings(list, parentId === null ? rootOrder : childOrder[parentId]));
  }

  function buildChildren(parentId: string | null): TreeNodeData[] {
    return (childrenByParent.get(parentId) ?? []).map((node) => ({
      id: node.id,
      name: node.name,
      templateKey: node.templateKey,
      children: canHaveChildren(node.templateKey) ? buildChildren(node.id) : null,
    }));
  }

  return buildChildren(null);
}

export type EffectiveColor = {
  color: string | null;
  isOwner: boolean;
};

// Walks up the parent chain until a node with an own color is found (or the
// root is reached uncolored). `isOwner` is true only when `nodeId` itself set
// the color, not when it merely inherited one — the tree uses this to decide
// which row gets the left-border "owner" stripe.
export function getEffectiveColor(nodeId: string, nodes: Record<string, Node>): EffectiveColor {
  let current: Node | undefined = nodes[nodeId];
  let isOwner = true;
  while (current) {
    if (current.color) {
      return { color: current.color, isOwner };
    }
    isOwner = false;
    current = current.parentId ? nodes[current.parentId] : undefined;
  }
  return { color: null, isOwner: false };
}

// Ancestors from the project root down to (but excluding) nodeId itself —
// used for the page view's breadcrumb trail.
export function getAncestorChain(nodeId: string, nodes: Record<string, Node>): Node[] {
  const chain: Node[] = [];
  let currentParentId = nodes[nodeId]?.parentId ?? null;
  while (currentParentId) {
    const parent: Node | undefined = nodes[currentParentId];
    if (!parent) break;
    chain.unshift(parent);
    currentParentId = parent.parentId;
  }
  return chain;
}

// Fuzzy name-and-tag search for the tree filter. A leading `#` searches tags
// only (e.g. "#antagonist"); otherwise both name and tags are searched.
// Returns null for an empty query, meaning "don't filter."
export function createSearchMatcher(nodes: Record<string, Node>, query: string): ((nodeId: string) => boolean) | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const isTagQuery = trimmed.startsWith("#");
  const term = isTagQuery ? trimmed.slice(1).trim() : trimmed;
  if (!term) return null;

  const fuse = new Fuse(Object.values(nodes), {
    keys: isTagQuery ? ["tags"] : ["name", "tags"],
    threshold: 0.35,
  });
  const matchedIds = new Set(fuse.search(term).map((result) => result.item.id));
  return (nodeId: string) => matchedIds.has(nodeId);
}
