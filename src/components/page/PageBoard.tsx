// A board's whiteboard, in the page whose body it is. Board spike, 2026-09-13.
//
// Drawn in the page rather than opened over it, for the reason PageStoryline
// gives: it is what the page is *for*. Expand is a mode of the same element,
// so the drawing carries across without a remount.
import { Suspense, lazy, useCallback, useRef, useState } from "react";
import type { Node } from "../../constants/schema";
import { dotsLayout } from "../../services/board-service";
import { useBoardBookmarks } from "../../hooks/use-board-bookmarks";
import { useBoardView } from "../../hooks/use-board-view";
import { useBoardLinks } from "../../hooks/use-board-links";
import { BoardViewPanel } from "./BoardViewPanel";
import "./board.css";

// Where the drawing library finds its fonts. Resolved against the page's own
// address rather than written as a root path, because the Electron build is
// opened from a file and has no root to be relative to — `/excalidraw/` on a
// file:// page is the top of the drive. Set before the library is loaded,
// which the lazy import below guarantees.
declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string;
  }
}
window.EXCALIDRAW_ASSET_PATH = new URL("excalidraw/", document.baseURI).href;

const BoardCanvas = lazy(() => import("./BoardCanvas"));

export function PageBoard({ node }: { node: Node }) {
  const [expanded, setExpanded] = useState(false);
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const takeSurface = useCallback((element: HTMLDivElement | null) => {
    surfaceRef.current = element;
    setSurface(element);
  }, []);
  // The dots are the board's own background, told where the library's view
  // is on every scroll and zoom so they stay under the same points of the
  // drawing. Set on the element directly rather than through state: the
  // library reports every wheel tick, and a render per tick is what would
  // make panning feel heavy.
  // Whether the pointer is over a locked linked shape — a button — set on
  // the element for the same reason as the dots: it is told on every move.
  const onOverButton = useCallback((over: boolean) => {
    const element = surfaceRef.current;
    if (!element) return;
    const value = over ? "true" : "false";
    if (element.getAttribute("data-over-button") !== value) element.setAttribute("data-over-button", value);
  }, []);
  const onView = useCallback((scrollX: number, scrollY: number, zoom: number) => {
    const element = surfaceRef.current;
    if (!element) return;
    const { size, x, y } = dotsLayout(scrollX, scrollY, zoom);
    element.style.setProperty("--board-dots-size", `${size}px`);
    element.style.setProperty("--board-dots-x", `${x}px`);
    element.style.setProperty("--board-dots-y", `${y}px`);
  }, []);
  // Whether a page card is the selected shape: the stylesheet hides the
  // library's link popup for one, since the address in it is not for reading.
  const [cardSelected, setCardSelected] = useState(false);
  // The page viewed beside the board, if one is — the View button's panel
  // (step 6). This session's only: which page was being looked at is not
  // part of the drawing.
  const [viewedPageId, setViewedPageId] = useState<string | null>(null);
  const { initialData, theme, onChange, dots, toggleDots, readPictures, placePicture, placeVideo } = useBoardView(node.id, surface);
  const { fetchBookmark } = useBoardBookmarks();
  const links = useBoardLinks(node.id);

  return (
    <div
      ref={takeSurface}
      className={expanded ? "board board-expanded" : "board"}
      data-testid="board"
      data-card-selected={cardSelected ? "true" : "false"}
      data-dots={dots ? "true" : "false"}
      data-view-open={viewedPageId !== null ? "true" : "false"}
    >
      {viewedPageId !== null && (
        <BoardViewPanel
          pageId={viewedPageId}
          onOpen={() => links.openLink(links.pageLinkFor(viewedPageId))}
          onClose={() => setViewedPageId(null)}
        />
      )}
      <Suspense fallback={<div className="board-loading">Loading the board…</div>}>
        <BoardCanvas
          initialData={initialData}
          theme={theme}
          onChange={onChange}
          expanded={expanded}
          onToggleExpand={() => setExpanded((value) => !value)}
          links={links}
          surface={surface}
          onCardSelected={setCardSelected}
          onView={onView}
          dots={dots}
          onToggleDots={toggleDots}
          onOverButton={onOverButton}
          readPictures={readPictures}
          placePicture={placePicture}
          placeVideo={placeVideo}
          fetchBookmark={fetchBookmark}
          viewedPageId={viewedPageId}
          onViewPage={setViewedPageId}
        />
      </Suspense>
      {/* A link that went nowhere, said once and briefly — the storyline's
          refusal strip, in the same place for the same reason. */}
      {links.notice && (
        <p className="board-notice" role="status">
          {links.notice}
        </p>
      )}
    </div>
  );
}
