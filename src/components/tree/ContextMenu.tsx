// Right-click menu content: Rename / Duplicate / Set color / Delete / Add
// child. Delete is confirmed before it runs — via the in-app themed dialog
// (see shell/ConfirmDialog.tsx), which replaced an earlier native
// window.confirm(). Positioning/portaling is handled by the TreePopover
// wrapper.
import { Copy, Palette, PencilLine, Plus, Trash2 } from "lucide-react";

type ContextMenuProps = {
  canHaveChildren: boolean;
  onRename: () => void;
  onDuplicate: () => void;
  onSetColor: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onClose: () => void;
};

export function ContextMenu({
  canHaveChildren,
  onRename,
  onDuplicate,
  onSetColor,
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
      <button type="button" className="tree-context-menu-danger" onClick={() => run(onDelete)}>
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}
