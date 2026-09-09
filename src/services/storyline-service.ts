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
import type {
  Node,
  Storyline,
  StorylineBand,
  StorylineEdge,
  StorylineNode,
  StorylineNote,
} from "../constants/schema";
import {
  STORYLINE_ANNOTATION_CASCADE,
  STORYLINE_ANNOTATION_GAP,
  STORYLINE_MIN_BAND_SIZE,
  STORYLINE_NEW_BAND_HEIGHT,
  STORYLINE_NEW_BAND_WIDTH,
  STORYLINE_NEW_NODE_GAP,
  STORYLINE_NODE_HEIGHT,
  STORYLINE_NODE_WIDTH,
  STORYLINE_NOTE_ROW,
  STORYLINE_NOTE_WIDTH,
  STORYLINE_TIDY_COLUMN_GAP,
  STORYLINE_TIDY_ROW_GAP,
} from "../constants/storyline";

export function createStoryline(): Storyline {
  return { version: 1, nodes: [], edges: [], notes: [], bands: [] };
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
  return {
    version: 1,
    nodes: readNodes,
    edges: readEdges,
    notes: readNotes(record.notes),
    bands: readBands(record.bands),
  };
}

/**
 * The annotations, defaulted rather than demanded.
 *
 * **Absent is the ordinary state for every canvas written before step 2**, and
 * this is the only door a stored canvas comes through — so nothing downstream
 * has to treat "no notes" and "an old file" as two cases.
 */
function readNotes(raw: unknown): StorylineNote[] {
  if (!Array.isArray(raw)) return [];
  const notes: StorylineNote[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const note = entry as Record<string, unknown>;
    if (typeof note.id !== "string" || seen.has(note.id)) continue;
    seen.add(note.id);
    notes.push({
      id: note.id,
      x: number(note.x),
      y: number(note.y),
      width: typeof note.width === "number" && note.width > 0 ? note.width : STORYLINE_NOTE_WIDTH,
      text: typeof note.text === "string" ? note.text : "",
    });
  }
  return notes;
}

function readBands(raw: unknown): StorylineBand[] {
  if (!Array.isArray(raw)) return [];
  const bands: StorylineBand[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const band = entry as Record<string, unknown>;
    if (typeof band.id !== "string" || seen.has(band.id)) continue;
    seen.add(band.id);
    bands.push({
      id: band.id,
      x: number(band.x),
      y: number(band.y),
      width: typeof band.width === "number" && band.width > 0 ? band.width : STORYLINE_NEW_BAND_WIDTH,
      height: typeof band.height === "number" && band.height > 0 ? band.height : STORYLINE_NEW_BAND_HEIGHT,
      label: typeof band.label === "string" ? band.label : "",
    });
  }
  return bands;
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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
    ...storyline,
    nodes: storyline.nodes.filter((node) => node.id !== nodeId),
    edges: storyline.edges.filter((edge) => edge.fromId !== nodeId && edge.toId !== nodeId),
  };
}

// ---- Notes: what is written on the canvas but is not part of it ----

export function addNote(storyline: Storyline, at: { x: number; y: number }, text = ""): Storyline {
  const note: StorylineNote = {
    id: crypto.randomUUID(),
    x: Math.round(at.x),
    y: Math.round(at.y),
    width: STORYLINE_NOTE_WIDTH,
    text,
  };
  return { ...storyline, notes: [...storyline.notes, note] };
}

export function setNoteText(storyline: Storyline, noteId: string, text: string): Storyline {
  return {
    ...storyline,
    notes: storyline.notes.map((note) => (note.id === noteId ? { ...note, text } : note)),
  };
}

export function moveNote(storyline: Storyline, noteId: string, to: { x: number; y: number }): Storyline {
  return {
    ...storyline,
    notes: storyline.notes.map((note) =>
      note.id === noteId ? { ...note, x: Math.round(to.x), y: Math.round(to.y) } : note,
    ),
  };
}

export function removeNote(storyline: Storyline, noteId: string): Storyline {
  return { ...storyline, notes: storyline.notes.filter((note) => note.id !== noteId) };
}

/** A note's text, cut into the plain stretches and the links between them. */
export type NoteSegment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; nodeId: string }
  | { kind: "unresolved"; text: string };

/**
 * A wikilink anywhere in a note's text. Refuses to span a line, so one unclosed
 * bracket swallows a phrase rather than the rest of the note.
 */
const WIKILINK = /\[\[([^\][\n]+)\]\]/g;

