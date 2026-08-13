// The picture library's folder chips — the row above both grids that show
// pictures: the sidebar's Assets tab and the picker dialog.
//
// One component in two places on purpose. They are the same list of the same
// folders with the same counts, and two copies would be two places to forget
// that a folder is a *label*, not a location: dropping a picture on a chip
// moves nothing on disk. See services/asset-folders.ts.
//
// **Chips that wrap, not a column of rows.** The sidebar is 180px at its
// narrowest, and a folder list down the side — which is the shape LegendKeeper
// uses, in a window many times wider — would leave the pictures a single
// column. Wrapping chips cost one line until there are enough folders to need
// two.
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ASSET_DRAG_TYPE } from "../../constants/paths";
import type { AssetFolders, FolderFilter } from "../../services/asset-folders";

type Counts = { all: number; unsorted: number; byFolder: Record<string, number> };

export type AssetFolderStripProps = {
  folders: AssetFolders;
  counts: Counts;
  filter: FolderFilter;
  onFilter: (filter: FolderFilter) => void;
  /**
   * Omitted by the Assets tab, which has its own button in the toolbar above.
   * Left in for the picker, where there's no toolbar to put one in — and where
   * the strip appears whether or not any folders exist, because the only way
   * to make the first one has to be somewhere.
   */
  onCreate?: () => void;
  onRename: (id: string, name: string) => void;
  onStartRename: (id: string) => void;
  onDelete: (id: string) => void;
  /** Dropping a picture on a chip files it there. Omitted in the picker. */
  onDropAsset?: (fileName: string, folderId: string | null) => void;
  /** The folder just made, which opens straight into its own name box. */
  renamingId: string | null;
  onRenamingDone: () => void;
};

const sameFilter = (a: FolderFilter, b: FolderFilter): boolean =>
  a.kind === b.kind && (a.kind !== "folder" || b.kind !== "folder" || a.id === b.id);

export function AssetFolderStrip({
  folders,
  counts,
  filter,
  onFilter,
  onCreate,
  onRename,
  onStartRename,
  onDelete,
  onDropAsset,
  renamingId,
  onRenamingDone,
}: AssetFolderStripProps) {
  const selected = filter.kind === "folder" ? folders.folders.find((f) => f.id === filter.id) : undefined;

  return (
    <div className="asset-folders">
      <div className="asset-folders-chips">
        <Chip
          label="All pictures"
          count={counts.all}
          active={filter.kind === "all"}
          onClick={() => onFilter({ kind: "all" })}
          // Dropping on "All pictures" means "take it out of its folder" —
          // there is nowhere else for it to go, and a drop that did nothing
          // would read as a bug rather than as a rule.
          onDropAsset={onDropAsset && ((fileName) => onDropAsset(fileName, null))}
        />
        {/* Only once filing something has actually made a difference. With
            nothing filed yet, Unsorted holds every picture there is, so the
            chip is a second button for the one beside it wearing a different
            name and the same number. */}
        {counts.unsorted > 0 && counts.unsorted < counts.all && (
          <Chip
            label="Unsorted"
            count={counts.unsorted}
            active={filter.kind === "unsorted"}
            onClick={() => onFilter({ kind: "unsorted" })}
            onDropAsset={onDropAsset && ((fileName) => onDropAsset(fileName, null))}
          />
        )}
        {folders.folders.map((folder) =>
          folder.id === renamingId ? (
            <NameBox
              key={folder.id}
              initial={folder.name}
              onCommit={(name) => {
                onRename(folder.id, name);
                onRenamingDone();
              }}
            />
          ) : (
            <Chip
              key={folder.id}
              label={folder.name}
              count={counts.byFolder[folder.id] ?? 0}
              active={sameFilter(filter, { kind: "folder", id: folder.id })}
              onClick={() => onFilter({ kind: "folder", id: folder.id })}
              onDropAsset={onDropAsset && ((fileName) => onDropAsset(fileName, folder.id))}
            />
          ),
        )}
        {onCreate && (
          <button
            type="button"
            className="ui-icon-btn ui-icon-btn-sm asset-folders-new"
            title="New folder"
            aria-label="New folder"
            onClick={onCreate}
          >
            <FolderPlus size={14} />
          </button>
        )}
      </div>

      {/* Rename and delete live here rather than on every chip. A chip is a
          name and a number in a 180px column; three controls inside one would
          leave no room for the name, which is the part you're reading.

          These used to carry the folder's name alongside them, on the reasoning
          that it answered "which one does this delete". It didn't — it printed
          the selected folder's name directly beneath the selected chip bearing
          that same name, and with several folders called "New folder (4)" the
          honest reading was that the folder was in the list twice. Reported
          2026-08-13. The highlighted chip is what says which folder this is;
          the buttons' own tooltips name it for anyone who wants it spelled
          out. */}
      {selected && (
        <div className="asset-folders-actions">
          <button
            type="button"
            className="ui-icon-btn ui-icon-btn-sm"
            title={`Rename ${selected.name}`}
            aria-label={`Rename ${selected.name}`}
            onClick={() => onStartRename(selected.id)}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            className="ui-icon-btn ui-icon-btn-sm"
            title={`Delete ${selected.name}`}
            aria-label={`Delete ${selected.name}`}
            onClick={() => onDelete(selected.id)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  count,
  active,
  onClick,
  onDropAsset,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  onDropAsset?: (fileName: string) => void;
}) {
  const [over, setOver] = useState(false);
  const carries = (event: React.DragEvent): boolean =>
    Array.from(event.dataTransfer.types).includes(ASSET_DRAG_TYPE);

  return (
    <button
      type="button"
      className={`asset-folder-chip${active ? " asset-folder-chip-active" : ""}${over ? " asset-folder-chip-over" : ""}`}
      aria-pressed={active}
      onClick={onClick}
      onDragOver={(event) => {
        if (!onDropAsset || !carries(event)) return;
        // The browser refuses the drop outright without this — `dragover`
        // calling preventDefault is what makes an element a target at all.
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false);
        if (!onDropAsset || !carries(event)) return;
        event.preventDefault();
        const fileName = event.dataTransfer.getData(ASSET_DRAG_TYPE);
        if (fileName) onDropAsset(fileName);
      }}
    >
      <span className="asset-folder-chip-label">{label}</span>
      <span className="asset-folder-chip-count">{count}</span>
    </button>
  );
}

/**
 * The name box a new folder opens into, and the one Rename reopens.
 *
 * Inline rather than a dialog, which is the app's own pattern — a page is
 * renamed in the tree the same way. Enter and blur both commit, Escape leaves
 * the name alone; a folder created and then escaped keeps the default name
 * rather than vanishing, because a control that undoes a *different* action
 * than the one you took is worse than a folder called "New folder".
 */
function NameBox({ initial, onCommit }: { initial: string; onCommit: (name: string) => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      className="asset-folder-name"
      value={value}
      autoFocus
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(value);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCommit(initial);
        }
      }}
    />
  );
}
