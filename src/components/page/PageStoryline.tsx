// A storyline's canvas: scenes in narrative order, where she put them.
// Phase 25, step 1.
//
// **Drawn in the page rather than opened over it, which is the opposite call
// Phase 24 made for the graph, on purpose.** A graph is a lens — a temporary
// way of looking at pages that live elsewhere — so it takes the whole window
// and gives it back. A storyline is a place she works: it is the body of a
// page, it is what that page is *for*, and a canvas you had to summon over the
// page holding it would make the page itself an empty shell. `Expand` is here
// for when the arrangement wants the whole monitor, and it is a mode of this
// same component rather than a second surface.
//
// **Lines are SVG and scenes are HTML**, the same one decision the graph makes:
// the CSS token themes — hers included — apply to an ordinary element for free,
// while a line is what SVG is for. Both sit inside one transformed scene so
// they pan and zoom together.
//
// All of the behaviour is in hooks/use-storyline-view.ts; this renders.
import { useCallback, useEffect, useState } from "react";
import { Link2, Maximize2, Minimize2, Plus, Trash2, X } from "lucide-react";
import { getPaletteHex } from "../../constants/palette";
import { STORYLINE_NODE_HEIGHT, STORYLINE_NODE_WIDTH } from "../../constants/storyline";
import type { Node } from "../../constants/schema";
import { useStoryline, useStorylineActions, type ConnectRefusal } from "../../hooks/use-storyline";
import { useStorylineView } from "../../hooks/use-storyline-view";
import { NodeIcon } from "../blocks/IconPicker";
import "./storyline.css";

/**
 * Why a line was refused, in words rather than as a shrug.
 *
 * **Every refusal says something true about the story**, which is why the
 * canvas explains rather than silently doing nothing: a gesture that produces
 * no line and no reason is indistinguishable from a bug in the dragging.
 */
const REFUSALS: Record<ConnectRefusal, string> = {
  "same-node": "A scene can't lead to itself.",
  "already-joined": "These two are already joined.",
  "would-loop": "That would make the story loop back on itself.",
};

