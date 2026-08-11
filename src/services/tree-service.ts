// Pure tree-shape logic — no disk, no React. Converts the flat node graph
// into the nested shape react-arborist wants, and computes each node's
// effective (cascaded) color. See docs/glossary.md §Color Cascade.
import Fuse from "fuse.js";
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

/**
 * The orders "Sort sub-pages" offers. A one-shot rewrite of the manual order,
 * not a mode the tree stays in: the tree is drag-reorderable, and a sort that
 * persisted would either undo the next drag or quietly stop applying — both
 * worse than sorting again when it's wanted. Undo puts the old order back.
 */
export const SIBLING_SORTS = ["name-asc", "name-desc", "newest", "oldest"] as const;
export type SiblingSort = (typeof SIBLING_SORTS)[number];

export const SIBLING_SORT_LABELS: Record<SiblingSort, string> = {
  "name-asc": "A to Z",
  "name-desc": "Z to A",
  newest: "Newest first",
  oldest: "Oldest first",
};

/**
 * Reorders one sibling group. Takes the ids already in their current display
 * order and returns them sorted — the caller writes the result straight back
 * to `rootOrder`/`childOrder`, which is what makes it undoable as a single
 * ordering change rather than a move per page.
 *
 * Names compare with `localeCompare` and its numeric option, so "Chapter 2"
 * sorts before "Chapter 10" — worldbuilding pages are numbered constantly and
 * plain string order puts 10 in the middle of the single digits. Ties break on
 * creation time so the result is stable rather than dependent on input order.
 */
export function sortSiblingIds(ids: string[], nodes: Record<string, Node>, sort: SiblingSort): string[] {
  const present = ids.filter((id) => nodes[id]);
  return present.sort((idA, idB) => {
    const a = nodes[idA];
    const b = nodes[idB];
    switch (sort) {
      case "name-asc":
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }) || sortByCreation(a, b);
      case "name-desc":
        return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" }) || sortByCreation(a, b);
      case "newest":
        return b.createdAt - a.createdAt || a.id.localeCompare(b.id);
      case "oldest":
        return sortByCreation(a, b);
    }
  });
}

/**
 * @param focusedId When set, the tree starts at this node's *children* rather
 * than at the project root — "focus here" from the right-click menu. The node
 * itself isn't in the returned data; it's named in the path bar above the tree
 * instead, which is the way back out. A focused id that no longer exists (the
 * page was deleted while focused) falls back to the whole tree rather than
 * rendering nothing.
 */
export function buildTreeData(
  nodes: Record<string, Node>,
  rootOrder: string[],
  childOrder: Record<string, string[]> = {},
  focusedId: string | null = null,
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
      // Always an array, never null. react-arborist reads a null `children` as
      // "this is a leaf" and won't let anything be dropped *onto* it — which
      // was right while leaf templates couldn't hold pages and is wrong now
      // that any page can. An empty array still renders without a chevron,
      // because TreeItem shows the toggle only when there's something in there.
      children: buildChildren(node.id),
    }));
  }

  return buildChildren(focusedId && nodes[focusedId] ? focusedId : null);
}

// Whether `nodeId` sits anywhere beneath `ancestorId`. Used to decide whether
// a page being selected is inside the current focus — a page reached from a
// search result or a wikilink usually isn't, and the tree can't show it while
// focused, so the focus is dropped rather than the tree quietly failing to
// follow. Excludes the ancestor itself: the focused node is not *inside* the
// focus, it's the boundary of it.
export function isDescendantOf(nodeId: string, ancestorId: string, nodes: Record<string, Node>): boolean {
  let currentParentId = nodes[nodeId]?.parentId ?? null;
  while (currentParentId) {
    if (currentParentId === ancestorId) return true;
    currentParentId = nodes[currentParentId]?.parentId ?? null;
  }
  return false;
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

// Whether something *above* this node is hidden, which makes this node hidden
// too without its own flag being set. Deliberately excludes the node itself:
// callers need to tell "hidden because I said so" from "hidden because my
// folder is", since only the first is what the menu toggles.
//
// Not stored on the children. A cascade written down is a cascade that goes
// stale the moment a page is dragged somewhere else, and this is the same
// walk-up-the-parents answer `getEffectiveColor` above already gives.
export function isHiddenByAncestor(nodeId: string, nodes: Record<string, Node>): boolean {
  let currentParentId = nodes[nodeId]?.parentId ?? null;
  while (currentParentId) {
    const parent: Node | undefined = nodes[currentParentId];
    if (!parent) return false;
    if (parent.hidden) return true;
    currentParentId = parent.parentId;
  }
  return false;
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

/**
 * What the tree filter is looking at. `all` is both fields, which is the
 * default and what a plain query has always done.
 *
 * `name` exists because the two halves of `all` interfere in both directions,
 * not just one: a project with a `character` tag *and* folders called
 * Characters can't isolate either from the other. Tag mode answered half of
 * that from the start; this is the other half.
 */
export const TREE_SEARCH_MODES = ["all", "name", "tag"] as const;
export type TreeSearchMode = (typeof TREE_SEARCH_MODES)[number];

// Building a Fuse index means tokenizing every node's name and tags, and the
// index depends only on the node record — which doesn't change while someone
// is typing a query. Keyed on that record's identity so the store's next
// immutable update naturally evicts a stale one, and held weakly so a closed
// project's index isn't kept alive by this cache. Each mode needs its own
// index because they search different fields.
type SearchIndexes = Partial<Record<TreeSearchMode, Fuse<Node>>>;
const searchIndexCache = new WeakMap<Record<string, Node>, SearchIndexes>();

const SEARCH_KEYS: Record<TreeSearchMode, string[]> = {
  all: ["name", "tags"],
  name: ["name"],
  tag: ["tags"],
};

function getSearchIndex(nodes: Record<string, Node>, mode: TreeSearchMode): Fuse<Node> {
  const cached = searchIndexCache.get(nodes) ?? {};
  const existing = cached[mode];
  if (existing) return existing;

  const fuse = new Fuse(Object.values(nodes), { keys: SEARCH_KEYS[mode], threshold: 0.35 });
  searchIndexCache.set(nodes, { ...cached, [mode]: fuse });
  return fuse;
}

/**
 * Fuzzy name-and-tag search for the tree filter. Returns null for an empty
 * query, meaning "don't filter."
 *
 * A leading `#` still forces tag mode whatever `mode` says. The field strips
 * that character and moves the mode control instead, so nobody typing here
 * reaches this path — but the convention predates the control, it's what a
 * pasted query or a link carrying `#antagonist` will contain, and honouring it
 * costs one line. What it must not do is *fight* the control: `#` only ever
 * narrows to tags, and the control is what put the query in that state.
 */
export function createSearchMatcher(
  nodes: Record<string, Node>,
  query: string,
  mode: TreeSearchMode = "all",
): ((nodeId: string) => boolean) | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const hashed = trimmed.startsWith("#");
  const resolved: TreeSearchMode = hashed ? "tag" : mode;
  const term = hashed ? trimmed.slice(1).trim() : trimmed;
  if (!term) return null;

  const matchedIds = new Set(
    getSearchIndex(nodes, resolved)
      .search(term)
      .map((result) => result.item.id),
  );
  return (nodeId: string) => matchedIds.has(nodeId);
}
