// A page viewed beside a board: the panel the board's *View* button opens
// (Phase 32, step 6, the last half). LK's page card has the same three ways
// in — write in the box, view in a side panel, open in full — and this is
// the second: the page's whole view, title and tabs and writing, editable,
// beside the drawing it is pinned to, without leaving the board.
//
// **It is `PageView` for another page, not a second page view.** The same
// component the middle of the window shows the selected page with, given a
// page id instead of reading the selection — so everything a page can do
// there it can do here, and there is one page view to keep right. What the
// panel adds is a bar: *Open*, which is the page in full, and a close.
//
// **A board or a storyline is not viewed here.** Their body is a canvas,
// and a canvas inside a board's panel would be a drawing in a drawing —
// which LK's tutorial says theirs cannot do either. The panel says so and
// offers Open.
import { X } from "lucide-react";
import { BOARD_TEMPLATE_KEY, STORYLINE_TEMPLATE_KEY } from "../../constants/schema";
import { useNode } from "../../hooks/use-project";
import { PageView } from "./PageView";

type Props = {
  pageId: string;
  /** Open: the page in full, in the middle of the window. */
  onOpen: () => void;
  onClose: () => void;
};

export function BoardViewPanel({ pageId, onOpen, onClose }: Props) {
  const page = useNode(pageId);
  const isCanvas = page?.templateKey === BOARD_TEMPLATE_KEY || page?.templateKey === STORYLINE_TEMPLATE_KEY;

  return (
    <aside className="board-view-panel" data-testid="board-view-panel" aria-label={page ? `${page.name}, viewed beside the board` : "A page viewed beside the board"}>
      <div className="board-view-panel-bar">
        <span className="board-view-panel-name">{page?.name ?? "This page is gone"}</span>
        {page && (
          <button type="button" className="board-view-panel-open" onClick={onOpen} title="Open this page in full">
            Open
          </button>
        )}
        <button type="button" className="board-view-panel-close" onClick={onClose} title="Close" aria-label="Close the viewed page">
          <X size={16} />
        </button>
      </div>
      <div className="board-view-panel-body">
        {!page ? (
          <p className="board-view-panel-note">The page this card was for has been deleted.</p>
        ) : isCanvas ? (
          <p className="board-view-panel-note">
            {page.templateKey === BOARD_TEMPLATE_KEY ? "A board" : "A storyline"} is opened in full rather than beside a board.
          </p>
        ) : (
          // Keyed on the page so a different page starts its own view fresh
          // — the reason the window's own PageView is keyed.
          <PageView key={page.id} nodeId={page.id} />
        )}
      </div>
    </aside>
  );
}
