// Pure tree-shape logic — no disk, no React. Converts the flat node graph
// into the nested shape react-arborist wants, and computes each node's
// effective (cascaded) color. See docs/glossary.md §Color Cascade.
import Fuse from "fuse.js";
import { canHaveChildren } from "../constants/templates";
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

export function buildTreeData(nodes: Record<string, Node>, rootOrder: string[]): TreeNodeData[] {
  const childrenByParent = new Map<string | null, Node[]>();
  for (const node of Object.values(nodes)) {
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }
  for (const list of childrenByParent.values()) {
    list.sort(sortByCreation);
  }

  const rootSiblings = childrenByParent.get(null);
  if (rootSiblings) {
    const rootPosition = new Map(rootOrder.map((id, index) => [id, index]));
    rootSiblings.sort((a, b) => {
      const posA = rootPosition.get(a.id);
      const posB = rootPosition.get(b.id);
      if (posA !== undefined && posB !== undefined) return posA - posB;
      if (posA !== undefined) return -1;
      if (posB !== undefined) return 1;
      return sortByCreation(a, b);
    });
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
