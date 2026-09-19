// The drawing surface itself: Excalidraw, dressed for this app. Board spike,
// 2026-09-13.
//
// **Its own module so it can be loaded late.** The library is a few megabytes
// of JavaScript, and a world with no boards in it should not pay for them at
// launch — PageBoard pulls this in the first time a board is opened, and
// never before.
//
// **A shape can point at a page** (links step). The library gives every shape
// one `link` string and a way to be told when one is clicked; the app adds a
// picker that writes a page link into the selected shape and follows the link
// to the page instead of the browser. Hand-typed names in the library's own
// link box resolve too — see `boardLinkTarget`.
//
// **A page can be on the board** (Phase 32, step 1). A page card is the
// library's embed element with a page link for its address; the library asks
// the host what to draw in an embed it does not recognise, and the answer is
// `BoardPageCard`. Cards come from the *Put a Page on It* picker in the
// top-right slot, or from a page row dragged out of the tree.
import {
  CaptureUpdateAction,
  Excalidraw,
  MainMenu,
  convertToExcalidrawElements,
  newElementWith,
  viewportCoordsToSceneCoords,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, ExcalidrawImperativeAPI, ExcalidrawInitialDataState, UIAppState } from "@excalidraw/excalidraw/types";
import { FilePlus2, Grip, Link2, Maximize2, Minimize2, Unlink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BOARD_CARD_HEIGHT, BOARD_CARD_WIDTH, BOARD_PAGE_LINK_PREFIX, PAGE_DRAG_TYPE } from "../../constants/board";
import { cardPageId, cardPlacement, draggedPageIds, elementLink, isPageCard, lockedButtonAt } from "../../services/board-service";
import type { BoardLinks } from "../../hooks/use-board-links";
import { NodeIcon } from "../blocks/IconPicker";
import { BoardPageCard } from "./BoardPageCard";

