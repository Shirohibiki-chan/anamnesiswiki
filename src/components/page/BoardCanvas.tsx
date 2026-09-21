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
//
// **A sticky note is the third thing drawn in an embed** (Phase 32, step
// 10): a coloured square whose words take bold, italic and links, drawn
// and edited by `BoardNote`. The library owns its box as it owns a card's;
// this file owns when a note is being written in, which is the app's own
// state rather than the library's "active embed" — the library keeps that
// by the element's identity, and every keystroke here makes a new element.
//
// **Ordinary text takes bold, italic and links** (Phase 32, step 14), as
// Markdown's marks in the library's own text string — `services/board-text`
// reads them, the patched library draws them. This file owns the small
// toolbar over a text box being written in and its shortcuts, which put
// the marks around the selected words, and the click on a drawn link.
import {
  CaptureUpdateAction,
  Excalidraw,
  MainMenu,
  convertToExcalidrawElements,
  newElementWith,
  setCustomTextMetricsProvider,
  viewportCoordsToSceneCoords,
} from "@excalidraw/excalidraw";
import * as excalidrawLibrary from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFileData, ExcalidrawImperativeAPI, ExcalidrawInitialDataState, UIAppState } from "@excalidraw/excalidraw/types";
import { Bold, FilePlus2, Grip, Highlighter, Italic, Layers, Link2, Maximize2, Minimize2, PanelLeftOpen, StickyNote, Unlink } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BOARD_CARD_CASCADE,
  BOARD_CARD_HEIGHT,
  BOARD_CARD_WIDTH,
  BOARD_HIGHLIGHT_COLOUR,
  BOARD_HIGHLIGHT_OPACITY,
  BOARD_HIGHLIGHT_WIDTH,
  BOARD_NOTE_LINK,
  BOARD_NOTE_PADDING,
  BOARD_NOTE_SIZE,
  BOARD_PAGE_LINK_PREFIX,
  BOARD_PICTURE_MAX_SIDE,
  BOARD_TEXT_TOOLS_GAP,
  BOARD_VIDEO_HEIGHT,
  BOARD_VIDEO_LINK,
  BOARD_VIDEO_WIDTH,
  PAGE_DRAG_TYPE,
} from "../../constants/board";
import { ASSET_DRAG_TYPE } from "../../constants/paths";
import { DEFAULT_NOTE_COLOUR, NOTE_COLOURS, emptyNote, isNote, noteColourName, noteOf, type NoteColour, type NoteLine } from "../../services/board-notes";
import { boardLayers, hiddenFields, layerOffScreen, movedLayer, shownFields, type BoardLayer } from "../../services/board-layers";
import { fittedSize, type PictureFile } from "../../services/board-pictures";
import { BOLD_MARK, ITALIC_MARK, linkedWords, textLinkAt, toggledMark } from "../../services/board-text";
import { cardPageId, cardPlacement, draggedPageIds, elementLink, isHidden, isHighlight, isOpenPageCard, isPageCard, lockedButtonAt, sunkUnderInk } from "../../services/board-service";
import { isVideo, isVideoFileName, videoOf } from "../../services/board-videos";
import { bookmarkOf, isBookmarkCard, placeholderBookmark, webAddressIn, type Bookmark } from "../../services/bookmark-service";
import { BoardNote, type NoteEditor } from "./BoardNote";
import type { BoardLinks } from "../../hooks/use-board-links";
import { installBoardTextMetrics, measureBoardText } from "../../hooks/board-text-metrics";
import { NodeIcon } from "../blocks/IconPicker";
import { BoardBookmarkCard } from "./BoardBookmarkCard";
import { BoardLayersPanel } from "./BoardLayersPanel";
import { BoardPageCard } from "./BoardPageCard";
import { BoardVideo } from "./BoardVideo";

// The library measures text through the app from here on (Phase 32, step
// 14): a mark's stars and brackets take no room, and a bold word takes
// bold's. Before any board mounts, since a box is measured as it is made.
installBoardTextMetrics({ setCustomTextMetricsProvider });

// The library's own font string for a text box — what it measures and draws
// with. Exported at run time — by the dev build as it comes and by the prod
// build through the patch — and left out of its typings, so read by name.
const { getFontString } = excalidrawLibrary as unknown as { getFontString: (element: { fontSize: number; fontFamily: number }) => string };

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
  /** The board's pictures, read out of the world's library once the drawing is up. */
  readPictures: () => Promise<PictureFile[]>;
  /** A picture from the Assets tab, as the library takes it, or null if its file will not read. */
  placePicture: (fileName: string) => Promise<PictureFile | null>;
  /** A video file dropped on the board, put into the world's library: its name there, or null if it would not read. */
  placeVideo: (file: File) => Promise<string | null>;
  /** What a web address's page says about itself, with its picture put in the library. Never rejects. */
  fetchBookmark: (url: string) => Promise<Bookmark>;
  /** The page viewed beside the board, if one is: its box is never written in while it is. */
  viewedPageId: string | null;
  /** The View button: show this page beside the board. */
  onViewPage: (pageId: string) => void;
};

/**
 * Which picker is open and what has been typed into it so far; null when
 * closed. `note` and `colour` are the swatch grid, for a new note and for
 * the selected ones; they have no box to type in.
 */
type Picker = { mode: "link" | "put" | "note" | "colour"; query: string };

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

/**
 * A bookmark card, as the library's own element: an embed whose link is
 * the web address and whose `customData` is what the card draws. Made the
 * way a page card is, from a rectangle skeleton retyped.
 */
function bookmarkCardElement(bookmark: Bookmark, x: number, y: number): ExcalidrawElement {
  const [rectangle] = convertToExcalidrawElements([
    { type: "rectangle", x, y, width: BOARD_CARD_WIDTH, height: BOARD_CARD_HEIGHT, strokeWidth: 1, roundness: null },
  ]);
  return { ...rectangle, type: "embeddable", link: bookmark.url, customData: { bookmark } } as ExcalidrawElement;
}

/**
 * A sticky note, as the library's own element: an embed whose address says
 * it is a note and whose `customData` is its colour and words. A square,
 * made the way a card is.
 */
function noteElement(colour: NoteColour, x: number, y: number): ExcalidrawElement {
  const [rectangle] = convertToExcalidrawElements([{ type: "rectangle", x, y, width: BOARD_NOTE_SIZE, height: BOARD_NOTE_SIZE, strokeWidth: 1, roundness: null }]);
  return { ...rectangle, type: "embeddable", link: BOARD_NOTE_LINK, customData: { note: emptyNote(colour) } } as ExcalidrawElement;
}

/** A video element for the file called `file` in the world's library, with its middle at `centre`. */
function videoElement(file: string, centre: { x: number; y: number }): ExcalidrawElement {
  const [rectangle] = convertToExcalidrawElements([
    { type: "rectangle", x: centre.x - BOARD_VIDEO_WIDTH / 2, y: centre.y - BOARD_VIDEO_HEIGHT / 2, width: BOARD_VIDEO_WIDTH, height: BOARD_VIDEO_HEIGHT, strokeWidth: 1, roundness: null },
  ]);
  return { ...rectangle, type: "embeddable", link: BOARD_VIDEO_LINK, customData: { video: { file } } } as ExcalidrawElement;
}

