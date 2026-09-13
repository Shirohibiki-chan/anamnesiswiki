// The lines of a graph, as one memoised piece. Phase 24, big-world pass.
//
// **Split out of GraphOverlay so that panning does not redraw them.** The
// overlay re-renders on every pointer move while the background is dragged,
// every wheel tick and every hover, and when the lines were written inline
// each of those rebuilt every `<line>` through React — two and a half
// thousand of them on a world of 835 pages, which is the stutter she reported.
// The scene's transform already moves the picture; nothing about a line
// changes until a node is dragged, so this piece only re-renders then.
//
// **The lit lines are a second, tiny SVG rather than a class on these.** A
// hover changes which lines are lit, and marking them here would mean this
// whole piece re-rendering for it. Drawing them again on top, in their own
// element, costs a dozen lines per hover and leaves the thousands alone — and
// gets them above the rest for free, where SVG's paint order would otherwise
// need the list reordered.
import { memo } from "react";
import type { PlacedEdge } from "../../hooks/use-graph-view";
import type { GraphBounds } from "../../services/graph-layout";

type GraphEdgesProps = {
  edges: PlacedEdge[];
  bounds: GraphBounds;
  /** Whether every line that knows its reason writes it — *Names always*, at a zoom names are drawn at. */
  labelled: boolean;
};

function edgeClass(edge: PlacedEdge, lit: boolean): string {
  return [
    "page-graph-edge",
    `page-graph-edge-${edge.kind === "tree" ? "tree" : "written"}`,
    lit ? "page-graph-edge-lit" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Every line on the graph, drawn once and left alone while the view moves. */
export const GraphEdges = memo(function GraphEdges({ edges, bounds, labelled }: GraphEdgesProps) {
  return (
    // Decorative: every relationship a line stands for is already reachable
    // through the buttons, so a reader going through them one at a time would
    // otherwise hear the same thing twice.
    <svg
      className="page-graph-edges"
      aria-hidden="true"
      style={{ left: bounds.minX, top: bounds.minY, width: bounds.width, height: bounds.height }}
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
    >
      {edges.map((edge) => (
        <line key={edge.id} className={edgeClass(edge, false)} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} />
      ))}

      {/* Only a reference property knows what to call itself — "Friends",
          "Enemies" — which is the one thing Obsidian's graph cannot say about
          a line it draws. Prose, manual links and the tree have no name to
          write, so most lines carry nothing either way. */}
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
        <line key={edge.id} className={edgeClass(edge, true)} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} />
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
