// Right-click menu content: Rename / Duplicate / Set color / Delete / Add
// child. No confirm-dialog component exists yet (that's a later phase), so
// Delete uses a native window.confirm() as a safety net against accidental
// data loss. Positioning/portaling is handled by the TreePopover wrapper.
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
