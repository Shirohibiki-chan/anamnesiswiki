// Everything the graph overlay *does*, so that PageGraph.tsx only draws. Same
// split as use-lightbox.ts and for the same reason: pointer bookkeeping is the
// part worth being able to read on its own.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GRAPH_DOT_GRAB_PX,
  GRAPH_DOT_HOVER_PX,
  GRAPH_DRAG_THRESHOLD,
  GRAPH_FIT_PADDING,
  GRAPH_MAX_FIT_ZOOM,
  GRAPH_MAX_ZOOM,
  GRAPH_MIN_ZOOM,
  GRAPH_MIN_ZOOM_OF_FIT,
  GRAPH_ZOOM_GLIDE_MS,
  GRAPH_ZOOM_SENSITIVITY,
} from "../constants/graph";
import { graphBounds } from "../services/graph-layout";
import { dotSize, type GraphEdge, type GraphModel, type GraphNode } from "../services/graph-service";

/** An edge with both ends resolved to where its nodes actually are. */
export type PlacedEdge = GraphEdge & { x1: number; y1: number; x2: number; y2: number };

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export type GraphViewOptions = {
  /**
   * Changes when the question changes — a different page, reach or filter.
   *
   * Deliberately not the model's identity: the model is also rebuilt when a
   * page anywhere in the world is edited, and throwing away her panning and
   * her selection because someone typed a letter on another page would be a
   * view that resets itself at random.
   */
  resetKey: string;
  /** Called on letting go of a node, with everything moved so far. */
  onArrange: (moved: Record<string, Point>) => void;
  /**
   * The zoom below which the pages are drawn as dots — the names threshold.
   *
   * While they are, the buttons take no pointer events and the stage finds
   * the nearest dot itself (see `nearest`); above it the buttons handle their
   * own hover and drag as ordinary elements.
   */
  dotsBelow: number;
};

