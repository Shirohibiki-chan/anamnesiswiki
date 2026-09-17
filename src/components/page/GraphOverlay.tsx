// A graph drawn over the app: one page's surroundings, or a whole universe.
// Phase 24, steps 1 to 3.
//
// **Was PageGraph until step 3.** It draws both graphs now, because both were
// scoped as one component fed a different set of pages — a name saying "page"
// would be the only thing in the feature still claiming they are two. The CSS
// classes keep the older `page-graph-` prefix on purpose; the stylesheet and
// the app suite's harness both know it, and renaming a class buys a reader
// nothing the file's own name has not already told them.
//
// **Opened over the page rather than living in it.** Her call 2026-09-07: every
// page has one without being set up for it, and the graph gets the whole window
// instead of a column. A block version is the obvious second size and is not
// built — see `docs/shipped.md` Phase 24.
//
// **Lines are SVG and nodes are HTML, which is one decision and not two.** The
// plan's commitment is SVG over canvas, and the reason is that the CSS token
// themes — including the ones she writes herself — then apply for free. Nodes
// get more of that from being ordinary elements than from being SVG: a real
// button focuses, takes a hover state, holds a lucide icon and a wrapping name,
// and needs no hit-testing of its own. The edges stay SVG because a line is
// what SVG is for. Both sit inside one transformed scene, so they pan and zoom
// together.
//
// **The lines and the pages are memoised pieces of their own** (GraphEdges,
// GraphNodeButton), because this body re-renders on every pointer move while
// panning, every wheel tick and every hover. Written inline they were rebuilt
// each time — 835 buttons and two and a half thousand lines per mouse move on
// the generated world, which is the lag she reported. The scene's transform
// moves the picture; nothing inside it changes until a node is dragged.
//
// All of the behaviour is in hooks/use-graph-view.ts; this renders.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  GRAPH_DEFAULT_DEPTH,
  GRAPH_DIM_OPACITY,
  GRAPH_FADE_MS,
  GRAPH_REACH_EVERYTHING,
  type GraphReach,
} from "../../constants/graph";
import type { DatabaseFilter } from "../../constants/schema";
import {
  edgeOpacity,
  graphPinKey,
  neighbourhoodOf,
  GRAPH_EDGE_KINDS,
  type GraphEdgeKind,
} from "../../services/graph-service";
import { usePageGraph, useGraphPins, useGraphPreview, useGraphScope } from "../../hooks/use-graph";
import { useGraphOverlayActions, useOpenGraph } from "../../hooks/use-graph-overlay";
import { useGraphView } from "../../hooks/use-graph-view";
import { useGraphEdgeLabels, useGraphNameZoom, usePreferenceActions } from "../../hooks/use-preferences";
import { useProject, useProjectActions, useProjectName } from "../../hooks/use-project";
import { NodeIcon } from "../blocks/IconPicker";
import { GraphEdgeLabels, GraphEdgeProbe, GraphEdgesCanvas, GraphLitEdges } from "./GraphEdges";
import { GraphNodeButton } from "./GraphNodeButton";
import { GraphToolbar } from "./GraphToolbar";
import "./graph.css";

/**
 * Mounted once at the app's root, beside Lightbox, and empty until asked for.
 *
 * The body is keyed on which graph is open, so every piece of state inside it —
 * the reach, the filters, the panning — is reset by the remount rather than by
 * five lines that have to remember to. Opening a different graph is a different
 * question, and none of the answers to the last one carry over.
 */
export function GraphOverlay() {
  const open = useOpenGraph();
  if (!open) return null;
  return <GraphOverlayBody key={open.focusId ?? "__world__"} focusId={open.focusId} />;
}

