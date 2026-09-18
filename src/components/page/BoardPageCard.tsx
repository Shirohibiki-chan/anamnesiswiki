// A page on a board: the card drawn inside the library's embed box. Phase 32,
// step 1.
//
// **It reads the page, it does not copy it.** Name, icon and picture come off
// the store each time it draws, so a rename or a new picture on the page
// shows up on the board without the board being touched — the card is the
// page, seen from here. The library owns the box: where it is, how big,
// whether it is locked or grouped, and the file it is saved in. This owns
// only what is inside.
//
// **Its presentation is its size**, three of one card: narrow is the icon
// alone, short is icon and name in a row, and anything bigger is the picture
// with the name over it — resize it and it changes, with nothing to set.
import { useNodeImage } from "../../hooks/use-node-image";
import { cardPresentation } from "../../services/board-service";
import { useProjectStore } from "../../state/project-store";
import { NodeIcon } from "../blocks/IconPicker";

type Props = {
  pageId: string;
  /** The box the library gave the card, in the drawing's own units. */
  width: number;
  height: number;
  /** A click on the card, once the library has let it through (see BoardCanvas). */
  onOpen: () => void;
};

export function BoardPageCard({ pageId, width, height, onOpen }: Props) {
  const page = useProjectStore((state) => state.nodes[pageId]);
  // The page's own picture first; a page with only a banner shows that,
  // because a card with a picture on it is what LK's boards make and a page
  // with a banner has a picture in every sense she cares about.
  const { url } = useNodeImage(page?.image ?? page?.banner);
  const presentation = cardPresentation(width, height);

  if (!page) {
    // The page was deleted after the card was made. Say so on the card
    // rather than drawing a blank — a blank box on a board is a bug report.
    return (
      <div className="board-page-card board-page-card-missing" data-presentation={presentation} data-testid="board-page-card">
        <span className="board-page-card-name">This page is gone</span>
      </div>
    );
  }

  const iconSize = presentation === "icon" ? Math.max(20, Math.min(width, height) * 0.5) : presentation === "row" ? 18 : 16;

  return (
    <div
      className="board-page-card"
      data-presentation={presentation}
      data-page-id={page.id}
      data-page-name={page.name}
      data-testid="board-page-card"
      title={presentation === "icon" ? page.name : undefined}
      onClick={onOpen}
    >
      {presentation === "picture" && url && (
        <img
          className="board-page-card-picture"
          src={url}
          alt=""
          draggable={false}
          style={page.imageFocusY !== undefined ? { objectPosition: `50% ${page.imageFocusY}%` } : undefined}
        />
      )}
      <span className="board-page-card-label">
        <NodeIcon icon={page.icon} templateKey={page.templateKey} size={iconSize} className="board-page-card-icon" />
        {presentation !== "icon" && <span className="board-page-card-name">{page.name}</span>}
      </span>
    </div>
  );
}