// The app holds a drawing opaquely (see `Board` in constants/schema.ts); this
// is the one file that knows what the library's shape is, so the cast lives
// here and nowhere above it.
type Props = {
  initialData: { elements: unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> };
  theme: "light" | "dark";
  onChange: (elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  links: BoardLinks;
  /** The board's own box, which is where a page dragged from the tree lands. */
  surface: HTMLDivElement | null;
  /** Whether the one selected shape is a page card, for the board to style around. */
  onCardSelected: (selected: boolean) => void;
  /** Where the library's view is, on every scroll and zoom, for the dots underneath. */
  onView: (scrollX: number, scrollY: number, zoom: number) => void;
  dots: boolean;
  onToggleDots: () => void;
  /** Whether the pointer is over a locked shape with a link — a button — for the cursor. */
  onOverButton: (over: boolean) => void;
};

/** Which picker is open and what has been typed into it so far; null when closed. */
type Picker = { mode: "link" | "put"; query: string };

/** The one selected shape's id, or null when nothing or several are selected. */
function soleSelection(appState: UIAppState | AppState): string | null {
  const ids = Object.keys(appState.selectedElementIds).filter((id) => appState.selectedElementIds[id]);
  return ids.length === 1 ? ids[0] : null;
}

/**
 * A page card, as the library's own element: an embed with a page link.
 * Built as a rectangle first so every field the library expects — seed,
 * version, index, roundness — is the library's, then retyped. The converter
 * passes an `embeddable` skeleton through untouched, so this is the one way
 * to make one that is whole.
 */
function pageCardElement(pageId: string, x: number, y: number): ExcalidrawElement {
  const [rectangle] = convertToExcalidrawElements([
    { type: "rectangle", x, y, width: BOARD_CARD_WIDTH, height: BOARD_CARD_HEIGHT, strokeWidth: 1, roundness: null },
  ]);
  return { ...rectangle, type: "embeddable", link: `${BOARD_PAGE_LINK_PREFIX}${pageId}` } as ExcalidrawElement;
}

/** The middle of what the board is showing, in the drawing's own units. */
function viewCentre(appState: AppState): { x: number; y: number } {
  return {
    x: -appState.scrollX + appState.width / 2 / appState.zoom.value,
    y: -appState.scrollY + appState.height / 2 / appState.zoom.value,
  };
}

export default function BoardCanvas({
  initialData,
  theme,
  onChange,
  expanded,
  onToggleExpand,
  links,
  surface,
  onCardSelected,
  onView,
  dots,
  onToggleDots,
  onOverButton,
}: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const pickerInputRef = useRef<HTMLInputElement | null>(null);
  // The last view the dots were told about, so a change report that moved
  // nothing costs a string compare.
  const viewRef = useRef("");

  // Clicking anywhere else closes the picker, the storyline picker's rule.
  useEffect(() => {
    if (picker === null) return;
    function onPointerDown(event: PointerEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setPicker(null);
    }
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [picker]);

  /** Writes `link` (or none) into the shape with `elementId`, as one undoable edit. */
  function setLink(elementId: string, link: string | null) {
    const api = apiRef.current;
    if (!api) return;
    api.updateScene({
      elements: api.getSceneElements().map((element) => (element.id === elementId ? newElementWith(element, { link }) : element)),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    setPicker(null);
  }

  /**
   * Puts a card for each page on the board, the first centred on `centre`
   * and the rest stepped from it, selected so the hand is already on them.
   * One undoable edit for the batch.
   */
  const addCards = useCallback((pageIds: string[], centre: { x: number; y: number }) => {
    const api = apiRef.current;
    if (!api || pageIds.length === 0) return;
    const cards = pageIds.map((pageId, index) => {
      const { x, y } = cardPlacement(centre, index);
      return pageCardElement(pageId, x, y);
    });
    api.updateScene({
      elements: [...api.getSceneElements(), ...cards],
      appState: { selectedElementIds: Object.fromEntries(cards.map((card) => [card.id, true])) },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  }, []);

  /** A pick from the *Put a Page on It* picker: the card lands mid-view and the box stays open for the next. */
  function putPageOn(pageId: string) {
    const api = apiRef.current;
    if (!api) return;
    addCards([pageId], viewCentre(api.getAppState()));
    // Left open on success, the storyline picker's reason: several pages in
    // a row is how a board gets started, and the focus goes back to the box
    // so the next name is typed somewhere.
    setPicker({ mode: "put", query: "" });
    pickerInputRef.current?.focus();
  }

  // A page row dragged out of the tree and dropped here becomes a card
  // where it was dropped. Listened for in the capture phase on the board's
  // own box, ahead of the library's drop handler, which is for files and
  // would otherwise be handed a drag it has no answer to.
  useEffect(() => {
    if (!surface) return;
    function onDragOver(event: DragEvent) {
      if (!event.dataTransfer?.types.includes(PAGE_DRAG_TYPE)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
    }
    function onDrop(event: DragEvent) {
      const api = apiRef.current;
      if (!api || !event.dataTransfer?.types.includes(PAGE_DRAG_TYPE)) return;
      event.preventDefault();
      event.stopPropagation();
      const pageIds = draggedPageIds(event.dataTransfer.getData(PAGE_DRAG_TYPE));
      addCards(pageIds, viewportCoordsToSceneCoords(event, api.getAppState()));
    }
    surface.addEventListener("dragover", onDragOver, true);
    surface.addEventListener("drop", onDrop, true);
    return () => {
      surface.removeEventListener("dragover", onDragOver, true);
      surface.removeEventListener("drop", onDrop, true);
    };
  }, [surface, addCards]);

  return (
    <Excalidraw
      excalidrawAPI={(api) => {
        apiRef.current = api;
      }}
      initialData={initialData as unknown as ExcalidrawInitialDataState}
      theme={theme}
      onChange={(elements, appState, files) => {
        // The library shows its own link popup for any selected embed, with
        // the raw page address in it. For a card the address is not for
        // reading, so the board is told and its stylesheet hides the popup;
        // the top-right button is where a card's page is named.
        const selectedId = soleSelection(appState);
        const selected = selectedId ? elements.find((element) => element.id === selectedId) : undefined;
        onCardSelected(!!selected && isPageCard(selected));
        // The library "wakes" an embed clicked in its middle, a hundred
        // milliseconds after the click, and then refuses to drag it from the
        // canvas — the pointer is meant to be the iframe's. A card's box takes
        // no pointer events (board.css), so a woken card would be stuck. The
        // state is put back, but only the *woken* state and only from outside
        // this callback: the hover state flickers on every pointer move over a
        // selected card, and an `updateScene` from inside the change report,
        // mid-gesture, made the library drop the next box selection's first
        // element.
        const woken = appState.activeEmbeddable;
        if (woken?.state === "active" && isPageCard(woken.element)) {
          window.setTimeout(() => apiRef.current?.updateScene({ appState: { activeEmbeddable: null } }), 0);
        }
        // The dots underneath follow the view. Told from here rather than
        // the library's scroll hook, which says nothing about where a
        // reopened board starts.
        const view = `${appState.scrollX}:${appState.scrollY}:${appState.zoom.value}`;
        if (view !== viewRef.current) {
          viewRef.current = view;
          onView(appState.scrollX, appState.scrollY, appState.zoom.value);
        }
        onChange(elements, appState as unknown as Record<string, unknown>, files);
      }}
      // Every link goes through the app: a page link opens the page, and a
      // web address goes to the real browser through the host rather than
      // through `window.open`, which the Electron shell refuses.
      onLinkOpen={(element, event) => {
        event.preventDefault();
        if (element.link) links.openLink(element.link);
      }}
      // A card opens its page on the second click: the first selects it, as
      // it selects any shape, and a plain click on a card already selected —
      // no drag, nothing added to the selection — is the one that opens.
      // Every click on a card reaches here, because the card's own box takes
      // no pointer events (board.css).
      // And a *locked* shape with a link — a card or any shape linked to a
      // page or a site — opens on the first click, anywhere on it (Phase 32,
      // step 2): locked, it cannot be moved or edited, so a click on it can
      // mean nothing else. The library does not hit-test locked shapes at
      // all, so the click arrives with nothing hit and the shape is found
      // by its box.
      onPointerUp={(_tool, pointerDownState) => {
        if (pointerDownState.drag.hasOccurred) return;
        const elements = apiRef.current?.getSceneElements() ?? [];
        const hit = pointerDownState.hit.element;
        // The library skips locked shapes and reports whatever lies beneath,
        // so the button wins whenever it is drawn above what was hit.
        const button = lockedButtonAt(elements, pointerDownState.origin);
        if (button && (!hit || button.index > elements.findIndex((element) => element.id === hit.id))) {
          links.openLink(button.link);
          return;
        }
        if (!hit || pointerDownState.hit.wasAddedToSelection) return;
        const pageId = cardPageId(hit);
        if (pageId) links.openLink(`${BOARD_PAGE_LINK_PREFIX}${pageId}`);
      }}
      // The cursor says a locked linked shape is a button before it is
      // clicked. Told on every pointer move; the test is a walk over the
      // locked shapes, which are few.
      onPointerUpdate={({ pointer }) => {
        const api = apiRef.current;
        onOverButton(!!api && lockedButtonAt(api.getSceneElements(), pointer) !== null);
      }}
      // An embed whose address is a page link is a card of ours; anything
      // else is left to the library's own list of sites it knows.
      validateEmbeddable={(link) => (link.startsWith(BOARD_PAGE_LINK_PREFIX) ? true : undefined)}
      renderEmbeddable={(element) => {
        const pageId = cardPageId(element);
        if (!pageId) return null;
        return <BoardPageCard pageId={pageId} width={element.width} height={element.height} />;
      }}
      // The library's own open/save-to-file actions are the desktop app's
      // job, not the board's: the drawing is already saved, in the page.
      UIOptions={{
        canvasActions: {
          loadScene: false,
          saveToActiveFile: false,
          toggleTheme: false,
        },
      }}
      // Expand, the put-a-page picker and the page-link picker sit in the
      // library's own top-right slot, beside its Library button, rather than
      // floating over it — the one place the library promises to keep clear
      // for the host.
      renderTopRightUI={(_isMobile, appState) => {
        const selectedId = soleSelection(appState);
        const selected = selectedId ? apiRef.current?.getSceneElements().find((element) => element.id === selectedId) : undefined;
        const selectedIsCard = selected ? isPageCard(selected) : false;
        const current = selected ? elementLink(selected) : null;
        const linked = links.linkedPage(current);
        const candidates = picker !== null ? links.candidates(picker.query) : [];
        const pickerLabel = picker?.mode === "put" ? "Put a page on this board" : "Link this shape to a page";
        return (
          <>
            <div className="board-picker-anchor" ref={pickerRef}>
              <button
                type="button"
                className="board-top-button board-put-button"
                aria-expanded={picker?.mode === "put"}
                onClick={() => setPicker((open) => (open?.mode === "put" ? null : { mode: "put", query: "" }))}
                title="Put a Page on It"
                aria-label="Put a page you already have on this board"
              >
                <FilePlus2 size={16} />
                <span className="board-link-label">Put a Page on It</span>
              </button>
              {selected && (
                <button
                  type="button"
                  className="board-top-button board-link-button"
                  data-linked={linked ? "true" : "false"}
                  aria-expanded={picker?.mode === "link"}
                  onClick={() => setPicker((open) => (open?.mode === "link" ? null : { mode: "link", query: "" }))}
                  title={linked ? `Linked to ${linked.name}` : "Link this shape to a page"}
                  aria-label={linked ? `Linked to ${linked.name}` : "Link this shape to a page"}
                >
                  <Link2 size={16} />
                  <span className="board-link-label">{linked ? linked.name : "Link to Page"}</span>
                </button>
              )}
              {picker !== null && (
                <div className="board-picker" role="dialog" aria-label={pickerLabel}>
                  <input
                    type="text"
                    className="property-field-input"
                    placeholder="Search pages…"
                    aria-label={picker.mode === "put" ? "Search pages to put on this board" : "Search pages to link this shape to"}
                    value={picker.query}
                    autoFocus
                    ref={pickerInputRef}
                    onChange={(event) => setPicker({ mode: picker.mode, query: event.target.value })}
                    onKeyDown={(event) => {
                      // The library listens to the whole window for its
                      // tool shortcuts; typing a page name must not switch
                      // tools under her.
                      event.stopPropagation();
                      if (event.key === "Escape") setPicker(null);
                      if (event.key === "Enter" && candidates.length > 0) {
                        if (picker.mode === "put") putPageOn(candidates[0].id);
                        else if (selected) setLink(selected.id, links.pageLinkFor(candidates[0].id));
                      }
                    }}
                    onKeyUp={(event) => event.stopPropagation()}
                  />
                  {picker.query.trim() && candidates.length === 0 && <p className="board-picker-empty">No page by that name.</p>}
                  {candidates.map((candidate) => (
                    <button
                      type="button"
                      key={candidate.id}
                      className="board-picker-row"
                      onClick={() => {
                        if (picker.mode === "put") putPageOn(candidate.id);
                        else if (selected) setLink(selected.id, links.pageLinkFor(candidate.id));
                      }}
                    >
                      <NodeIcon icon={candidate.icon} templateKey={candidate.templateKey} size={14} />
                      <span className="board-picker-name">{candidate.name}</span>
                    </button>
                  ))}
                  {/* A card *is* its link; taking the link off one would leave
                      an empty box, so the row is for shapes only. Delete
                      removes a card. */}
                  {picker.mode === "link" && current && selected && !selectedIsCard && (
                    <button type="button" className="board-picker-row board-picker-unlink" onClick={() => setLink(selected.id, null)}>
                      <Unlink size={14} />
                      <span className="board-picker-name">Remove the Link</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="board-top-button board-expand"
              onClick={onToggleExpand}
              aria-label={expanded ? "Shrink the board back into the page" : "Expand the board to fill the window"}
              title={expanded ? "Shrink" : "Expand"}
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </>
        );
      }}
    >
      {/* The default menu links out to Excalidraw's own site and socials.
          This one keeps the three things that act on the drawing, and the
          dots, which are the app's. */}
      <MainMenu>
        <MainMenu.DefaultItems.SaveAsImage />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.Separator />
        <MainMenu.Item icon={<Grip size={16} />} onSelect={onToggleDots} selected={dots} data-testid="board-dots-toggle">
          {dots ? "Hide the Dots" : "Show the Dots"}
        </MainMenu.Item>
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    </Excalidraw>
  );
}
