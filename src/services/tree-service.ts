// Pure tree-shape logic — no disk, no React. Converts the flat node graph
// into the nested shape react-arborist wants, and computes each node's
// effective (cascaded) color. See docs/glossary.md §Color Cascade.
import Fuse from "fuse.js";
import { UNIVERSE_TEMPLATE_KEY, type Node } from "../constants/schema";

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

/**
 * The universes at the project root, in the order the tree draws them
 * (Phase 22).
 *
 * Read from the graph rather than kept as a list on the project, deliberately:
 * a universe is an ordinary page with a template key, so making, deleting,
 * duplicating, importing or turning one back into a folder already maintains
 * this — a second list would be a second thing to keep in step, and the one
 * that drifts is the one that leaves a switcher offering a universe that is
 * gone.
 *
 * Only the root is looked at, because that is the only place a universe can
 * be. A stored `universe` key on a nested page — from a hand-edited file, or a
 * world written by a future version — is not counted and cannot appear in the
 * switcher.
 */
export function listUniverses(nodes: Record<string, Node>, rootOrder: string[]): Node[] {
  const roots = Object.values(nodes).filter(
    (node) => node.parentId === null && node.templateKey === UNIVERSE_TEMPLATE_KEY,
  );
  return orderSiblings(roots, rootOrder);
}

/**
 * The universe the tree is showing, or null for all of them.
 *
 * **An id that no longer names a universe reads as null, never as an empty
 * tree.** A universe can be deleted, or turned back into a folder, while it is
 * the one selected — and a tree built against an id that isn't there any more
 * would show nothing at all, with the switcher that could fix it drawn from
 * the same missing thing. Falling back to every universe at once is the state
 * the app already knows how to be in.
 */
export function selectedUniverse(
  nodes: Record<string, Node>,
  selectedUniverseId: string | null | undefined,
): Node | null {
  if (!selectedUniverseId) return null;
  const node = nodes[selectedUniverseId];
  if (!node || node.parentId !== null || node.templateKey !== UNIVERSE_TEMPLATE_KEY) return null;
  return node;
}

/**
 * The universe `nodeId` belongs to, or null if it is outside every universe.
 *
 * Walks to the top and checks what it found, rather than checking the node
 * itself: a page nine levels down is in whichever universe its chain ends at,
 * and that is the question every caller has — the tree revealing a search
 * result, a link followed out of the universe you were in.
 */
