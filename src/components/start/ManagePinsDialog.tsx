// Pinning and rearranging, in one window.
//
// **The row itself doesn't reorder by dragging, and that is the point of this.**
// A 150px card that can scroll out from under the cursor is the worst drag
// target on the screen — you are aiming at a moving thing inside a thing that
// moves. So the row stays a row, and arranging happens here, against full-width
// rows that hold still.
//
// Both halves in one window for the same reason: pinning something and deciding
// where it goes is one intention, and splitting it across two trips is how you
// get a feature nobody uses twice.
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pin, X } from "lucide-react";
import { useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useProjectCoverUrl } from "../../hooks/use-project-cover";
import { coverFor, coverGradient } from "../../services/project-covers";
import { timeAgo } from "../../services/relative-time";
import type { ListedWorld } from "../../services/world-scan";

type ManagePinsDialogProps = {
  pinned: ListedWorld[];
  unpinned: ListedWorld[];
  now: number;
  onPin: (project: ListedWorld) => void;
  onUnpin: (project: ListedWorld) => void;
  onReorder: (from: number, to: number) => void;
  onClose: () => void;
};

export function ManagePinsDialog({
  pinned,
  unpinned,
  now,
  onPin,
  onUnpin,
  onReorder,
  onClose,
}: ManagePinsDialogProps) {
  // 4px before a drag starts, the same threshold the templates panel and the
  // tab strip use — the grip is small, and a press that moves a pixel is a
  // click rather than a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = pinned.findIndex((project) => project.path === active.id);
    const to = pinned.findIndex((project) => project.path === over.id);
    if (from === -1 || to === -1) return;
    onReorder(from, to);
  }

  return createPortal(
    <div className="ui-backdrop" onClick={onClose}>
      <div className="ui-modal manage-pins" onClick={(event) => event.stopPropagation()}>
        <header className="manage-pins-head">
          <h2>Pinned Projects</h2>
          <p>Drag to reorder. Pinned projects stay at the top of the start screen.</p>
          <button type="button" className="ui-icon-btn manage-pins-close" aria-label="Close" onClick={onClose}>
            <X size={15} />
          </button>
        </header>

        <div className="manage-pins-body">
          {pinned.length === 0 ? (
            <p className="manage-pins-empty">
              Nothing is pinned yet. Pick a project below and it goes to the top of the start screen.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={pinned.map((project) => project.path)} strategy={verticalListSortingStrategy}>
                <ol className="manage-pins-list">
                  {pinned.map((project, index) => (
                    <PinnedRowItem
                      key={project.path}
                      project={project}
                      position={index + 1}
                      now={now}
                      onUnpin={() => onUnpin(project)}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          <h3 className="manage-pins-subhead">Everything else</h3>
          {unpinned.length === 0 ? (
            <p className="manage-pins-empty">Every project you have is pinned.</p>
          ) : (
            <ul className="manage-pins-grid">
              {unpinned.map((project) => (
                <UnpinnedCover key={project.path} project={project} onPin={() => onPin(project)} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * One project in "Everything else", not yet pinned. Its own component, not
 * inline JSX inside the `.map` that renders it, because `useProjectCoverUrl`
 * is a hook and hooks can't run inside a loop.
 */
function UnpinnedCover({ project, onPin }: { project: ListedWorld; onPin: () => void }) {
  const coverUrl = useProjectCoverUrl(project.path, project.coverImage);
  return (
    <li>
      <button type="button" className="manage-pins-cover" title={project.path} aria-label={`Pin ${project.name}`} onClick={onPin}>
        <span
          className="manage-pins-cover-art"
          style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : coverGradient(coverFor(project)) }}
        />
        <span className="manage-pins-cover-pin" aria-hidden>
          <Pin size={13} />
        </span>
        <span className="manage-pins-cover-name">{project.name}</span>
      </button>
    </li>
  );
}

/**
 * One pinned project as a full-width row.
 *
 * The grip carries the drag listeners rather than the whole row, for the reason
 * the templates panel gives about its own: the row holds a button, and a press
 * that moved a little would stop counting as a click on it.
 */
function PinnedRowItem({
  project,
  position,
  now,
  onUnpin,
}: {
  project: ListedWorld;
  position: number;
  now: number;
  onUnpin: () => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: project.path,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };
  const coverUrl = useProjectCoverUrl(project.path, project.coverImage);
  const when = timeAgo(project.activeAt || null, now);

  return (
    <li className="manage-pins-row" ref={setNodeRef} style={style} {...attributes}>
      <span className="manage-pins-grip" title="Drag to reorder" {...listeners}>
        <GripVertical size={13} />
      </span>
      <span className="manage-pins-position">{position}</span>
      <span
        className="manage-pins-thumb"
        style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : coverGradient(coverFor(project)) }}
      />
      <span className="manage-pins-name">
        <b>{project.name}</b>
        {when && <em>{when}</em>}
      </span>
      <button
        type="button"
        className="ui-icon-btn manage-pins-unpin"
        aria-label={`Unpin ${project.name}`}
        title="Unpin"
        onClick={onUnpin}
      >
        <X size={14} />
      </button>
    </li>
  );
}
