// A page opened on a board: what a page card shows once it is stretched past
// a page's worth (Phase 32, step 6). LK's "nested article" — the page's own
// writing, in the box, on the board.
//
// **Resting, the page is drawn; woken, it is written in.** Resting, the
// body is the page's real editor with the typing turned off (`PageReader`),
// so it draws exactly what the page's own tab draws and the box takes no
// pointer, so the card moves, selects and resizes like any shape. Woken by
// the library's double-click or second click in its middle, the canvas
// marks it as being written in and the body becomes the page's real editor
// — the same `Editor` the page's own tab is, menus and all — saving to the
// page as that tab would. Escape, or a click elsewhere, puts it back. LK's
// page on a board takes typing in the box too (its pencil button), in a
// plainer editor; ours is the full one because it was already there. The
// *Open* button is the page in full, and is live either way.
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { Node } from "../../constants/schema";
import { useProjectActions } from "../../hooks/use-project";
import { NodeIcon } from "../blocks/IconPicker";
import { Editor } from "./Editor";
import { PageReader } from "./PageReader";

/** How long a page just opened for writing keeps taking the keyboard back from nothing — the note's rule. */
const KEEP_FOCUS_MS = 800;

type Props = {
  page: Node;
  /** Whether the canvas has this page open for writing: the box takes the pointer and the keyboard, and the body is the editor. */
  writing: boolean;
  /** The Open button: the page in full, in its own view. */
  onOpen: () => void;
  /** Escape, or anything else that means she is done writing. */
  onDone: () => void;
  /** A web link in the drawn writing, clicked: it goes to the browser through the board, never through the window. */
  onOpenLink: (href: string) => void;
};

export function BoardOpenPage({ page, writing, onOpen, onDone, onOpenLink }: Props) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const { updateTabContent } = useProjectActions();
  // Which tab is being read; the page's first until one is picked. Not
  // stored: a card is a way of looking at the page, and which tab it was
  // left on is not part of the drawing.
  const [tabId, setTabId] = useState<string | null>(null);
  const tab = page.tabs.find((candidate) => candidate.id === tabId) ?? page.tabs[0];

  // The keyboard comes to the editor as writing starts, and comes back for
  // a moment after: the library's wake, which is what started this, fires
  // its own focus a hundred milliseconds after the click that woke the box.
  // The editor is the target when it is up, the body otherwise, so Escape
  // and the arrows land somewhere either way.
  useEffect(() => {
    if (!writing) return;
    const body = bodyRef.current;
    if (!body) return;
    const take = () => (body.querySelector<HTMLElement>(".bn-editor") ?? body).focus({ preventScroll: true });
    take();
    const until = performance.now() + KEEP_FOCUS_MS;
    let frame = 0;
    const keep = () => {
      const active = document.activeElement;
      if (!body.contains(active) && (active === null || active === document.body || active.classList.contains("excalidraw-container"))) take();
      if (performance.now() < until) frame = requestAnimationFrame(keep);
    };
    frame = requestAnimationFrame(keep);
    return () => cancelAnimationFrame(frame);
  }, [writing]);

  // A plain link in the drawn writing is an `<a>` with the address on it,
  // and read-only, nothing stands between a click on it and the window
  // navigating there. A mention chip is not an `<a>` and opens its page
  // itself. While writing, the editor handles its own links.
  function onLinkClick(event: MouseEvent<HTMLDivElement>) {
    if (writing) return;
    const anchor = (event.target as HTMLElement).closest("a[href]");
    if (!anchor) return;
    event.preventDefault();
    event.stopPropagation();
    onOpenLink(anchor.getAttribute("href") ?? "");
  }

  // Escape ends the writing — unless one of the editor's menus is up,
  // when it means "shut the menu" and is the editor's. Whether a menu was
  // up is read on the way down, before the editor shuts it; the key is
  // then stopped on the way back up, after the editor has had it, so it
  // never reaches the drawing library — which lets Escape through its
  // "inside a box" guard and, given it, takes the keyboard back to its
  // own container, where the next Backspace deletes the card.
  const escapeForMenuRef = useRef(false);
  function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") escapeForMenuRef.current = !!document.getElementById("bn-suggestion-menu");
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    if (escapeForMenuRef.current) return;
    event.preventDefault();
    onDone();
  }

  return (
    <div
      className="board-card board-page-card board-open-page"
      data-presentation="page"
      data-writing={writing ? "true" : "false"}
      data-page-id={page.id}
      data-page-name={page.name}
      data-testid="board-page-card"
    >
      <div className="board-open-page-head">
        <NodeIcon icon={page.icon} templateKey={page.templateKey} size={16} className="board-page-card-icon" />
        <span className="board-page-card-name">{page.name}</span>
        {page.tabs.length > 1 && (
          <div className="board-open-page-tabs" role="tablist" aria-label="Tabs">
            {page.tabs.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                role="tab"
                className="board-open-page-tab"
                aria-selected={candidate.id === tab?.id}
                data-hidden={candidate.hidden ? "true" : undefined}
                onClick={() => setTabId(candidate.id)}
              >
                {candidate.label}
              </button>
            ))}
          </div>
        )}
        {/* Live whether the box is being read or not — the one part of a
            resting card that takes the pointer, as a note's links are. */}
        <button type="button" className="board-open-page-open" onClick={onOpen} title="Open this page in full">
          Open
        </button>
      </div>
      {/* `data-type="wysiwyg"` is the library's own marker for a box that
          takes the keyboard: with it on whatever is focused in here — the
          body, or the editor, which wears it too — the library's shortcuts
          (Delete, the tool keys, its undo) step aside. */}
      <div ref={bodyRef} className="board-open-page-body" data-type="wysiwyg" tabIndex={-1} onKeyDownCapture={onKeyDownCapture} onKeyDown={onKeyDown} onClick={onLinkClick}>
        {!tab ? (
          <p className="board-open-page-empty">Nothing written on this page yet.</p>
        ) : writing ? (
          <Editor key={tab.id} nodeId={page.id} tabId={tab.id} content={tab.content} onContentChange={(content) => updateTabContent(page.id, tab.id, content)} />
        ) : (
          <PageReader key={tab.id} content={tab.content} />
        )}
      </div>
    </div>
  );
}