export function universeOf(nodeId: string, nodes: Record<string, Node>): Node | null {
  let current: Node | undefined = nodes[nodeId];
  while (current) {
    if (current.parentId === null) {
      return current.templateKey === UNIVERSE_TEMPLATE_KEY ? current : null;
    }
    current = nodes[current.parentId];
  }
  return null;
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

/**
 * The members of `ids` that aren't already inside another member.
 *
 * A selection can easily hold both a folder and a page inside it, and any
 * operation that carries a whole subtree — copying, deleting — would otherwise
 * act on the inner page twice: once on its own, once as part of its ancestor.
 * For a copy that means a second copy of it turning up inside the first.
 *
 * Order is preserved, so the caller's own sibling ordering survives.
 * `deleteNodes` answers the same question inline against the descendant set it
 * has to build anyway; this is for callers that don't need one.
 */
export function selectionRoots(ids: string[], nodes: Record<string, Node>): string[] {
  const selected = new Set(ids.filter((id) => nodes[id]));
  return [...selected].filter((id) => {
    let parentId = nodes[id].parentId;
    while (parentId) {
      if (selected.has(parentId)) return false;
      // A parent id pointing at nothing ends the walk rather than looping
      // forever — the same guard isDescendantOf above needs.
      parentId = nodes[parentId]?.parentId ?? null;
    }
    return true;
  });
}

/**
 * One place "Move to" can put a page. `id` is null for the project root, which
 * is a real destination and has no node to name it — the caller passes the
 * project's name for that row.
 *
 * `path` is the ancestor names from the root down, excluding the destination
 * itself. It isn't decoration: a world has several pages called "Notes", and a
 * list of bare names is a list of identical rows.
 */
export type MoveDestination = {
  id: string | null;
  name: string;
  path: string[];
};

/**
 * Everywhere the given pages could go, in the order the sidebar draws them.
 *
 * Three kinds of place are left out, and each is a bug rather than a tidiness
 * preference:
 *
 * - **The pages being moved, and everything under them.** A page filed inside
 *   itself is a cycle: the tree walk never terminates, and on disk it's a
 *   directory being moved into its own subtree, which is how a subtree gets
 *   lost rather than relocated. Dragging can't express this — react-arborist
 *   won't draw the drop — so this is the first route to Move that has to say it
 *   out loud.
 * - **The parent they already share.** "Move to" the folder they're already in
 *   does nothing visible, which reads as the menu being broken. Only excluded
 *   when they *all* share it: a selection spread across three folders can
 *   genuinely be gathered into any one of them.
 * - **Nothing else.** Every page can hold pages (2026-08-10), so there's no
 *   template that can't be a destination.
 */
export function moveDestinations(
  movingIds: string[],
  nodes: Record<string, Node>,
  rootOrder: string[],
  childOrder: Record<string, string[]> | undefined,
  rootLabel: string,
): MoveDestination[] {
  const moving = movingIds.filter((id) => nodes[id]);
  if (moving.length === 0) return [];

  const movingSet = new Set(moving);
  const isInsideMoving = (id: string): boolean => {
    let currentId: string | null = id;
    while (currentId) {
      if (movingSet.has(currentId)) return true;
      currentId = nodes[currentId]?.parentId ?? null;
    }
    return false;
  };

  // `undefined` when they don't agree, which is the case that keeps every
  // parent in the list. Reading the first one and comparing is enough — a
  // single moving page trivially agrees with itself.
  const sharedParent = moving.every((id) => nodes[id].parentId === nodes[moving[0]].parentId)
    ? nodes[moving[0]].parentId
    : undefined;

  const childrenByParent = new Map<string | null, Node[]>();
  for (const node of Object.values(nodes)) {
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }

  const destinations: MoveDestination[] = [];
  if (sharedParent !== null) destinations.push({ id: null, name: rootLabel, path: [] });

  // A universe only ever sits at the root (Phase 22), so a selection holding
  // one has nowhere else to go and the menu says so by being one line long.
  // `planMove` refuses the move as well — this is the half that keeps the
  // refusal from being a destination you can pick and watch do nothing.
  if (moving.some((id) => nodes[id].templateKey === UNIVERSE_TEMPLATE_KEY)) return destinations;

  const walk = (parentId: string | null, path: string[]): void => {
    const siblings = orderSiblings(childrenByParent.get(parentId) ?? [], parentId === null ? rootOrder : childOrder?.[parentId]);
    for (const node of siblings) {
      // The whole subtree goes with it, so there's nothing below a moving page
      // worth descending into either.
      if (isInsideMoving(node.id)) continue;
      if (node.id !== sharedParent) destinations.push({ id: node.id, name: node.name, path });
      walk(node.id, [...path, node.name]);
    }
  };
  walk(null, []);

  return destinations;
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

// Whether anything is parented to this node. A boolean rather than a count,
// because every caller so far only asks "is it empty" — and a count would make
// the folder view re-render on each page added to a folder holding two hundred
// of them, for a number nothing displays.
//
// Reads `parentId` off the nodes rather than `childOrder`, for the same reason
// buildTreeData falls back to it: `childOrder` records arrangement, not
// membership, and a child that has never been dragged isn't in it.
export function hasChildren(nodeId: string, nodes: Record<string, Node>): boolean {
  for (const node of Object.values(nodes)) {
    if (node.parentId === nodeId) return true;
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
 * A breadcrumb trail with its middle folded away — `leading › … › trailing`.
 *
 * Two different things make a trail too long, and each needs its own answer.
 * A page buried eight levels down has *too many* steps, which is this; a page
 * whose name is a sentence has one step that's *too wide*, which is CSS's
 * problem and is solved by letting each crumb shorten with an ellipsis. Fixing
 * only the width would leave twelve two-character stubs; fixing only the count
 * would leave four crumbs still overrunning the column.
 *
 * The topmost ancestor survives rather than being folded in with the rest,
 * because it's the one that says which part of the world this is — losing
 * "Locations" tells you much less than losing a step in the middle of it.
 */
export type BreadcrumbTrail = {
  /** Nearest the project name. */
  leading: Node[];
  /** Folded behind the ellipsis. Empty when the trail fits as it is. */
  hidden: Node[];
  /** Nearest the page itself. */
  trailing: Node[];
};

export function collapseBreadcrumb(ancestors: Node[], maxVisible: number): BreadcrumbTrail {
  // Below two there's no trail left to shorten — one crumb and an ellipsis is
  // longer than the two crumbs it replaced.
  if (maxVisible < 2 || ancestors.length <= maxVisible) {
    return { leading: ancestors, hidden: [], trailing: [] };
  }

  const trailingCount = maxVisible - 1;
  return {
    leading: ancestors.slice(0, 1),
    hidden: ancestors.slice(1, ancestors.length - trailingCount),
    trailing: ancestors.slice(ancestors.length - trailingCount),
  };
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
