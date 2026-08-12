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
import { Trash2 } from "lucide-react";
import { describeSize, describeUses, useAssetActions, useAssets, type AssetEntry } from "../../hooks/use-assets";
import { useDialogs } from "../../hooks/use-dialogs";
import { useOpenSingleImage } from "../../hooks/use-lightbox";
import { useNodeImage } from "../../hooks/use-node-image";

export function AssetsPanel() {
  const { entries, isLoading, isUsageIncomplete, refresh } = useAssets();
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
        {!isUsageIncomplete && unusedCount > 0 && ` · ${unusedCount} used by nothing`}
      </p>
      {isUsageIncomplete && (
        <p className="tree-assets-note tree-assets-warning">
          One of your pages wouldn&rsquo;t open, so this can&rsquo;t say for certain what&rsquo;s using what. Deleting
          is off until it can.
        </p>
      )}
      <ul className="tree-assets-grid">
        {entries.map((entry) => (
          <AssetTile
            key={entry.fileName}
            entry={entry}
            onDelete={handleDelete}
            usageIsCertain={!isUsageIncomplete}
          />
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
    <li className={`tree-assets-tile${entry.isUnused ? " tree-assets-tile-unused" : ""}`} title={detail}>
      {/* Clicking opens it full size, in the same viewer a picture inside a
          page opens in. Deliberately *not* "put this on the page you're
          looking at": these are 77px squares packed six to a screen, and a
          gesture that edits your writing shouldn't be the one you make while
          trying to see what something is. Putting a picture into a page is the
          picture block's own Library tab, where you've already said where it
          goes. */}
      <div className="tree-assets-thumb">
        {status === "ready" && url ? (
          <img src={url} alt="" className="tree-assets-image" />
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
