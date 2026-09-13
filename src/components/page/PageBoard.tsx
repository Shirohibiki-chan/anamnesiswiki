// A board's whiteboard, in the page whose body it is. Board spike, 2026-09-13.
//
// Drawn in the page rather than opened over it, for the reason PageStoryline
// gives: it is what the page is *for*. Expand is a mode of the same element,
// so the drawing carries across without a remount.
import { Suspense, lazy, useState } from "react";
import type { Node } from "../../constants/schema";
import { useBoardView } from "../../hooks/use-board-view";
import { useBoardLinks } from "../../hooks/use-board-links";
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
  const { initialData, theme, onChange } = useBoardView(node.id, surface);
  const links = useBoardLinks(node.id);

  return (
    <div ref={setSurface} className={expanded ? "board board-expanded" : "board"} data-testid="board">
      <Suspense fallback={<div className="board-loading">Loading the board…</div>}>
        <BoardCanvas
          initialData={initialData}
          theme={theme}
          onChange={onChange}
          expanded={expanded}
          onToggleExpand={() => setExpanded((value) => !value)}
          links={links}
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