export function useGraphView(model: GraphModel, { resetKey, onArrange, dotsBelow }: GraphViewOptions) {
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [zoomFactor, setZoomFactor] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** The node under the pointer, which is what the quiet label mode follows. */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  /**
   * Whether the background is being dragged right now.
   *
   * State rather than a ref because the scene is styled on it: it takes
   * `will-change: transform` for exactly the length of a pan and no longer —
   * see graph.css on why leaving it on pixellates every zoom.
   */
  const [panning, setPanning] = useState(false);
  /**
   * Whether the zoom is gliding toward the wheel's target. Not for scaling
   * anything (that was tried and read as blurry); the canvas uses it to
   * paint only the window while the glide lasts and the overdraw margin
   * once it lands. See GraphEdgesCanvas, and `handleWheel` for the glide.
   */
  const [zooming, setZooming] = useState(false);
  const glideRef = useRef<{
    target: number;
    from: number;
    startedAt: number;
    factor: number;
    pan: Point;
    anchor: Point;
    frame: number | null;
  }>({
    target: 1,
    from: 1,
    startedAt: 0,
    factor: 1,
    pan: { x: 0, y: 0 },
    anchor: { x: 0, y: 0 },
    frame: null,
  });
  useEffect(() => () => cancelAnimationFrame(glideRef.current.frame ?? 0), []);

  /**
   * Nodes she has dragged somewhere, by id.
   *
   * An override rather than an edit of the model: the settled layout stays what
   * the simulation produced, so a node put back is put back exactly and nothing
   * about a drag has to be undone.
   *
   * **It also outlives the drop rather than being folded back into the model.**
   * Letting go writes the position to `project.json`, but the layout is not
   * recomputed from it — doing that would re-solve the forces around the newly
   * fixed node and jump every other one the instant she let go. The stored
   * arrangement becomes fixed points the *next* time this graph is worked out.
   */
  const [moved, setMoved] = useState<Record<string, Point>>({});

  /**
   * Everything about *this* graph forgotten when a different question is asked.
   *
   * React's documented alternative to an effect that syncs state: adjust during
   * render, keyed on the value that changed. PageView.tsx does the same thing
   * with `pendingFocus` and says so. An effect here would set five pieces of
   * state after paint, which is a frame of the new graph drawn with the old
   * one's panning still applied.
   */
  const [appliedKey, setAppliedKey] = useState(resetKey);
  if (resetKey !== appliedKey) {
    setAppliedKey(resetKey);
    setPan({ x: 0, y: 0 });
    setMoved({});
    setSelectedId(null);
    setHoveredId(null);
    setZoomFactor(1);
  }

  /**
   * Measured rather than read once, so the picture refits when the window is
   * resized. A callback ref with an observer instead of a layout effect: the
   * size genuinely comes from outside React, which is the one thing an effect
   * is meant for, and it means nothing has to reach for the element during
   * render to find out how big it is.
   */
  const stageElement = useRef<HTMLDivElement | null>(null);
  const stageRef = useCallback((element: HTMLDivElement | null) => {
    stageElement.current = element;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const nodes = useMemo<GraphNode[]>(
    () => model.nodes.map((node) => ({ ...node, ...(moved[node.id] ?? {}) })),
    [model.nodes, moved],
  );

  const edges = useMemo<PlacedEdge[]>(() => {
    const at = new Map(nodes.map((node) => [node.id, node]));
    const placed: PlacedEdge[] = [];
    for (const edge of model.edges) {
      const from = at.get(edge.sourceId);
      const to = at.get(edge.targetId);
      if (!from || !to) continue;
      placed.push({ ...edge, x1: from.x, y1: from.y, x2: to.x, y2: to.y });
    }
    return placed;
  }, [model.edges, nodes]);

  const bounds = useMemo(() => graphBounds(nodes, GRAPH_FIT_PADDING), [nodes]);

  /**
   * The zoom that fits the whole graph in the window it opened into.
   *
   * **Measured against the settled model rather than against `bounds`**, which
   * moves as nodes are dragged — refitting on that would pull the picture out
   * from under the hand doing the dragging. `GRAPH_MAX_FIT_ZOOM` bounds it
   * above, which is what keeps three pages from being blown up to fill a
   * monitor.
   */
  const fitZoom = useMemo(() => {
    const box = graphBounds(model.nodes, GRAPH_FIT_PADDING);
    if (!stageSize.width || !stageSize.height || !box.width || !box.height) return 1;
    // No floor: a world that needs 0.1 to fit opens at 0.1. The floor below
    // is on the wheel, and it follows the fit — see GRAPH_MIN_ZOOM_OF_FIT.
    return Math.min(Math.min(stageSize.width / box.width, stageSize.height / box.height), GRAPH_MAX_FIT_ZOOM);
  }, [model.nodes, stageSize]);

  /**
   * How far out the wheel may go: half the fit on a big world, so the whole
   * of it can be seen with air around it, and GRAPH_MIN_ZOOM on a small one.
   */
  const minZoom = Math.min(GRAPH_MIN_ZOOM, fitZoom * GRAPH_MIN_ZOOM_OF_FIT);

  // The wheel moves a factor and the fit stays the baseline, so resizing the
  // window refits without throwing away how far in she had zoomed.
  const zoom = clamp(fitZoom * zoomFactor, minZoom, GRAPH_MAX_ZOOM);
  /**
   * The zoom as a ref as well, for the drag handler to read.
   *
   * **So that the handler is the same function at every zoom.** Every node
   * button holds it, and a handler remade on each wheel tick is a new prop to
   * eight hundred memoised buttons — which is every one of them re-rendering
   * for a zoom that the scene's transform already applies on its own.
   */
  const zoomRef = useRef(zoom);
  const fitZoomRef = useRef(fitZoom);
  const minZoomRef = useRef(minZoom);
  useEffect(() => {
    zoomRef.current = zoom;
    fitZoomRef.current = fitZoom;
    minZoomRef.current = minZoom;
  }, [zoom, fitZoom, minZoom]);

  /**
   * Everything a pointer event needs to find the dot under it, kept current
   * without being closed over — so the stage's handlers are made once and
   * every dot is found against this frame's picture.
   */
  const dots = zoom < dotsBelow;
  const frameRef = useRef({ nodes, bounds, pan, zoom, stageSize, dots });
  useEffect(() => {
    frameRef.current = { nodes, bounds, pan, zoom, stageSize, dots };
  }, [nodes, bounds, pan, zoom, stageSize, dots]);

  /**
   * The dot nearest a pointer, if one is within `radius` screen pixels of it —
   * measured from the dot's edge, so a big hub is as easy to catch as it
   * looks. Eight hundred distances per pointer move is nothing.
   */
  const nearest = useCallback((clientX: number, clientY: number, radius: number): GraphNode | null => {
    const stage = stageElement.current;
    if (!stage) return null;
    const { nodes: drawn, bounds: box, pan: at, zoom: scale, stageSize: size } = frameRef.current;
    const rect = stage.getBoundingClientRect();
    const originX = rect.left + size.width / 2 + at.x - scale * (box.minX + box.width / 2);
    const originY = rect.top + size.height / 2 + at.y - scale * (box.minY + box.height / 2);
    let best: GraphNode | null = null;
    let bestGap = radius;
    for (const node of drawn) {
      const gap =
        Math.hypot(originX + scale * node.x - clientX, originY + scale * node.y - clientY) -
        (scale * dotSize(node.links)) / 2;
      if (gap < bestGap) {
        bestGap = gap;
        best = node;
      }
    }
    return best;
  }, []);

  // Right-to-left, so: centre the box on the stage's middle, scale about it,
  // then apply whatever panning has been done. The scene element itself sits at
  // the stage's centre, which is what makes the origin here the middle.
  const sceneTransform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) translate(${-(bounds.minX + bounds.width / 2)}px, ${-(bounds.minY + bounds.height / 2)}px)`;

  const dragRef = useRef<{ id: string; fromX: number; fromY: number; atX: number; atY: number; moved: boolean } | null>(
    null,
  );
  const panRef = useRef<{ fromX: number; fromY: number; atX: number; atY: number; moved: boolean } | null>(null);

  const startNodeDrag = useCallback((event: React.PointerEvent<HTMLElement>, node: GraphNode) => {
    // Without this the press also starts a pan, and the graph slides out from
    // under the node being moved.
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: node.id,
      fromX: event.clientX,
      fromY: event.clientY,
      atX: node.x,
      atY: node.y,
      moved: false,
    };
  }, []);

  const moveNodeDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.fromX;
      const dy = event.clientY - drag.fromY;
      if (!drag.moved && Math.hypot(dx, dy) < GRAPH_DRAG_THRESHOLD) return;
      drag.moved = true;
      // Divided by the zoom because the pointer moves in window pixels and the
      // node lives in graph ones — without it a zoomed-out graph moves a node
      // several times as far as the hand went.
      const zoom = zoomRef.current;
      setMoved((prev) => ({
        ...prev,
        [drag.id]: { x: Math.round(drag.atX + dx / zoom), y: Math.round(drag.atY + dy / zoom) },
      }));
    },
    [],
  );

  const endNodeDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>, node: GraphNode) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      // A press that never travelled was a click, and a click opens the
      // preview. Deciding it here rather than in an onClick is what stops the
      // end of a drag also counting as one.
      if (drag && !drag.moved) {
        setSelectedId(node.id);
        return;
      }
      // Written on letting go, never during the drag: a position saved per
      // pointer move is sixty writes a second to a file on her disk.
      if (drag) onArrange(moved);
    },
    [moved, onArrange],
  );

  /**
   * A press on the stage. While the pages are dots, a press within
   * GRAPH_DOT_GRAB_PX of one picks it up; any other press begins a pan.
   * With the pages as buttons, a press that reached here missed them all.
   */
  const startPan = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      if (frameRef.current.dots) {
        const grabbed = nearest(event.clientX, event.clientY, GRAPH_DOT_GRAB_PX);
        if (grabbed) {
          startNodeDrag(event, grabbed);
          return;
        }
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      panRef.current = { fromX: event.clientX, fromY: event.clientY, atX: 0, atY: 0, moved: false };
    },
    [nearest, startNodeDrag],
  );

  /**
   * The pointer moving over the stage: a node being dragged follows it, a pan
   * in progress follows it, and otherwise — while the pages are dots — the
   * dot nearest it, within GRAPH_DOT_HOVER_PX, is the one pointed at.
   */
  const movePan = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current) {
      moveNodeDrag(event);
      return;
    }
    const drag = panRef.current;
    if (!drag) {
      if (frameRef.current.dots) {
        const near = nearest(event.clientX, event.clientY, GRAPH_DOT_HOVER_PX);
        setHoveredId((current) => (current === (near?.id ?? null) ? current : (near?.id ?? null)));
      }
      return;
    }
    const dx = event.clientX - drag.fromX;
    const dy = event.clientY - drag.fromY;
    if (!drag.moved && Math.hypot(dx, dy) < GRAPH_DRAG_THRESHOLD) return;
    if (!drag.moved) setPanning(true);
    drag.moved = true;
    // The step is worked out here and handed over as numbers. It used to be
    // worked out inside the updater from `drag.atX`, which the next two lines
    // had already moved on by the time React ran it — so the step was zero
    // whenever React deferred the updater, which turned out to be most of the
    // time. "I still can't left click to move the canvas": her report,
    // 2026-09-13, and she was right all day.
    const stepX = dx - drag.atX;
    const stepY = dy - drag.atY;
    drag.atX = dx;
    drag.atY = dy;
    setPan((prev) => ({ x: prev.x + stepX, y: prev.y + stepY }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearest]);

  const endPan = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const grabbed = dragRef.current;
    if (grabbed) {
      const node = frameRef.current.nodes.find((candidate) => candidate.id === grabbed.id);
      if (node) endNodeDrag(event, node);
      else dragRef.current = null;
      return;
    }
    const drag = panRef.current;
    panRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPanning(false);
    // Clicking the empty background puts the preview away, the same gesture
    // that dismisses a popover anywhere else in the app.
    if (drag && !drag.moved) setSelectedId(null);
  }, [endNodeDrag]);

  /**
   * The factor is bounded so that the *zoom* stays within the limits, not the
   * factor itself. It used to be the factor, which on a small graph is the same
   * thing and on a big one is not: a world of 835 pages fits at 0.2, and a
   * factor capped at 2.5 stopped the wheel at 0.5 — the exact zoom names start
   * being drawn at, so the whole world could never be read closer than that.
   * Her report of 2026-09-13.
   */
  /**
   * **A notch sets a target; the view glides to it, about the pointer.**
   * Both are Obsidian's, and both are what she felt as the difference after
   * the frame rate itself had been made even (2026-09-13). The glide: each
   * frame moves GRAPH_ZOOM_EASE of the way to the target, so a notch is a
   * dozen frames of movement rather than one jump. The anchor: the point
   * under the pointer stays under it, which means the pan moves with the
   * zoom — a point at `c` from the stage's middle needs
   * `pan = c - (z1 / z0) · (c - pan0)` to stay put. The glide is what
   * `zooming` means now; it lands when the target is within GRAPH_ZOOM_LANDED.
   */
  const handleWheel = useCallback((event: React.WheelEvent<HTMLElement>) => {
    const fit = fitZoomRef.current;
    const glide = glideRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    glide.anchor = { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
    // A fresh glide starts from wherever the view is now — after a reset, a
    // refit, a drag, anything — and from then on keeps its own numbers.
    // **Its own, not React's.** The first cut read the zoom back from the
    // last render each frame, and the render lags the frames, so a step was
    // worked out against a zoom one or two frames old and applied to a pan
    // that was not: the point under the pointer drifted 180px in five
    // notches and thousands by full zoom — "I end up in the middle of
    // nowhere", 2026-09-14. The glide is the source of truth while it runs
    // and React is told the results.
    if (glide.frame === null) {
      glide.factor = frameRef.current.zoom / fit;
      glide.pan = { ...frameRef.current.pan };
      glide.target = glide.factor;
    }
    glide.target = clamp(
      glide.target * Math.exp(-event.deltaY * GRAPH_ZOOM_SENSITIVITY),
      minZoomRef.current / fit,
      GRAPH_MAX_ZOOM / fit,
    );
    // Each notch restarts the glide from wherever the zoom is, toward the
    // new target, over the same length of time.
    glide.from = glide.factor;
    glide.startedAt = performance.now();
    if (glide.frame !== null) return;
    setZooming(true);
    const step = (now: number) => {
      const current = glide.factor;
      const t = Math.min(1, (now - glide.startedAt) / GRAPH_ZOOM_GLIDE_MS);
      const eased = 1 - (1 - t) ** 3;
      const landed = t >= 1;
      const next = landed ? glide.target : glide.from + (glide.target - glide.from) * eased;
      const ratio = next / current;
      const { anchor } = glide;
      glide.pan = { x: anchor.x - ratio * (anchor.x - glide.pan.x), y: anchor.y - ratio * (anchor.y - glide.pan.y) };
      glide.factor = next;
      setPan(glide.pan);
      setZoomFactor(next);
      if (landed) {
        glide.frame = null;
        setZooming(false);
        return;
      }
      glide.frame = requestAnimationFrame(step);
    };
    glide.frame = requestAnimationFrame(step);
  }, []);

  const hover = useCallback((id: string | null) => setHoveredId(id), []);

  /**
   * The scene's transform in numbers, for the canvas the lines are drawn on.
   * Memoised so a hover, which changes none of these, does not redraw them.
   */
  const view = useMemo(() => ({ pan, zoom, stageSize }), [pan, zoom, stageSize]);

  /** Forgets this session's drags. The stored arrangement is the caller's to clear. */
  const forgetArrangement = useCallback(() => setMoved({}), []);

  return {
    stageRef,
    nodes,
    edges,
    bounds,
    zoom,
    sceneTransform,
    view,
    selectedId,
    hoveredId,
    hover,
    /**
     * Whether the background is being dragged, which is the one gesture that
     * may borrow the cheap path — see graph.css. **Zooming is not one, and
     * was, briefly.** Scaling the painted picture while the wheel turned was
     * soft on the way in and showed the painted rectangle with blank around
     * it on the way out until the repaint landed — "stupid blurry", her words
     * 2026-09-13. A wheel tick repaints, crisp, every time; a pan is a
     * pixel-exact slide and stays cheap.
     */
    moving: panning,
    /** Whether the wheel is turning; the canvas paints less while it is. */
    zooming,
    forgetArrangement,
    hasMoved: Object.keys(moved).length > 0,
    select: setSelectedId,
    startNodeDrag,
    moveNodeDrag,
    endNodeDrag,
    startPan,
    movePan,
    endPan,
    handleWheel,
  };
}
