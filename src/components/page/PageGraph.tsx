// One page's relationships, drawn. Phase 24, steps 1 and 2.
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
import { GRAPH_DEFAULT_DEPTH, type GraphDepth } from "../../constants/graph";
import { getPaletteHex } from "../../constants/palette";
import type { DatabaseFilter, Node } from "../../constants/schema";
import { usePageGraph, useGraphPins, useGraphPreview } from "../../hooks/use-graph";
import { useGraphView } from "../../hooks/use-graph-view";
import { useGraphEdgeLabels, usePreferenceActions } from "../../hooks/use-preferences";
import { useProjectActions } from "../../hooks/use-project";
import { NodeIcon } from "../blocks/IconPicker";
import { GraphToolbar } from "./GraphToolbar";
import "./graph.css";

type PageGraphProps = {
  node: Node;
  onClose: () => void;
};

export function PageGraph({ node, onClose }: PageGraphProps) {
  /**
   * The reach and the filters last only as long as the graph is open.
   *
   * Not stored, unlike the arrangement, and the difference is what each one
   * means. Where a page sits is something she *made*, and losing it would lose
   * work. A filter is a question she is asking right now — a graph reopened
   * three days later still hiding half of what it is connected to, with nothing
   * on screen saying why, is the setting that reads as a broken feature.
   */
  const [depth, setDepth] = useState<GraphDepth>(GRAPH_DEFAULT_DEPTH);
  const [filters, setFilters] = useState<DatabaseFilter[]>([]);
  const [generation, setGeneration] = useState(0);

  const pins = useGraphPins(node.id);
  const labels = useGraphEdgeLabels();
  const { setGraphEdgeLabels } = usePreferenceActions();
  const { selectNode, setGraphPins } = useProjectActions();

  const graph = usePageGraph({ focusId: node.id, depth, filters, pins, generation });

  const onArrange = useCallback(
    (moved: Record<string, { x: number; y: number }>) => setGraphPins(node.id, { ...pins, ...moved }),
    [setGraphPins, node.id, pins],
  );
  const view = useGraphView(graph.model, { resetKey: graph.key, onArrange });

  // Destructured up here rather than reached for as `view.x` through the
  // markup, the same shape Lightbox takes from use-lightbox. It keeps the JSX
  // below reading as a description of the picture rather than of the hook.
  const { stageRef, nodes, edges, bounds, sceneTransform, selectedId, select } = view;
  const { startNodeDrag, moveNodeDrag, endNodeDrag, startPan, movePan, endPan, handleWheel } = view;
  const { hoveredId, hover, forgetArrangement, hasMoved } = view;

  const preview = useGraphPreview(selectedId);

  const selected = nodes.find((drawn) => drawn.id === selectedId);
  const neighbours = graph.model.nodes.length - 1;
  // Whatever the graph is currently *about*, which is what the quiet label mode
  // follows: the thing under the pointer if there is one, else the selection.
  const inPlay = hoveredId ?? selectedId;
  const arranged = hasMoved || Object.keys(pins).length > 0;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function openSelected() {
    if (!selectedId) return;
    selectNode(selectedId);
    onClose();
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
    setGraphPins(node.id, {});
    forgetArrangement();
    setGeneration((current) => current + 1);
  }

  return createPortal(
    <div className="page-graph" role="dialog" aria-modal="true" aria-label={`Connections for ${node.name}`}>
      <div className="page-graph-bar">
        <span className="page-graph-heading">
          Connections
          <span className="page-graph-heading-page" title={node.name}>
            {node.name}
          </span>
        </span>

        <GraphToolbar
          drawn={graph.model.nodes.length}
          reached={graph.reach.length}
          depth={depth}
          onDepth={setDepth}
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
          onClick={onClose}
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
          <div className="page-graph-scene" style={{ transform: sceneTransform }}>
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
                  name to write, so most lines carry nothing either way. */}
              {edges.map((edge) => {
                if (!edge.label) return null;
                const showing =
                  labels === "all" || (inPlay !== null && (edge.sourceId === inPlay || edge.targetId === inPlay));
                if (!showing) return null;
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

            {nodes.map((drawn) => {
              const hex = getPaletteHex(drawn.color ?? undefined);
              return (
                <button
                  key={drawn.id}
                  type="button"
                  className={[
                    "page-graph-node",
                    drawn.depth === 0 ? "page-graph-node-focus" : "",
                    drawn.id === selectedId ? "page-graph-node-selected" : "",
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

          {neighbours === 0 && (
            <p className="page-graph-empty">
              {filters.length > 0
                ? "Nothing connected to this page matches those filters. Loosen one, or reach further out."
                : "Nothing points at this page and it points at nothing yet. Mention another page while writing, fill in a reference field, or put a page inside this one."}
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
