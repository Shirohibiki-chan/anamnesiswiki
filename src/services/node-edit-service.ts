// What the tree and the project's ordering look like after a page is moved,
// deleted or duplicated.
//
// **These three are the operations that have cost her real writing**, which is
// why they are the ones pulled out of the store first. Every one of them is the
// same shape underneath: expand a selection to the subtrees it really means,
// rebuild the sibling lists that mention it, and clear the project-level
// pointers (home, pins, selection) that would otherwise be left aiming at
// something that is gone. None of that needs React, a store or a disk — it is
// a graph in and a graph out — and until now none of it could be tested,
// because it only existed inside a Zustand action that also wrote files.
//
// **Nothing here touches the filesystem or performs I/O**, deliberately. The
// store still owns the writes, the undo entries and the picture files; this
// owns the answer to "what should be true afterwards". `planDuplicate` takes
// the copied picture names as an argument for exactly that reason — copying a
// file is I/O, deciding which clone wears it is not.
//
// See filesystem-service.ts's `planRelocations` for the other half of the
// story: this plans the *graph*, that plans the *paths*.
import { orderSiblings, selectionRoots } from "./tree-service";
import type { Block, Node, Project } from "../constants/schema";

/**
 * The sibling order as the tree is actually showing it right now — the stored
 * manual order where there is one, creation order for everything else.
 *
 * Used as the base list a drop inserts into, so a folder nobody has ever
 * reordered doesn't have to be seeded separately. Also what LK export asks for,
 * because sibling positions written into an export should be the ones she can
 * see.
 */
export function orderedSiblingIds(
  nodes: Record<string, Node>,
  project: Project,
  parentId: string | null,
): string[] {
  const siblings = Object.values(nodes).filter((n) => n.parentId === parentId);
  const stored = parentId === null ? project.rootOrder : project.childOrder?.[parentId];
  return orderSiblings(siblings, stored).map((n) => n.id);
}

/**
 * Every descendant of `id`, breadth-first.
 *
 * Groups children by parent in one pass and then walks that grouping, rather
 * than re-scanning the whole node record once per level — the recursive-filter
 * shape this replaces re-read every node in the project for every node in the
 * subtree.
 */
export function descendantIds(id: string, nodes: Record<string, Node>): string[] {
  const childIdsByParent = new Map<string | null, string[]>();
  for (const node of Object.values(nodes)) {
    const siblings = childIdsByParent.get(node.parentId);
    if (siblings) siblings.push(node.id);
    else childIdsByParent.set(node.parentId, [node.id]);
  }

  const collected: string[] = [];
  const queue: string[] = [id];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const childId of childIdsByParent.get(queue[cursor]) ?? []) {
      collected.push(childId);
      queue.push(childId);
    }
  }
  return collected;
}

/** Drops `ids` out of every sibling list in `project` that mentions them. */
function withoutFromOrdering(project: Project, parentIds: Iterable<string | null>, ids: ReadonlySet<string>): Project {
  let next = project;
  for (const parentId of parentIds) {
    if (parentId === null) {
      next = { ...next, rootOrder: next.rootOrder.filter((n) => !ids.has(n)) };
    } else if (next.childOrder?.[parentId]) {
      next = {
        ...next,
        childOrder: { ...next.childOrder, [parentId]: next.childOrder[parentId].filter((n) => !ids.has(n)) },
      };
    }
  }
  return next;
}

/** Writes one parent's sibling list back, picking the right field for the root. */
function withOrdering(project: Project, parentId: string | null, order: string[]): Project {
  return parentId === null
    ? { ...project, rootOrder: order }
    : { ...project, childOrder: { ...project.childOrder, [parentId]: order } };
}

export type MovePlan = {
  nodes: Record<string, Node>;
  project: Project;
  /** The ids that are actually moving — the requested ones that still exist. */
  moved: string[];
  /** Where each one came from, so an undo can put it back. */
  previousParents: Map<string, string | null>;
};

/**
 * Reparent `ids` under `newParentId`, landing at `index` among the siblings
 * already there.
 *
 * Returns null when there is nothing to do — no surviving ids, or a destination
 * that isn't in the graph. A drop onto an id that has gone would file a whole
 * subtree nowhere, so it is refused rather than treated as a drop to the root.
 *
 * **The destination list is rebuilt from the order actually on screen**, not
 * from whatever partial list happens to be stored, so a folder that has never
 * been reordered still gets a complete and correct list the first time
 * something is dropped into it. The moved ids keep their own relative order.
 *
 * **A move out of several folders at once is still one plan.** A multi-select
 * can span parents, and every old list that mentions a moved id is pruned —
 * a stale entry left behind would pull a page back to an old position the next
 * time it came home.
 */