/**
 * A note's text ready to draw: prose, resolved links, and the ones that point
 * at nothing.
 *
 * **An unresolved link is kept and marked rather than left as plain text.** A
 * name that stops resolving — the page was renamed, or it was a typo — is the
 * one thing about a note worth being able to see; drawing the brackets as
 * ordinary prose is how a broken exit sits there looking finished.
 *
 * **A name that two pages answer to resolves to neither**, the same rule
 * `linkableNames` follows: nothing here can say which Sable was meant, and
 * guessing is how a canvas quietly points somewhere wrong. Aliases count,
 * because an alias is a name for linking purposes everywhere else in the app.
 *
 * Resolved when it is drawn rather than stored as an id, which is the opposite
 * of what the editor's mentions do and is right for this one: a note is a
 * sentence somebody typed, and the alternative is a picker in a textarea.
 */
export function noteSegments(text: string, nodes: Record<string, Node>): NoteSegment[] {
  return segmentsAgainst(text, linkTargets(nodes));
}

/**
 * Every name and alias in the world, to the page it means — or to null where
 * two pages answer to it.
 *
 * **Built once per canvas rather than once per note.** It walks every page in
 * the world, which is cheap on its own and not cheap done six times on every
 * redraw; `storylineModel` builds it and hands it down.
 */
export function linkTargets(nodes: Record<string, Node>): Map<string, string | null> {
  const byName = new Map<string, string | null>();
  for (const node of Object.values(nodes)) {
    for (const name of [node.name, ...(node.aliases ?? [])]) {
      const key = name.trim().toLowerCase();
      if (!key) continue;
      // Null means "more than one page answers to this", which is not a link.
      const seen = byName.get(key);
      byName.set(key, seen === undefined || seen === node.id ? node.id : null);
    }
  }
  return byName;
}

function segmentsAgainst(text: string, byName: Map<string, string | null>): NoteSegment[] {
  const segments: NoteSegment[] = [];
  let at = 0;
  for (const match of text.matchAll(WIKILINK)) {
    const start = match.index;
    if (start > at) segments.push({ kind: "text", text: text.slice(at, start) });
    const name = match[1].trim();
    const nodeId = byName.get(name.toLowerCase()) ?? null;
    segments.push(nodeId ? { kind: "link", text: name, nodeId } : { kind: "unresolved", text: name });
    at = start + match[0].length;
  }
  if (at < text.length) segments.push({ kind: "text", text: text.slice(at) });
  return segments;
}

// ---- Bands: saying what a stretch of the storyline is ----

export function addBand(
  storyline: Storyline,
  at: { x: number; y: number; width?: number; height?: number },
  label = "",
): Storyline {
  const band: StorylineBand = {
    id: crypto.randomUUID(),
    x: Math.round(at.x),
    y: Math.round(at.y),
    width: Math.max(STORYLINE_MIN_BAND_SIZE, Math.round(at.width ?? STORYLINE_NEW_BAND_WIDTH)),
    height: Math.max(STORYLINE_MIN_BAND_SIZE, Math.round(at.height ?? STORYLINE_NEW_BAND_HEIGHT)),
    label,
  };
  return { ...storyline, bands: [...storyline.bands, band] };
}

/**
 * The box the scenes occupy, or nothing when there are none.
 *
 * Scene positions are centres, so the card's own size is added back — a band
 * fitted to the centres alone would cut the outermost cards in half.
 */
