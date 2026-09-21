// The Layers panel: everything on the board, top to bottom, as rows the
// hand can select, drag and mark (Phase 32, step 15). The list itself is
// read by services/board-layers.ts; this is the rows.
//
// **The app's own panel, on the right, and only there.** The library's
// styles panel has four Layers buttons that act on the selection and show
// nothing; this shows the order, which is what a list is for. It sits on
// the board's right-hand side whether the board is in the page or
// expanded — one place, never moving by state — while a page viewed
// beside the board (step 6) sits on the left. Rows are dragged with dnd-kit
// as the page's tabs are, for the same reason: the other rows slide out of
// the way, which is what makes a reorder feel like one.
//
// **A page card's row is named by its page, live.** The row carries the
// page's id and looks the name up, so a rename in the tree shows here at
// once — a name copied into the row would be stale by the next edit.
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bookmark,
  Circle,
  Diamond,
  Eye,
  EyeOff,
  FileX,
  Film,
  Frame,
  Highlighter,
  Image,
  Lock,
  LockOpen,
  Minus,
  MoveRight,
  Pencil,
  Shapes,
  Square,
  StickyNote,
  Type,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useNode } from "../../hooks/use-project";
import { type BoardLayer, type LayerKind, layerKindName } from "../../services/board-layers";
import { NodeIcon } from "../blocks/IconPicker";

type Props = {
  layers: BoardLayer[];
  /** The ids of the selected shapes, so their rows read as selected. */
  selectedIds: ReadonlySet<string>;
  /** A row clicked: select its shape, or with Shift add it to the selection. */
  onSelect: (id: string, additive: boolean) => void;
  /** A row dropped on another: put its shape just above or below that one. */
  onMove: (movedId: string, targetId: string, side: "above" | "below") => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onClose: () => void;
  /** A move the panel would not make, said once and briefly. */
  notice: string | null;
};

export function BoardLayersPanel({ layers, selectedIds, onSelect, onMove, onToggleHidden, onToggleLocked, onClose, notice }: Props) {
  // The keyboard lifts a row with Space and drops it with Space, so Enter
  // is left to mean what it means on a row: select.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = layers.findIndex((layer) => layer.id === active.id);
    const to = layers.findIndex((layer) => layer.id === over.id);
    if (from === -1 || to === -1) return;
    // Dragged down the list is dropped below the row it landed on; up, above.
    onMove(String(active.id), String(over.id), from < to ? "below" : "above");
  }

  return (
    <aside className="board-layers-panel" data-testid="board-layers-panel" aria-label="Layers">
      <div className="board-layers-bar">
        <span className="board-layers-title">Layers</span>
        <button type="button" className="board-layers-close" onClick={onClose} title="Close" aria-label="Close the Layers panel">
          <X size={16} />
        </button>
      </div>
      {layers.length === 0 ? (
        <p className="board-layers-empty">Nothing on this board yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={layers.map((layer) => layer.id)} strategy={verticalListSortingStrategy}>
            <div className="board-layers-list" role="list">
              {layers.map((layer) => (
                <LayerRow
                  key={layer.id}
                  layer={layer}
                  selected={selectedIds.has(layer.id)}
                  onSelect={(additive) => onSelect(layer.id, additive)}
                  onToggleHidden={() => onToggleHidden(layer.id)}
                  onToggleLocked={() => onToggleLocked(layer.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {notice && (
        <p className="board-layers-notice" role="status">
          {notice}
        </p>
      )}
    </aside>
  );
}

type RowProps = {
  layer: BoardLayer;
  selected: boolean;
  onSelect: (additive: boolean) => void;
  onToggleHidden: () => void;
  onToggleLocked: () => void;
};

function LayerRow({ layer, selected, onSelect, onToggleHidden, onToggleLocked }: RowProps) {
  const page = useNode(layer.pageId);
  const name = layer.pageId ? (page?.name ?? "A page that is gone") : layer.name;
  // Grabbing anywhere on the row starts a drag once the pointer has moved
  // past the sensor's distance; a plain click on the name or a mark still
  // fires as a click. The page's tabs do the same.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layer.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="board-layer"
      data-testid="board-layer"
      data-id={layer.id}
      data-kind={layer.kind}
      data-selected={selected ? "true" : "false"}
      data-hidden={layer.hidden ? "true" : "false"}
      data-locked={layer.locked ? "true" : "false"}
      data-in-frame={layer.frameId !== null ? "true" : "false"}
      {...attributes}
      {...listeners}
      // After the sortable's own attributes: it names the row a button, and
      // a row in a list is a row. Its key handler is kept — Space lifts.
      role="listitem"
      onKeyDown={(event) => {
        listeners?.onKeyDown?.(event);
        if (event.key === "Enter" && event.target === event.currentTarget) {
          event.preventDefault();
          onSelect(event.shiftKey);
        }
      }}
    >
      <button
        type="button"
        className="board-layer-name"
        tabIndex={-1}
        onClick={(event) => onSelect(event.shiftKey)}
        title={layer.pageId ? `${name} — a page card` : `${name} — ${layerKindName(layer.kind).toLowerCase()}`}
      >
        <span className="board-layer-icon" aria-hidden="true">
          {layer.pageId ? page ? <NodeIcon icon={page.icon} templateKey={page.templateKey} size={14} /> : <FileX size={14} /> : kindIcon(layer.kind)}
        </span>
        <span className="board-layer-label">{name}</span>
      </button>
      <button
        type="button"
        className="board-layer-toggle board-layer-eye"
        aria-pressed={layer.hidden}
        onClick={onToggleHidden}
        title={layer.hidden ? "Show" : "Hide"}
        aria-label={layer.hidden ? `Show ${name}` : `Hide ${name}`}
      >
        {layer.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      {/* Hidden is locked already; the eye says so, and one mark is enough. */}
      {!layer.hidden && (
        <button
          type="button"
          className="board-layer-toggle board-layer-lock"
          aria-pressed={layer.locked}
          onClick={onToggleLocked}
          title={layer.locked ? "Unlock" : "Lock"}
          aria-label={layer.locked ? `Unlock ${name}` : `Lock ${name}`}
        >
          {layer.locked ? <Lock size={14} /> : <LockOpen size={14} />}
        </button>
      )}
    </div>
  );
}

function kindIcon(kind: LayerKind): ReactNode {
  const size = 14;
  switch (kind) {
    case "bookmark":
      return <Bookmark size={size} />;
    case "note":
      return <StickyNote size={size} />;
    case "video":
      return <Film size={size} />;
    case "text":
      return <Type size={size} />;
    case "picture":
      return <Image size={size} />;
    case "frame":
      return <Frame size={size} />;
    case "rectangle":
      return <Square size={size} />;
    case "ellipse":
      return <Circle size={size} />;
    case "diamond":
      return <Diamond size={size} />;
    case "arrow":
      return <MoveRight size={size} />;
    case "line":
      return <Minus size={size} />;
    case "drawing":
      return <Pencil size={size} />;
    case "highlight":
      return <Highlighter size={size} />;
    default:
      return <Shapes size={size} />;
  }
}
