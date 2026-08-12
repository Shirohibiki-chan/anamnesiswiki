// The sidebar's Assets tab — every picture in the project's `assets/` folder,
// and an honest answer to "is anything using this".
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
import { Trash2 } from "lucide-react";
import { describeSize, describeUses, useAssetActions, useAssets, type AssetEntry } from "../../hooks/use-assets";
import { useDialogs } from "../../hooks/use-dialogs";
import { useNodeImage } from "../../hooks/use-node-image";

export function AssetsPanel() {
  const { entries, isLoading, refresh } = useAssets();
  const { deleteAsset } = useAssetActions();
  const { confirmDestructive } = useDialogs();

  const unusedCount = entries.filter((entry) => entry.isUnused).length;

  async function handleDelete(fileName: string) {
    const ok = await confirmDestructive(
      "Delete this picture? Nothing is using it. You can undo this if it turns out something was.",
    );
    if (!ok) return;
    await deleteAsset(fileName);
    refresh();
  }

  if (isLoading) {
    return <p className="tree-assets-note">Reading your pictures&hellip;</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="tree-assets-note">
        No pictures yet. Anything you upload as a page&rsquo;s portrait or cover, or drop into a page, lands here.
      </p>
    );
  }

  return (
    <div className="tree-assets">
      <p className="tree-assets-note">
        {entries.length} {entries.length === 1 ? "picture" : "pictures"}
        {unusedCount > 0 && ` · ${unusedCount} used by nothing`}
      </p>
      <ul className="tree-assets-grid">
        {entries.map((entry) => (
          <AssetTile key={entry.fileName} entry={entry} onDelete={handleDelete} />
        ))}
      </ul>
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
function AssetTile({ entry, onDelete }: { entry: AssetEntry; onDelete: (fileName: string) => void }) {
  const { url, status } = useNodeImage(entry.fileName);
  const names = [...new Set(entry.uses.map((use) => use.nodeName))];
  const detail = names.length > 0 ? `Used by ${names.join(", ")}` : "Not used anywhere";

  return (
    <li className={`tree-assets-tile${entry.isUnused ? " tree-assets-tile-unused" : ""}`} title={detail}>
      <div className="tree-assets-thumb">
        {status === "ready" && url ? (
          <img src={url} alt="" className="tree-assets-image" />
        ) : (
          // A file that won't read is still a file taking up room, so it stays
          // in the grid. Saying so beats an empty square that reads as a
          // picture still loading.
          <span className="tree-assets-broken">{status === "loading" ? "" : "?"}</span>
        )}

        {/* Sits on the picture's top corner, hidden until the tile is hovered
            or focused — `display: none`, the same rule the tree rows follow.
            On the picture rather than beside it because a grid has no spare
            width to reserve for a button that's usually invisible. */}
        {entry.isUnused && (
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
        <span className="tree-assets-uses">{describeUses(entry.uses)}</span>
        <span className="tree-assets-size">{describeSize(entry.size)}</span>
      </span>
    </li>
  );
}
