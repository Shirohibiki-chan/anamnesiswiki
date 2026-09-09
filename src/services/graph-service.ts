// The pages around one page, as something a renderer can draw. Phase 24, step 1.
//
// **Nothing here works out a relationship.** link-index.ts already knows every
// edge in the project and why each one exists — its own header comment says it
// was written for this. What this file does is walk outward from one page over
// that index, decide which line survives when two pages are connected more than
// one way, and hand back a flat shape. Keeping the walk out of the component is
// what makes "one connection out" and "two" the same code with a different
// number, and what lets the ordering be asserted in a test instead of eyeballed
// on a canvas.
import { GRAPH_RING_RADIUS, GRAPH_WORLD_PIN_PREFIX } from "../constants/graph";
import { UNIVERSE_TEMPLATE_KEY, type DatabaseField, type DatabaseOperator, type Node } from "../constants/schema";
import { outgoingEdges, type LinkIndex, type MentionKind } from "./link-index";
import { getEffectiveColor, isDescendantOf } from "./tree-service";

/**
 * Why a line is on the graph.
 *
 * The first three are link-index's own kinds and are all things she wrote.
 * `tree` is this file's addition: a page nested under another is a real
 * relationship and leaving it out would draw a picture the app knows to be
 * incomplete — but where a page was filed and what was written about it are not
 * the same claim, so the renderer draws them differently. Her call 2026-09-07;
 * see `docs/shipped.md` Phase 24.
 */
export type GraphEdgeKind = MentionKind | "tree";

/**
 * Which kind survives when one pair of pages is connected several ways.
 *
 * **One line per pair, and the most specific reason wins.** Two lines between
 * the same two discs land on top of each other, so the choice is which reason
 * to show rather than whether to show both. The order mirrors `outgoingEdges`,
 * which already decided that prose beats a property for the same target — a
 * second, contradictory precedence here would mean a line's reason depended on
 * which end of it you asked from.
 */
const KIND_RANK: Record<GraphEdgeKind, number> = { prose: 0, property: 1, manual: 2, tree: 3 };

export type GraphNode = {
  id: string;
  name: string;
  templateKey: string;
  /** The page's own icon glyph, where it set one, for `NodeIcon` to resolve. */
  icon?: string;
  /** A palette key from the colour cascade, or null for an uncoloured page. */
  color: string | null;
  /**
   * Whether this page chose its colour rather than inheriting it.
   *
   * Unused by the first drawing and deliberately carried anyway: colour is
   * inherited, so a world with one coloured folder near its root draws as a
   * graph of a single colour, and this flag is the whole of the fix if that
   * turns out to be the ordinary case. See `docs/shipped.md` Phase 24.
   */
  ownsColor: boolean;
  /** Hops from the page the graph is centred on. 0 is that page. */
  depth: number;
  x: number;
  y: number;
};

export type GraphEdge = {
  /** The two ids, sorted and joined — the pair's identity, and a stable key. */
  id: string;
  sourceId: string;
  targetId: string;
  kind: GraphEdgeKind;
  /** The property's label where the surviving edge came from one. */
  label?: string;
};

export type GraphModel = { nodes: GraphNode[]; edges: GraphEdge[] };

type RawEdge = { sourceId: string; targetId: string; kind: GraphEdgeKind; label?: string };

/** The pair's identity, independent of which way round the edge was found. */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Every edge with `node` at one end of it, in both directions.
 *
 * Outgoing comes from `outgoingEdges` and incoming from the index's
 * `mentionsOf`, which is the same data read from the other side — a graph is
 * undirected in the sense that matters here, since a line has to be drawn
 * whichever page was the one doing the pointing.
 */
function edgesTouching(node: Node, nodes: Record<string, Node>, index: LinkIndex): RawEdge[] {
  const out: RawEdge[] = [];

  for (const [targetId, edge] of outgoingEdges(node)) {
    if (!nodes[targetId]) continue;
    out.push({ sourceId: node.id, targetId, kind: edge.kind, label: edge.label });
  }

  for (const mention of index.mentionsOf.get(node.id) ?? []) {
    if (!nodes[mention.fromId]) continue;
    out.push({ sourceId: mention.fromId, targetId: node.id, kind: mention.kind, label: mention.label });
  }

  if (node.parentId && nodes[node.parentId]) {
    out.push({ sourceId: node.parentId, targetId: node.id, kind: "tree" });
  }
  for (const childId of index.childrenOf.get(node.id) ?? []) {
    if (nodes[childId]) out.push({ sourceId: node.id, targetId: childId, kind: "tree" });
  }

  return out;
}

/**
 * A stable number in [0, 1) for a page id — FNV-1a, folded to a fraction.
 *
 * The point is only that it never changes: a page keeps roughly the position it
 * had last time even as the pages around it come and go, which is what makes a
 * graph somewhere you can build a memory of where things are rather than a
 * fresh scatter per visit.
 */
function hashUnit(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x100000000;
}