export function planMove(
  nodes: Record<string, Node>,
  project: Project,
  ids: readonly string[],
  newParentId: string | null,
  index: number | undefined,
  now: number,
): MovePlan | null {
  const moved = ids.filter((id) => nodes[id]);
  if (moved.length === 0) return null;
  if (newParentId !== null && !nodes[newParentId]) return null;

  const movingSet = new Set(moved);
  const nextNodes = { ...nodes };
  for (const id of moved) nextNodes[id] = { ...nodes[id], parentId: newParentId, updatedAt: now };

  const destinationIds = orderedSiblingIds(nextNodes, project, newParentId).filter((n) => !movingSet.has(n));
  const insertAt = index === undefined ? destinationIds.length : Math.min(Math.max(index, 0), destinationIds.length);
  const destinationOrder = [...destinationIds.slice(0, insertAt), ...moved, ...destinationIds.slice(insertAt)];

  const previousParents = new Map(moved.map((id) => [id, nodes[id].parentId]));
  const oldParentIds = new Set([...previousParents.values()].filter((p) => p !== newParentId));

  const nextProject = withoutFromOrdering(
    withOrdering(project, newParentId, destinationOrder),
    oldParentIds,
    movingSet,
  );

  return { nodes: nextNodes, project: nextProject, moved, previousParents };
}

export type DeletePlan = {
  nodes: Record<string, Node>;
  project: Project;
  /** The requested ids that existed — what the undo label counts. */
  deleted: string[];
  /** Everything going, subtrees included. */
  removedIds: Set<string>;
  /**
   * The subset to ask the disk to remove.
   *
   * A selection can easily hold both a folder and something inside it, and a
   * directory-storage node takes its whole subtree with it — asking for the
   * child as well would try to remove a path its parent already took.
   */
  removalRoots: string[];
};

/**
 * Remove `ids` and everything under them.
 *
 * Returns null when none of them are in the graph.
 *
 * **The project-level pointers are cleared here, not by the caller.** Home, the
 * pinned rail and the current selection are all ordinary node ids, and every
 * one of them can be deleted like any other page; a dangling one leaves a
 * button that goes nowhere or a page view rendering nothing with no way back.
 * Each is cleared when what it names is anywhere in the removal, not just when
 * it is one of the roots.
 *
 * The stored sibling order is pruned both ways: entries *for* deleted parents
 * go, and mentions *of* deleted nodes inside surviving parents' lists go.
 * Stale ids sort harmlessly, but left alone they accumulate in `project.json`
 * forever.
 */
export function planDelete(
  nodes: Record<string, Node>,
  project: Project,
  ids: readonly string[],
): DeletePlan | null {
  const deleted = ids.filter((id) => nodes[id]);
  if (deleted.length === 0) return null;

  const removedIds = new Set(deleted.flatMap((id) => [id, ...descendantIds(id, nodes)]));
  const removalRoots = deleted.filter((id) => {
    const parentId = nodes[id].parentId;
    return !parentId || !removedIds.has(parentId);
  });

  const nextNodes = Object.fromEntries(Object.entries(nodes).filter(([nodeId]) => !removedIds.has(nodeId)));

  const nextChildOrder: Record<string, string[]> = {};
  for (const [parentId, order] of Object.entries(project.childOrder ?? {})) {
    if (removedIds.has(parentId)) continue;
    nextChildOrder[parentId] = order.filter((nodeId) => !removedIds.has(nodeId));
  }

  const selectionGone = Boolean(project.selectedId && removedIds.has(project.selectedId));
  const nextProject: Project = {
    ...project,
    rootOrder: project.rootOrder.filter((n) => !removedIds.has(n)),
    childOrder: nextChildOrder,
    homeNodeId: project.homeNodeId && removedIds.has(project.homeNodeId) ? null : project.homeNodeId,
    pinnedIds: (project.pinnedIds ?? []).filter((pinnedId) => !removedIds.has(pinnedId)),
    selectedId: selectionGone ? null : project.selectedId,
    // A copy of the same node's name, so it goes stale for the same reason.
    selectedName: selectionGone ? null : project.selectedName,
  };

  return { nodes: nextNodes, project: nextProject, deleted, removedIds, removalRoots };
}