/**
 * `element` with `changes` and its version left alone. A change made to a
 * note mid-edit — a keystroke, the box growing under it — is not a change
 * of its own: it is folded into the one captured when the edit ends. The
 * library's `updateScene` keeps an element whose version has run ahead of
 * its last captured state *out* of the next capture (it takes a version
 * ahead to mean a gesture still in progress), so an edit written with
 * version bumps along the way would never reach the undo history at all.
 * An unbumped version also leaves the board file alone until the edit is
 * done, which is one write per note rather than one per key.
 */
function withoutBump<T extends ExcalidrawElement>(element: T, changes: Partial<T>): T {
  return { ...element, ...changes };
}

/**
 * Whether the keyboard is in something that takes typing — a paste there is
 * that box's, not the board's. A page opened for reading counts: its body
 * wears the library's own marker for a box with the keyboard.
 */
function isWritable(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (element as HTMLElement).isContentEditable || (element as HTMLElement).dataset.type === "wysiwyg";
}

/** The library's textarea for the text box being written in, if it is up in `surface`. */
function textEditorIn(surface: HTMLDivElement | null): HTMLTextAreaElement | null {
  return surface?.querySelector<HTMLTextAreaElement>(".excalidraw-wysiwyg") ?? null;
}

/**
 * Writes `next` into the library's textarea and tells the library, the way
 * its own indent does, so it sizes the box to the words as typed.
 */
