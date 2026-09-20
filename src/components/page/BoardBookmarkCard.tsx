// A web address on a board: the card drawn inside the library's embed box.
// Phase 32, step 5.
//
// **It draws what was fetched once, off the element.** Title, description,
// site and picture were asked of the page when the address was pasted and
// kept on the element (`customData.bookmark`), so the card draws with the
// internet off and in a world handed to somebody else. The library owns the
// box, as it does a page card's; this owns only what is inside.
//
// **Its presentation is its size**, like a page card's: narrow is the
// site's name alone, short is the title in a row, and anything bigger is
// the picture with the title and description under it.
import { Globe } from "lucide-react";
import { useNodeImage } from "../../hooks/use-node-image";
import { cardPresentation } from "../../services/board-service";
import type { Bookmark } from "../../services/bookmark-service";

type Props = {
  bookmark: Bookmark;
  /** The box the library gave the card, in the drawing's own units. */
  width: number;
  height: number;
};

// No click handler of its own, for the page card's reason: the box never
// takes the pointer, and BoardCanvas opens the address from the library's
// pointer-up hook.
export function BoardBookmarkCard({ bookmark, width, height }: Props) {
  const { url } = useNodeImage(bookmark.image ?? undefined);
  const presentation = cardPresentation(width, height);
  // How many lines the words get, worked out from the box rather than
  // left to overflow: a line cut off halfway reads as broken. The picture
  // takes half the height; the rest is padding, a title line, the site
  // row, and whatever description lines fit.
  const wordsHeight = presentation === "picture" ? height * (url ? 0.5 : 1) - 18 : height;
  const titleLines = wordsHeight >= 110 ? 2 : 1;
  const descriptionLines = Math.max(0, Math.floor((wordsHeight - titleLines * 18 - 25) / 18));

  return (
    <div
      className="board-card board-bookmark-card"
      data-presentation={presentation}
      data-fetched={bookmark.fetched ? "true" : "false"}
      data-testid="board-bookmark-card"
      title={presentation === "icon" ? bookmark.title : bookmark.url}
    >
      {presentation === "picture" && url && <img className="board-bookmark-card-picture" src={url} alt="" draggable={false} />}
      {presentation === "icon" ? (
        <Globe size={Math.max(20, Math.min(width, height) * 0.5)} className="board-bookmark-card-icon" />
      ) : (
        <span className="board-bookmark-card-text">
          <span className="board-bookmark-card-title" style={{ WebkitLineClamp: titleLines }}>
            {bookmark.title}
          </span>
          {presentation === "picture" && bookmark.description && descriptionLines > 0 && (
            <span className="board-bookmark-card-description" style={{ WebkitLineClamp: descriptionLines }}>
              {bookmark.description}
            </span>
          )}
          <span className="board-bookmark-card-site">
            <Globe size={12} />
            {bookmark.fetched ? bookmark.site : "Looking it up…"}
          </span>
        </span>
      )}
    </div>
  );
}
