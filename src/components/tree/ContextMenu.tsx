// Right-click menu content: New page inside / Rename / Duplicate / Set color /
// Set as project home / Show in the file manager / Delete. Delete is confirmed before it runs — via the
// in-app themed dialog (see shell/ConfirmDialog.tsx), which replaced an
// earlier native window.confirm(). Positioning/portaling is handled by the
// TreePopover wrapper.
import { Copy, FolderOpen, Home, Palette, PencilLine, Plus, Trash2, Upload } from "lucide-react";

type ContextMenuProps = {
  canHaveChildren: boolean;
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
  canHaveChildren,
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
  // out of the way. Not every item is one of those: "New page inside" and "Set
  // color" swap this popover's contents for a picker instead, so closing after
  // them shuts the thing they just opened. Both are therefore bound directly,
  // and adding a new item means deciding which kind it is.
  //
  // "New page inside" was wrapped in here from Phase 3 until 2026-08-10, which
  // set the picker and unset it in the same batch and made the item look inert.
  // It went unnoticed for as long as it did because the row's own "+" opens the
  // same picker correctly, so the feature was never missing — only that route
  // to it.
  function run(action: () => void) {
    action();
    onClose();
  }

  const isMultiple = selectionCount > 1;

  return (
    <div className="tree-context-menu">
      {isMultiple && <div className="tree-context-menu-heading">{selectionCount} pages selected</div>}

      {canHaveChildren && !isMultiple && (
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
