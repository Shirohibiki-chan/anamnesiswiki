// The lines of a graph. Phase 24, big-world pass.
//
// **The lines are a canvas; everything else on the graph is still the DOM.**
// Phase 24 chose SVG over canvas so the CSS token themes — hers included —
// would apply for free, and named canvas as the swap "if a world ever gets
// there". It got there: on a generated world of 835 pages the 3,902 lines as
// one SVG made a zoomed-in drag 98ms a frame (worst tenth 490ms), and with
// the lines switched off the same drag was 16ms. Chrome has to walk the whole
// SVG for every tile it paints, and up close every line is long and thick.
// Drawing them on a canvas is a few milliseconds however close you are.
//
// **The themes still apply, because the canvas never picks a colour itself.**
// Two invisible `<line>`s with the real classes sit inside the scene
// (`GraphEdgeProbe`), so the stylesheet — colour, width, dash, the fade by
// count, the dim while a page is selected — resolves on them the way it always
// did, and each draw reads the computed result. Restyle the lines in graph.css
// and the canvas follows; nothing here knows what colour a line is.
//
// **What stays SVG is what has to be text or has to be few.** The names on
// lines are `<text>` (`GraphEdgeLabels`), and the lines touching the page in
// play are drawn again on top in a tiny SVG (`GraphLitEdges`) — a dozen lines,
// so a hover repaints a dozen lines rather than thousands.
import { memo, useEffect, useRef, type RefObject } from "react";
import { GRAPH_LINE_MAX_PX } from "../../constants/graph";
import type { PlacedEdge } from "../../hooks/use-graph-view";
import type { GraphBounds } from "../../services/graph-layout";

type View = { pan: { x: number; y: number }; zoom: number; stageSize: { width: number; height: number } };

type GraphEdgesCanvasProps = {
  edges: PlacedEdge[];
  bounds: GraphBounds;
  view: View;
  /**
   * Whether the background is being dragged. While it is, the picture already
   * drawn is slid rather than drawn again — see the effect below.
   */
  moving: boolean;
  /**
   * Whether the wheel is turning. While it is, only the window is painted —
   * the overdraw margin is a drag's need, and painting it on every tick was
   * painting more than twice the screen per frame. It is painted once when
   * the wheel stops.
   */
  zooming: boolean;
  /** The scene, where the probe lines live and the stylesheet resolves. */
  sceneRef: RefObject<HTMLDivElement | null>;
  /** Whether the page in play is selected — the stylesheet dims the rest, and the canvas has to hear about it. */
  dimmed: boolean;
};

/**
 * How far beyond the window the canvas is painted, as a fraction of the
 * window's size on each side.
 *
 * A drag slides the painted picture rather than repainting it, so what is
 * beyond the window's edge has to be painted already or the drag reveals
 * blank. A quarter each side covers an ordinary drag; a longer one repaints
 * once, mid-drag, when it runs out.
 */
const OVERDRAW = 0.25;

/** What the canvas was last painted for, to tell a slide from a repaint. */
type Painted = {
  pan: { x: number; y: number };
  zoom: number;
  stageSize: { width: number; height: number };
  edges: PlacedEdge[];
  bounds: GraphBounds;
  dimmed: boolean;
};

type LineStyle = { stroke: string; width: number; opacity: number; dash: number[] };

/** The stylesheet's answer for one kind of line, read off its probe. */
function readStyle(probe: Element | null): LineStyle | null {
  if (!probe) return null;
  const computed = getComputedStyle(probe);
  const dash = computed.strokeDasharray
    .split(/[\s,]+/)
    .map((part) => parseFloat(part))
    .filter((part) => Number.isFinite(part));
  return {
    stroke: computed.stroke,
    width: parseFloat(computed.strokeWidth) || 1,
    opacity: parseFloat(computed.strokeOpacity),
    dash,
  };
}

/**
 * Every line on the graph, painted on a canvas the size of the stage.
 *
 * Redrawn on every pan, zoom, resize and change of edges — a few milliseconds
 * for thousands of lines — and again when the document's root attributes
 * change, which is how a theme switch reaches it while the graph is open.
 */
