// Right-click menu content: New page inside / Rename / Duplicate / Set color /
// Set as project home / Show in the file manager / Delete. Delete is confirmed before it runs — via the
// in-app themed dialog (see shell/ConfirmDialog.tsx), which replaced an
// earlier native window.confirm(). Positioning/portaling is handled by the
// TreePopover wrapper.
import { Copy, FolderOpen, Home, Palette, PencilLine, Plus, Trash2, Upload } from "lucide-react";

type ContextMenuProps = {
  isProjectHome: boolean;
  // How many rows the actions will apply to. Above one, the items that only
  // make sense for a single page (renaming, duplicating, nesting a new page,
  // designating home, revealing on disk) drop out rather than being shown and
  // quietly doing something surprising.
  selectionCount: number;
  /** The OS's own word for its file manager — see dialog-service. */
  fileManagerName: string;
  onRename: () => void;
  onDuplicate: () => void;
  onSetColor: () => void;
  onToggleProjectHome: () => void;
  onReveal: () => void;
  onExport: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onClose: () => void;
};

export function ContextMenu({
  isProjectHome,
  selectionCount,
  fileManagerName,
  onRename,
  onDuplicate,
  onSetColor,
  onToggleProjectHome,
  onReveal,
  onExport,
  onDelete,
  onAddChild,
  onClose,
}: ContextMenuProps) {
  // Wraps the actions that *finish* here — the menu has done its job and gets
  // out of the way. Two items are bound directly instead, and adding a new one
  // means deciding which kind it is:
  //
  //   "Set color"        swaps this popover's contents for the picker, so
  //                      closing after it would shut what it just opened.
  //   "New page inside"  is shared with the row's own "+" button and closes
  //                      the menu from inside its own handler.
  //
  // "New page inside" was wrapped in here from Phase 3 until 2026-08-10, back
  // when it opened a picker: it set the picker and unset it in the same batch,
  // which made the item look inert.
  function run(action: () => void) {
    action();
    onClose();
  }

  const isMultiple = selectionCount > 1;

  return (
    <div className="tree-context-menu">
      {isMultiple && <div className="tree-context-menu-heading">{selectionCount} pages selected</div>}

      {!isMultiple && (
        <button type="button" onClick={onAddChild}>
          <Plus size={13} /> New page inside
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
      {/* Single selection only: revealing several rows at once means several
          file manager windows, and rows in different folders can't be shown
          together anyway. */}
      {!isMultiple && (
        <button type="button" onClick={() => run(onReveal)}>
          <FolderOpen size={13} /> Show in {fileManagerName}
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
