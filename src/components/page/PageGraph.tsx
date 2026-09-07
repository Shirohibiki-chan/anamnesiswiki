// One page's relationships, drawn. Phase 24, step 1.
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
// button focuses, takes a hover state, holds a lucide icon and an ellipsised
// name, and needs no hit-testing of its own. The edges stay SVG because a line
// is what SVG is for. Both sit inside one transformed scene, so they pan and
// zoom together.
//
// All of the behaviour is in hooks/use-graph-view.ts; this renders.
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { GRAPH_DEFAULT_DEPTH } from "../../constants/graph";
import { getPaletteHex } from "../../constants/palette";
import type { Node } from "../../constants/schema";
import { usePageGraph, useGraphPreview } from "../../hooks/use-graph";
import { useGraphView } from "../../hooks/use-graph-view";
import { useProjectActions } from "../../hooks/use-project";
import { NodeIcon } from "../blocks/IconPicker";
import "./graph.css";

type PageGraphProps = {
  node: Node;
  onClose: () => void;
};

export function PageGraph({ node, onClose }: PageGraphProps) {
  const model = usePageGraph(node.id, GRAPH_DEFAULT_DEPTH);
  const view = useGraphView(model);
  // Destructured up here rather than reached for as `view.x` through the
  // markup, the same shape Lightbox takes from use-lightbox. It keeps the JSX
  // below reading as a description of the picture rather than of the hook.
  const { stageRef, nodes, edges, bounds, sceneTransform, selectedId, select } = view;
  const { startNodeDrag, moveNodeDrag, endNodeDrag, startPan, movePan, endPan, handleWheel } = view;
  const preview = useGraphPreview(selectedId);
  const { selectNode } = useProjectActions();

  const selected = nodes.find((drawn) => drawn.id === selectedId);
  const neighbours = model.nodes.length - 1;

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

  return createPortal(
    <div className="page-graph" role="dialog" aria-modal="true" aria-label={`Connections for ${node.name}`}>
      <div className="page-graph-bar">
        <span className="page-graph-heading">
          Connections
          <span className="page-graph-heading-page" title={node.name}>
            {node.name}
          </span>
        </span>
        <span className="page-graph-count">
          {neighbours === 0 ? "Nothing connected yet" : `${neighbours} ${neighbours === 1 ? "page" : "pages"}`}
        </span>
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
              Nothing points at this page and it points at nothing yet. Mention another page while writing, fill in a
              reference field, or put a page inside this one.
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
