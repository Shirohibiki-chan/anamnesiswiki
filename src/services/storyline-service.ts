// What a storyline's canvas *is*, apart from how it is drawn (Phase 25).
//
// Every function here takes a storyline and gives one back. Nothing reaches for
// the store, the disk or React — the same split `node-edit-service.ts` makes
// for the tree, and for the same reason: the rules about what shape the data
// may end up in are the ones worth being able to test on their own.
//
// **The one rule with teeth is that a storyline is a DAG.** Threads fork and
// rejoin, so a scene may have several parents and several children — but "what
// happened next" has to have an answer, and a cycle is the state where it does
// not. `connect` refuses one rather than drawing it and leaving the reader to
// notice.
import type { Node, Storyline, StorylineEdge, StorylineNode } from "../constants/schema";
import { STORYLINE_NEW_NODE_GAP } from "../constants/storyline";

export function createStoryline(): Storyline {
  return { version: 1, nodes: [], edges: [] };
}

/**
 * A stored storyline read back into the shape the rest of the code expects.
 *
 * Everything on disk is somebody's file and may have been edited by hand, so
 * nothing here trusts its own field types: a canvas with a broken `edges` is
 * a canvas with no lines, not a crash on the page that holds it.
 */
export function readStoryline(raw: unknown): Storyline {
  if (!raw || typeof raw !== "object") return createStoryline();
  const record = raw as Record<string, unknown>;
  const nodes = Array.isArray(record.nodes) ? record.nodes : [];
  const edges = Array.isArray(record.edges) ? record.edges : [];
  const seen = new Set<string>();
  const readNodes: StorylineNode[] = [];
  for (const entry of nodes) {
    if (!entry || typeof entry !== "object") continue;
    const node = entry as Record<string, unknown>;
    if (typeof node.id !== "string" || typeof node.pageId !== "string") continue;
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    readNodes.push({
      id: node.id,
      pageId: node.pageId,
      x: typeof node.x === "number" && Number.isFinite(node.x) ? node.x : 0,
      y: typeof node.y === "number" && Number.isFinite(node.y) ? node.y : 0,
    });
  }
  const readEdges: StorylineEdge[] = [];
  const edgeIds = new Set<string>();
  for (const entry of edges) {
    if (!entry || typeof entry !== "object") continue;
    const edge = entry as Record<string, unknown>;
    if (typeof edge.id !== "string" || typeof edge.fromId !== "string" || typeof edge.toId !== "string") continue;
    if (edgeIds.has(edge.id)) continue;
    edgeIds.add(edge.id);
    readEdges.push({ id: edge.id, fromId: edge.fromId, toId: edge.toId });
  }
  return { version: 1, nodes: readNodes, edges: readEdges };
}

/** Whether this canvas holds nothing at all — what the empty state asks about. */
export function isEmptyStoryline(storyline: Storyline): boolean {
  return storyline.nodes.length === 0;
}

export function addSceneNode(storyline: Storyline, pageId: string, at: { x: number; y: number }): Storyline {
  const node: StorylineNode = { id: crypto.randomUUID(), pageId, x: Math.round(at.x), y: Math.round(at.y) };
  return { ...storyline, nodes: [...storyline.nodes, node] };
}

/**
 * Where a scene added from a button rather than from a click on the canvas
 * goes: to the right of everything already there, level with the top of it.
 *
 * **Right rather than below**, because a storyline is read left to right — the
 * next scene belongs where the eye already is. An empty canvas starts at the
 * origin, which is what the view centres on.
 */
export function nextPlacement(storyline: Storyline): { x: number; y: number } {
  if (storyline.nodes.length === 0) return { x: 0, y: 0 };
  let right = -Infinity;
  let top = Infinity;
  for (const node of storyline.nodes) {
    right = Math.max(right, node.x);
    top = Math.min(top, node.y);
  }
  return { x: right + STORYLINE_NEW_NODE_GAP, y: top };
}

/** Positions written back after a drag, by canvas-node id. */
export function moveNodes(storyline: Storyline, moved: Record<string, { x: number; y: number }>): Storyline {
  if (Object.keys(moved).length === 0) return storyline;
  return {
    ...storyline,
    nodes: storyline.nodes.map((node) => {
      const to = moved[node.id];
      return to ? { ...node, x: Math.round(to.x), y: Math.round(to.y) } : node;
    }),
  };
}

/**
 * Whether joining these two would make "what happened next" circular.
 *
 * Walks forward from `toId` looking for `fromId` — if the new edge's end can
 * already reach its start, adding it closes a loop.
 */
