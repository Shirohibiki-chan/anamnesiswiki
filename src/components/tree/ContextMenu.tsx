// Right-click menu content: Rename / Duplicate / Set color / Set as project
// home / Delete / Add child. Delete is confirmed before it runs — via the
// in-app themed dialog (see shell/ConfirmDialog.tsx), which replaced an
// earlier native window.confirm(). Positioning/portaling is handled by the
// TreePopover wrapper.
import { Copy, Home, Palette, PencilLine, Plus, Trash2, Upload } from "lucide-react";

type ContextMenuProps = {
  canHaveChildren: boolean;
  isProjectHome: boolean;
  // How many rows the actions will apply to. Above one, the items that only
  // make sense for a single page (renaming, duplicating, adding a child,
  // designating home) drop out rather than being shown and quietly doing
  // something surprising.
  selectionCount: number;
  onRename: () => void;
  onDuplicate: () => void;
  onSetColor: () => void;
  onToggleProjectHome: () => void;
  onExport: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onClose: () => void;
};

export function ContextMenu({
  canHaveChildren,
  isProjectHome,
  selectionCount,
  onRename,
  onDuplicate,
  onSetColor,
  onToggleProjectHome,
  onExport,
  onDelete,
  onAddChild,
  onClose,
}: ContextMenuProps) {
  function run(action: () => void) {
    action();
    onClose();
  }

  const isMultiple = selectionCount > 1;

  return (
    <div className="tree-context-menu">
      {isMultiple && <div className="tree-context-menu-heading">{selectionCount} pages selected</div>}

      {canHaveChildren && !isMultiple && (
        <button type="button" onClick={() => run(onAddChild)}>
          <Plus size={13} /> Add child
        </button>
      )}
      {!isMultiple && (
        <button type="button" onClick={() => run(onRename)}>
          <PencilLine size={13} /> Rename
        </button>
      )}
      {!isMultiple && (
        <button type="button" onClick={() => run(onDuplicate)}>
          <Copy size={13} /> Duplicate
        </button>
      )}
      <button type="button" onClick={onSetColor}>
        <Palette size={13} /> Set color
      </button>
      {!isMultiple && (
        <button type="button" onClick={() => run(onToggleProjectHome)}>
          <Home size={13} /> {isProjectHome ? "Remove as project home" : "Set as project home"}
        </button>
      )}
      <button type="button" onClick={() => run(onExport)}>
        <Upload size={13} /> Export to LegendKeeper
      </button>
      <button type="button" className="tree-context-menu-danger" onClick={() => run(onDelete)}>
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}
