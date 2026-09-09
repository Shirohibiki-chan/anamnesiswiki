// Everything the storyline canvas *does*, so PageStoryline.tsx only draws.
// Same split as use-graph-view.ts and use-lightbox.ts, and for the same reason:
// pointer bookkeeping is the part worth being able to read on its own.
//
// **What this shares with the graph's view hook is the surface, not the
// layout.** Panning, zooming and the drag threshold behave the same because
// they are the same gesture on the same kind of picture. Where a node *sits* is
// the opposite: the graph settles a simulation and treats a drag as an override
// on top of it, while here the position is the only thing there ever was.
// There is no `moved` map layered over a computed layout — a drag edits the
// canvas, because the canvas is what she authored.
import { useCallback, useMemo, useRef, useState } from "react";
import {
  STORYLINE_DRAG_THRESHOLD,
  STORYLINE_EDGE_GAP,
  STORYLINE_FIT_PADDING,
  STORYLINE_MAX_FIT_ZOOM,
  STORYLINE_MAX_ZOOM,
  STORYLINE_MIN_BAND_SIZE,
  STORYLINE_MIN_FIT_ZOOM,
  STORYLINE_MIN_ZOOM,
  STORYLINE_NODE_HEIGHT,
  STORYLINE_NODE_WIDTH,
  STORYLINE_ZOOM_SENSITIVITY,
} from "../constants/storyline";
import type { StorylineBand, StorylineEdge } from "../constants/schema";
import { scenesOnBand, type DrawnNote, type DrawnScene, type StorylineModel } from "../services/storyline-service";

type Point = { x: number; y: number };

/** An edge with both ends resolved to where its scenes actually are. */
export type PlacedStorylineEdge = StorylineEdge & { x1: number; y1: number; x2: number; y2: number };