export const GraphEdgesCanvas = memo(function GraphEdgesCanvas({
  edges,
  bounds,
  view,
  moving,
  zooming,
  sceneRef,
  dimmed,
}: GraphEdgesCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintedRef = useRef<Painted | null>(null);
  const written = edges.filter((edge) => edge.kind !== "tree").length;

  const marginX = zooming ? 0 : Math.round(view.stageSize.width * OVERDRAW);
  const marginY = zooming ? 0 : Math.round(view.stageSize.height * OVERDRAW);

  /**
   * **Mid-drag the picture is slid; otherwise it is painted.** Painting
   * thousands of thick lines is 40ms a frame up close, measured, and a drag
   * asks for a frame every 16ms. So while `moving` the canvas keeps what it
   * has and a CSS transform slides it, pixel-exact, and when the hand stops
   * it is painted once for where the view has ended up. A drag that runs
   * past the overdraw is painted mid-gesture rather than revealing blank.
   * A zoom is painted every tick: scaling the painting instead was soft on
   * the way in and showed blank around the painted rectangle on the way out.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    if (!canvas || !scene) return;

    const painted = paintedRef.current;
    const sameWorld =
      painted !== null &&
      painted.edges === edges &&
      painted.bounds === bounds &&
      painted.dimmed === dimmed &&
      painted.stageSize === view.stageSize;
    if (sameWorld && moving && painted.zoom === view.zoom) {
      const tx = view.pan.x - painted.pan.x;
      const ty = view.pan.y - painted.pan.y;
      if (Math.abs(tx) <= marginX && Math.abs(ty) <= marginY) {
        canvas.style.transform = `translate(${tx}px, ${ty}px)`;
        return;
      }
    }

    paint();
    canvas.style.transform = "";
    paintedRef.current = { pan: view.pan, zoom: view.zoom, stageSize: view.stageSize, edges, bounds, dimmed };

    function paint() {
      if (!canvas || !scene) return;
      const { pan, zoom, stageSize } = view;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round((stageSize.width + 2 * marginX) * ratio);
      const height = Math.round((stageSize.height + 2 * marginY) * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, width, height);
      if (edges.length === 0) return;

      const writtenStyle = readStyle(scene.querySelector(".page-graph-edge-probe .page-graph-edge-written"));
      const treeStyle = readStyle(scene.querySelector(".page-graph-edge-probe .page-graph-edge-tree"));
      if (!writtenStyle || !treeStyle) return;

      // The scene's own transform, in numbers: centre the box on the stage's
      // middle, scale about it, then pan — shifted by the overdraw, since the
      // canvas starts a margin above and left of the stage. Line widths are in
      // scene units and scale with the zoom, exactly as they did in the SVG.
      const offsetX = marginX + stageSize.width / 2 + pan.x - zoom * (bounds.minX + bounds.width / 2);
      const offsetY = marginY + stageSize.height / 2 + pan.y - zoom * (bounds.minY + bounds.height / 2);
      context.setTransform(ratio * zoom, 0, 0, ratio * zoom, ratio * offsetX, ratio * offsetY);

      // Only what crosses the canvas is drawn. Cheap to decide and it is most
      // of the saving up close, where most of a big world is off the screen.
      const left = -offsetX / zoom;
      const top = -offsetY / zoom;
      const right = left + (stageSize.width + 2 * marginX) / zoom;
      const bottom = top + (stageSize.height + 2 * marginY) / zoom;
      const crosses = (edge: PlacedEdge) =>
        Math.max(edge.x1, edge.x2) >= left &&
        Math.min(edge.x1, edge.x2) <= right &&
        Math.max(edge.y1, edge.y2) >= top &&
        Math.min(edge.y1, edge.y2) <= bottom;

      for (const kind of ["tree", "written"] as const) {
        const style = kind === "tree" ? treeStyle : writtenStyle;
        context.strokeStyle = style.stroke;
        // A line never gets wider than GRAPH_LINE_MAX_PX on the screen. Drawn
        // purely in scene units it was four pixels across at full zoom — heavy
        // to look at and, since a stroke's cost is the pixels it covers, half of
        // what made zooming in lag. Far out the stylesheet's width still holds,
        // so the whole-world mesh is as fine as it was.
        context.lineWidth = Math.min(style.width, GRAPH_LINE_MAX_PX / zoom);
        // Round on a written line, as the SVG had it; square on a dashed one.
        // A round cap is drawn on every dash, and up close a tree line is
        // hundreds of them: measured 2026-09-13, dashed tree lines were 30ms
        // of a 55ms frame with round caps, and the difference at four pixels
        // a dash is invisible.
        context.lineCap = kind === "tree" ? "butt" : "round";
        context.globalAlpha = style.opacity;
        // Solid while the wheel turns, dashed when it stops: every dash is a
        // path of its own to the painter, and on a graph of thousands of
        // filed-under lines they were a third of a zoom frame — for a pattern
        // the eye cannot follow on a picture that is changing size.
        context.setLineDash(zooming ? [] : style.dash);
        context.beginPath();
        for (const edge of edges) {
          if ((edge.kind === "tree") !== (kind === "tree")) continue;
          if (!crosses(edge)) continue;
          context.moveTo(edge.x1, edge.y1);
          context.lineTo(edge.x2, edge.y2);
        }
        context.stroke();
      }
    }

    // A theme is a set of attributes and classes on the root; any change up
    // there is painted for, which is cheap and catches every way a theme is
    // switched without this file knowing how themes work.
    const observer = new MutationObserver(paint);
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [edges, bounds, view, moving, zooming, sceneRef, dimmed, marginX, marginY]);

  return (
    <canvas
      ref={canvasRef}
      className="page-graph-edges-canvas"
      aria-hidden="true"
      // The counts by kind, for the app suite: the lines are pixels now, and
      // "a line she wrote is drawn differently from the tree" needs a handle.
      data-written={written}
      data-tree={edges.length - written}
      style={{
        left: -marginX,
        top: -marginY,
        width: view.stageSize.width + 2 * marginX,
        height: view.stageSize.height + 2 * marginY,
      }}
    />
  );
});

/**
 * Two invisible lines the stylesheet is asked about. Inside the scene, so
 * everything the scene's classes and variables decide — the fade by count,
 * the dim while a page is selected — resolves on them too.
 */
export function GraphEdgeProbe() {
  return (
    <svg className="page-graph-edge-probe" aria-hidden="true" width="0" height="0">
      <line className="page-graph-edge page-graph-edge-written" />
      <line className="page-graph-edge page-graph-edge-tree" />
    </svg>
  );
}

type GraphEdgeLabelsProps = {
  edges: PlacedEdge[];
  bounds: GraphBounds;
};

/**
 * The name on every line that has one — *Names always*, at a zoom names are
 * drawn at. Only a reference property knows what to call itself ("Friends",
 * "Enemies"), which is the one thing Obsidian's graph cannot say about a line
 * it draws; prose, manual links and the tree have no name to write.
 */
export const GraphEdgeLabels = memo(function GraphEdgeLabels({ edges, bounds }: GraphEdgeLabelsProps) {
  return (
    <svg
      className="page-graph-edges"
      aria-hidden="true"
      style={{ left: bounds.minX, top: bounds.minY, width: bounds.width, height: bounds.height }}
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
    >
      {edges.map((edge) =>
        edge.label ? (
          <text
            key={`${edge.id}-label`}
            className="page-graph-edge-label"
            x={(edge.x1 + edge.x2) / 2}
            y={(edge.y1 + edge.y2) / 2}
          >
            {edge.label}
          </text>
        ) : null,
      )}
    </svg>
  );
});

type GraphLitEdgesProps = {
  /** The lines touching the page in play — a handful, never the whole graph. */
  edges: PlacedEdge[];
  bounds: GraphBounds;
  /** Whether their reasons are written; held back while the picture is small, like names. */
  labelled: boolean;
};

/**
 * The lines touching the page being pointed at, drawn again on top.
 *
 * Nothing is drawn while nothing is in play, so on a quiet graph this element
 * is an empty SVG and costs nothing.
 */
export function GraphLitEdges({ edges, bounds, labelled }: GraphLitEdgesProps) {
  return (
    <svg
      className="page-graph-edges page-graph-edges-lit"
      aria-hidden="true"
      style={{ left: bounds.minX, top: bounds.minY, width: bounds.width, height: bounds.height }}
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
    >
      {edges.map((edge) => (
        <line
          key={edge.id}
          className={`page-graph-edge page-graph-edge-${edge.kind === "tree" ? "tree" : "written"} page-graph-edge-lit`}
          x1={edge.x1}
          y1={edge.y1}
          x2={edge.x2}
          y2={edge.y2}
        />
      ))}
      {labelled &&
        edges.map((edge) =>
          edge.label ? (
            <text
              key={`${edge.id}-label`}
              className="page-graph-edge-label"
              x={(edge.x1 + edge.x2) / 2}
              y={(edge.y1 + edge.y2) / 2}
            >
              {edge.label}
            </text>
          ) : null,
        )}
    </svg>
  );
}
