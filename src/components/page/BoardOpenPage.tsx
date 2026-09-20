// A page opened on a board: what a page card shows once it is stretched past
// a page's worth (Phase 32, step 6). LK's "nested article" — the page's own
// writing, in the box, on the board.
//
// **The writing is read here, not written.** The body is the page's real
// editor with the typing turned off (`PageReader`), so it draws exactly what
// the page's own tab draws; the *Open* button is the way to write in it.
// Whether the box should take typing as well is the question this step puts
// to her with the card running — see `docs/plan.md` § Phase 32.
//
// **Reading is a state the canvas owns**, as writing in a note is: resting,
// the box takes no pointer so the card moves, selects and resizes like any
// shape; woken by the library's double-click or second click in its middle,
// the canvas marks it as being read and the box takes the pointer, so it
// scrolls, its words select and its links open. The Open button alone is
// live either way.
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { Node } from "../../constants/schema";
import { NodeIcon } from "../blocks/IconPicker";
import { PageReader } from "./PageReader";

/** How long a page just opened for reading keeps taking the keyboard back from nothing — the note's rule. */
const KEEP_FOCUS_MS = 800;

type Props = {
  page: Node;
  /** Whether the canvas has this page open for reading: the box takes the pointer and the keyboard. */
  reading: boolean;
  /** The Open button: the page in full, in its own view. */
  onOpen: () => void;
  /** Escape, or anything else that means she is done reading. */
  onDone: () => void;
  /** A web link in the writing, clicked: it goes to the browser through the board, never through the window. */
  onOpenLink: (href: string) => void;
};

export function BoardOpenPage({ page, reading, onOpen, onDone, onOpenLink }: Props) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // Which tab is being read; the page's first until one is picked. Not
  // stored: a card is a way of looking at the page, and which tab it was
  // left on is not part of the drawing.
  const [tabId, setTabId] = useState<string | null>(null);
  const tab = page.tabs.find((candidate) => candidate.id === tabId) ?? page.tabs[0];

  // The keyboard comes to the body as reading starts, so Escape ends it and
  // the arrows scroll it, and comes back for a moment after: the library's
  // wake, which is what started this, fires its own focus a hundred
  // milliseconds after the click that woke the box.
  useEffect(() => {
    if (!reading) return;
    const body = bodyRef.current;
    if (!body) return;
    const take = () => body.focus({ preventScroll: true });
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
  }, [reading]);

  // A plain link in the writing is an `<a>` with the address on it, and
  // read-only, nothing stands between a click on it and the window
  // navigating there. A mention chip is not an `<a>` and opens its page
  // itself.
  function onLinkClick(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest("a[href]");
    if (!anchor) return;
    event.preventDefault();
    event.stopPropagation();
    onOpenLink(anchor.getAttribute("href") ?? "");
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onDone();
    }
  }

  return (
    <div
      className="board-card board-page-card board-open-page"
      data-presentation="page"
      data-reading={reading ? "true" : "false"}
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
          takes the keyboard: with it on the focused body, the library's
          shortcuts — Delete, the tool keys — step aside while she reads. */}
      <div ref={bodyRef} className="board-open-page-body" data-type="wysiwyg" tabIndex={-1} onKeyDown={onKeyDown} onClick={onLinkClick}>
        {tab ? (
          <PageReader key={tab.id} content={tab.content} />
        ) : (
          <p className="board-open-page-empty">Nothing written on this page yet.</p>
        )}
      </div>
    </div>
  );
}