function sceneExtent(
  storyline: Storyline,
): { x: number; y: number; width: number; height: number } | null {
  if (storyline.nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of storyline.nodes) {
    minX = Math.min(minX, node.x - STORYLINE_NODE_WIDTH / 2);
    maxX = Math.max(maxX, node.x + STORYLINE_NODE_WIDTH / 2);
    minY = Math.min(minY, node.y - STORYLINE_NODE_HEIGHT / 2);
    maxY = Math.max(maxY, node.y + STORYLINE_NODE_HEIGHT / 2);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Where a new note goes: below the scenes, at their left edge, stepped along
 * by how many notes are already there.
 *
 * **Below rather than at the middle of the view**, which is what it did for
 * about an hour on 2026-09-09 and which drops every new note squarely on top
 * of a scene card. An annotation must never land on the story — the first
 * thing she would have to do is move it off something it was hiding.
 */
export function notePlacement(storyline: Storyline): { x: number; y: number } {
  const extent = sceneExtent(storyline);
  const step = storyline.notes.length * STORYLINE_NOTE_ROW;
  if (!extent) return { x: 0, y: step };
  return { x: Math.round(extent.x), y: Math.round(extent.y + extent.height + STORYLINE_ANNOTATION_GAP + step) };
}

/**
 * Where a new band goes: drawn around everything that is already there.
 *
 * **Framing rather than floating**, because a band is a thing you put *behind*
 * a stretch of the story, and one dropped in empty space has to be dragged into
 * position before it means anything. Around the whole storyline is the one
 * guess that is never wrong in an interesting way — she pulls it in to the
 * stretch she actually meant, which is a smaller act than placing it.
 */
export function bandPlacement(storyline: Storyline): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const extent = sceneExtent(storyline);
  const step = storyline.bands.length * STORYLINE_ANNOTATION_CASCADE;
  if (!extent) {
    return { x: step, y: step, width: STORYLINE_NEW_BAND_WIDTH, height: STORYLINE_NEW_BAND_HEIGHT };
  }
  return {
    x: Math.round(extent.x - STORYLINE_ANNOTATION_GAP + step),
    y: Math.round(extent.y - STORYLINE_ANNOTATION_GAP + step),
    width: Math.round(extent.width + STORYLINE_ANNOTATION_GAP * 2),
    height: Math.round(extent.height + STORYLINE_ANNOTATION_GAP * 2),
  };
}

export function setBandLabel(storyline: Storyline, bandId: string, label: string): Storyline {
  return {
    ...storyline,
    bands: storyline.bands.map((band) => (band.id === bandId ? { ...band, label } : band)),
  };
}

export function resizeBand(
  storyline: Storyline,
  bandId: string,
  size: { width: number; height: number },
): Storyline {
  return {
    ...storyline,
    bands: storyline.bands.map((band) =>
      band.id === bandId
        ? {
            // Floored rather than refused: a band dragged past its own corner
            // would otherwise be stored inside out, and every later question
            // about what is standing on it would answer nothing.
            ...band,
            width: Math.max(STORYLINE_MIN_BAND_SIZE, Math.round(size.width)),
            height: Math.max(STORYLINE_MIN_BAND_SIZE, Math.round(size.height)),
          }
        : band,
    ),
  };
}

export function removeBand(storyline: Storyline, bandId: string): Storyline {
  return { ...storyline, bands: storyline.bands.filter((band) => band.id !== bandId) };
}

/**
 * The scenes standing on a band, by their canvas ids.
 *
 * **Asked geometrically and never stored**, which is what keeps a band an
 * annotation rather than a container: nothing is filed inside it, a scene knows
 * nothing about it, and deleting one takes nothing with it. The question is
 * only ever asked at the moment a band is picked up.
 *
 * A scene's *centre* decides it, not its corners — a card half over the edge
 * belongs to whichever side most of it is on, which is the answer somebody
 * dragging expects.
 */
export function scenesOnBand(
  scenes: { id: string; x: number; y: number }[],
  band: { x: number; y: number; width: number; height: number },
): string[] {
  return scenes
    .filter(
      (scene) =>
        scene.x >= band.x &&
        scene.x <= band.x + band.width &&
        scene.y >= band.y &&
        scene.y <= band.y + band.height,
    )
    .map((scene) => scene.id);
}

/** Moves a band, and every scene that was standing on it, by the same amount. */
export function moveBand(
  storyline: Storyline,
  bandId: string,
  to: { x: number; y: number },
  carried: string[],
): Storyline {
  const band = storyline.bands.find((entry) => entry.id === bandId);
  if (!band) return storyline;
  const dx = Math.round(to.x) - band.x;
  const dy = Math.round(to.y) - band.y;
  if (dx === 0 && dy === 0) return storyline;
  const moving = new Set(carried);
  return {
    ...storyline,
    bands: storyline.bands.map((entry) =>
      entry.id === bandId ? { ...entry, x: band.x + dx, y: band.y + dy } : entry,
    ),
    nodes: storyline.nodes.map((node) =>
      moving.has(node.id) ? { ...node, x: node.x + dx, y: node.y + dy } : node,
    ),
  };
}

// ---- Tidying up ----

/**
 * Lines the sequence up: every scene one column to the right of everything
 * leading into it.
 *
 * **Only ever run from a button she presses.** The canvas has no layout of its
 * own and must not grow one — a force simulation exists to choose positions for
 * you, and this canvas promises that a scene stays where it was put. What makes
 * this the acceptable version of "lay it out" is that it happens once, when
 * asked, and reverses with Ctrl+Z.
 *
 * **Columns come from the longest path in, not the shortest.** A scene reached
 * both directly and the long way round belongs after the long way — placing it
 * by the shortest route draws an edge running backwards past three columns,
 * which reads as the arrow being wrong rather than as the layout being loose.
 * The canvas is a DAG, so the longest path terminates.
 *
 * **Notes and bands are left exactly where they are**, and that is a decision
 * rather than an omission: a note is anchored to a thought about a place on the
 * canvas, and there is no honest way to work out where that thought went. A
 * tidy-up that scattered her annotations is one nobody presses twice.
 */
export function tidyUp(storyline: Storyline): Storyline {
  if (storyline.nodes.length === 0) return storyline;

  const outgoing = new Map<string, string[]>();
  for (const node of storyline.nodes) outgoing.set(node.id, []);
  for (const edge of storyline.edges) {
    const list = outgoing.get(edge.fromId);
    if (list && outgoing.has(edge.toId)) list.push(edge.toId);
  }

  // Longest path in, worked out by settling: a scene sits one past the furthest
  // of its parents, and a parent that moves right pushes its children again.
  // Bounded by the number of scenes because a DAG has no cycle to go round —
  // and the bound is what keeps a hand-edited file with a loop in it from
  // spinning here rather than drawing something odd.
  const column = new Map<string, number>(storyline.nodes.map((node) => [node.id, 0]));
  let queue = storyline.nodes.map((node) => node.id);
  for (let pass = 0; pass < storyline.nodes.length && queue.length > 0; pass += 1) {
    const next: string[] = [];
    for (const id of queue) {
      const at = column.get(id) ?? 0;
      for (const child of outgoing.get(id) ?? []) {
        if ((column.get(child) ?? 0) >= at + 1) continue;
        column.set(child, at + 1);
        next.push(child);
      }
    }
    queue = next;
  }

  // Within a column, the order they were already in top to bottom — so a tidy
  // rearranges as little as it can, and pressing it twice on an already-tidy
  // canvas changes nothing.
  const byColumn = new Map<number, StorylineNode[]>();
  for (const node of [...storyline.nodes].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const at = column.get(node.id) ?? 0;
    const list = byColumn.get(at);
    if (list) list.push(node);
    else byColumn.set(at, [node]);
  }

  const placed = new Map<string, { x: number; y: number }>();
  for (const [at, inColumn] of byColumn) {
    const span = (inColumn.length - 1) * STORYLINE_TIDY_ROW_GAP;
    inColumn.forEach((node, index) => {
      placed.set(node.id, {
        x: at * STORYLINE_TIDY_COLUMN_GAP,
        // Centred on the row, so a fork reads as one thread splitting either
        // side of the line rather than as everything hanging below it.
        y: Math.round(index * STORYLINE_TIDY_ROW_GAP - span / 2),
      });
    });
  }

  return {
    ...storyline,
    nodes: storyline.nodes.map((node) => ({ ...node, ...(placed.get(node.id) ?? {}) })),
  };
}

/** Whether tidying would move anything, so the button can say when it is spent. */
export function needsTidying(storyline: Storyline): boolean {
  if (storyline.nodes.length === 0) return false;
  const tidy = tidyUp(storyline);
  return tidy.nodes.some(
    (node, index) => node.x !== storyline.nodes[index].x || node.y !== storyline.nodes[index].y,
  );
}

/** A scene on the canvas with the page it stands for resolved. */
export type DrawnScene = StorylineNode & {
  name: string;
  templateKey: string;
  icon?: string;
  color?: string;
};

/** A note with its links already resolved against the world. */
export type DrawnNote = StorylineNote & { segments: NoteSegment[] };

export type StorylineModel = {
  scenes: DrawnScene[];
  edges: StorylineEdge[];
  notes: DrawnNote[];
  bands: StorylineBand[];
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
  const targets = linkTargets(nodes);
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
    // Resolved here rather than in the component, so a page renamed anywhere in
    // the world redraws every note that mentions it without the canvas file
    // being touched — the same join the scenes get, for the same reason.
    notes: storyline.notes.map((note) => ({ ...note, segments: segmentsAgainst(note.text, targets) })),
    bands: storyline.bands,
    orphans: storyline.nodes.length - scenes.length,
  };
}

/** Which pages this canvas already shows, so the same one is not offered twice. */
export function pagesOnCanvas(storyline: Storyline): Set<string> {
  return new Set(storyline.nodes.map((node) => node.pageId));
}