export type DuplicateScope = {
  /**
   * The selection reduced to what actually gets copied. Selecting a folder and
   * something inside it can't mean copying both — see tree-service's
   * `selectionRoots`.
   */
  roots: string[];
  /** Those roots plus every descendant: the pages a copy has to be made of. */
  subtreeIds: string[];
};

/**
 * What a duplicate would cover, worked out before any picture is copied.
 *
 * Separate from `planDuplicate` because the caller needs these ids *first*: the
 * pictures belonging to them have to be copied on disk, and the copied names
 * are an input to the plan rather than something it can invent.
 */
export function duplicateScope(nodes: Record<string, Node>, ids: readonly string[]): DuplicateScope | null {
  const existing = ids.filter((id) => nodes[id]);
  if (existing.length === 0) return null;
  const roots = selectionRoots(existing, nodes);
  return { roots, subtreeIds: roots.flatMap((rootId) => [rootId, ...descendantIds(rootId, nodes)]) };
}

/** The pictures a clone should wear, already copied to their own files. */
export type ClonedAssetNames = {
  image?: string;
  banner?: string;
  /**
   * The page's blocks, with the pictures its image blocks hold copied too
   * (Phase 19.5). Absent when the page has no block list of its own, which is
   * every page written before blocks existed.
   */
  blocks?: Block[];
};

export type DuplicatePlan = {
  nodes: Record<string, Node>;
  project: Project;
  /** The new pages, parents already rewired to point at each other. */
  clones: Node[];
  /** Original id → clone id, for the whole subtree. */
  idMap: Map<string, string>;
  /** Just the copies of what was selected — what an undo deletes. */
  cloneRootIds: Set<string>;
};

/**
 * Copy `scope`'s pages, landing each copy directly after what it was copied
 * from.
 *
 * `mintId` and `now` are arguments rather than calls so a test can predict the
 * result; `assets` carries the already-copied picture names, keyed by the
 * *original* node's id. **A clone must never share the original's picture
 * filename** — replacing or deleting the picture on either side would take it
 * out from under the other — so a missing entry means a clone with no picture,
 * never a clone pointing at the original's.
 *
 * **The sibling order is rebuilt by walking each parent's existing list**,
 * rather than splicing one copy in at a time: duplicating several pages from
 * the same folder at once shifts every position after the first insertion, so
 * the second copy would land one place further along than it should.
 */
export function planDuplicate(
  nodes: Record<string, Node>,
  project: Project,
  scope: DuplicateScope,
  options: { mintId: () => string; now: number; assets: ReadonlyMap<string, ClonedAssetNames> },
): DuplicatePlan {
  const { roots, subtreeIds } = scope;
  const { mintId, now, assets } = options;

  const idMap = new Map(subtreeIds.map((subId) => [subId, mintId()]));
  const rootIds = new Set(roots);

  const clones: Node[] = subtreeIds.map((subId) => {
    const source = nodes[subId];
    const isRoot = rootIds.has(subId);
    const { image, banner, blocks } = assets.get(subId) ?? {};
    return {
      ...source,
      blocks: blocks ?? source.blocks,
      id: idMap.get(subId)!,
      parentId: isRoot ? source.parentId : (idMap.get(source.parentId!) ?? null),
      name: isRoot ? `${source.name} (Copy)` : source.name,
      image,
      banner,
      createdAt: now,
      updatedAt: now,
    };
  });

  const nextNodes = { ...nodes };
  for (const clone of clones) nextNodes[clone.id] = clone;

  const cloneByOriginal = new Map<string, string>(roots.map((rootId) => [rootId, idMap.get(rootId)!]));
  const cloneRootIds = new Set(cloneByOriginal.values());
  const affectedParents = new Set(roots.map((rootId) => nodes[rootId].parentId));

  let nextProject: Project = project;
  for (const parentId of affectedParents) {
    const siblingIds = orderedSiblingIds(nextNodes, nextProject, parentId).filter((n) => !cloneRootIds.has(n));
    const withClones = siblingIds.flatMap((n) => {
      const cloneId = cloneByOriginal.get(n);
      return cloneId ? [n, cloneId] : [n];
    });
    nextProject = withOrdering(nextProject, parentId, withClones);
  }

  return { nodes: nextNodes, project: nextProject, clones, idMap, cloneRootIds };
}
