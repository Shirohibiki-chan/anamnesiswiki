// Everything the graph overlay *does*, so that PageGraph.tsx only draws. Same
// split as use-lightbox.ts and for the same reason: pointer bookkeeping is the
// part worth being able to read on its own.
import { useCallback, useMemo, useRef, useState } from "react";
import {
  GRAPH_DRAG_THRESHOLD,
  GRAPH_FIT_PADDING,
  GRAPH_MAX_FIT_ZOOM,
  GRAPH_MAX_ZOOM,
  GRAPH_MIN_ZOOM,
  GRAPH_ZOOM_SENSITIVITY,
} from "../constants/graph";
import { graphBounds } from "../services/graph-layout";
import type { GraphEdge, GraphModel, GraphNode } from "../services/graph-service";

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
};

export function useGraphView(model: GraphModel, { resetKey, onArrange }: GraphViewOptions) {
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [zoomFactor, setZoomFactor] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** The node under the pointer, which is what the quiet label mode follows. */
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
  const stageRef = useCallback((element: HTMLDivElement | null) => {
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
    return clamp(
      Math.min(stageSize.width / box.width, stageSize.height / box.height),
      GRAPH_MIN_ZOOM,
      GRAPH_MAX_FIT_ZOOM,
    );
  }, [model.nodes, stageSize]);

  // The wheel moves a factor and the fit stays the baseline, so resizing the
  // window refits without throwing away how far in she had zoomed.
  const zoom = clamp(fitZoom * zoomFactor, GRAPH_MIN_ZOOM, GRAPH_MAX_ZOOM);

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
      setMoved((prev) => ({
        ...prev,
        [drag.id]: { x: Math.round(drag.atX + dx / zoom), y: Math.round(drag.atY + dy / zoom) },
      }));
    },
    [zoom],
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
    if (!drag.moved && Math.hypot(dx, dy) < GRAPH_DRAG_THRESHOLD) return;
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
    // Clicking the empty background puts the preview away, the same gesture
    // that dismisses a popover anywhere else in the app.
    if (drag && !drag.moved) setSelectedId(null);
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLElement>) => {
    setZoomFactor((prev) =>
      clamp(prev * Math.exp(-event.deltaY * GRAPH_ZOOM_SENSITIVITY), GRAPH_MIN_ZOOM, GRAPH_MAX_ZOOM),
    );
  }, []);

  const hover = useCallback((id: string | null) => setHoveredId(id), []);

  /** Forgets this session's drags. The stored arrangement is the caller's to clear. */
  const forgetArrangement = useCallback(() => setMoved({}), []);

  return {
    stageRef,
    nodes,
    edges,
    bounds,
    zoom,
    sceneTransform,
    selectedId,
    hoveredId,
    hover,
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