export function PageStoryline({ node }: { node: Node }) {
  const model = useStoryline(node.id);
  const { addSceneToStoryline, moveStorylineNodes, connectStorylineNodes } = useStorylineActions();
  const { disconnectStorylineEdge, removeStorylineNode, selectNode } = useStorylineActions();
  const [expanded, setExpanded] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const onArrange = useCallback(
    (moved: Record<string, { x: number; y: number }>) => moveStorylineNodes(node.id, moved),
    [moveStorylineNodes, node.id],
  );

  const onConnect = useCallback(
    (fromId: string, toId: string) => {
      const refused = connectStorylineNodes(node.id, fromId, toId);
      setRefusal(refused ? REFUSALS[refused] : null);
    },
    [connectStorylineNodes, node.id],
  );

  const view = useStorylineView(model, { resetKey: node.id, onArrange, onConnect });
  const { stageRef, scenes, edges, bounds, sceneTransform, linking, zoom } = view;
  const { selectedId, selectedEdgeId, select, selectEdge } = view;
  const { startSceneDrag, moveSceneDrag, endSceneDrag, startLink, moveLink, endLink } = view;
  const { startPan, movePan, endPan, handleWheel } = view;

  const selected = scenes.find((scene) => scene.id === selectedId);

  // The explanation goes away on its own — it is a reply to a gesture, not a
  // state of the canvas, and one still sitting there three minutes later reads
  // as a problem rather than as an answer.
  useEffect(() => {
    if (!refusal) return;
    const timer = window.setTimeout(() => setRefusal(null), 4000);
    return () => window.clearTimeout(timer);
  }, [refusal]);

  // Escape leaves the expanded canvas, matching every other full-window surface
  // in the app. Only bound while expanded, so it never eats the key from
  // something else on an ordinary page.
  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  function addScene() {
    // Deliberately not opened afterwards. Adding three scenes in a row is the
    // ordinary way a storyline gets started, and jumping to a full editor after
    // each one turns that into three round trips.
    if (!addSceneToStoryline(node.id)) setRefusal("Couldn't make a page for that scene.");
  }

  return (
    <section
      className={`storyline${expanded ? " storyline-expanded" : ""}`}
      aria-label={`Storyline: ${node.name}`}
    >
      <div className="storyline-bar">
        <button type="button" className="ui-btn ui-btn-secondary" onClick={addScene}>
          <Plus size={15} />
          Add a scene
        </button>

        <span className="storyline-count">
          {model.scenes.length === 0
            ? "No scenes yet"
            : `${model.scenes.length} ${model.scenes.length === 1 ? "scene" : "scenes"}`}
        </span>

        <div className="storyline-bar-end">
          {selectedEdgeId && (
            <button
              type="button"
              className="ui-btn ui-btn-secondary"
              onClick={() => {
                disconnectStorylineEdge(node.id, selectedEdgeId);
                selectEdge(null);
              }}
            >
              <Trash2 size={15} />
              Remove this line
            </button>
          )}
          <button
            type="button"
            className="storyline-icon-btn"
            aria-label={expanded ? "Shrink the canvas" : "Fill the window"}
            title={expanded ? "Shrink the canvas (Esc)" : "Fill the window"}
            onClick={() => setExpanded((was) => !was)}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div
        className="storyline-stage"
        ref={stageRef}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onWheel={handleWheel}
      >
        <div className="storyline-scene" style={{ transform: sceneTransform }}>
          <svg
            className="storyline-edges"
            style={{ left: bounds.minX, top: bounds.minY, width: bounds.width, height: bounds.height }}
            viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
          >
            {/* One marker, referenced by every line. Drawn in the same token
                colour the lines take, so a theme that recolours the canvas
                recolours the arrowheads with it rather than leaving them
                behind at the old value. */}
            <defs>
              <marker
                id="storyline-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path className="storyline-arrowhead" d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>

            {edges.map((edge) => (
              // A line is clickable so it can be removed, which means it is a
              // control and not decoration — hence the role and the label. The
              // wide transparent twin underneath is what makes a two-pixel line
              // possible to actually hit.
              <g
                key={edge.id}
                className={`storyline-edge${edge.id === selectedEdgeId ? " storyline-edge-selected" : ""}`}
                role="button"
                tabIndex={0}
                aria-label="A line between two scenes"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  selectEdge(edge.id === selectedEdgeId ? null : edge.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") selectEdge(edge.id);
                }}
              >
                <line className="storyline-edge-hit" x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} />
                <line
                  className="storyline-edge-line"
                  markerEnd="url(#storyline-arrow)"
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                />
              </g>
            ))}

            {/* The line being drawn right now. Decorative — it exists for the
                duration of a pointer gesture and there is nothing to read. */}
            {linking && (
              <line
                className="storyline-edge-line storyline-edge-drawing"
                aria-hidden="true"
                x1={scenes.find((scene) => scene.id === linking.fromId)?.x ?? linking.to.x}
                y1={scenes.find((scene) => scene.id === linking.fromId)?.y ?? linking.to.y}
                x2={linking.to.x}
                y2={linking.to.y}
              />
            )}
          </svg>

          {scenes.map((scene) => {
            const hex = getPaletteHex(scene.color ?? undefined);
            return (
              <div
                key={scene.id}
                className={`storyline-node${scene.id === selectedId ? " storyline-node-selected" : ""}`}
                style={
                  {
                    left: scene.x - STORYLINE_NODE_WIDTH / 2,
                    top: scene.y - STORYLINE_NODE_HEIGHT / 2,
                    ...(hex ? { "--storyline-node-color": hex } : {}),
                  } as React.CSSProperties
                }
              >
                {/* `data-scene-id` is how a dropped line finds what it landed
                    on — see `endLink`, which reads the document because a
                    pointer capture means nothing else is getting events. */}
                <button
                  type="button"
                  className="storyline-node-body"
                  data-scene-id={scene.id}
                  title={scene.name}
                  onPointerDown={(event) => startSceneDrag(event, scene)}
                  onPointerMove={moveSceneDrag}
                  onPointerUp={(event) => endSceneDrag(event, scene)}
                  onPointerCancel={(event) => endSceneDrag(event, scene)}
                  // Only the keyboard's click reaches this — a mouse click is
                  // decided in endSceneDrag, where a press that travelled can
                  // be told from one that did not.
                  onClick={(event) => {
                    if (event.detail === 0) select(scene.id);
                  }}
                  onDoubleClick={() => selectNode(scene.pageId)}
                >
                  <span className="storyline-node-icon">
                    <NodeIcon icon={scene.icon} templateKey={scene.templateKey} size={16} />
                  </span>
                  <span className="storyline-node-name">{scene.name}</span>
                </button>

                {/* Its own element rather than a modifier key on the card: the
                    two things you do to a scene are move it and join it, and
                    telling those apart by whether Shift was held is how half
                    the lines end up drawn by accident. */}
                <button
                  type="button"
                  className="storyline-node-handle"
                  aria-label={`Draw a line from ${scene.name}`}
                  title="Drag to the scene this leads to"
                  onPointerDown={(event) => startLink(event, scene)}
                  onPointerMove={moveLink}
                  onPointerUp={endLink}
                  onPointerCancel={endLink}
                >
                  <Link2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {model.scenes.length === 0 && (
          <p className="storyline-empty">
            Nothing on this storyline yet. Add a scene — it becomes a page inside this one, and you write in it
            like any other. Drag from a scene's handle to the one it leads to.
          </p>
        )}

        {refusal && (
          <p className="storyline-refusal" role="status">
            {refusal}
            <button type="button" className="storyline-refusal-close" aria-label="Dismiss" onClick={() => setRefusal(null)}>
              <X size={13} />
            </button>
          </p>
        )}
      </div>

      {selected && (
        <div className="storyline-selection">
          <span className="storyline-selection-name">{selected.name}</span>
          <button type="button" className="ui-btn ui-btn-secondary" onClick={() => selectNode(selected.pageId)}>
            Open this scene
          </button>
          {/* Says "off the canvas", never "delete": the page keeps existing,
              in the tree, with everything written in it. */}
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={() => {
              removeStorylineNode(node.id, selected.id);
              select(null);
            }}
          >
            Take off the canvas
          </button>
        </div>
      )}

      {/* Read out rather than shown as a number: how far in she is zoomed is
          not something to fix, and a percentage sitting in the corner of a
          canvas is a readout nobody acts on. */}
      <span className="storyline-zoom" aria-live="off">
        {Math.round(zoom * 100)}%
      </span>
    </section>
  );
}