export type StorylineBounds = { minX: number; minY: number; width: number; height: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The box the whole canvas occupies, in canvas units.
 *
 * Node size is included rather than only the centres, because a scene is a card
 * and half of it hangs outside its own point — fitting to the centres alone
 * crops the leftmost and rightmost cards in half every time.
 */
function sceneBounds(scenes: DrawnScene[], padding: number): StorylineBounds {
  if (scenes.length === 0) return { minX: -padding, minY: -padding, width: padding * 2, height: padding * 2 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const scene of scenes) {
    minX = Math.min(minX, scene.x - STORYLINE_NODE_WIDTH / 2);
    maxX = Math.max(maxX, scene.x + STORYLINE_NODE_WIDTH / 2);
    minY = Math.min(minY, scene.y - STORYLINE_NODE_HEIGHT / 2);
    maxY = Math.max(maxY, scene.y + STORYLINE_NODE_HEIGHT / 2);
  }
  return {
    minX: minX - padding,
    minY: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/**
 * Where a line from `from` meets the edge of the card at `to`.
 *
 * **Without this the arrowhead is drawn at the card's centre, underneath the
 * card, and the picture loses the only thing it is trying to say.** A
 * storyline's lines are directed — this leads to that — and an arrow nobody can
 * see is a line that reads as an undirected association. Found by looking at
 * the first working canvas on 2026-09-09.
 *
 * The card is a rectangle, so the meeting point is whichever of its two pairs
 * of sides the line crosses first: scale the centre-to-centre direction until
 * it reaches half the width or half the height, whichever comes sooner, then
 * back off by a few units so the arrow's tip sits clear of the border rather
 * than on it.
 */
function meetsCard(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  // Two scenes stacked exactly on top of each other: there is no direction to
  // trim along, and any answer draws a line of zero length either way.
  if (length === 0) return to;
  const halfWidth = STORYLINE_NODE_WIDTH / 2;
  const halfHeight = STORYLINE_NODE_HEIGHT / 2;
  const toSide = Math.abs(dx) > 0 ? halfWidth / Math.abs(dx) : Infinity;
  const toTop = Math.abs(dy) > 0 ? halfHeight / Math.abs(dy) : Infinity;
  const reach = Math.min(toSide, toTop) + STORYLINE_EDGE_GAP / length;
  return { x: to.x - dx * reach, y: to.y - dy * reach };
}

export type StorylineViewOptions = {
  /**
   * Changes when the canvas being looked at changes — a different storyline.
   *
   * Deliberately not the model's identity: the model is rebuilt whenever any
   * page in the world is renamed, and throwing away her panning because someone
   * typed a letter on another page would be a view that resets itself at
   * random. The graph's view hook says the same thing about the same trap.
   */
  resetKey: string;
  /** Called on letting go of a scene, with everything moved by this drag. */
  onArrange: (moved: Record<string, Point>) => void;
  /** Called when a line is dragged from one scene and dropped on another. */
  onConnect: (fromId: string, toId: string) => void;
  /** Called on letting go of a note, with where it ended up. */
  onMoveNote: (noteId: string, to: Point) => void;
  /**
   * Called on letting go of a band, with where it ended up and the scenes that
   * were standing on it when it was picked up — never re-asked at the drop,
   * where the band is somewhere else and the answer would be a different set.
   */
  onMoveBand: (bandId: string, to: Point, carried: string[]) => void;
  /** Called on letting go of a band's corner. */
  onResizeBand: (bandId: string, size: { width: number; height: number }) => void;
};

export function useStorylineView(model: StorylineModel, options: StorylineViewOptions) {
  const { resetKey, onArrange, onConnect, onMoveNote, onMoveBand, onResizeBand } = options;
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [zoomFactor, setZoomFactor] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  /**
   * The note or band being worked on, if any.
   *
   * One piece of state holding either, rather than two — a canvas where a note
   * and a band could both look selected at once would have two "remove this"
   * buttons in the bar and no way to tell which was about to fire.
   */
  const [selectedAnnotation, setSelectedAnnotation] = useState<
    { kind: "note" | "band"; id: string } | null
  >(null);

  /**
   * Where a scene has been dragged to *during this gesture only*.
   *
   * Cleared on letting go, at which point the position is written to the canvas
   * and the model itself carries it. Unlike the graph's `moved` map, this does
   * not outlive the drop — there is no computed layout underneath for it to be
   * an override on. It exists purely so a drag redraws at sixty frames a second
   * without sixty writes to a file on her disk.
   */
  const [dragging, setDragging] = useState<Record<string, Point>>({});

  /**
   * The line being drawn right now: which scene it started at, and where the
   * pointer has reached, in canvas units. Null when nothing is being joined.
   */
  const [linking, setLinking] = useState<{ fromId: string; to: Point } | null>(null);

  /**
   * The band being pulled bigger right now, and how big it is at this instant.
   *
   * Separate from `dragging`, which holds positions — a resize changes a band's
   * size and not where its corner sits, and folding both into one map would
   * mean every reader of it having to ask which kind of change it was looking
   * at.
   */
  const [resizing, setResizing] = useState<{ id: string; size: { width: number; height: number } } | null>(null);

  // React's documented alternative to an effect that syncs state: adjust during
  // render, keyed on the value that changed. An effect here would set five
  // pieces of state after paint — one frame of the new canvas drawn with the
  // old one's panning still applied.
  const [appliedKey, setAppliedKey] = useState(resetKey);
  if (resetKey !== appliedKey) {
    setAppliedKey(resetKey);
    setPan({ x: 0, y: 0 });
    setDragging({});
    setLinking(null);
    setResizing(null);
    setSelectedId(null);
    setSelectedEdgeId(null);
    setSelectedAnnotation(null);
    setZoomFactor(1);
  }

  // Measured rather than read once, so the picture refits when the window is
  // resized. A callback ref with an observer instead of a layout effect: the
  // size genuinely comes from outside React.
  const stageRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scenes = useMemo<DrawnScene[]>(
    () => model.scenes.map((scene) => ({ ...scene, ...(dragging[scene.id] ?? {}) })),
    [model.scenes, dragging],
  );

  const edges = useMemo<PlacedStorylineEdge[]>(() => {
    const at = new Map(scenes.map((scene) => [scene.id, scene]));
    const placed: PlacedStorylineEdge[] = [];
    for (const edge of model.edges) {
      const from = at.get(edge.fromId);
      const to = at.get(edge.toId);
      if (!from || !to) continue;
      // Both ends trimmed to the cards, not only the arrow end: a line
      // starting under the card it leaves reads as a line that starts nowhere.
      const start = meetsCard(to, from);
      const end = meetsCard(from, to);
      placed.push({ ...edge, x1: start.x, y1: start.y, x2: end.x, y2: end.y });
    }
    return placed;
  }, [model.edges, scenes]);

  const bounds = useMemo(() => sceneBounds(scenes, STORYLINE_FIT_PADDING), [scenes]);

  /**
   * The zoom that fits the whole canvas in the window it opened into.
   *
   * **Measured against the stored positions rather than against `bounds`**,
   * which moves as scenes are dragged — refitting on that would pull the
   * picture out from under the hand doing the dragging. The graph's view hook
   * makes the same call and says so at greater length.
   */
  const fitZoom = useMemo(() => {
    const box = sceneBounds(model.scenes, STORYLINE_FIT_PADDING);
    if (!stageSize.width || !stageSize.height || !box.width || !box.height) return 1;
    return clamp(
      Math.min(stageSize.width / box.width, stageSize.height / box.height),
      // Floored well above the wheel's own limit: past this the names stop
      // being readable, and she pans instead of squinting. See the constant.
      STORYLINE_MIN_FIT_ZOOM,
      STORYLINE_MAX_FIT_ZOOM,
    );
  }, [model.scenes, stageSize]);

  const zoom = clamp(fitZoom * zoomFactor, STORYLINE_MIN_ZOOM, STORYLINE_MAX_ZOOM);

  // Right-to-left: centre the box on the stage's middle, scale about it, then
  // apply the panning. The scene element sits at the stage's centre, which is
  // what makes the origin here the middle.
  const sceneTransform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) translate(${-(bounds.minX + bounds.width / 2)}px, ${-(bounds.minY + bounds.height / 2)}px)`;

  /**
   * A point in window pixels turned into a point on the canvas.
   *
   * The inverse of `sceneTransform`, and the reason a click on empty space can
   * put a scene where the click was rather than somewhere near it. Needed by
   * the linking line too, which follows the pointer in canvas units so it stays
   * attached while the canvas is zoomed.
   */
  const toCanvas = useCallback(
    (event: { clientX: number; clientY: number }, stage: DOMRect): Point => ({
      x: (event.clientX - stage.left - stage.width / 2 - pan.x) / zoom + bounds.minX + bounds.width / 2,
      y: (event.clientY - stage.top - stage.height / 2 - pan.y) / zoom + bounds.minY + bounds.height / 2,
    }),
    [pan, zoom, bounds],
  );

  const dragRef = useRef<{ id: string; fromX: number; fromY: number; atX: number; atY: number; moved: boolean } | null>(
    null,
  );
  const panRef = useRef<{ fromX: number; fromY: number; atX: number; atY: number; moved: boolean } | null>(null);
  const linkRef = useRef<{ fromId: string; stage: DOMRect } | null>(null);
  const noteRef = useRef<{ id: string; fromX: number; fromY: number; atX: number; atY: number; moved: boolean } | null>(
    null,
  );
  const bandRef = useRef<{
    id: string;
    fromX: number;
    fromY: number;
    atX: number;
    atY: number;
    moved: boolean;
    carried: string[];
    /** Where each carried scene was when the band was picked up. */
    carriedAt: Map<string, Point>;
  } | null>(null);
  const resizeRef = useRef<{ id: string; fromX: number; fromY: number; atWidth: number; atHeight: number } | null>(
    null,
  );

  const startSceneDrag = useCallback((event: React.PointerEvent<HTMLElement>, scene: DrawnScene) => {
    // Without this the press also starts a pan, and the canvas slides out from
    // under the scene being moved.
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: scene.id,
      fromX: event.clientX,
      fromY: event.clientY,
      atX: scene.x,
      atY: scene.y,
      moved: false,
    };
  }, []);

  const moveSceneDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.fromX;
      const dy = event.clientY - drag.fromY;
      if (!drag.moved && Math.hypot(dx, dy) < STORYLINE_DRAG_THRESHOLD) return;
      drag.moved = true;
      // Divided by the zoom because the pointer moves in window pixels and the
      // scene lives in canvas ones — without it a zoomed-out canvas moves a
      // card several times as far as the hand went.
      setDragging({ [drag.id]: { x: Math.round(drag.atX + dx / zoom), y: Math.round(drag.atY + dy / zoom) } });
    },
    [zoom],
  );

  const endSceneDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>, scene: DrawnScene) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      // A press that never travelled was a click, and a click selects. Deciding
      // it here rather than in an onClick is what stops the end of a drag also
      // counting as one.
      if (drag && !drag.moved) {
        setSelectedId(scene.id);
        setSelectedEdgeId(null);
        setSelectedAnnotation(null);
        return;
      }
      if (!drag) return;
      const at = dragging[drag.id];
      // Written on letting go, never during the drag.
      if (at) onArrange({ [drag.id]: at });
      setDragging({});
    },
    [dragging, onArrange],
  );

  /**
   * Starts drawing a line out of a scene's handle.
   *
   * A separate gesture from dragging the scene itself — the handle is its own
   * element — because the alternative is a modifier key, and a canvas whose two
   * most-used actions are told apart by whether Shift was held is one where
   * half the lines get drawn by accident.
   */
  const startLink = useCallback((event: React.PointerEvent<HTMLElement>, scene: DrawnScene) => {
    event.stopPropagation();
    const stage = event.currentTarget.closest(".storyline-stage")?.getBoundingClientRect();
    if (!stage) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    linkRef.current = { fromId: scene.id, stage };
    setLinking({ fromId: scene.id, to: { x: scene.x, y: scene.y } });
  }, []);

  const moveLink = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const link = linkRef.current;
      if (!link) return;
      setLinking({ fromId: link.fromId, to: toCanvas(event, link.stage) });
    },
    [toCanvas],
  );

  /**
   * Lets go of a line. The scene under the pointer is found from the document
   * rather than tracked as a hover, because a pointer capture is in force and
   * no other element is receiving events while it is.
   */
  const endLink = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const link = linkRef.current;
      linkRef.current = null;
      setLinking(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!link) return;
      const under = document
        .elementsFromPoint(event.clientX, event.clientY)
        .find((element) => element instanceof HTMLElement && element.dataset.sceneId);
      const toId = under instanceof HTMLElement ? under.dataset.sceneId : undefined;
      if (toId) onConnect(link.fromId, toId);
    },
    [onConnect],
  );

  const startPan = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { fromX: event.clientX, fromY: event.clientY, atX: 0, atY: 0, moved: false };
  }, []);

  const movePan = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const drag = panRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.fromX;
    const dy = event.clientY - drag.fromY;
    if (!drag.moved && Math.hypot(dx, dy) < STORYLINE_DRAG_THRESHOLD) return;
    drag.moved = true;
    setPan((prev) => ({ x: prev.x + (dx - drag.atX), y: prev.y + (dy - drag.atY) }));
    drag.atX = dx;
    drag.atY = dy;
  }, []);

  const endPan = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const drag = panRef.current;
    panRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    // Clicking empty canvas puts the selection away, the same gesture that
    // dismisses a popover anywhere else in the app.
    if (drag && !drag.moved) {
      setSelectedId(null);
      setSelectedEdgeId(null);
      setSelectedAnnotation(null);
    }
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLElement>) => {
    setZoomFactor((prev) =>
      clamp(prev * Math.exp(-event.deltaY * STORYLINE_ZOOM_SENSITIVITY), STORYLINE_MIN_ZOOM, STORYLINE_MAX_ZOOM),
    );
  }, []);

  /**
   * The notes and bands, moved by whatever gesture is in flight.
   *
   * They share the one `dragging` map with the scenes, which is what lets a
   * band drag move a band and six scenes in one gesture without a second map to
   * keep in step.
   */
  const notes = useMemo<DrawnNote[]>(
    () => model.notes.map((note) => ({ ...note, ...(dragging[note.id] ?? {}) })),
    [model.notes, dragging],
  );

  const bands = useMemo<StorylineBand[]>(
    () =>
      model.bands.map((band) => ({
        ...band,
        ...(dragging[band.id] ?? {}),
        ...(resizing && resizing.id === band.id ? resizing.size : {}),
      })),
    [model.bands, dragging, resizing],
  );

  const startNoteDrag = useCallback((event: React.PointerEvent<HTMLElement>, note: DrawnNote) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    noteRef.current = {
      id: note.id,
      fromX: event.clientX,
      fromY: event.clientY,
      atX: note.x,
      atY: note.y,
      moved: false,
    };
  }, []);

  const moveNoteDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = noteRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.fromX;
      const dy = event.clientY - drag.fromY;
      if (!drag.moved && Math.hypot(dx, dy) < STORYLINE_DRAG_THRESHOLD) return;
      drag.moved = true;
      setDragging({ [drag.id]: { x: Math.round(drag.atX + dx / zoom), y: Math.round(drag.atY + dy / zoom) } });
    },
    [zoom],
  );

  const endNoteDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>, note: DrawnNote) => {
      const drag = noteRef.current;
      noteRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!drag) return;
      if (!drag.moved) {
        setSelectedAnnotation({ kind: "note", id: note.id });
        setSelectedId(null);
        setSelectedEdgeId(null);
        return;
      }
      const at = dragging[drag.id];
      if (at) onMoveNote(drag.id, at);
      setDragging({});
    },
    [dragging, onMoveNote],
  );

  /**
   * Picking up a band, and with it everything standing on it.
   *
   * **Which scenes those are is decided here, once, before anything moves.**
   * Asking again while the drag is in flight would ask about the band's current
   * position, so a scene the band slid over halfway through would join the move
   * and arrive somewhere nobody put it.
   */
  const startBandDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>, band: StorylineBand) => {
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      const carried = scenesOnBand(scenes, band);
      bandRef.current = {
        id: band.id,
        fromX: event.clientX,
        fromY: event.clientY,
        atX: band.x,
        atY: band.y,
        moved: false,
        carried,
        carriedAt: new Map(
          carried.map((id) => {
            const scene = scenes.find((entry) => entry.id === id)!;
            return [id, { x: scene.x, y: scene.y }];
          }),
        ),
      };
    },
    [scenes],
  );

  const moveBandDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = bandRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.fromX;
      const dy = event.clientY - drag.fromY;
      if (!drag.moved && Math.hypot(dx, dy) < STORYLINE_DRAG_THRESHOLD) return;
      drag.moved = true;
      const byX = Math.round(dx / zoom);
      const byY = Math.round(dy / zoom);
      const next: Record<string, Point> = { [drag.id]: { x: drag.atX + byX, y: drag.atY + byY } };
      for (const [id, at] of drag.carriedAt) next[id] = { x: at.x + byX, y: at.y + byY };
      setDragging(next);
    },
    [zoom],
  );

  const endBandDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>, band: StorylineBand) => {
      const drag = bandRef.current;
      bandRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!drag) return;
      if (!drag.moved) {
        setSelectedAnnotation({ kind: "band", id: band.id });
        setSelectedId(null);
        setSelectedEdgeId(null);
        return;
      }
      const at = dragging[drag.id];
      if (at) onMoveBand(drag.id, at, drag.carried);
      setDragging({});
    },
    [dragging, onMoveBand],
  );

  const startBandResize = useCallback((event: React.PointerEvent<HTMLElement>, band: StorylineBand) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      id: band.id,
      fromX: event.clientX,
      fromY: event.clientY,
      atWidth: band.width,
      atHeight: band.height,
    };
    setResizing({ id: band.id, size: { width: band.width, height: band.height } });
  }, []);

  const moveBandResize = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = resizeRef.current;
      if (!drag) return;
      setResizing({
        id: drag.id,
        size: {
          width: Math.max(STORYLINE_MIN_BAND_SIZE, Math.round(drag.atWidth + (event.clientX - drag.fromX) / zoom)),
          height: Math.max(STORYLINE_MIN_BAND_SIZE, Math.round(drag.atHeight + (event.clientY - drag.fromY) / zoom)),
        },
      });
    },
    [zoom],
  );

  const endBandResize = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = resizeRef.current;
      resizeRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (drag && resizing && resizing.id === drag.id) onResizeBand(drag.id, resizing.size);
      setResizing(null);
    },
    [resizing, onResizeBand],
  );

  const selectAnnotation = useCallback((selection: { kind: "note" | "band"; id: string } | null) => {
    setSelectedAnnotation(selection);
    setSelectedId(null);
    setSelectedEdgeId(null);
  }, []);

  const selectEdge = useCallback((edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    setSelectedId(null);
    setSelectedAnnotation(null);
  }, []);

  return {
    stageRef,
    scenes,
    edges,
    notes,
    bands,
    selectedAnnotation,
    selectAnnotation,
    startNoteDrag,
    moveNoteDrag,
    endNoteDrag,
    startBandDrag,
    moveBandDrag,
    endBandDrag,
    startBandResize,
    moveBandResize,
    endBandResize,
    bounds,
    zoom,
    sceneTransform,
    linking,
    selectedId,
    selectedEdgeId,
    select: setSelectedId,
    selectEdge,
    startSceneDrag,
    moveSceneDrag,
    endSceneDrag,
    startLink,
    moveLink,
    endLink,
    startPan,
    movePan,
    endPan,
    handleWheel,
  };
}
