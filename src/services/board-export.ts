// A board in the exports (Phase 32, step 7): what the picture of one is
// made from, and where an export keeps it.
//
// **The picture is the library's own export, of a drawing the app has
// made drawable first.** A page card, a note, a bookmark and a video are
// embeds the app draws on screen, and the library's picture export draws
// an embed it does not know as an empty box. So before the picture is
// taken each of those is swapped for shapes the library does draw — a
// filled box with the card's page name, the note's words in the note's
// colour, the bookmark's title, the video's file — in the same place, at
// the same size, turned the same way. The swap is in `exportableElements`;
// the library's converter is handed in, so this file stays plain and
// testable and never imports the library.
//
// **A board is in the Markdown vault and the site as a PNG**, one per
// board, named after the board page's id so two boards with one name
// never collide. The one big Markdown file carries it inline as a data
// address, since one file has nowhere else to put it. The `.lk` export
// leaves boards out and says so: LegendKeeper's file has no shape for a
// drawing.
import { BOARD_EXPORT_CARD_FILL, BOARD_EXPORT_CARD_STROKE, BOARD_EXPORT_FONT_SIZE, BOARD_EXPORT_INK, BOARD_NOTE_FILLS } from "../constants/board";
import { BOARD_TEMPLATE_KEY, type Board, type Node } from "../constants/schema";
import { isNote, noteOf, noteText } from "./board-notes";
import { encodeDataUrl } from "./board-pictures";
import { cardPageId } from "./board-service";
import { videoOf } from "./board-videos";
import { bookmarkOf } from "./bookmark-service";

/** The pictures of the boards in an export, by board page id, as PNG bytes. */
export type BoardPictures = Record<string, Uint8Array>;

/** Whether `node` is a board page. */
export function isBoardPage(node: Node): boolean {
  return node.templateKey === BOARD_TEMPLATE_KEY;
}

/** Whether a board has anything to draw a picture of. */
export function boardHasDrawing(board: Board | null | undefined): boolean {
  return !!board && board.elements.some((element) => !(element as { isDeleted?: boolean }).isDeleted);
}

/** The file an export keeps a board's picture in, named by the page's id. */
export function boardPictureFileName(nodeId: string): string {
  return `board-${nodeId}.png`;
}

/** A board's picture as a `data:` address, for the one big Markdown file. */
export function boardPictureDataUrl(bytes: Uint8Array): string {
  return encodeDataUrl(bytes, "image/png");
}

/** The little of an embed a swap is made from. */
type EmbedLike = {
  id: string;
  type?: string;
  isDeleted?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  opacity?: number;
};

/**
 * A shape for the library's converter to make: the skeleton shape the
 * library's `convertToExcalidrawElements` takes, with a label the converter
 * binds to it as wrapped text.
 */
export type ExportSkeleton = {
  type: "rectangle";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  strokeColor: string;
  strokeWidth: number;
  /** Drawn clean, as the app draws a card, rather than in the library's sketched hand. */
  roughness: 0;
  backgroundColor: string;
  fillStyle: "solid";
  roundness: { type: number } | null;
  label: { text: string; fontSize: number; textAlign: "left" | "center"; verticalAlign: "top" | "middle"; strokeColor: string };
};

/**
 * The shape an app-drawn embed is swapped for in the picture, or null for
 * an element that is not one. `pageName` is the name of a page by id, or
 * null for a page that is gone.
 */
export function exportSkeletonFor(element: unknown, pageName: (id: string) => string | null): ExportSkeleton | null {
  const embed = element as EmbedLike;
  if (embed.type !== "embeddable") return null;
  const base = {
    type: "rectangle" as const,
    id: embed.id,
    x: embed.x,
    y: embed.y,
    width: embed.width,
    height: embed.height,
    angle: embed.angle ?? 0,
    opacity: embed.opacity ?? 100,
    strokeColor: BOARD_EXPORT_CARD_STROKE,
    strokeWidth: 1,
    roughness: 0 as const,
    fillStyle: "solid" as const,
  };
  const label = (text: string, textAlign: "left" | "center", verticalAlign: "top" | "middle") => ({
    text,
    fontSize: BOARD_EXPORT_FONT_SIZE,
    textAlign,
    verticalAlign,
    strokeColor: BOARD_EXPORT_INK,
  });
  const pageId = cardPageId(element);
  if (pageId) {
    return { ...base, backgroundColor: BOARD_EXPORT_CARD_FILL, roundness: { type: 3 }, label: label(pageName(pageId) ?? "A page that is gone", "center", "middle") };
  }
  if (isNote(element)) {
    const note = noteOf(element);
    return {
      ...base,
      strokeColor: "transparent",
      backgroundColor: BOARD_NOTE_FILLS[note?.colour ?? ""] ?? BOARD_NOTE_FILLS.yellow,
      roundness: null,
      label: label(note ? noteText(note) : "", "left", "top"),
    };
  }
  const video = videoOf(element);
  if (video) return { ...base, backgroundColor: BOARD_EXPORT_CARD_FILL, roundness: { type: 3 }, label: label(`Video — ${video.file}`, "center", "middle") };
  const bookmark = bookmarkOf(element);
  if (bookmark) return { ...base, backgroundColor: BOARD_EXPORT_CARD_FILL, roundness: { type: 3 }, label: label(`${bookmark.title}\n${bookmark.site}`, "center", "middle") };
  return null;
}

/**
 * The board's elements with every app-drawn embed swapped for what
 * `convert` makes of its skeleton — the library's converter, which turns
 * a labelled rectangle into the rectangle and its bound text. Order is
 * kept, so what was on top stays on top; deleted elements are left out.
 */
export function exportableElements<T>(elements: readonly T[], pageName: (id: string) => string | null, convert: (skeleton: ExportSkeleton) => T[]): T[] {
  const out: T[] = [];
  for (const element of elements) {
    if ((element as { isDeleted?: boolean }).isDeleted) continue;
    const skeleton = exportSkeletonFor(element, pageName);
    if (skeleton) out.push(...convert(skeleton));
    else out.push(element);
  }
  return out;
}
