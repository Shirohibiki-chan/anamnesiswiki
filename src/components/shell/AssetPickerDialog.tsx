// The picture library — every picture the project already has, offered
// wherever one is being chosen. Mounted once at the app root and rendering
// nothing until something asks, the same shape as the dialogs beside it.
//
// **This is what stops the same picture being uploaded six times.** Before it,
// every place that took a picture took a *file*, so one map on six pages meant
// six identical files and six separate things to replace when the map changed.
// Picking here points at the file that's already there. See docs/handoff.md on
// what that costs — every asset delete now has to ask whether anything else
// still wants the file.
//
// Uploading is a way of answering the same question rather than a separate
// path: the new picture joins the library and is picked, so a caller gets a
// filename back either way.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Search } from "lucide-react";
import {
  ALL_PICTURES,
  describeSize,
  describeUses,
  useAssetFolders,
  useAssets,
  useFilteredAssets,
  useUploadPicture,
  type AssetEntry,
  type FolderFilter,
} from "../../hooks/use-assets";
import { AssetFolderStrip } from "../tree/AssetFolderStrip";
import { useDialogs } from "../../hooks/use-dialogs";
import { useNodeImage } from "../../hooks/use-node-image";

export function AssetPickerDialog() {
  const { pendingAssetPick, resolveAssetPick } = useDialogs();
  if (!pendingAssetPick) return null;

  // Split in two so the body is mounted only while the dialog is open. Its
  // search text and selection then start empty every time by construction,
  // rather than by an effect that has to remember to clear them — and
  // `useAssets` re-reads the directory on each open, which is what makes a
  // picture uploaded a minute ago in another tab show up.
  return <AssetPicker title={pendingAssetPick.title} onResolve={resolveAssetPick} />;
}

function AssetPicker({ title, onResolve }: { title: string; onResolve: (fileName: string | null) => void }) {
  const { entries, isLoading, refresh } = useAssets();
  const uploadPicture = useUploadPicture();
  const { folders, createAssetFolder, renameAssetFolder, deleteAssetFolder } = useAssetFolders();
  const [filter, setFilter] = useState<FolderFilter>(ALL_PICTURES);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Escape closes it. On the window rather than the dialog because the grid
  // isn't focused until something in it is clicked, and a dialog you can't
  // dismiss from the keyboard until you've clicked in it is a trap.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onResolve(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResolve]);

  /**
   * Searching by *what's using a picture*, since a filename here is a UUID and
   * matching on one would be a search box that never finds anything. "valera"
   * finds the pictures on her page; "unused" finds the ones going spare.
   */
  // Folder first, then search — so searching inside a folder searches that
  // folder, which is what a folder being *open* has to mean.
  const { shown: inFolder, counts } = useFilteredAssets(entries, folders, filter);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return inFolder;
    return inFolder.filter((entry) => {
      if (entry.isUnused && "unused".startsWith(needle)) return true;
      return entry.uses.some((use) => use.nodeName.toLowerCase().includes(needle));
    });
  }, [inFolder, query]);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    try {
      const fileName = await uploadPicture(file);
      setError(null);
      // Straight out with it. She picked a specific file from her own disk —
      // making her then find it again in the grid and press Confirm would be
      // asking the same question twice.
      onResolve(fileName);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "That picture couldn't be added.");
      refresh();
    }
  }

  return createPortal(
    <div className="ui-backdrop" onClick={() => onResolve(null)}>
      <div className="ui-modal ui-modal-lg asset-picker" onClick={(event) => event.stopPropagation()}>
        <h2 className="asset-picker-title">{title}</h2>

        <div className="asset-picker-search">
          <Search size={12} className="asset-picker-search-icon" />
          <input
            type="text"
            className="asset-picker-search-input"
            placeholder="Search by what’s using it"
            value={query}
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {/* No drop target here: a picture is dragged into a folder from the
            Assets tab, where the grid is the thing you're working in. This
            dialog is open because something is waiting for an answer, and
            reorganising the library is not that answer. Making and renaming
            folders stays, because "this doesn't belong anywhere yet" is a
            thing you notice while looking for a picture. */}
        <AssetFolderStrip
          folders={folders}
          counts={counts}
          filter={filter}
          onFilter={setFilter}
          onCreate={() => {
            const id = createAssetFolder("New folder");
            setFilter({ kind: "folder", id });
            setRenamingId(id);
          }}
          onRename={renameAssetFolder}
          onStartRename={setRenamingId}
          onDelete={(id) => {
            deleteAssetFolder(id);
            setFilter(ALL_PICTURES);
          }}
          renamingId={renamingId}
          onRenamingDone={() => setRenamingId(null)}
        />

        <div className="asset-picker-body">
          {isLoading ? (
            <p className="asset-picker-note">Reading your pictures&hellip;</p>
          ) : entries.length === 0 ? (
            <p className="asset-picker-note">
              No pictures in this world yet. Add one from your computer and it&rsquo;ll be here next time too.
            </p>
          ) : shown.length === 0 ? (
            <p className="asset-picker-note">Nothing matches that.</p>
          ) : (
            <ul className="asset-picker-grid">
              {shown.map((entry) => (
                <PickerTile
                  key={entry.fileName}
                  entry={entry}
                  isSelected={entry.fileName === selected}
                  onSelect={() => setSelected(entry.fileName)}
                  onConfirm={() => onResolve(entry.fileName)}
                />
              ))}
            </ul>
          )}
        </div>

        {error && <p className="asset-picker-error">{error}</p>}

        <div className="asset-picker-actions">
          <button type="button" className="ui-btn ui-btn-secondary" onClick={() => inputRef.current?.click()}>
            <ImagePlus size={13} />
            Add from computer
          </button>
          <span className="asset-picker-spacer" />
          <button type="button" className="ui-btn ui-btn-secondary" onClick={() => onResolve(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            disabled={!selected}
            onClick={() => selected && onResolve(selected)}
          >
            Use this picture
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="asset-picker-file"
          onChange={(event) => {
            void handleUpload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
    </div>,
    document.body,
  );
}

/**
 * One picture in the grid. Double-click confirms, because a picker where the
 * obvious gesture only highlights is one you press Confirm on every single
 * time — and single-click alone can't confirm, or a mis-click on the wrong
 * picture is a decision.
 */
function PickerTile({
  entry,
  isSelected,
  onSelect,
  onConfirm,
}: {
  entry: AssetEntry;
  isSelected: boolean;
  onSelect: () => void;
  onConfirm: () => void;
}) {
  const { url, status } = useNodeImage(entry.fileName);

  return (
    <li>
      <button
        type="button"
        className={`asset-picker-tile${isSelected ? " asset-picker-tile-selected" : ""}`}
        aria-pressed={isSelected}
        title={`${describeUses(entry.uses)} · ${describeSize(entry.size)}`}
        onClick={onSelect}
        onDoubleClick={onConfirm}
      >
        <span className="asset-picker-thumb">
          {status === "ready" && url ? (
            <img src={url} alt="" className="asset-picker-image" />
          ) : (
            <span className="asset-picker-broken">{status === "loading" ? "" : "?"}</span>
          )}
        </span>
        <span className="asset-picker-uses">{describeUses(entry.uses)}</span>
      </button>
    </li>
  );
}
