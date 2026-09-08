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
// built — see `docs/plan.md` Phase 24.
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
// All of the behaviour is in hooks/use-graph-view.ts; this renders.
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  GRAPH_DEFAULT_DEPTH,
  GRAPH_NAME_ZOOM,
  GRAPH_REACH_EVERYTHING,
  type GraphReach,
} from "../../constants/graph";
import { getPaletteHex } from "../../constants/palette";
import type { DatabaseFilter } from "../../constants/schema";
import { graphPinKey } from "../../services/graph-service";
import { usePageGraph, useGraphPins, useGraphPreview, useGraphScope } from "../../hooks/use-graph";
import { useGraphOverlayActions, useOpenGraph } from "../../hooks/use-graph-overlay";
import { useGraphView } from "../../hooks/use-graph-view";
import { useGraphEdgeLabels, usePreferenceActions } from "../../hooks/use-preferences";
import { useProject, useProjectActions, useProjectName } from "../../hooks/use-project";
import { NodeIcon } from "../blocks/IconPicker";
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
  const [generation, setGeneration] = useState(0);

  const { universeId, universeName } = useGraphScope(focusId);
  const pinKey = graphPinKey(focusId, universeId);
  const pins = useGraphPins(focusId, universeId);
  const labels = useGraphEdgeLabels();
  const { setGraphEdgeLabels } = usePreferenceActions();
  const { selectNode, setGraphPins } = useProjectActions();

  const graph = usePageGraph({ focusId, reach, filters, pins, generation });

  const onArrange = useCallback(
    (moved: Record<string, { x: number; y: number }>) => setGraphPins(pinKey, { ...pins, ...moved }),
    [setGraphPins, pinKey, pins],
  );
  const view = useGraphView(graph.model, { resetKey: graph.key, onArrange });

  // Destructured up here rather than reached for as `view.x` through the
  // markup, the same shape Lightbox takes from use-lightbox. It keeps the JSX
  // below reading as a description of the picture rather than of the hook.
  const { stageRef, nodes: drawnNodes, edges, bounds, sceneTransform, selectedId, select, zoom } = view;
  const { startNodeDrag, moveNodeDrag, endNodeDrag, startPan, movePan, endPan, handleWheel } = view;
  const { hoveredId, hover, forgetArrangement, hasMoved } = view;

  const preview = useGraphPreview(selectedId);

  const selected = drawnNodes.find((drawn) => drawn.id === selectedId);
  // Whatever the graph is currently *about*, which is what the quiet label mode
  // follows: the thing under the pointer if there is one, else the selection.
  const inPlay = hoveredId ?? selectedId;
  const arranged = hasMoved || Object.keys(pins).length > 0;
  const empty = focus ? graph.model.nodes.length <= 1 : graph.model.nodes.length === 0;
  // Too far out for a name to be readable, so none of them are drawn — the
  // preview card and the node's tooltip are where a name comes from at this
  // distance. See GRAPH_NAME_ZOOM.
  const namesQuiet = zoom < GRAPH_NAME_ZOOM;

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
          <div
            className={`page-graph-scene${namesQuiet ? " page-graph-scene-small" : ""}`}
            style={{ transform: sceneTransform }}
          >
            {/* Decorative: every relationship a line stands for is already
                reachable through the buttons, so a reader going through them
                one at a time would otherwise hear the same thing twice. */}
            <svg
              className="page-graph-edges"
              aria-hidden="true"
              style={{
                left: bounds.minX,
                top: bounds.minY,
                width: bounds.width,
                height: bounds.height,
              }}
              viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
            >
              {edges.map((edge) => (
                <line
                  key={edge.id}
                  className={`page-graph-edge page-graph-edge-${edge.kind === "tree" ? "tree" : "written"}`}
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                />
              ))}

              {/* Only a reference property knows what to call itself — "Friends",
                  "Enemies" — which is the one thing Obsidian's graph cannot say
                  about a line it draws. Prose, manual links and the tree have no
                  name to write, so most lines carry nothing either way.

                  Names always is dropped while the picture is small, for the
                  same reason every node's name is: a whole world's worth of
                  six-pixel words is noise standing where the shape should be. */}
              {edges.map((edge) => {
                if (!edge.label) return null;
                const touching = inPlay !== null && (edge.sourceId === inPlay || edge.targetId === inPlay);
                if (!(touching || (labels === "all" && !namesQuiet))) return null;
                return (
                  <text
                    key={`${edge.id}-label`}
                    className="page-graph-edge-label"
                    x={(edge.x1 + edge.x2) / 2}
                    y={(edge.y1 + edge.y2) / 2}
                  >
                    {edge.label}
                  </text>
                );
              })}
            </svg>

            {drawnNodes.map((drawn) => {
              const hex = getPaletteHex(drawn.color ?? undefined);
              return (
                <button
                  key={drawn.id}
                  type="button"
                  className={[
                    "page-graph-node",
                    drawn.depth === 0 ? "page-graph-node-focus" : "",
                    drawn.id === selectedId ? "page-graph-node-selected" : "",
                    drawn.id === hoveredId ? "page-graph-node-inplay" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    {
                      left: drawn.x,
                      top: drawn.y,
                      ...(hex ? { "--graph-node-color": hex } : {}),
                    } as React.CSSProperties
                  }
                  title={drawn.name}
                  onPointerDown={(event) => startNodeDrag(event, drawn)}
                  onPointerMove={moveNodeDrag}
                  onPointerUp={(event) => endNodeDrag(event, drawn)}
                  onPointerCancel={(event) => endNodeDrag(event, drawn)}
                  onPointerEnter={() => hover(drawn.id)}
                  onPointerLeave={() => hover(null)}
                  // Only the keyboard's click reaches this — a mouse click is
                  // decided in endNodeDrag, where a press that travelled can be
                  // told from one that did not. `detail` is 0 exactly when the
                  // click came from Enter or Space rather than a pointer.
                  onClick={(event) => {
                    if (event.detail === 0) select(drawn.id);
                  }}
                >
                  <span className="page-graph-node-disc">
                    <NodeIcon icon={drawn.icon} templateKey={drawn.templateKey} size={20} />
                  </span>
                  <span className="page-graph-node-name">{drawn.name}</span>
                </button>
              );
            })}
          </div>

          {empty && (
            <p className="page-graph-empty">
              {filters.length > 0
                ? "Nothing here matches those filters. Loosen one, or reach further out."
                : focus
                  ? "Nothing points at this page and it points at nothing yet. Mention another page while writing, fill in a reference field, or put a page inside this one."
                  : "This universe has no pages in it yet."}
            </p>
          )}
        </div>

        {preview && selected && (
          <aside className="page-graph-preview" aria-label={`About ${preview.name}`}>
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
                node must not throw the graph away. See docs/plan.md Phase 24. */}
            <button type="button" className="ui-btn ui-btn-secondary" onClick={openSelected}>
              Open this page
            </button>
          </aside>
        )}
      </div>
    </div>,
    document.body,
  );
}
