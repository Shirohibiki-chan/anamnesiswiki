// Tab strip beneath the page title. Hidden tabs (GM-only content) render
// dimmer and italic; the eye icon toggles visibility. Phase 7 added tab
// management on top of a template's starting set: a "+" to add a tab,
// double-click a label to rename it, a hover-revealed delete (confirmed,
// since a tab's content isn't recoverable), and drag-to-reorder via a
// dedicated grip handle. Reordering uses dnd-kit rather than plain HTML5
// drag-and-drop — a first pass with raw dragstart/dragover/drop worked but
// felt stiff (no live reflow preview, binary highlight, imprecise insert
// position); dnd-kit's sortable preset animates the other tabs sliding out
// of the way as you drag, which is what "feels smooth" actually requires.
// The grip is its own small non-button element (not the whole tab) so
// clicking the label/eye/delete buttons is unaffected.
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Plus, X } from "lucide-react";
import type { Tab } from "../../constants/schema";
import { useDialogs } from "../../hooks/use-dialogs";

type PageTabsProps = {
  tabs: Tab[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onToggleHidden: (tabId: string) => void;
  onAdd: () => void;
  onRename: (tabId: string, label: string) => void;
  onDelete: (tabId: string) => void;
  onReorder: (orderedTabIds: string[]) => void;
};

export function PageTabs({ tabs, activeTabId, onSelect, onToggleHidden, onAdd, onRename, onDelete, onReorder }: PageTabsProps) {
  const { confirmDestructive } = useDialogs();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function commit(tab: Tab, value: string) {
    const trimmed = value.trim();
    if (trimmed && trimmed !== tab.label) onRename(tab.id, trimmed);
    setEditingTabId(null);
  }

  async function handleDelete(tab: Tab) {
    if (await confirmDestructive(`Delete the "${tab.label}" tab? This can't be undone.`)) onDelete(tab.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
    const newIndex = tabs.findIndex((tab) => tab.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(tabs, oldIndex, newIndex).map((tab) => tab.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tabs.map((tab) => tab.id)} strategy={horizontalListSortingStrategy}>
        <div className="page-tabs">
          {tabs.map((tab) => (
            <SortableTab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              isEditing={editingTabId === tab.id}
              onSelect={() => onSelect(tab.id)}
              onStartRename={() => setEditingTabId(tab.id)}
              onCommitRename={(value) => commit(tab, value)}
              onToggleHidden={() => onToggleHidden(tab.id)}
              onDelete={() => void handleDelete(tab)}
            />
          ))}
          <button type="button" className="ui-icon-btn ui-icon-btn-sm page-tab-add" title="Add a tab" onClick={onAdd}>
            <Plus size={13} />
          </button>
        </div>
      </SortableContext>
    </DndContext>
  );
}

type SortableTabProps = {
  tab: Tab;
  isActive: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: (value: string) => void;
  onToggleHidden: () => void;
  onDelete: () => void;
};

function SortableTab({ tab, isActive, isEditing, onSelect, onStartRename, onCommitRename, onToggleHidden, onDelete }: SortableTabProps) {
  // Grabbing anywhere on the tab (not just a dedicated handle) starts a
  // drag — dnd-kit's PointerSensor only commits to a drag once the pointer
  // moves past its activation distance, so a plain click on the label/eye/
  // delete buttons still fires normally. Disabled while renaming so a text
  // selection drag inside the input can't be mistaken for a reorder.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
    disabled: isEditing,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`page-tab${isActive ? " page-tab-active" : ""}${tab.hidden ? " page-tab-hidden" : ""}`}
      {...attributes}
      {...listeners}
    >
      {!isEditing && (
        <span className="page-tab-grip" title="Drag to reorder">
          <GripVertical size={12} />
        </span>
      )}
      {isEditing ? (
        <input
          className="page-tab-input"
          defaultValue={tab.label}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => onCommitRename(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              e.currentTarget.value = tab.label;
              e.currentTarget.blur();
            }
          }}
        />
      ) : (
        <button type="button" className="page-tab-label" onClick={onSelect} onDoubleClick={onStartRename}>
          {tab.label}
        </button>
      )}
      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-sm page-tab-eye"
        title={tab.hidden ? "Hidden — click to reveal" : "Visible — click to hide"}
        onClick={onToggleHidden}
      >
        {tab.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      <button type="button" className="ui-icon-btn ui-icon-btn-sm page-tab-delete" title="Delete tab" onClick={onDelete}>
        <X size={12} />
      </button>
    </div>
  );
}