export function wouldCycle(storyline: Storyline, fromId: string, toId: string): boolean {
  if (fromId === toId) return true;
  const onward = new Map<string, string[]>();
  for (const edge of storyline.edges) {
    const list = onward.get(edge.fromId);
    if (list) list.push(edge.toId);
    else onward.set(edge.fromId, [edge.toId]);
  }
  const queue = [toId];
  const seen = new Set<string>([toId]);
  while (queue.length > 0) {
    const at = queue.shift()!;
    if (at === fromId) return true;
    for (const next of onward.get(at) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}

/** Why an edge was not drawn, or null when it was. */
export type ConnectRefusal = "same-node" | "already-joined" | "would-loop";

export type ConnectResult = { storyline: Storyline; refused: ConnectRefusal | null };

/**
 * Joins two scenes in narrative order.
 *
 * **Refuses rather than corrects.** Each of the three refusals is a gesture
 * that had a meaning the canvas cannot honour, and quietly doing something
 * near-enough — dropping the duplicate silently, reversing the loop — is how a
 * drawing stops matching what the person drawing it believes. The caller says
 * which one happened; see `PageStoryline`.
 */
export function connect(storyline: Storyline, fromId: string, toId: string): ConnectResult {
  if (fromId === toId) return { storyline, refused: "same-node" };
  // A pair joined the other way round is still joined: the line already on
  // screen says these two are in sequence, and a second one in the opposite
  // direction is the smallest possible cycle.
  const joined = storyline.edges.some(
    (edge) =>
      (edge.fromId === fromId && edge.toId === toId) || (edge.fromId === toId && edge.toId === fromId),
  );
  if (joined) return { storyline, refused: "already-joined" };
  if (wouldCycle(storyline, fromId, toId)) return { storyline, refused: "would-loop" };
  const edge: StorylineEdge = { id: crypto.randomUUID(), fromId, toId };
  return { storyline: { ...storyline, edges: [...storyline.edges, edge] }, refused: null };
}

export function disconnect(storyline: Storyline, edgeId: string): Storyline {
  return { ...storyline, edges: storyline.edges.filter((edge) => edge.id !== edgeId) };
}

/**
 * Takes a scene off the canvas.
 *
 * **The page it pointed at is not touched, and that is the whole distinction.**
 * A scene is a page that lives in the tree; removing it here removes it from
 * this arrangement, exactly as removing a database view removes a view and
 * never a row. Deleting the page is a separate act, done from the tree.
 */
export function removeNode(storyline: Storyline, nodeId: string): Storyline {
  return {
    nodes: storyline.nodes.filter((node) => node.id !== nodeId),
    edges: storyline.edges.filter((edge) => edge.fromId !== nodeId && edge.toId !== nodeId),
    version: 1,
  };
}

/** A scene on the canvas with the page it stands for resolved. */
export type DrawnScene = StorylineNode & {
  name: string;
  templateKey: string;
  icon?: string;
  color?: string;
};

export type StorylineModel = {
  scenes: DrawnScene[];
  edges: StorylineEdge[];
  /** Canvas nodes whose page is gone — counted, never drawn. See below. */
  orphans: number;
};

/**
 * The canvas joined to the pages it names, ready to draw.
 *
 * **A node whose page is gone is dropped here and never written away.** The
 * stored file keeps it, deliberately: deleting a page is undoable in this app,
 * and a canvas that pruned itself the moment a scene was deleted would put the
 * page back with no line to anything and no position — the arrangement lost to
 * a mistake that was itself undone. Costing a few bytes to survive that is the
 * same trade `Project.graphPins` makes.
 */
export function storylineModel(storyline: Storyline, nodes: Record<string, Node>): StorylineModel {
  const scenes: DrawnScene[] = [];
  const alive = new Set<string>();
  for (const node of storyline.nodes) {
    const page = nodes[node.pageId];
    if (!page) continue;
    alive.add(node.id);
    scenes.push({
      ...node,
      name: page.name,
      templateKey: page.templateKey,
      icon: page.icon,
      color: page.color,
    });
  }
  return {
    scenes,
    edges: storyline.edges.filter((edge) => alive.has(edge.fromId) && alive.has(edge.toId)),
    orphans: storyline.nodes.length - scenes.length,
  };
}

/** Which pages this canvas already shows, so the same one is not offered twice. */
export function pagesOnCanvas(storyline: Storyline): Set<string> {
  return new Set(storyline.nodes.map((node) => node.pageId));
}
