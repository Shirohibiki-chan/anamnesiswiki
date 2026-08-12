// The sidebar's Assets tab — every picture in the project's `assets/` folder,
// an honest answer to "is anything using this", and the two ways of acting on
// one: add a picture from your computer, and drag a picture onto a page.
//
// **Dragging is the deliberate gesture, and clicking is not.** A tile is a 77px
// square packed six to a screen, so the thing you do while working out what a
// picture *is* must not be the thing that edits your writing — clicking opens
// it full size. Dragging can't happen by accident, so it means what it looks
// like it means. The drop end is hooks/use-asset-drop.ts.
//
// Until now nothing in the app could even list that directory: pictures went in
// when you uploaded one and never came out, so a portrait you replaced six
// times left five files nobody could see or reach. See docs/plan.md Phase 17.
//
// **The delete button only appears on a picture nothing points at.** That's the
// user's own call, on the grounds that deleting one in use fails quietly — the
// page keeps its reference and draws an empty box, with nothing to say why.
// "Remove from every page", which turns a picture in use into one that isn't,
// is the next step of this phase and is what makes that reachable.
//
// It also disappears entirely when the load couldn't read every page, because
// "nothing is using this" is a claim about all of them and one unreadable file
// makes it a guess. That isn't hypothetical: on 2026-08-12 the tab offered to
// delete five pictures, three of which were a live page's portrait and cover —
// two files on disk claimed the same page and only one of them could be kept,
// so the other's pictures fell out of the count. The storage side of that is
// fixed (see `setAsideSupersededCopies`), and this is the belt to its braces:
// whatever the next way of losing a page turns out to be, it must not arrive
// as a delete button.
import { FolderPlus, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ASSET_DRAG_TYPE } from "../../constants/paths";
import {
  ALL_PICTURES,
  describeSize,
  describeUses,
  useAssetActions,
  useAssetFolders,
  useAssets,
  useFilteredAssets,
  useUploadPicture,
  type AssetEntry,
  type FolderFilter,
} from "../../hooks/use-assets";
import { AssetFolderStrip } from "./AssetFolderStrip";
import { useDialogs } from "../../hooks/use-dialogs";
import { useOpenSingleImage } from "../../hooks/use-lightbox";
import { useNodeImage } from "../../hooks/use-node-image";

