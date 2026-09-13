// One page on the graph, as a memoised button. Phase 24, big-world pass.
//
// **Split out of GraphOverlay so that the view moving does not redraw every
// page.** The overlay re-renders on every pointer move while panning, every
// wheel tick and every hover; written inline, that rebuilt 835 buttons — each
// resolving its icon — per mouse move on the generated world. Every prop here
// is a primitive or a stable callback, so React's shallow compare finds nothing
// changed on a pan and skips the lot, and a hover re-renders only the dozen
// whose `near` flipped.
//
// **The closures over `drawn` are made here, not in the overlay**, which is the
// whole point: an inline arrow in the parent is a new function on every render
// and would defeat the memo on its own.
import { memo } from "react";
import { getPaletteHex } from "../../constants/palette";
import type { GraphNode } from "../../services/graph-service";
import { NodeIcon } from "../blocks/IconPicker";

type GraphNodeButtonProps = {
  drawn: GraphNode;
  selected: boolean;
  hovered: boolean;
  /** In the neighbourhood of the page in play — itself included — so not dimmed. */
  near: boolean;
  onStartDrag: (event: React.PointerEvent<HTMLElement>, node: GraphNode) => void;
  onMoveDrag: (event: React.PointerEvent<HTMLElement>) => void;
  onEndDrag: (event: React.PointerEvent<HTMLElement>, node: GraphNode) => void;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

export const GraphNodeButton = memo(function GraphNodeButton({
  drawn,
  selected,
  hovered,
  near,
  onStartDrag,
  onMoveDrag,
  onEndDrag,
  onHover,
  onSelect,
}: GraphNodeButtonProps) {
  const hex = getPaletteHex(drawn.color ?? undefined);
  return (
    <button
      type="button"
      className={[
        "page-graph-node",
        drawn.depth === 0 ? "page-graph-node-focus" : "",
        selected ? "page-graph-node-selected" : "",
        hovered ? "page-graph-node-inplay" : "",
        near ? "page-graph-node-near" : "",
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
      onPointerDown={(event) => onStartDrag(event, drawn)}
      onPointerMove={onMoveDrag}
      onPointerUp={(event) => onEndDrag(event, drawn)}
      onPointerCancel={(event) => onEndDrag(event, drawn)}
      onPointerEnter={() => onHover(drawn.id)}
      onPointerLeave={() => onHover(null)}
      // Only the keyboard's click reaches this — a mouse click is decided in
      // endNodeDrag, where a press that travelled can be told from one that
      // did not. `detail` is 0 exactly when the click came from Enter or Space
      // rather than a pointer.
      onClick={(event) => {
        if (event.detail === 0) onSelect(drawn.id);
      }}
    >
      <span className="page-graph-node-disc">
        <NodeIcon icon={drawn.icon} templateKey={drawn.templateKey} size={20} />
      </span>
      <span className="page-graph-node-name">{drawn.name}</span>
    </button>
  );
});
