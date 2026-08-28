// Right-click menu content: New page inside / Rename / Duplicate / Move to /
// Set color / Earlier versions /
// Save as template / Sort sub-pages / Expand all inside / Collapse all inside / Focus here / Hide
// from readers / Set as project home / Show in the file manager / Export /
// Delete. Also reached from the row's own "..." button — see TreeItem.
// Delete is confirmed before it runs — via the
// in-app themed dialog (see shell/ConfirmDialog.tsx), which replaced an
// earlier native window.confirm(). Positioning/portaling is handled by the
// TreePopover wrapper.
import {
  ArrowDownUp,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Crosshair,
  FileStack,
  Eye,
  EyeOff,
  FolderInput,
  FolderOpen,
  History,
  Home,
  Palette,
  Smile,
  PencilLine,
  Pin,
  PinOff,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

type ContextMenuProps = {
  isProjectHome: boolean;
  /** Whether this row is already on the shortcut rail — the item toggles. */
  isPinned: boolean;
  /**
   * Whether the row the menu was opened on is hidden — which is what the item
   * offers to undo. On a multi-selection it applies that answer to the whole
   * selection, the way "Set color" applies one swatch: the row under the
   * pointer is the one whose state is on screen, so it's the one to read.
   */
  isHidden: boolean;
  // How many rows the actions will apply to. Above one, the items that only
  // make sense for a single page (renaming, nesting a new page, designating
  // home, revealing on disk) drop out rather than being shown and quietly
  // doing something surprising.
  selectionCount: number;
  /** The OS's own word for its file manager — see dialog-service. */
  fileManagerName: string;
  /**
   * Whether this row has anything inside it. "Focus here" is hidden when it
   * doesn't: focusing an empty page shows an empty tree with a path bar over
   * it, which looks exactly like the project having disappeared.
   */
  hasChildren: boolean;
  /**
   * Whether this row holds more than one page. Sorting is offered above that
   * rather than above zero: a group of one is already in every order at once,
   * and an item that visibly does nothing is worse than one that isn't there.
   */
  canSort: boolean;
  onRename: () => void;
  onSetIcon: () => void;
  onDuplicate: () => void;
  onMoveTo: () => void;
  onSetColor: () => void;
  onSaveAsTemplate: () => void;
  onSortChildren: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onFocusHere: () => void;
  onToggleProjectHome: () => void;
  onTogglePinned: () => void;
  onToggleHidden: () => void;
  /** Earlier versions of this page (Phase 19). Single selection only. */
  onShowHistory: () => void;
  /**
   * How many copies this page has, or null while the folder is still being
   * read. Shown beside the item so the menu answers "is there anything to go
   * back to" without opening the dialog to find out.
   */
  historyCount: number | null;
  onReveal: () => void;
  onExport: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onClose: () => void;
};

export function ContextMenu({
  isProjectHome,
  isPinned,
  isHidden,
  selectionCount,
  fileManagerName,
  hasChildren,
  canSort,
  onRename,
  onSetIcon,
  onDuplicate,
  onMoveTo,
  onSetColor,
  onSaveAsTemplate,
  onSortChildren,
  onExpandAll,
  onCollapseAll,
  onFocusHere,
  onToggleProjectHome,
  onTogglePinned,
  onToggleHidden,
  onShowHistory,
  historyCount,
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
  //   "Sort sub-pages"   closing after it would shut what it just opened.
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
      {/* Multi-selection included. It used to drop out above one row, which
          read as duplicating being impossible on a selection rather than as
          not having been wired up yet — and copying a run of pages means
          exactly what copying one does, done to each of them. */}
      <button type="button" onClick={() => run(onDuplicate)}>
        <Copy size={13} /> Duplicate
      </button>
      {/* Multi-selection included: filing a run of pages into one folder is
          most of what moving is for, and unlike renaming it means the same
          thing done ten times as it does done once. Sits beside Duplicate
          because it answers the same kind of question — where this page
          lives — rather than what's written in it. */}
      <button type="button" className="tree-context-menu-submenu" onClick={onMoveTo}>
        <FolderInput size={13} /> Move to
        <ChevronRight size={13} className="tree-context-menu-chevron" />
      </button>
      <button type="button" onClick={onSetColor}>
        <Palette size={13} /> Set color
      </button>
      {/* Swaps this popover for the picker, like Set color — so it is bound
          directly rather than through `run`, which would close what it opens.
          Multi-selection included: giving a folder's worth of pages one icon
          is the same errand as giving them one colour. */}
      <button type="button" onClick={onSetIcon}>
        <Smile size={13} /> Set icon
      </button>
      {/* Single selection only. It copies one page's shape, and three pages
          have three shapes — "save these as a template" would have to either
          pick one or make three, and neither is what the click looked like. */}
      {!isMultiple && (
        <button type="button" onClick={() => run(onSaveAsTemplate)}>
          <FileStack size={13} /> Save as template
        </button>
      )}
      {/* Single selection only. Sorting rewrites one group's order, and "sort
          the sub-pages of these three" is three separate reorderings sharing a
          menu click — nothing on screen would show which one went wrong. */}
      {!isMultiple && canSort && (
        <button type="button" className="tree-context-menu-submenu" onClick={onSortChildren}>
          <ArrowDownUp size={13} /> Sort sub-pages
          <ChevronRight size={13} className="tree-context-menu-chevron" />
        </button>
      )}
      {/* Expand/collapse are about what's *inside* the row, so they need
          something in there — and unlike sorting they read fine repeated over a
          selection, which is why they don't drop out above one row. */}
      {hasChildren && (
        <>
          <button type="button" onClick={() => run(onExpandAll)}>
            <ChevronsUpDown size={13} /> Expand all inside
          </button>
          <button type="button" onClick={() => run(onCollapseAll)}>
            <ChevronsDownUp size={13} /> Collapse all inside
          </button>
        </>
      )}
      {/* Single selection only, and only with something inside: focus shows
          the inside of *one* thing, and there's no reading of "focus on these
          three" that isn't just a different feature. */}
      {!isMultiple && hasChildren && (
        <button type="button" onClick={() => run(onFocusHere)}>
          <Crosshair size={13} /> Focus here
        </button>
      )}
      {/* Multi-selection included: hiding a run of pages is most of why anyone
          hides one, and unlike renaming or revealing it means the same thing
          done ten times as it does done once. */}
      <button type="button" onClick={() => run(onToggleHidden)}>
        {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}{" "}
        {isHidden ? "Show to readers" : "Hide from readers"}
      </button>
      {!isMultiple && (
        <button type="button" onClick={() => run(onToggleProjectHome)}>
          <Home size={13} /> {isProjectHome ? "Remove as project home" : "Set as project home"}
        </button>
      )}
      {/* Single selection only. Pinning a run of pages at once would fill the
          rail in one gesture, and the rail's whole value is that it's short —
          it's the handful you reach for, not a second copy of the tree. */}
      {!isMultiple && (
        <button type="button" onClick={() => run(onTogglePinned)}>
          {isPinned ? <PinOff size={13} /> : <Pin size={13} />}{" "}
          {isPinned ? "Remove shortcut" : "Set as shortcut"}
        </button>
      )}
      {/* Single selection only, for the same reason Reveal is: the panel is
          about one page's past, and there is no sensible thing for it to show
          about six of them at once. */}
      {!isMultiple && (
        <button type="button" onClick={() => run(onShowHistory)}>
          <History size={13} /> Earlier versions
          {historyCount !== null && (
            <span className="tree-context-menu-count">{historyCount === 0 ? "none yet" : historyCount}</span>
          )}
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
