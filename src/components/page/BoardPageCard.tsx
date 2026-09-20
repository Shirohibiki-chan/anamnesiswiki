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
// **Its presentation is its size**, four of one card: narrow is the icon
// alone, short is icon and name in a row, bigger is the picture with the
// name over it, and past a page's worth both ways it is the page itself,
// opened (step 6, `BoardOpenPage`) — resize it and it changes, with nothing
// to set.
import { useNodeImage } from "../../hooks/use-node-image";
import { cardPresentation } from "../../services/board-service";
import { useProjectStore } from "../../state/project-store";
import { NodeIcon } from "../blocks/IconPicker";
import { BoardOpenPage } from "./BoardOpenPage";

type Props = {
  pageId: string;
  /** The box the library gave the card, in the drawing's own units. */
  width: number;
  height: number;
  /** Whether the canvas has the card open for reading — only meant for the page presentation. */
  reading: boolean;
  /** The opened page's Open button: the page in full. */
  onOpen: () => void;
  /** She is done reading the opened page. */
  onDone: () => void;
  /** A web link in the opened page's writing, clicked. */
  onOpenLink: (href: string) => void;
};

// No click handler of its own: the card's box never takes the pointer (see
// board.css), so clicks land on the canvas and BoardCanvas opens the page
// from the library's pointer-up hook, where selecting and dragging already
// are.
export function BoardPageCard({ pageId, width, height, reading, onOpen, onDone, onOpenLink }: Props) {
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
      <div className="board-card board-page-card board-page-card-missing" data-presentation={presentation} data-testid="board-page-card">
        <span className="board-page-card-name">This page is gone</span>
      </div>
    );
  }

  if (presentation === "page") return <BoardOpenPage page={page} reading={reading} onOpen={onOpen} onDone={onDone} onOpenLink={onOpenLink} />;

  const iconSize = presentation === "icon" ? Math.max(20, Math.min(width, height) * 0.5) : presentation === "row" ? 18 : 16;

  return (
    <div
      className="board-card board-page-card"
      data-presentation={presentation}
      data-page-id={page.id}
      data-page-name={page.name}
      data-testid="board-page-card"
      title={presentation === "icon" ? page.name : undefined}
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
