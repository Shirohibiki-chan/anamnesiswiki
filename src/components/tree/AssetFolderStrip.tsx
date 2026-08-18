// The picture library's folder tiles — the block above both grids that show
// pictures: the sidebar's Assets tab and the picker dialog.
//
// One component in two places on purpose. They are the same list of the same
// folders with the same counts, and two copies would be two places to forget
// that a folder is a *label*, not a location: dropping a picture on a tile
// moves nothing on disk. See services/asset-folders.ts.
//
// **Tiles in a grid, not chips in a wrapping row.** Chips were the first shape
// and they were wrong for the reason a chip is usually right: they flow, and
// nothing here fits two to a line. A folder's name plus its count is wider than
// half of a 180px sidebar, so every chip claimed a whole row anyway and the
// strip became a column of stretched pills — reported 2026-08-18 with four
// folders filling the panel. A grid says two per row and means it: the name
// ellipsises instead of pushing the row apart, and the count sits under it
// rather than competing for the same line. It widens to three and beyond as
// the sidebar is dragged out, and again in the picker dialog, tracking the
// picture grid below it.
//
// Deliberately no folder icon. At roughly 72px a glyph costs about a third of
// the name, and the name is the part being read.
//
// **In the sidebar it folds down to one line, and starts folded.** Even as
// tiles the folders were taking the top of a panel whose whole job is showing
// pictures — reported 2026-08-18, the day the tiles landed. Shut, it says which
// folder you're in, which is the one thing worth a permanent line; open, every
// folder is there. Choosing one shuts it again, so the ordinary errand costs
// two clicks and no lasting space.
//
// The picker dialog doesn't get the toggle. It's several hundred pixels wide,
// the folders fit on one row there, and it's a dialog you're looking at rather
// than a panel you're working beside.
import { ChevronDown, ChevronRight, FolderPlus, Pencil, Trash2 } from "lucide-react";
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
  /** Dropping a picture on a tile files it there. Omitted in the picker. */
  onDropAsset?: (fileName: string, folderId: string | null) => void;
  /**
   * Folds down to one line saying where you are. The sidebar's, not the
   * picker's — see the note at the top of the file.
   */
  collapsible?: boolean;
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
  collapsible = false,
  renamingId,
  onRenamingDone,
}: AssetFolderStripProps) {
  const selected = filter.kind === "folder" ? folders.folders.find((f) => f.id === filter.id) : undefined;
  const [open, setOpen] = useState(false);
  // A folder just made opens straight into its name box, and that box is one of
  // the tiles — so a rename in progress holds the strip open whatever the
  // toggle says, or the box she's typing into is somewhere she can't see.
  // Derived rather than an effect that opens it: an effect would leave the
  // strip open afterwards, and `open` is then out of step with the chevron.
  const showGrid = !collapsible || open || renamingId !== null;

  const pick = (next: FolderFilter): void => {
    onFilter(next);
    // Choosing is the end of the errand, so the strip gets out of the way
    // again. Only where there's a toggle at all — the picker never folds.
    if (collapsible) setOpen(false);
  };

  // What the shut line says. `selected` is undefined for a folder id that no
  // longer exists, which is a filter left pointing at a deleted folder — the
  // grid shows everything in that case, so the line has to say so too.
  const here =
    filter.kind === "unsorted"
      ? { label: "Unsorted", count: counts.unsorted }
      : filter.kind === "folder" && selected
        ? { label: selected.name, count: counts.byFolder[selected.id] ?? 0 }
        : { label: "All pictures", count: counts.all };

  return (
    <div className="asset-folders">
      {collapsible && (
        <button
          type="button"
          className="asset-folders-toggle"
          aria-expanded={open}
          title={open ? "Hide the folders" : "Show the folders"}
          onClick={() => setOpen((was) => !was)}
          // A picture dragged onto a shut strip opens it, rather than meeting
          // one line that can't file it. The drop still happens on a tile;
          // this only gets the tiles on screen to be dropped on.
          onDragOver={(event) => {
            if (!onDropAsset || !Array.from(event.dataTransfer.types).includes(ASSET_DRAG_TYPE)) return;
            event.preventDefault();
            setOpen(true);
          }}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="asset-folders-toggle-label">{here.label}</span>
          <span className="asset-folders-toggle-count">{here.count}</span>
        </button>
      )}

      {showGrid && (
        <div className="asset-folders-grid">
          <Tile
            label="All pictures"
            count={counts.all}
            active={filter.kind === "all"}
            onClick={() => pick({ kind: "all" })}
            // Dropping on "All pictures" means "take it out of its folder" —
            // there is nowhere else for it to go, and a drop that did nothing
            // would read as a bug rather than as a rule.
            onDropAsset={onDropAsset && ((fileName) => onDropAsset(fileName, null))}
          />
          {/* Only once filing something has actually made a difference. With
              nothing filed yet, Unsorted holds every picture there is, so the
              tile is a second button for the one beside it wearing a different
              name and the same number. */}
          {counts.unsorted > 0 && counts.unsorted < counts.all && (
            <Tile
              label="Unsorted"
              count={counts.unsorted}
              active={filter.kind === "unsorted"}
              onClick={() => pick({ kind: "unsorted" })}
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
              <Tile
                key={folder.id}
                label={folder.name}
                count={counts.byFolder[folder.id] ?? 0}
                active={sameFilter(filter, { kind: "folder", id: folder.id })}
                onClick={() => pick({ kind: "folder", id: folder.id })}
                onDropAsset={onDropAsset && ((fileName) => onDropAsset(fileName, folder.id))}
              />
            ),
          )}
          {/* A cell of its own rather than a small button trailing the last tile,
              which in a grid would leave a ragged half-row wherever it landed. */}
          {onCreate && (
            <button
              type="button"
              className="asset-folder-tile asset-folders-new"
              title="New folder"
              aria-label="New folder"
              onClick={onCreate}
            >
              <FolderPlus size={14} />
            </button>
          )}
        </div>
      )}

      {/* Rename and delete live here rather than on every tile. A tile is a
          name and a number in half of a 180px column; three controls inside one
          would leave no room for the name, which is the part you're reading.

          These used to carry the folder's name alongside them, on the reasoning
          that it answered "which one does this delete". It didn't — it printed
          the selected folder's name directly beneath the selected tile bearing
          that same name, and with several folders called "New folder (4)" the
          honest reading was that the folder was in the list twice. Reported
          2026-08-13. The highlighted tile is what says which folder this is;
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

function Tile({
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
      className={`asset-folder-tile${active ? " asset-folder-tile-active" : ""}${over ? " asset-folder-tile-over" : ""}`}
      aria-pressed={active}
      // The whole name on hover, since the tile shows as much of it as fits and
      // several folders can start with the same word.
      title={label}
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
      <span className="asset-folder-tile-label">{label}</span>
      <span className="asset-folder-tile-count">{count}</span>
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