export function AssetsPanel() {
  const { entries, isLoading, isUsageIncomplete, refresh } = useAssets();
  const { deleteAsset } = useAssetActions();
  const { confirmDestructive } = useDialogs();
  const uploadPicture = useUploadPicture();
  const { folders, createAssetFolder, renameAssetFolder, deleteAssetFolder, setAssetFolder } = useAssetFolders();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FolderFilter>(ALL_PICTURES);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const { shown, counts } = useFilteredAssets(entries, folders, filter);
  const unusedCount = shown.filter((entry) => entry.isUnused).length;

  function handleCreateFolder() {
    const id = createAssetFolder("New folder");
    // Straight into its name box and straight into the folder itself, so the
    // next thing she does — naming it, then dropping pictures in — needs no
    // click in between.
    setFilter({ kind: "folder", id });
    setRenamingId(id);
  }

  async function handleDeleteFolder(id: string) {
    const folder = folders.folders.find((f) => f.id === id);
    if (!folder) return;
    const ok = await confirmDestructive(
      `Delete the folder “${folder.name}”? The pictures in it stay — they go back to Unsorted. You can undo this.`,
    );
    if (!ok) return;
    deleteAssetFolder(id);
    setFilter(ALL_PICTURES);
  }

  async function handleDelete(fileName: string) {
    const ok = await confirmDestructive(
      "Delete this picture? Nothing is using it. You can undo this if it turns out something was.",
    );
    if (!ok) return;
    await deleteAsset(fileName);
    refresh();
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    try {
      const fileName = await uploadPicture(file);
      // Straight into the folder that's open, because that's what having one
      // open means. Adding a picture while looking at "Maps" and finding it in
      // Unsorted would make the folder a filter and not a place.
      if (filter.kind === "folder" && fileName) setAssetFolder(fileName, filter.id);
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "That picture couldn't be added.");
    }
    // After the failure as well as the success: a rejected file changes
    // nothing on disk, but a *partly* written one would, and the grid should
    // show what's actually in the folder either way.
    refresh();
  }

  // Both ways of putting something into the library, as buttons that look like
  // buttons.
  //
  // Adding a picture used to be a bare `.ui-icon-btn` at the end of the count
  // sentence, and those are transparent until they're hovered — deliberately,
  // for a control sitting beside the thing it acts on. It is the wrong shape
  // for the only door into a feature: the tab read as a list you could look at
  // and not touch, and the button went unfound.
  //
  // Outside the loading and empty branches below, because adding a picture is
  // the one thing that has to be reachable when the tab is empty — which is
  // exactly when there's nothing else to click.
  const toolbar = (
    <div className="tree-assets-bar">
      <button
        type="button"
        className="ui-btn ui-btn-secondary tree-assets-add"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus size={14} />
        Add picture
      </button>
      {/* Its own control up here rather than the last item in the row of folder
          chips. Down there it sat immediately after a folder called "New
          folder" — a chip and a button, same size, one of them named after
          what the other one does. */}
      <button
        type="button"
        className="ui-btn ui-btn-secondary tree-assets-new-folder"
        title="Make a folder"
        aria-label="Make a folder"
        onClick={handleCreateFolder}
      >
        <FolderPlus size={14} />
      </button>
      {/* Value cleared on every pick, so choosing the same file twice in a row
          still fires a change event the second time. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void handleUpload(file);
        }}
      />
    </div>
  );

  return (
    <div className="tree-assets">
      {toolbar}
      <p className="tree-assets-note tree-assets-count">
        {isLoading
          ? "Reading your pictures…"
          : `${shown.length} ${shown.length === 1 ? "picture" : "pictures"}${
              !isUsageIncomplete && unusedCount > 0 ? ` · ${unusedCount} used by nothing` : ""
            }`}
      </p>
      {/* No folders means nothing to filter by, so the strip would be one chip
          saying "All pictures" above every picture. The way to make the first
          one is in the toolbar, not in here. */}
      {folders.folders.length > 0 && (
        <AssetFolderStrip
          folders={folders}
          counts={counts}
          filter={filter}
          onFilter={setFilter}
          onRename={renameAssetFolder}
          onStartRename={setRenamingId}
          onDelete={handleDeleteFolder}
          onDropAsset={setAssetFolder}
          renamingId={renamingId}
          onRenamingDone={() => setRenamingId(null)}
        />
      )}
      {/* Only this part scrolls. The toolbar, the count and the folders stay
          put — everything above used to scroll away with the grid, so the way
          to add a picture or change folder disappeared the moment you went
          looking through the pictures. */}
      <div className="tree-assets-scroll">
        {error && <p className="tree-assets-note tree-assets-error">{error}</p>}
        {isUsageIncomplete && (
          <p className="tree-assets-note tree-assets-warning">
            One of your pages wouldn&rsquo;t open, so this can&rsquo;t say for certain what&rsquo;s using what. Deleting
            is off until it can.
          </p>
        )}
        {!isLoading && shown.length === 0 && (
          <p className="tree-assets-note">
            {entries.length === 0
              ? "No pictures yet. Add one with the button above, or upload one as a page’s portrait or cover — they all land here."
              : "Nothing in here yet. Drag a picture onto this folder’s name to file it."}
          </p>
        )}
        <ul className="tree-assets-grid">
          {shown.map((entry) => (
            <AssetTile key={entry.fileName} entry={entry} onDelete={handleDelete} usageIsCertain={!isUsageIncomplete} />
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * One picture: the thumbnail, and under it what's using it rather than what
 * it's called — the filename is a UUID, which identifies it to the app and to
 * nobody else. The picture is the label here; the caption is the part you
 * couldn't have worked out by looking.
 *
 * `title` carries the long version, because "3 pages" is the answer you scan
 * for and "Valera, The Amber Coast, Her Sword" is the one you want once you've
 * found the picture you care about.
 */
function AssetTile({
  entry,
  onDelete,
  usageIsCertain,
}: {
  entry: AssetEntry;
  onDelete: (fileName: string) => void;
  /** False when a page didn't load, which makes `isUnused` a guess. */
  usageIsCertain: boolean;
}) {
  const { url, status } = useNodeImage(entry.fileName);
  const openImage = useOpenSingleImage();
  const names = [...new Set(entry.uses.map((use) => use.nodeName))];
  // "Not used anywhere" is a much stronger sentence than the app can back up
  // when a page didn't load, and it's the one she'd act on. Softened rather
  // than hidden: the picture is still there and still worth showing.
  const unknown = names.length === 0 && !usageIsCertain;
  const detail = names.length > 0 ? `Used by ${names.join(", ")}` : unknown ? "Not sure yet" : "Not used anywhere";

  return (
    <li
      className={`tree-assets-tile${entry.isUnused ? " tree-assets-tile-unused" : ""}`}
      title={detail}
      // Dragging one onto a page puts it there — the deliberate gesture that
      // *clicking* isn't (see below). It carries the filename under a type of
      // our own rather than as text, so nothing else in the app can mistake it
      // for a dropped word; hooks/use-asset-drop.ts is the other end.
      //
      // A file that hasn't read isn't draggable, because the drop would write a
      // reference to something that doesn't work and the empty box would turn
      // up on the page rather than here.
      draggable={status === "ready"}
      onDragStart={(event) => {
        event.dataTransfer.setData(ASSET_DRAG_TYPE, entry.fileName);
        event.dataTransfer.effectAllowed = "copy";
      }}
    >
      {/* Clicking opens it full size, in the same viewer a picture inside a
          page opens in. Deliberately *not* "put this on the page you're
          looking at": these are 77px squares packed six to a screen, and a
          gesture that edits your writing shouldn't be the one you make while
          trying to see what something is. Dragging is the deliberate version of
          that, and the picture block's own Library tab is the other route. */}
      <div className="tree-assets-thumb">
        {status === "ready" && url ? (
          // Not draggable itself: an `<img>` is a drag source by default, and
          // its drag carries the picture's own data rather than ours. It sits
          // under the overlay button so the pointer never reaches it anyway,
          // but the whole tile being the drag source shouldn't depend on that
          // stacking staying exactly as it is.
          <img src={url} alt="" className="tree-assets-image" draggable={false} />
        ) : (
          // A file that won't read is still a file taking up room, so it stays
          // in the grid. Saying so beats an empty square that reads as a
          // picture still loading.
          <span className="tree-assets-broken">{status === "loading" ? "" : "?"}</span>
        )}

        {/* An empty button laid over the picture rather than a click handler on
            the picture itself, so the thing you click is focusable and reachable
            by keyboard. It has to be a sibling of the delete button below and
            not its parent — a button inside a button is invalid, and the browser
            drops one of them. */}
        <button
          type="button"
          className="tree-assets-open"
          aria-label={`Open this picture full size — ${detail}`}
          disabled={status !== "ready" || !url}
          onClick={() => url && openImage(url, "")}
        />

        {/* Sits on the picture's top corner, and stays there — see the CSS for
            why it isn't revealed on hover the way the tree rows' controls are.
            On the picture rather than beside it because a grid this narrow has
            no spare width to give a button its own column. After the overlay in
            the DOM so it takes the clicks in the corner it covers. */}
        {entry.isUnused && usageIsCertain && (
          <button
            type="button"
            className="tree-assets-delete"
            title="Delete this picture"
            aria-label="Delete this picture"
            onClick={() => void onDelete(entry.fileName)}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <span className="tree-assets-text">
        <span className="tree-assets-uses">{unknown ? "Not sure yet" : describeUses(entry.uses)}</span>
        <span className="tree-assets-size">{describeSize(entry.size)}</span>
      </span>
    </li>
  );
}