function GraphOverlayBody({ focusId }: { focusId: string | null }) {
  const { nodes } = useProject();
  const projectName = useProjectName();
  const { closeGraph } = useGraphOverlayActions();
  const focus = focusId ? nodes[focusId] : undefined;

  /**
   * The reach and the filters last only as long as the graph is open.
   *
   * Not stored, unlike the arrangement, and the difference is what each one
   * means. Where a page sits is something she *made*, and losing it would lose
   * work. A filter is a question she is asking right now — a graph reopened
   * three days later still hiding half of what it is connected to, with nothing
   * on screen saying why, is the setting that reads as a broken feature.
   *
   * A graph opened from the rail starts at everything, because that is what its
   * button offers; one opened from a page starts at one connection out.
   */
  const [reach, setReach] = useState<GraphReach>(focusId ? GRAPH_DEFAULT_DEPTH : GRAPH_REACH_EVERYTHING);
  const [filters, setFilters] = useState<DatabaseFilter[]>([]);
  // With the filters, and for the same reason: a question being asked now.
  const [hideLone, setHideLone] = useState(false);
  const [kinds, setKinds] = useState<ReadonlySet<GraphEdgeKind>>(() => new Set(GRAPH_EDGE_KINDS));
  const [hiddenLabels, setHiddenLabels] = useState<ReadonlySet<string>>(() => new Set());
  const [generation, setGeneration] = useState(0);

  const { universeId, universeName } = useGraphScope(focusId);
  /**
   * A whole-universe graph is arranged as a universe, whichever door it came
   * through — so widening this page's graph all the way reads and writes the
   * same arrangement the rail's button does. See `graphPinKey`.
   */
  const arrangedAs = reach === GRAPH_REACH_EVERYTHING ? null : focusId;
  const pinKey = graphPinKey(arrangedAs, universeId);
  const pins = useGraphPins(arrangedAs, universeId);
  const labels = useGraphEdgeLabels();
  const nameZoom = useGraphNameZoom();
  const { setGraphEdgeLabels, setGraphNameZoom } = usePreferenceActions();
  const { selectNode, setGraphPins } = useProjectActions();

  const graph = usePageGraph({ focusId, reach, filters, hideLone, kinds, hiddenLabels, pins, generation });

  const onArrange = useCallback(
    (moved: Record<string, { x: number; y: number }>) => setGraphPins(pinKey, { ...pins, ...moved }),
    [setGraphPins, pinKey, pins],
  );
  const view = useGraphView(graph.model, { resetKey: graph.key, onArrange, dotsBelow: nameZoom });

  // Destructured up here rather than reached for as `view.x` through the
  // markup, the same shape Lightbox takes from use-lightbox. It keeps the JSX
  // below reading as a description of the picture rather than of the hook.
  const { stageRef, nodes: drawnNodes, edges, bounds, sceneTransform, selectedId, select, zoom } = view;
  // For the canvas to find the probe lines the stylesheet resolves on.
  const sceneRef = useRef<HTMLDivElement>(null);
  const { startNodeDrag, moveNodeDrag, endNodeDrag, startPan, movePan, endPan, handleWheel } = view;
  const { hoveredId, hover, moving, zooming, forgetArrangement, hasMoved } = view;

  const preview = useGraphPreview(selectedId);

  const selected = drawnNodes.find((drawn) => drawn.id === selectedId);
  // Whatever the graph is currently *about*, which is what the quiet label mode
  // follows: the thing under the pointer if there is one, else the selection.
  const inPlay = hoveredId ?? selectedId;
  /**
   * The lines touching the page in play are drawn again on top, and the pages
   * around it stay at full strength while the rest step back — Obsidian's
   * picture, her call 2026-09-13. Recomputed only when the page in play
   * changes, not on every pan.
   */
  const near = useMemo(() => neighbourhoodOf(graph.model.edges, inPlay), [graph.model.edges, inPlay]);
  const lit = inPlay === null ? [] : edges.filter((edge) => edge.sourceId === inPlay || edge.targetId === inPlay);
  const arranged = hasMoved || Object.keys(pins).length > 0;
  const empty = !graph.working && (focus ? graph.model.nodes.length <= 1 : graph.model.nodes.length === 0);
  // Too far out for a name to be readable, so none of them are drawn — the
  // preview card and the node's tooltip are where a name comes from at this
  // distance. See GRAPH_NAME_ZOOM.
  const namesQuiet = zoom < nameZoom;
  const measured = view.view.stageSize.width > 0 && view.view.stageSize.height > 0;

  /**
   * What this graph is of, in the words its subject is known by.
   *
   * **The world's own name rather than "this world"**, which is what it said
   * until it was looked at: a bar reading "Everything in This world" over a
   * picture of Valeraverse is the app describing a category instead of naming
   * the thing on screen — and the name is right there, at the top of the tree.
   * A universe is named the same way when one is selected.
   */
  const subject = focus ? focus.name : (universeName ?? projectName);
  const title = focus ? `Connections for ${subject}` : `Everything in ${subject}`;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeGraph();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeGraph]);

  function openSelected() {
    if (!selectedId) return;
    selectNode(selectedId);
    closeGraph();
  }

  /**
   * Puts the arrangement back: forget the stored pins, forget this session's
   * drags, and ask for the layout to be worked out from nothing.
   *
   * All three, because each covers what the others cannot — the store holds
   * earlier visits, `moved` holds this one, and the generation is what makes
   * the simulation run again rather than leaving everything sitting exactly
   * where the pins had put it.
   */
  function putBack() {
    setGraphPins(pinKey, {});
    forgetArrangement();
    setGeneration((current) => current + 1);
  }

  return createPortal(
    <div className="page-graph" role="dialog" aria-modal="true" aria-label={title}>
      <div className="page-graph-bar">
        <span className="page-graph-heading">
          {focus ? "Connections" : "Everything in"}
          <span className="page-graph-heading-page" title={subject}>
            {subject}
          </span>
        </span>

        <GraphToolbar
          drawn={graph.model.nodes.length}
          reached={graph.reached.length}
          reach={reach}
          onReach={setReach}
          // Hops are counted from somewhere, and a graph with no centre has
          // nowhere to count from. The control stays in the row rather than
          // vanishing — see its own note on why nothing here appears and
          // disappears — and says why it cannot be used.
          reachDisabled={!focus}
          labels={labels}
          onLabels={setGraphEdgeLabels}
          filters={filters}
          onFilters={setFilters}
          choicesFor={graph.choicesFor}
          hideLone={hideLone}
          onHideLone={setHideLone}
          kinds={kinds}
          onKinds={setKinds}
          lineNames={graph.labels}
          hiddenLabels={hiddenLabels}
          onHiddenLabels={setHiddenLabels}
          nameZoom={nameZoom}
          onNameZoom={setGraphNameZoom}
          arranged={arranged}
          onPutBack={putBack}
        />

        <button
          type="button"
          className="page-graph-close"
          aria-label="Close"
          title="Close (Esc)"
          onClick={closeGraph}
          autoFocus
        >
          <X size={18} />
        </button>
      </div>

      <div className="page-graph-body">
        <div
          className="page-graph-stage"
          ref={stageRef}
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onWheel={handleWheel}
        >
          {/* Under the scene, unscaled, the size of the stage. Nothing is
              drawn in the quietest mode — see GRAPH_EDGE_LABELS. */}
          {labels !== "pointed" && (
            <GraphEdgesCanvas
              edges={edges}
              bounds={bounds}
              view={view.view}
              moving={moving}
              zooming={zooming}
              sceneRef={sceneRef}
              // On selection, not on hover: a canvas cannot ease, so lines that
              // dimmed on hover snapped between full and faint on every dot the
              // pointer crossed — thousands of lines flashing, "disco party" in
              // her words 2026-09-13. The dots ease and the lit lines come up
              // on hover; the rest of the lines step back only for a click.
              dimmed={selectedId !== null}
            />
          )}

          {/* Said rather than left as a frozen window. The last picture stays
              up while the next is worked out; on a first open there is none,
              and this is what stands in for it. */}
          {graph.working && <p className="page-graph-working">Working out the picture…</p>}

          <div
            ref={sceneRef}
            // Not settled until the stage has been measured either: before
            // the ResizeObserver reports, the fit is 1 and the first picture
            // is drawn at the wrong size for a frame, then jumps. On CI that
            // frame is long enough for a scenario to read a position from it
            // — 545px of "drift" that was the refit. Hidden for that frame too,
            // so nobody sees the jump.
            data-settled={graph.working || !measured ? "false" : "true"}
            // For the app suite: a zoom is a glide of many frames, and a read
            // taken before it lands is a read of the middle of a movement.
            data-zooming={zooming ? "true" : "false"}
            className={[
              "page-graph-scene",
              namesQuiet ? "page-graph-scene-small" : "",
              inPlay !== null ? "page-graph-scene-inplay" : "",
              selectedId !== null ? "page-graph-scene-selected" : "",
              moving ? "page-graph-scene-moving" : "",
              measured ? "" : "page-graph-scene-unmeasured",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              {
                transform: sceneTransform,
                // Fainter the more of them there are — see edgeOpacity.
                "--graph-edge-opacity": edgeOpacity(edges.length),
                "--graph-dim-opacity": GRAPH_DIM_OPACITY,
                "--graph-fade": `${GRAPH_FADE_MS}ms`,
              } as React.CSSProperties
            }
          >
            <GraphEdgeProbe />
            {/* A line's reason is held back while the picture is small for
                the same reason every node's name is: a whole world's worth of
                six-pixel words is noise standing where the shape should be,
                and on a lit line it drew as a short grey dash — the same
                stripe the selected node's name once did. */}
            {labels === "all" && !namesQuiet && <GraphEdgeLabels edges={edges} bounds={bounds} />}
            {/* Its names only in the quiet mode — in *Names always* the line
                underneath has written it already, and the same word drawn
                twice in the same place is a heavier halo, not two words. */}
            <GraphLitEdges edges={lit} bounds={bounds} labelled={!namesQuiet && labels !== "all"} />

            {drawnNodes.map((drawn) => (
              <GraphNodeButton
                key={drawn.id}
                drawn={drawn}
                selected={drawn.id === selectedId}
                hovered={drawn.id === hoveredId}
                near={near.has(drawn.id)}
                onStartDrag={startNodeDrag}
                onMoveDrag={moveNodeDrag}
                onEndDrag={endNodeDrag}
                onHover={hover}
                onSelect={select}
              />
            ))}
          </div>

          {empty && (
            <p className="page-graph-empty">
              {filters.length > 0 || hideLone || kinds.size < GRAPH_EDGE_KINDS.length || hiddenLabels.size > 0
                ? "Nothing here matches those filters. Loosen one, or reach further out."
                : focus
                  ? "Nothing points at this page and it points at nothing yet. Mention another page while writing, fill in a reference field, or put a page inside this one."
                  : "This universe has no pages in it yet."}
            </p>
          )}
        </div>

        {preview && selected && (
          <aside className="page-graph-preview" aria-label={`About ${preview.name}`}>
            {/* Clicking empty background also puts the card away, but nobody
                would guess that; a card with no way to close it reads as stuck.
                Her words, 2026-09-13. */}
            <button
              type="button"
              className="page-graph-preview-close"
              aria-label="Close this card"
              title="Close"
              onClick={() => select(null)}
            >
              <X size={16} />
            </button>
            <div className="page-graph-preview-head">
              <NodeIcon icon={selected.icon} templateKey={selected.templateKey} size={18} />
              <h2 className="page-graph-preview-name">{preview.name}</h2>
            </div>
            <p className="page-graph-preview-template">{preview.templateLabel}</p>

            {preview.tags.length > 0 && (
              <ul className="page-graph-preview-tags">
                {preview.tags.map((tag) => (
                  <li key={tag} className="page-graph-preview-tag">
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            {preview.excerpt ? (
              <>
                <p className="page-graph-preview-excerpt">{preview.excerpt}</p>
                {preview.tabLabel && <p className="page-graph-preview-source">from {preview.tabLabel}</p>}
              </>
            ) : (
              <p className="page-graph-preview-source">Nothing written here yet.</p>
            )}

            {/* Going to the page is a second, deliberate action — clicking a
                node must not throw the graph away. See docs/shipped.md Phase 24. */}
            <button type="button" className="ui-btn ui-btn-secondary" onClick={openSelected}>
              Open This Page
            </button>
          </aside>
        )}
      </div>
    </div>,
    document.body,
  );
}