/** Where a node starts before the forces are applied. The focus starts centred. */
export function seedPosition(id: string, depth: number): { x: number; y: number } {
  if (depth === 0) return { x: 0, y: 0 };
  const angle = hashUnit(id) * Math.PI * 2;
  const radius = GRAPH_RING_RADIUS * depth;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/**
 * A starting point on a disc rather than on a ring, for a graph with no hops.
 *
 * **Rings are the wrong shape once every page is at the same distance.** A
 * whole universe seeded by `seedPosition` starts as one crowded circle, and
 * the simulation spends its whole run pushing that apart instead of finding the
 * clusters — which is both slower and a worse picture. A disc that already
 * holds them starts the run near the answer.
 *
 * The square root is what keeps the density even. Radius drawn straight from a
 * uniform number crowds the middle, because the area near the edge of a disc is
 * larger than the area near its centre; taking the root spreads the same
 * numbers over equal area. It grows with the count for the plain reason that
 * three hundred pages need more room than thirty.
 */
export function seedScatter(id: string, count: number): { x: number; y: number } {
  const angle = hashUnit(id) * Math.PI * 2;
  const radius = Math.sqrt(hashUnit(`${id}~radius`)) * GRAPH_RING_RADIUS * Math.sqrt(Math.max(count, 1));
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/**
 * A random source that is not random between two runs — mulberry32, seeded.
 *
 * d3-force reaches for `Math.random` in one place: nudging two nodes that have
 * landed on exactly the same point. That is rare, and it is exactly the sort of
 * rare that makes one opening of a world differ from the next. Handing it this
 * instead is the difference between a layout that is usually the same and one
 * that is the same.
 */
export function seededRandom(seed: string): () => number {
  let state = (Math.round(hashUnit(seed) * 0xffffffff) || 1) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The lines and the drawable nodes for a set of pages that has already been
 * decided. Phase 24, step 3.
 *
 * **Split out because the two graphs differ only in how that set is chosen.**
 * One walks outward from a page; the other takes a universe whole. Everything
 * after that — which line survives between a pair, what a node wears, the order
 * things come out in — is identical, and was identical when it was written
 * once, so this is where it stays written once.
 *
 * `place` is the only other difference: hops around a centre want rings, and a
 * flat set wants a disc.
 */
function assemble(
  reached: Map<string, number>,
  nodes: Record<string, Node>,
  index: LinkIndex,
  place: (id: string, depth: number) => { x: number; y: number },
): GraphModel {
  const best = new Map<string, GraphEdge>();
  for (const id of reached.keys()) {
    const node = nodes[id];
    if (!node) continue;
    for (const edge of edgesTouching(node, nodes, index)) {
      if (edge.sourceId === edge.targetId) continue;
      if (!reached.has(edge.sourceId) || !reached.has(edge.targetId)) continue;
      const key = pairKey(edge.sourceId, edge.targetId);
      const standing = best.get(key);
      if (standing && KIND_RANK[standing.kind] <= KIND_RANK[edge.kind]) continue;
      best.set(key, { id: key, ...edge });
    }
  }

  const graphNodes: GraphNode[] = [];
  for (const [id, hop] of reached) {
    const node = nodes[id];
    if (!node) continue;
    const { color, isOwner } = getEffectiveColor(id, nodes);
    graphNodes.push({
      id,
      name: node.name,
      templateKey: node.templateKey,
      icon: node.icon,
      color,
      ownsColor: isOwner,
      depth: hop,
      ...place(id, hop),
    });
  }

  return { nodes: graphNodes, edges: [...best.values()] };
}

/**
 * The pages within `depth` connections of `focusId`, and the lines between them.
 *
 * **Edges are collected after the walk, not during it**, so two pages that both
 * sit on the outermost ring are still joined to each other. Gathering as you go
 * would draw the ring as spokes with no rim, which is a different and wronger
 * picture of the same data.
 *
 * Everything here iterates maps built in tree order, so the arrays come out the
 * same on every call — which is half of the layout being deterministic, before
 * the simulation is asked to be the other half.
 *
 * **`keep` filters during the walk rather than after it**, and the difference
 * shows the moment the depth is more than one: filtering afterwards would leave
 * a page that was only reachable *through* a hidden page floating with no line
 * to anything. Everything drawn is reachable through pages that are also drawn,
 * which is the only reading of a filtered graph that stays a graph.
 *
 * **The focused page is never filtered out.** Its graph is what she asked for;
 * hiding it would answer a different question with an empty window.
 */
export function graphAround(
  focusId: string,
  nodes: Record<string, Node>,
  index: LinkIndex,
  depth: number,
  keep: (node: Node) => boolean = () => true,
): GraphModel {
  if (!nodes[focusId]) return { nodes: [], edges: [] };

  const reached = new Map<string, number>([[focusId, 0]]);
  let frontier = [focusId];

  for (let hop = 1; hop <= depth; hop += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      const node = nodes[id];
      if (!node) continue;
      for (const edge of edgesTouching(node, nodes, index)) {
        const other = edge.sourceId === id ? edge.targetId : edge.sourceId;
        if (other === id || reached.has(other)) continue;
        const candidate = nodes[other];
        if (!candidate || !keep(candidate)) continue;
        reached.set(other, hop);
        next.push(other);
      }
    }
    frontier = next;
  }

  return assemble(reached, nodes, index, seedPosition);
}

/**
 * A graph of a set of pages given outright, rather than walked to. Phase 24,
 * step 3.
 *
 * **Every page in the set is drawn, including the ones joined to nothing.** A
 * walk can only ever reach what something points at, so a page nobody has
 * linked yet would be invisible on its own world's graph — which is exactly
 * backwards, since being unconnected is the most useful thing a picture of a
 * whole world can tell you about a page.
 *
 * `focusId` only marks a page, it does not move it. **The two doors have to
 * produce the same drawing** — widening a page's graph to everything and
 * opening the world's are the same picture of the same universe, and one of
 * them quietly laying out differently is the feature admitting it is really two.
 * So the pages go in in the order they were given whether or not one of them is
 * the focus, and the focus is not seeded at the centre: it is drawn larger and
 * filled, and that is the whole of the difference. A focus outside the set is
 * appended rather than inserted, for the same reason — it is where she is, and
 * it must not shift everything else along to say so.
 */
export function graphOfPages(
  pageIds: string[],
  focusId: string | null,
  nodes: Record<string, Node>,
  index: LinkIndex,
  keep: (node: Node) => boolean = () => true,
): GraphModel {
  const reached = new Map<string, number>();
  for (const id of pageIds) {
    if (reached.has(id)) continue;
    const node = nodes[id];
    if (!node || !keep(node)) continue;
    reached.set(id, id === focusId ? 0 : 1);
  }
  // Never filtered out and never reordered: a page opened from outside the
  // universe it is scoped to is still where she is.
  if (focusId && nodes[focusId] && !reached.has(focusId)) reached.set(focusId, 0);

  const count = reached.size;
  return assemble(reached, nodes, index, (id) => seedScatter(id, count));
}

/**
 * What a graph can be filtered on. Phase 24, step 2.
 *
 * **Two fields, not the database's five.** A graph filters on what a page *is*
 * — its template and its tags — because that is what a circle on a picture can
 * be recognised by. Name and the per-template properties are left out on
 * purpose: filtering a graph down to pages whose Summary contains a word is a
 * search, and the app already has one.
 *
 * The type is Phase 23's, as the plan promised, so `matchesFilter` does the
 * work and there is no second language for the same job.
 */
export const GRAPH_FILTER_FIELDS: DatabaseField[] = [{ kind: "template" }, { kind: "tag" }];

/**
 * The operators worth offering for a graph filter.
 *
 * Narrower than `operatorsFor`, which is right for a table and wrong here.
 * Every page has exactly one template, so *is empty* on it can never be true
 * and *contains* is asking to match part of a word in a list of thirteen fixed
 * names. Tags keep the empty pair, where "a page with no tags at all" is a real
 * and useful thing to look for.
 */
export function graphOperatorsFor(field: DatabaseField): DatabaseOperator[] {
  return field.kind === "tag" ? ["has", "does-not-have", "is-empty", "is-not-empty"] : ["is", "is-not"];
}

/**
 * Every page a whole-universe graph draws, in a stable order. Phase 24, step 3.
 *
 * **The same reading of "this universe" the database's scope already has** —
 * `databaseRows` filters exactly this way, and the plan asked for the graph to
 * be widened by the vocabulary that existed rather than a new one. So a
 * universe means the pages beneath it and not the shared universe riding
 * alongside, even though the tree draws the two together: a picture of Canon
 * that quietly included the shared pages would be a picture of something the
 * scope has no name for.
 *
 * `universeId` of null means every universe at once, which is the state a world
 * with no universes is permanently in and the one "All universes" selects.
 *
 * **Universes themselves are never drawn.** A universe is a container for a
 * version of the world rather than a page in it, and one circle joined to
 * seventy others by nothing but being above them says nothing and hides the
 * shape underneath.
 *
 * Sorted by name for the reason `databaseRows` gives: `Object.values` is the
 * order things came off the disk, which means nothing to anyone, and a stable
 * order is half of the layout being repeatable.
 */
export function pagesInUniverse(nodes: Record<string, Node>, universeId: string | null): Node[] {
  const pages = Object.values(nodes).filter((node) => {
    if (node.templateKey === UNIVERSE_TEMPLATE_KEY) return false;
    if (!universeId) return true;
    return isDescendantOf(node.id, universeId, nodes);
  });
  return pages.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/**
 * Which stored arrangement a graph reads and writes. Phase 24, step 3.
 *
 * **Keyed by what the graph is *of*, not by which button opened it.** A page's
 * neighbourhood is keyed by that page, so widening from one connection out to
 * three keeps whatever she has already tidied — it is the same picture growing.
 * A graph of a whole universe is keyed by the universe whichever door it came
 * through, so tidying it from a page and tidying it from the rail are the same
 * act on the same drawing. Callers pass a null focus for that case; the prefix
 * is what keeps the two kinds of key from colliding, since a page id is a UUID
 * and cannot contain a colon.
 */
export function graphPinKey(focusId: string | null, universeId: string | null): string {
  if (focusId) return focusId;
  return `${GRAPH_WORLD_PIN_PREFIX}${universeId ?? "all"}`;
}
