// Right-click menu content: Rename / Duplicate / Set color / Set as project
// home / Delete / Add child. Delete is confirmed before it runs — via the
// in-app themed dialog (see shell/ConfirmDialog.tsx), which replaced an
// earlier native window.confirm(). Positioning/portaling is handled by the
// TreePopover wrapper.
import { Copy, Home, Palette, PencilLine, Plus, Trash2 } from "lucide-react";

type ContextMenuProps = {
  canHaveChildren: boolean;
  isProjectHome: boolean;
  onRename: () => void;
  onDuplicate: () => void;
  onSetColor: () => void;
  onToggleProjectHome: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onClose: () => void;
};

export function ContextMenu({
  canHaveChildren,
  isProjectHome,
  onRename,
  onDuplicate,
  onSetColor,
  onToggleProjectHome,
  onDelete,
  onAddChild,
  onClose,
}: ContextMenuProps) {
  function run(action: () => void) {
    action();
    onClose();
  }

  return (
    <div className="tree-context-menu">
      {canHaveChildren && (
        <button type="button" onClick={() => run(onAddChild)}>
          <Plus size={13} /> Add child
        </button>
      )}
      <button type="button" onClick={() => run(onRename)}>
        <PencilLine size={13} /> Rename
      </button>
      <button type="button" onClick={() => run(onDuplicate)}>
        <Copy size={13} /> Duplicate
      </button>
      <button type="button" onClick={onSetColor}>
        <Palette size={13} /> Set color
      </button>
      <button type="button" onClick={() => run(onToggleProjectHome)}>
        <Home size={13} /> {isProjectHome ? "Remove as project home" : "Set as project home"}
      </button>
      <button type="button" className="tree-context-menu-danger" onClick={() => run(onDelete)}>
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}