function writeWords(box: HTMLTextAreaElement, next: { value: string; start: number; end: number }): void {
  box.value = next.value;
  box.setSelectionRange(next.start, next.end);
  box.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * A picture's own size, read by letting the browser decode it — the only
 * way to know how big a data URL's picture is, and what the library does
 * itself when a file is dropped on it.
 */
function measurePicture(dataURL: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: BOARD_CARD_WIDTH, height: BOARD_CARD_HEIGHT });
    image.src = dataURL;
  });
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
  readPictures,
  placePicture,
  placeVideo,
  fetchBookmark,
  viewedPageId,
  onViewPage,
}: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const pickerInputRef = useRef<HTMLInputElement | null>(null);
  // The last view the dots were told about, so a change report that moved
  // nothing costs a string compare.
  const viewRef = useRef("");
  // Where the mouse last was over the board, in the window's coordinates,
  // so a pasted address lands under it — the library's own rule for a
  // pasted picture.
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  // The note being written in, if one is: state so the note redraws as its
  // editor, and a ref so the library's change reports — which close over
  // nothing — can read it.
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const editingNoteRef = useRef<string | null>(null);
  // The note's handle on its editor while it is being written in, for
  // putting a link at the caret from the picker.
  const noteEditorRef = useRef<NoteEditor | null>(null);
  // The words of the note being written in, as last reported.
  const noteDraftRef = useRef<NoteLine[] | null>(null);
  const growPendingRef = useRef(false);
  // Whether the last pointer gesture on the canvas moved anything, or was
  // the click that selected the shape: the library calls a quick drag a
  // click and wakes the note under it, and wakes a note on the click that
  // selects it. A note dragged into place must not open for writing, and a
  // note opens on the second click, as a card does — the first selects.
  const lastGestureDraggedRef = useRef(false);
  const lastClickSelectedRef = useRef(false);
  // The colour the last note was made in, which the next one starts as.
  const [noteColour, setNoteColour] = useState<NoteColour>(DEFAULT_NOTE_COLOUR);
  // The page card being written in — a card at the page presentation
  // whose box has the pointer and the keyboard, and the page's editor in
  // it (step 6). State and ref for the note's reason: the library's change
  // reports close over nothing.
  const [writingCardId, setWritingCardId] = useState<string | null>(null);
  const writingCardRef = useRef<string | null>(null);
  // The highlighter (step 11): whether it is the tool in hand, the pen's
  // own style put aside while it is, the colour it was last used in, and
  // which strokes were on the board before it was picked up — any pen
  // stroke not among them is a highlight to sink under the ink.
  const [highlighting, setHighlighting] = useState(false);
  const highlightingRef = useRef(false);
  const penStyleRef = useRef<Pick<AppState, "currentItemStrokeColor" | "currentItemStrokeWidth" | "currentItemOpacity"> | null>(null);
  const highlightColourRef = useRef(BOARD_HIGHLIGHT_COLOUR);
  const knownStrokesRef = useRef<Set<string>>(new Set());
  // The Layers panel (step 15): whether it is open, and its rows as last
  // read off the board — read only while it is open, and set only when
  // they read differently, since the library reports on every pointer
  // move and the rows do not change with a shape's place.
  const [layersOpen, setLayersOpen] = useState(false);
  const layersOpenRef = useRef(false);
  const [layers, setLayers] = useState<{ rows: BoardLayer[]; selected: ReadonlySet<string> }>({ rows: [], selected: new Set() });
  const layersSignatureRef = useRef("");
  const [layersNotice, setLayersNotice] = useState<string | null>(null);
  const layersNoticeTimerRef = useRef<number | null>(null);
  // The text box being written in, if one is (step 14) — the library's
  // own textarea, found in the surface when needed. State so the small
  // toolbar over it draws, a ref so the change reports can read it, and
  // the library's own end-on-blur put aside while the link picker has the
  // keyboard, since the words are not done being written.
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const editingTextRef = useRef<string | null>(null);
  const textToolsRef = useRef<HTMLDivElement | null>(null);
  const textBlurRef = useRef<((this: GlobalEventHandlers, event: FocusEvent) => unknown) | null>(null);
  // The viewed page, readable from the library's change reports.
  const viewedPageRef = useRef(viewedPageId);
  useEffect(() => {
    viewedPageRef.current = viewedPageId;
  }, [viewedPageId]);

  // Clicking anywhere else closes the picker, the storyline picker's rule.
  useEffect(() => {
    if (picker === null) return;
    function onPointerDown(event: PointerEvent) {
      if (!pickerRef.current || pickerRef.current.contains(event.target as Node)) return;
      setPicker(null);
      // The link picker was open over a text box being written in: the
      // click is elsewhere, so the words are done, as the library's own
      // rule has it — its end-on-blur, held off for the picker, is called.
      const endWords = textBlurRef.current;
      if (endWords) {
        textBlurRef.current = null;
        const box = textEditorIn(surface);
        if (box) endWords.call(box, new FocusEvent("blur"));
      }
    }
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [picker, surface]);

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

  // ---- A text box being written in: the marks and the link (step 14) ----

  /**
   * Puts the small toolbar just over the library's textarea, or just under
   * it when there is no room above. Told on every change report while
   * writing, since the textarea follows the box as it grows, scrolls and
   * zooms; in the window's pixels, on the board's own box.
   */
  const placeTextTools = useCallback(() => {
    const tools = textToolsRef.current;
    const box = textEditorIn(surface);
    if (!tools || !box || !surface) return;
    const home = surface.getBoundingClientRect();
    const at = box.getBoundingClientRect();
    const above = at.top - home.top - tools.offsetHeight - BOARD_TEXT_TOOLS_GAP;
    tools.style.left = `${Math.max(0, at.left - home.left)}px`;
    tools.style.top = `${above >= 0 ? above : at.bottom - home.top + BOARD_TEXT_TOOLS_GAP}px`;
  }, [surface]);
  useLayoutEffect(placeTextTools, [editingTextId, placeTextTools]);

  /** Bold or italic put around the selected words, or taken off them. */
  const markWords = useCallback(
    (mark: string) => {
      const box = textEditorIn(surface);
      if (!box) return;
      writeWords(box, toggledMark({ value: box.value, start: box.selectionStart, end: box.selectionEnd }, mark));
      box.focus();
    },
    [surface],
  );

  /**
   * The link picker for the words. The library ends the writing the
   * moment its textarea loses the keyboard, and the picker takes it; so
   * its end-on-blur is put aside until the picker is done.
   */
  const wantWordsLink = useCallback(() => {
    const box = textEditorIn(surface);
    if (!box) return;
    if (box.onblur) {
      textBlurRef.current = box.onblur;
      box.onblur = null;
    }
    setPicker({ mode: "link", query: "" });
  }, [surface]);

  /** The keyboard back in the words where it was, and the library's end-on-blur put back. */
  const backToWords = useCallback(() => {
    const box = textEditorIn(surface);
    if (!box) return;
    box.focus();
    if (textBlurRef.current) {
      box.onblur = textBlurRef.current;
      textBlurRef.current = null;
    }
  }, [surface]);

  /** The selected words linked to `href`, or `text` put in linked at the caret. */
  const linkWords = useCallback(
    (href: string, text: string) => {
      const box = textEditorIn(surface);
      if (box) writeWords(box, linkedWords({ value: box.value, start: box.selectionStart, end: box.selectionEnd }, href, text));
      setPicker(null);
      backToWords();
    },
    [surface, backToWords],
  );

  // Ctrl+B, Ctrl+I and Ctrl+K in the library's textarea: the marks around
  // the selected words, and the link picker. Caught before the library's
  // own keys, among which Ctrl+K is a shape's link.
  useEffect(() => {
    if (!surface) return;
    function onKeyDown(event: KeyboardEvent) {
      const box = textEditorIn(surface);
      if (!box || document.activeElement !== box || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key !== "b" && key !== "i" && key !== "k") return;
      event.preventDefault();
      event.stopPropagation();
      if (key === "b") markWords(BOLD_MARK);
      else if (key === "i") markWords(ITALIC_MARK);
      else wantWordsLink();
    }
    surface.addEventListener("keydown", onKeyDown, true);
    return () => surface.removeEventListener("keydown", onKeyDown, true);
  }, [surface, markWords, wantWordsLink]);

  /** The address of the link drawn under `point` in some text box's words, or null. A hidden box has no links. */
  function wordsLinkAt(elements: readonly ExcalidrawElement[], point: { x: number; y: number }): string | null {
    return textLinkAt(
      elements.filter((element) => !isHidden(element)),
      point,
      measureBoardText,
      (element) => getFontString(element as { fontSize: number; fontFamily: number }),
    );
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

  /**
   * Puts a picture from the Assets tab on the board with its middle at
   * `centre`, at its own size unless that is more than a wall's worth,
   * selected like a dropped card. The library is handed the bytes first,
   * so the picture is never a placeholder.
   */
  const addPicture = useCallback(
    async (fileName: string, centre: { x: number; y: number }) => {
      const api = apiRef.current;
      const file = await placePicture(fileName);
      if (!api || !file) return;
      const natural = await measurePicture(file.dataURL);
      const { width, height } = fittedSize(natural.width, natural.height, BOARD_PICTURE_MAX_SIDE);
      api.addFiles([file as BinaryFileData]);
      const [picture] = convertToExcalidrawElements([
        { type: "image", fileId: file.id as BinaryFileData["id"], x: centre.x - width / 2, y: centre.y - height / 2, width, height, status: "saved" },
      ]);
      api.updateScene({
        elements: [...api.getSceneElements(), picture],
        appState: { selectedElementIds: { [picture.id]: true } },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    },
    [placePicture],
  );

  /** Puts the video called `file` in the world's library on the board with its middle at `centre`, selected like a dropped card. */
  const addVideo = useCallback((file: string, centre: { x: number; y: number }) => {
    const api = apiRef.current;
    if (!api) return;
    const video = videoElement(file, centre);
    api.updateScene({
      elements: [...api.getSceneElements(), video],
      appState: { selectedElementIds: { [video.id]: true } },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  }, []);

  // ---- Sticky notes (Phase 32, step 10) ----

  const setEditing = useCallback((id: string | null) => {
    editingNoteRef.current = id;
    setEditingNoteId(id);
  }, []);

  /**
   * Makes every note as tall as its words need, in one edit, measuring
   * the words on the board itself: each note's box is in the drawing's
   * own units, so what its words take up on screen is what the box needs.
   * Measured here, at the moment of deciding, rather than from what the
   * notes reported earlier — a resize observer inside the library's embed
   * was seen to fall silent after the first report on CI's machine
   * (2026-09-20), and the words were taller than the box by then. Never
   * shorter: a note she made taller stays so. Left alone while the
   * library is mid-resize, since a box being dragged narrower wraps more
   * and would be grown back under the hand; the pointer-up hook runs this
   * again when the drag ends.
   */
  /** The height the note with `id` needs for its words, measured off the board, or null when it is not drawn. */
  const noteNeeds = useCallback(
    (id: string): number | null => {
      const words = surface?.querySelector<HTMLElement>(`.board-note[data-note-id="${CSS.escape(id)}"] .board-note-words`);
      return words ? words.offsetHeight + BOARD_NOTE_PADDING * 2 : null;
    },
    [surface],
  );

  const growNotes = useCallback(() => {
    growPendingRef.current = false;
    const api = apiRef.current;
    if (!api || !surface || api.getAppState().isResizing) return;
    const needs = new Map<string, number>();
    for (const words of surface.querySelectorAll<HTMLElement>(".board-note .board-note-words")) {
      const id = words.parentElement?.getAttribute("data-note-id");
      if (id) needs.set(id, words.offsetHeight + BOARD_NOTE_PADDING * 2);
    }
    let changed = false;
    let captured = false;
    const elements = api.getSceneElementsIncludingDeleted().map((element) => {
      const needed = needs.get(element.id);
      if (needed === undefined || element.isDeleted || !isNote(element) || element.height >= needed - 0.5) return element;
      changed = true;
      // Mid-edit the growth belongs to the edit; otherwise — a note dragged
      // narrower, a note just loaded — it is a change of its own.
      if (element.id === editingNoteRef.current) return withoutBump(element, { height: needed });
      captured = true;
      return newElementWith(element, { height: needed });
    });
    if (changed) api.updateScene({ elements, captureUpdate: captured ? CaptureUpdateAction.IMMEDIATELY : CaptureUpdateAction.EVENTUALLY });
  }, [surface]);

  /** Asks for the notes to be grown, once per tick however many ask, and never from inside a layout callback. */
  const scheduleGrow = useCallback(() => {
    if (growPendingRef.current) return;
    growPendingRef.current = true;
    window.setTimeout(growNotes, 0);
  }, [growNotes]);

  /**
   * The words of the note being written in, on every change: written to
   * the element at once so the note draws them, but with its version left
   * alone (see `withoutBump`), so the edit is one undo step and one write
   * when it ends. The box's growth goes in the same update, measured off
   * the box the keystroke just changed — not on a timer: under steady
   * typing on a slow machine the key events starve a timer of its turn,
   * and a note that grows "next tick" never grows at all (CI, 2026-09-20).
   */
  const onNoteEdit = useCallback(
    (id: string, lines: NoteLine[]) => {
      const api = apiRef.current;
      if (!api) return;
      noteDraftRef.current = lines;
      const needed = noteNeeds(id);
      api.updateScene({
        elements: api.getSceneElementsIncludingDeleted().map((element) => {
          const note = noteOf(element);
          if (element.id !== id || !note) return element;
          const height = needed !== null && needed > element.height ? needed : element.height;
          return withoutBump(element, { customData: { note: { ...note, lines } }, height });
        }),
        captureUpdate: CaptureUpdateAction.EVENTUALLY,
      });
    },
    [noteNeeds],
  );

  /** Writing ends: the words as they stand become one undoable edit, and the keyboard goes back to the board. */
  const endNoteEditing = useCallback(() => {
    const api = apiRef.current;
    const id = editingNoteRef.current;
    if (!api || id === null) return;
    const draft = noteDraftRef.current;
    noteDraftRef.current = null;
    setEditing(null);
    // The one bump of the edit: the words as they stand, and the height
    // the box grew to under them, captured together.
    api.updateScene({
      elements: api.getSceneElementsIncludingDeleted().map((element) => {
        const note = noteOf(element);
        return element.id === id && note && draft ? newElementWith(element, { customData: { note: { ...note, lines: draft } } }) : element;
      }),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    surface?.querySelector<HTMLElement>(".excalidraw-container")?.focus();
  }, [setEditing, surface]);

  /** Puts a note of `colour` down with its middle at `centre`, selected and ready to be written in. */
  const addNote = useCallback(
    (colour: NoteColour, centre: { x: number; y: number }) => {
      const api = apiRef.current;
      if (!api) return;
      endNoteEditing();
      const note = noteElement(colour, centre.x - BOARD_NOTE_SIZE / 2, centre.y - BOARD_NOTE_SIZE / 2);
      api.setActiveTool({ type: "selection" });
      api.updateScene({
        elements: [...api.getSceneElements(), note],
        appState: { selectedElementIds: { [note.id]: true } },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      setNoteColour(colour);
      noteDraftRef.current = null;
      setEditing(note.id);
      setPicker(null);
    },
    [endNoteEditing, setEditing],
  );

  /** Recolours every selected note, as one undoable edit. */
  const recolourNotes = useCallback(
    (colour: NoteColour) => {
      const api = apiRef.current;
      if (!api) return;
      const selectedIds = api.getAppState().selectedElementIds;
      api.updateScene({
        elements: api.getSceneElements().map((element) => {
          const note = noteOf(element);
          return selectedIds[element.id] && note ? newElementWith(element, { customData: { note: { ...note, colour } } }) : element;
        }),
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      setNoteColour(colour);
      setPicker(null);
    },
    [],
  );

  // A note still being written in when the board goes away — another
  // page opened, the world closed — is committed as it stands, through
  // the board's own change report: the library is on its way out by then
  // and would not report the edit itself.
  // The library empties its scene as it unmounts, before this cleanup
  // runs, so the drawing is remembered from its last change report rather
  // than asked for.
  const onChangeRef = useRef(onChange);
  const lastSceneRef = useRef<{ elements: readonly ExcalidrawElement[]; appState: Record<string, unknown>; files: Record<string, unknown> } | null>(null);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  // A layout effect, so its cleanup runs before the board hook's own
  // unmount flush and the words go out with it rather than after.
  useLayoutEffect(
    () => () => {
      const scene = lastSceneRef.current;
      const id = editingNoteRef.current;
      const draft = noteDraftRef.current;
      if (!scene || id === null || !draft) return;
      editingNoteRef.current = null;
      noteDraftRef.current = null;
      const elements = scene.elements.map((element) => {
        const note = noteOf(element);
        return element.id === id && note ? newElementWith(element, { customData: { note: { ...note, lines: draft } } }) : element;
      });
      onChangeRef.current(elements, scene.appState, scene.files);
    },
    [],
  );

  // ---- A page opened on the board (Phase 32, step 6) ----

  const setWriting = useCallback((id: string | null) => {
    writingCardRef.current = id;
    setWritingCardId(id);
  }, []);

  /** Writing is over: the box goes back to being a shape, and the keyboard to the board. The page has already saved itself. */
  const endWriting = useCallback(() => {
    if (writingCardRef.current === null) return;
    setWriting(null);
    surface?.querySelector<HTMLElement>(".excalidraw-container")?.focus();
  }, [setWriting, surface]);

  /**
   * Whether this card may be written in: not while its page is the one
   * viewed beside the board. Two editors on one tab would each save over
   * the other; the box stays drawn and follows the panel's writing instead.
   */
  const mayWrite = useCallback((element: { locked?: boolean } & Parameters<typeof cardPageId>[0]) => {
    return !element.locked && cardPageId(element) !== viewedPageRef.current;
  }, []);

  // The panel opening on the page being written in ends the writing.
  useEffect(() => {
    const api = apiRef.current;
    const id = writingCardRef.current;
    if (!api || id === null || viewedPageId === null) return;
    const card = api.getSceneElements().find((element) => element.id === id);
    if (card && cardPageId(card) === viewedPageId) endWriting();
  }, [viewedPageId, endWriting]);

  // ---- The highlighter (Phase 32, step 11) ----

  /**
   * Picks up the highlighter: the library's pen, with the pen's style put
   * aside and the highlighter's put in its place — wide, see-through, the
   * colour it was last used in. The pen tool stays in hand from stroke to
   * stroke, as the library's pen does; picking any other tool, or Escape,
   * puts the pen's style back (see `endHighlighting`).
   */
  const startHighlighting = useCallback(() => {
    const api = apiRef.current;
    if (!api || highlightingRef.current) return;
    const state = api.getAppState();
    penStyleRef.current = {
      currentItemStrokeColor: state.currentItemStrokeColor,
      currentItemStrokeWidth: state.currentItemStrokeWidth,
      currentItemOpacity: state.currentItemOpacity,
    };
    knownStrokesRef.current = new Set(api.getSceneElementsIncludingDeleted().map((element) => element.id));
    api.updateScene({
      appState: {
        currentItemStrokeColor: highlightColourRef.current,
        currentItemStrokeWidth: BOARD_HIGHLIGHT_WIDTH,
        currentItemOpacity: BOARD_HIGHLIGHT_OPACITY,
      },
    });
    api.setActiveTool({ type: "freedraw" });
    highlightingRef.current = true;
    setHighlighting(true);
  }, []);

  /** Puts the highlighter down: the pen gets its own style back, and the highlighter remembers its colour. */
  const endHighlighting = useCallback(() => {
    const api = apiRef.current;
    if (!api || !highlightingRef.current) return;
    highlightingRef.current = false;
    setHighlighting(false);
    highlightColourRef.current = api.getAppState().currentItemStrokeColor;
    if (penStyleRef.current) api.updateScene({ appState: penStyleRef.current });
    penStyleRef.current = null;
  }, []);

  /**
   * Marks the finished strokes in `ids` as highlights and sinks them under
   * the ink. Outside the undo history: the stroke itself was captured as
   * it was drawn, and one undo should take the stroke, not first its
   * place in the pile.
   */
  const sinkHighlights = useCallback((ids: ReadonlySet<string>) => {
    const api = apiRef.current;
    if (!api) return;
    const marked = api
      .getSceneElementsIncludingDeleted()
      .map((element) => (ids.has(element.id) ? newElementWith(element, { customData: { ...element.customData, highlight: true } }) : element));
    api.updateScene({ elements: sunkUnderInk(marked, ids, (element) => element.id), captureUpdate: CaptureUpdateAction.NEVER });
  }, []);

  /** Reads the Layers panel's rows off the board, if the panel is open and they have changed. */
  const refreshLayers = useCallback((elements: readonly ExcalidrawElement[], appState: UIAppState | AppState) => {
    if (!layersOpenRef.current) return;
    const rows = boardLayers(elements);
    const selected = Object.keys(appState.selectedElementIds)
      .filter((id) => appState.selectedElementIds[id])
      .sort();
    const signature = JSON.stringify([rows, selected]);
    if (signature === layersSignatureRef.current) return;
    layersSignatureRef.current = signature;
    setLayers({ rows, selected: new Set(selected) });
  }, []);

  const toggleLayers = useCallback(() => {
    const open = !layersOpenRef.current;
    layersOpenRef.current = open;
    setLayersOpen(open);
    if (!open) {
      layersSignatureRef.current = "";
      return;
    }
    const api = apiRef.current;
    if (api) refreshLayers(api.getSceneElementsIncludingDeleted(), api.getAppState());
  }, [refreshLayers]);

  /** Says something in the Layers panel for a moment — a move it would not make. */
  const sayInLayers = useCallback((notice: string) => {
    setLayersNotice(notice);
    if (layersNoticeTimerRef.current !== null) window.clearTimeout(layersNoticeTimerRef.current);
    layersNoticeTimerRef.current = window.setTimeout(() => setLayersNotice(null), 4000);
  }, []);
  useEffect(
    () => () => {
      if (layersNoticeTimerRef.current !== null) window.clearTimeout(layersNoticeTimerRef.current);
    },
    [],
  );

  /**
   * A row clicked: the shape is the selection, or with Shift joins it
   * (or leaves it). Brought on screen if none of it is, so the click is
   * seen to do something; and the keyboard goes to the board, so Delete
   * and the arrows act on what was just picked.
   */
  const selectLayer = useCallback(
    (id: string, additive: boolean) => {
      const api = apiRef.current;
      if (!api) return;
      const state = api.getAppState();
      const current = additive ? { ...state.selectedElementIds } : {};
      if (additive && current[id]) delete current[id];
      else current[id] = true;
      api.updateScene({ appState: { selectedElementIds: current, selectedGroupIds: {}, editingGroupId: null, activeEmbeddable: null } });
      const element = api.getSceneElements().find((entry) => entry.id === id);
      if (element && !additive && layerOffScreen(element, { scrollX: state.scrollX, scrollY: state.scrollY, zoom: state.zoom.value, width: state.width, height: state.height })) {
        api.scrollToContent(element, { animate: true, duration: 300 });
      }
      surface?.querySelector<HTMLElement>(".excalidraw")?.focus();
    },
    [surface],
  );

  /** A row dropped beside another: the shape's unit moves there in the drawing, as one undoable edit. */
  const moveLayer = useCallback(
    (movedId: string, targetId: string, side: "above" | "below") => {
      const api = apiRef.current;
      if (!api) return;
      const moved = movedLayer(api.getSceneElementsIncludingDeleted(), movedId, targetId, side);
      if (!moved) {
        sayInLayers("A shape goes into or out of a frame on the drawing, by where it is put.");
        return;
      }
      api.updateScene({ elements: moved, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
    },
    [sayInLayers],
  );

  /** Hides a shape — see-through and locked, as it was kept for showing again — or shows it. Hidden, it leaves the selection. */
  const toggleLayerHidden = useCallback((id: string) => {
    const api = apiRef.current;
    if (!api) return;
    let hiding = false;
    const elements = api.getSceneElementsIncludingDeleted().map((element) => {
      if (element.id !== id) return element;
      hiding = !isHidden(element);
      return newElementWith(element, hiding ? hiddenFields(element) : shownFields(element));
    });
    const selectedElementIds = { ...api.getAppState().selectedElementIds };
    delete selectedElementIds[id];
    api.updateScene({ elements, appState: hiding ? { selectedElementIds } : undefined, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  }, []);

  /** Locks a shape, or unlocks it — the library's own lock, from the row. */
  const toggleLayerLocked = useCallback((id: string) => {
    const api = apiRef.current;
    if (!api) return;
    const elements = api.getSceneElementsIncludingDeleted().map((element) => (element.id === id ? newElementWith(element, { locked: !element.locked }) : element));
    api.updateScene({ elements, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  }, []);

  // A new note on N, and Enter on a selected note to write in it — the
  // library's own Enter on a shape with words — or on a selected opened
  // page to write in it; the highlighter on Shift+P, the pen's key with a
  // shift, as its neighbour's is. All only when the keyboard is the
  // board's and not a box's.
  useEffect(() => {
    if (!surface) return;
    function onKeyDown(event: KeyboardEvent) {
      const api = apiRef.current;
      if (!api || isWritable(document.activeElement) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() === "n" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        addNote(noteColour, viewCentre(api.getAppState()));
      } else if (event.key.toLowerCase() === "p" && event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        if (highlightingRef.current) api.setActiveTool({ type: "selection" });
        else startHighlighting();
      } else if (event.key === "Enter") {
        const selectedId = soleSelection(api.getAppState());
        const selected = selectedId ? api.getSceneElements().find((element) => element.id === selectedId) : undefined;
        if (!selected || selected.locked) return;
        if (isNote(selected)) {
          event.preventDefault();
          event.stopPropagation();
          noteDraftRef.current = null;
          setEditing(selected.id);
        } else if (isOpenPageCard(selected) && mayWrite(selected)) {
          event.preventDefault();
          event.stopPropagation();
          setWriting(selected.id);
        }
      }
    }
    surface.addEventListener("keydown", onKeyDown);
    return () => surface.removeEventListener("keydown", onKeyDown);
  }, [surface, addNote, noteColour, setEditing, setWriting, mayWrite, startHighlighting]);

  /**
   * Puts a bookmark card for `url` on the board with its middle at
   * `centre`, drawn from its address at once and from what the page says
   * about itself when that arrives. The card is selected like a dropped
   * one; the page's answer is written into it outside the undo history,
   * so an undo takes the card, not the answer.
   */
  const addBookmark = useCallback(
    (url: string, centre: { x: number; y: number }) => {
      const api = apiRef.current;
      if (!api) return;
      const card = bookmarkCardElement(placeholderBookmark(url), centre.x - BOARD_CARD_WIDTH / 2, centre.y - BOARD_CARD_HEIGHT / 2);
      api.updateScene({
        elements: [...api.getSceneElements(), card],
        appState: { selectedElementIds: { [card.id]: true } },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      void fetchBookmark(url).then((bookmark) => {
        const current = apiRef.current;
        if (!current) return;
        current.updateScene({
          elements: current.getSceneElements().map((element) => (element.id === card.id ? newElementWith(element, { customData: { bookmark } }) : element)),
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      });
    },
    [fetchBookmark],
  );

  // A web address pasted on the board is a bookmark card where the mouse
  // is, or mid-view when the mouse is elsewhere. Taken ahead of the
  // library's own paste, which would make it a line of text, and only when
  // the paste is a lone address with nothing else on the clipboard and the
  // keyboard is the board's — an address pasted into the picker's box is
  // the picker's.
  useEffect(() => {
    if (!surface) return;
    function onMouseMove(event: MouseEvent) {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    }
    function onPaste(event: ClipboardEvent) {
      const api = apiRef.current;
      const data = event.clipboardData;
      if (!api || !data || data.files.length > 0 || isWritable(document.activeElement)) return;
      const url = webAddressIn(data.getData("text/plain"));
      if (!url) return;
      event.preventDefault();
      event.stopPropagation();
      const mouse = mouseRef.current;
      const under = mouse ? document.elementFromPoint(mouse.x, mouse.y) : null;
      const overCanvas = !!under && under instanceof HTMLCanvasElement && !!surface?.contains(under);
      addBookmark(url, overCanvas && mouse ? viewportCoordsToSceneCoords({ clientX: mouse.x, clientY: mouse.y }, api.getAppState()) : viewCentre(api.getAppState()));
    }
    surface.addEventListener("mousemove", onMouseMove);
    surface.addEventListener("paste", onPaste, true);
    return () => {
      surface.removeEventListener("mousemove", onMouseMove);
      surface.removeEventListener("paste", onPaste, true);
    };
  }, [surface, addBookmark]);

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
  // where it was dropped, and a picture dragged out of the Assets tab
  // becomes a picture there. Listened for in the capture phase on the
  // board's own box, ahead of the library's drop handler, which is for
  // files from outside the app and would otherwise be handed a drag it has
  // no answer to.
  useEffect(() => {
    if (!surface) return;
    // The Assets tab's drag is a picture or a video by its name (step
    // 12); a drag of files from outside the app is the board's when any of
    // them is a video, which the library has no answer to — its own drop
    // handler takes pictures, and is left every drag without a video.
    const carried = (event: DragEvent): "page" | "picture" | "videos" | null => {
      const types = event.dataTransfer?.types ?? [];
      if (types.includes(PAGE_DRAG_TYPE)) return "page";
      if (types.includes(ASSET_DRAG_TYPE)) return "picture";
      if (types.includes("Files") && [...(event.dataTransfer?.items ?? [])].some((item) => item.kind === "file" && item.type.startsWith("video/"))) return "videos";
      return null;
    };
    function onDragOver(event: DragEvent) {
      if (!carried(event) || !event.dataTransfer) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
    }
    function onDrop(event: DragEvent) {
      const api = apiRef.current;
      const kind = carried(event);
      if (!api || !kind || !event.dataTransfer) return;
      event.preventDefault();
      event.stopPropagation();
      const at = viewportCoordsToSceneCoords(event, api.getAppState());
      if (kind === "page") addCards(draggedPageIds(event.dataTransfer.getData(PAGE_DRAG_TYPE)), at);
      else if (kind === "videos") {
        // Each video into the library, then onto the board where it was
        // dropped; several land stepped like several cards do.
        const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("video/") || isVideoFileName(file.name));
        files.forEach((file, index) => {
          void placeVideo(file).then((name) => {
            if (name) addVideo(name, { x: at.x + index * BOARD_CARD_CASCADE, y: at.y + index * BOARD_CARD_CASCADE });
          });
        });
      } else {
        const fileName = event.dataTransfer.getData(ASSET_DRAG_TYPE);
        if (isVideoFileName(fileName)) addVideo(fileName, at);
        else void addPicture(fileName, at);
      }
    }
    surface.addEventListener("dragover", onDragOver, true);
    surface.addEventListener("drop", onDrop, true);
    return () => {
      surface.removeEventListener("dragover", onDragOver, true);
      surface.removeEventListener("drop", onDrop, true);
    };
  }, [surface, addCards, addPicture, addVideo, placeVideo]);

  return (
    <>
    <Excalidraw
      excalidrawAPI={(api) => {
        apiRef.current = api;
        // The pictures come from the world's library, after the drawing is
        // up; until they land each is the library's own placeholder.
        void readPictures().then((files) => {
          if (apiRef.current === api && files.length > 0) api.addFiles(files as BinaryFileData[]);
        });
      }}
      initialData={initialData as unknown as ExcalidrawInitialDataState}
      theme={theme}
      onChange={(elements, appState, files) => {
        lastSceneRef.current = { elements, appState: appState as unknown as Record<string, unknown>, files };
        refreshLayers(elements, appState);
        // The library shows its own link popup for any selected embed, with
        // the raw page address in it. For a card the address is not for
        // reading, so the board is told and its stylesheet hides the popup;
        // the top-right button is where a card's page is named.
        const selectedId = soleSelection(appState);
        const selected = selectedId ? elements.find((element) => element.id === selectedId) : undefined;
        onCardSelected(!!selected && (isPageCard(selected) || isNote(selected) || isVideo(selected)));
        // A text box being written in (step 14): the toolbar over it comes
        // and goes with the library's editor, and follows its textarea.
        const editingText = appState.editingTextElement?.id ?? null;
        if (editingText !== editingTextRef.current) {
          editingTextRef.current = editingText;
          setEditingTextId(editingText);
        }
        if (editingText !== null) placeTextTools();
        // Writing in a note ends when the note stops being selected — a
        // click on the canvas, on another shape, or its deletion.
        // Ended from outside this callback, for the woken state's reason
        // below: the commit is an `updateScene` of its own.
        const editing = editingNoteRef.current;
        if (editing !== null) {
          const still = elements.find((element) => element.id === editing);
          if (!still || still.isDeleted || !appState.selectedElementIds[editing]) {
            // For *this* note: by the time this runs a new note may be the
            // one being written in, and that one is not to be ended.
            window.setTimeout(() => {
              if (editingNoteRef.current === editing) endNoteEditing();
            }, 0);
          }
        }
        // The highlighter is down the moment any other tool is up; while it
        // is up, each stroke it finishes is sunk under the ink. Both from
        // outside this callback, for the woken state's reason below.
        if (highlightingRef.current) {
          if (appState.activeTool.type !== "freedraw") {
            window.setTimeout(endHighlighting, 0);
          } else {
            const drawing = appState.newElement?.id;
            const fresh = new Set<string>();
            for (const element of elements) {
              if (element.type === "freedraw" && !element.isDeleted && element.id !== drawing && !knownStrokesRef.current.has(element.id) && !isHighlight(element)) {
                fresh.add(element.id);
                knownStrokesRef.current.add(element.id);
              }
            }
            if (fresh.size > 0) window.setTimeout(() => sinkHighlights(fresh), 0);
          }
        }
        // Writing in an opened page ends the same way, and also when the
        // box is shrunk back to a card.
        const writing = writingCardRef.current;
        if (writing !== null) {
          const still = elements.find((element) => element.id === writing);
          if (!still || still.isDeleted || !appState.selectedElementIds[writing] || !isOpenPageCard(still)) {
            window.setTimeout(() => {
              if (writingCardRef.current === writing) endWriting();
            }, 0);
          }
        }
        // The library "wakes" an embed clicked in its middle, a hundred
        // milliseconds after the click, and then refuses to drag it from the
        // canvas — the pointer is meant to be the iframe's. A card's box takes
        // no pointer events (board.css), so a woken card would be stuck. The
        // state is put back, but only the *woken* state and only from outside
        // this callback: the hover state flickers on every pointer move over a
        // selected card, and an `updateScene` from inside the change report,
        // mid-gesture, made the library drop the next box selection's first
        // element.
        // A woken *note* is a note to write in: the library's double-click
        // and second click in the middle are how writing starts, and its
        // woken state is put back the same way, since the app keeps its own.
        // A woken *opened page* is a page to write in, by the same two gestures.
        const woken = appState.activeEmbeddable;
        if (woken?.state === "active" && (isPageCard(woken.element) || isBookmarkCard(woken.element) || isNote(woken.element))) {
          const meant = !woken.element.locked && !lastGestureDraggedRef.current && !lastClickSelectedRef.current;
          if (isNote(woken.element) && meant && editingNoteRef.current !== woken.element.id) {
            noteDraftRef.current = null;
            setEditing(woken.element.id);
          } else if (isOpenPageCard(woken.element) && meant && mayWrite(woken.element) && writingCardRef.current !== woken.element.id) {
            setWriting(woken.element.id);
          }
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
        // A note's link only says it is a note, and a video's that it is a
        // video; the links in a note's words are the note's own to open.
        if (element.link && !isNote(element) && !isVideo(element)) links.openLink(element.link);
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
        lastGestureDraggedRef.current = pointerDownState.drag.hasOccurred;
        lastClickSelectedRef.current = pointerDownState.hit.wasAddedToSelection;
        // A note dragged narrower wraps more; now that the hand is off it,
        // it can grow to fit.
        if (pointerDownState.drag.hasOccurred) {
          window.setTimeout(growNotes, 0);
          return;
        }
        const elements = apiRef.current?.getSceneElements() ?? [];
        const hit = pointerDownState.hit.element;
        // A link among a text box's words opens on a click on the link
        // itself (step 14) — a click, since a drag moves the box as ever.
        const wordsLink = wordsLinkAt(elements, pointerDownState.origin);
        if (wordsLink) {
          links.openLink(wordsLink);
          return;
        }
        // The library skips locked shapes and reports whatever lies beneath,
        // so the button wins whenever it is drawn above what was hit.
        const button = lockedButtonAt(elements, pointerDownState.origin);
        if (button && (!hit || button.index > elements.findIndex((element) => element.id === hit.id))) {
          links.openLink(button.link);
          return;
        }
        if (!hit || pointerDownState.hit.wasAddedToSelection) return;
        // A card opened as its page is written in on the second click, not
        // left for the page (the woken state above); its Open button is the
        // way there.
        const pageId = isOpenPageCard(hit) ? null : cardPageId(hit);
        if (pageId) links.openLink(`${BOARD_PAGE_LINK_PREFIX}${pageId}`);
        else if (isBookmarkCard(hit) && hit.link) links.openLink(hit.link);
      }}
      // The cursor says a locked linked shape is a button before it is
      // clicked. Told on every pointer move; the test is a walk over the
      // locked shapes, which are few.
      onPointerUpdate={({ pointer }) => {
        const api = apiRef.current;
        const elements = api?.getSceneElements() ?? [];
        onOverButton(!!api && (lockedButtonAt(elements, pointer) !== null || wordsLinkAt(elements, pointer) !== null));
      }}
      // An embed whose address is a page link is a card of ours, and so is
      // one whose address is a web page: a bookmark. The library asks by
      // the address alone and asks once, so every web address is taken —
      // an embed of the library's own with one, from its embed tool, keeps
      // its own drawing, since the card is drawn only for a bookmark.
      validateEmbeddable={(link) => (link.startsWith(BOARD_PAGE_LINK_PREFIX) || link === BOARD_NOTE_LINK || link === BOARD_VIDEO_LINK || /^https?:\/\//i.test(link) ? true : undefined)}
      renderEmbeddable={(element) => {
        // Hidden by the Layers panel: the box is see-through, and nothing is
        // drawn in it either, so nothing in it can take a click or a wheel
        // — an opened page's editor, or a note's links, would, invisibly.
        if (isHidden(element)) return <div className="board-card board-card-hidden" data-testid="board-card-hidden" />;
        const pageId = cardPageId(element);
        if (pageId) {
          return (
            <BoardPageCard
              pageId={pageId}
              width={element.width}
              height={element.height}
              // Locked, an opened page is open for writing without being
              // woken — the library will not hit a locked shape, so nothing
              // could wake it — and it cannot be moved, so the box may as
              // well be hers. Never while its page is viewed beside the
              // board: one editor per page.
              writing={(writingCardId === element.id || !!element.locked) && pageId !== viewedPageId}
              onOpen={() => links.openLink(`${BOARD_PAGE_LINK_PREFIX}${pageId}`)}
              onDone={endWriting}
              onOpenLink={links.openLink}
            />
          );
        }
        const bookmark = bookmarkOf(element);
        if (bookmark) return <BoardBookmarkCard bookmark={bookmark} width={element.width} height={element.height} />;
        const video = videoOf(element);
        if (video) return <BoardVideo file={video.file} />;
        const note = noteOf(element);
        if (note) {
          return (
            <BoardNote
              id={element.id}
              note={note}
              editing={editingNoteId === element.id}
              editorRef={noteEditorRef}
              onEdit={onNoteEdit}
              onMeasure={scheduleGrow}
              onDone={endNoteEditing}
              onWantLink={() => setPicker({ mode: "link", query: "" })}
              onOpenLink={links.openLink}
            />
          );
        }
        return null;
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
        // A note's link says it is a note, so the link button is for the
        // words instead: shown while she is writing in it, and its picks go
        // into the words at the caret. A note not being written in has no
        // link button at all.
        const writingNote = !!selected && isNote(selected) && editingNoteId === selected.id;
        // A text box being written in has no selection, so no link button
        // of its own up here; the picker is opened from the toolbar over
        // the words, and its picks go into them (step 14).
        const writingWords = editingTextId !== null;
        const linkable = !!selected && (!isNote(selected) || writingNote);
        const selectedNotes = apiRef.current?.getSceneElements().filter((element) => appState.selectedElementIds[element.id] && isNote(element)) ?? [];
        const selectedNoteColour = selectedNotes.length > 0 ? (noteOf(selectedNotes[0])?.colour ?? DEFAULT_NOTE_COLOUR) : null;
        const typedAddress = picker?.mode === "link" && (writingNote || writingWords) ? webAddressIn(picker.query) : null;
        const pickLink = (href: string, text: string) => {
          if (writingNote) {
            noteEditorRef.current?.insertLink(href, text);
            setPicker(null);
          } else if (writingWords) {
            linkWords(href, text);
          } else if (selected) {
            setLink(selected.id, href);
          }
        };
        const pickerLabel =
          picker?.mode === "put"
            ? "Put a page on this board"
            : picker?.mode === "note"
              ? "Add a note in a colour"
              : picker?.mode === "colour"
                ? "Colour the selected notes"
                : writingNote || writingWords
                  ? "Link the words to a page"
                  : "Link this shape to a page";
        const swatches = (mode: "note" | "colour") => (
          <div className="board-picker board-note-picker" role="dialog" aria-label={pickerLabel}>
            <div className="board-note-swatches">
              {NOTE_COLOURS.map((colour) => (
                <button
                  type="button"
                  key={colour}
                  className="board-note-swatch"
                  data-colour={colour}
                  aria-label={mode === "note" ? `Add a ${noteColourName(colour)} Note` : noteColourName(colour)}
                  aria-pressed={mode === "colour" ? colour === selectedNoteColour : undefined}
                  title={noteColourName(colour)}
                  onClick={() => (mode === "note" ? addNote(colour, viewCentre(apiRef.current!.getAppState())) : recolourNotes(colour))}
                />
              ))}
            </div>
          </div>
        );
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
              <button
                type="button"
                className="board-top-button board-note-button"
                aria-expanded={picker?.mode === "note"}
                onClick={() => setPicker((open) => (open?.mode === "note" ? null : { mode: "note", query: "" }))}
                title="Add a Note (N)"
                aria-label="Add a sticky note to this board"
              >
                <StickyNote size={16} />
                <span className="board-link-label">Note</span>
              </button>
              <button
                type="button"
                className="board-top-button board-highlighter-button"
                aria-pressed={highlighting}
                onClick={() => (highlighting ? apiRef.current?.setActiveTool({ type: "selection" }) : startHighlighting())}
                title="Highlighter (Shift+P)"
                aria-label="Mark a region with the highlighter"
              >
                <Highlighter size={16} />
                <span className="board-link-label">Highlighter</span>
              </button>
              {selectedNoteColour !== null && (
                <button
                  type="button"
                  className="board-top-button board-colour-button"
                  data-colour={selectedNoteColour}
                  aria-expanded={picker?.mode === "colour"}
                  onClick={() => setPicker((open) => (open?.mode === "colour" ? null : { mode: "colour", query: "" }))}
                  title="Note Colour"
                  aria-label="Change the colour of the selected notes"
                >
                  <span className="board-colour-dot" />
                  <span className="board-link-label">Colour</span>
                </button>
              )}
              {/* A selected page card's page, viewed beside the board — LK's
                  View, the second of its three ways into a card's page. */}
              {selectedIsCard && selected && (
                <button
                  type="button"
                  className="board-top-button board-view-button"
                  aria-pressed={viewedPageId !== null && cardPageId(selected) === viewedPageId}
                  onClick={() => {
                    const pageId = cardPageId(selected);
                    if (pageId) onViewPage(pageId);
                  }}
                  title="View this page beside the board"
                  aria-label="View this page beside the board"
                >
                  <PanelLeftOpen size={16} />
                  <span className="board-link-label">View</span>
                </button>
              )}
              {/* The Layers panel, on the board's right: a list of everything
                  on it, top to bottom. */}
              <button
                type="button"
                className="board-top-button board-layers-button"
                aria-pressed={layersOpen}
                onClick={toggleLayers}
                title="Layers"
                aria-label="Show the Layers panel: everything on this board, top to bottom"
              >
                <Layers size={16} />
                <span className="board-link-label">Layers</span>
              </button>
              {linkable && (
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
              {picker?.mode === "note" && swatches("note")}
              {picker?.mode === "colour" && swatches("colour")}
              {(picker?.mode === "put" || picker?.mode === "link") && (
                // Writing words, the picker wears the library's own class for a
                // popup with the keyboard, so the library's editor does not take
                // the keyboard back from it on the next redraw.
                <div className={writingWords ? "board-picker properties-content" : "board-picker"} role="dialog" aria-label={pickerLabel}>
                  <input
                    type="text"
                    className="property-field-input"
                    placeholder={(writingNote || writingWords) && picker.mode === "link" ? "Search pages, or paste an address…" : "Search pages…"}
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
                      if (event.key === "Escape") {
                        setPicker(null);
                        if (writingNote) noteEditorRef.current?.focus();
                        else if (writingWords) backToWords();
                      }
                      if (event.key === "Enter" && picker.mode === "link" && typedAddress) pickLink(typedAddress, typedAddress);
                      else if (event.key === "Enter" && candidates.length > 0) {
                        if (picker.mode === "put") putPageOn(candidates[0].id);
                        else pickLink(links.pageLinkFor(candidates[0].id), candidates[0].name);
                      }
                    }}
                    onKeyUp={(event) => event.stopPropagation()}
                  />
                  {typedAddress && (
                    <button type="button" className="board-picker-row" onClick={() => pickLink(typedAddress, typedAddress)}>
                      <Link2 size={14} />
                      <span className="board-picker-name">Link to {typedAddress}</span>
                    </button>
                  )}
                  {picker.query.trim() && candidates.length === 0 && !typedAddress && <p className="board-picker-empty">No page by that name.</p>}
                  {candidates.map((candidate) => (
                    <button
                      type="button"
                      key={candidate.id}
                      className="board-picker-row"
                      onClick={() => {
                        if (picker.mode === "put") putPageOn(candidate.id);
                        else pickLink(links.pageLinkFor(candidate.id), candidate.name);
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
    {/* The toolbar over a text box being written in (step 14): the marks
        around the selected words, and a link for them. Its buttons take no
        focus, so the keyboard stays in the words. */}
    {editingTextId !== null && (
      <div className="board-text-tools" ref={textToolsRef} role="toolbar" aria-label="Text style" data-testid="board-text-tools">
        <button type="button" className="board-text-tool" title="Bold (Ctrl+B)" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => markWords(BOLD_MARK)}>
          <Bold size={14} />
        </button>
        <button type="button" className="board-text-tool" title="Italic (Ctrl+I)" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => markWords(ITALIC_MARK)}>
          <Italic size={14} />
        </button>
        <button type="button" className="board-text-tool" title="Link (Ctrl+K)" aria-label="Link" aria-expanded={picker?.mode === "link"} onMouseDown={(event) => event.preventDefault()} onClick={wantWordsLink}>
          <Link2 size={14} />
        </button>
      </div>
    )}
    {/* Beside the library's element, not inside it: the board's grid places
        the panel on the right by name. */}
    {layersOpen && (
      <BoardLayersPanel
        layers={layers.rows}
        selectedIds={layers.selected}
        onSelect={selectLayer}
        onMove={moveLayer}
        onToggleHidden={toggleLayerHidden}
        onToggleLocked={toggleLayerLocked}
        onClose={toggleLayers}
        notice={layersNotice}
      />
    )}
    </>
  );
}
