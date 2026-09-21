// The Layers panel's list: everything on a board from top to bottom, each
// with a name, and the moves the panel makes on the drawing. Phase 32,
// step 15.
//
// **This is the fourth named reading of an element's fields, and the
// widest.** `board-service.ts` reads a link, a `customData`, and a box; a
// layer needs a shape's kind, its words, which frame it sits in and which
// text is bound to it — the library's own vocabulary, read here in one
// place and nowhere above it. Read only: nothing here writes a field the
// library did not define, apart from the `hidden` mark on `customData`,
// which is the app's own.
//
// **The order is the library's.** A board draws its elements in list order,
// the last on top; the panel shows that list reversed, so the top row is
// the top shape. A frame's shapes sit above the frame in the drawing — the
// library keeps them there — and the panel lists them under the frame's
// row, indented, because a frame is a container and that is how a
// container reads. Moving a row is moving the shape's whole unit (a shape
// and the words bound to it, a frame and everything in it) to beside the
// row it was dropped on, in the drawing's list; the library re-numbers.
import { isNote, noteOf, noteText } from "./board-notes";
import { cardPageId, isHidden, isHighlight, isPageCard } from "./board-service";
import { videoOf } from "./board-videos";
import { bookmarkOf } from "./bookmark-service";

export type LayerKind =
  | "page"
  | "bookmark"
  | "note"
  | "video"
  | "text"
  | "picture"
  | "frame"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "arrow"
  | "line"
  | "drawing"
  | "highlight"
  | "shape";

export type BoardLayer = {
  id: string;
  kind: LayerKind;
  /**
   * What the row says. For a page card this is empty and `pageId` is set:
   * the page's name is looked up live, so a rename shows at once.
   */
  name: string;
  pageId: string | null;
  locked: boolean;
  hidden: boolean;
  /** The frame this sits inside, if any: its row is indented under the frame's. */
  frameId: string | null;
};

/** The little of an element a layer is read from. */
type ElementLike = {
  id: string;
  type?: string;
  isDeleted?: boolean;
  locked?: boolean;
  opacity?: number;
  text?: string;
  name?: string | null;
  containerId?: string | null;
  frameId?: string | null;
  customData?: Record<string, unknown>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

/** What each kind is called when a shape has no words of its own. */
export function layerKindName(kind: LayerKind): string {
  switch (kind) {
    case "page":
      return "Page";
    case "bookmark":
      return "Bookmark";
    case "note":
      return "Note";
    case "video":
      return "Video";
    case "text":
      return "Text";
    case "picture":
      return "Picture";
    case "frame":
      return "Frame";
    case "rectangle":
      return "Rectangle";
    case "ellipse":
      return "Ellipse";
    case "diamond":
      return "Diamond";
    case "arrow":
      return "Arrow";
    case "line":
      return "Line";
    case "drawing":
      return "Drawing";
    case "highlight":
      return "Highlight";
    default:
      return "Shape";
  }
}

function kindOf(element: ElementLike): LayerKind {
  if (isPageCard(element)) return "page";
  if (isNote(element)) return "note";
  if (videoOf(element)) return "video";
  if (bookmarkOf(element)) return "bookmark";
  switch (element.type) {
    case "text":
      return "text";
    case "image":
      return "picture";
    case "frame":
    case "magicframe":
      return "frame";
    case "rectangle":
      return "rectangle";
    case "ellipse":
      return "ellipse";
    case "diamond":
      return "diamond";
    case "arrow":
      return "arrow";
    case "line":
      return "line";
    case "freedraw":
      return isHighlight(element) ? "highlight" : "drawing";
    default:
      return "shape";
  }
}

/** The first line of some words, trimmed, or empty. */
function firstLine(text: string | undefined): string {
  return (text ?? "").split("\n")[0].trim();
}

/**
 * Everything on the board as rows, top to bottom. Words bound to a shape
 * are the shape's name rather than a row of their own; a frame's shapes
 * follow the frame's row. Deleted elements are not on the board.
 */
export function boardLayers(elements: readonly unknown[]): BoardLayer[] {
  const live = (elements as ElementLike[]).filter((element) => !element.isDeleted);
  const byId = new Map(live.map((element) => [element.id, element]));
  // The words bound to each shape, by the shape's id.
  const boundWords = new Map<string, string>();
  for (const element of live) {
    if (element.type === "text" && element.containerId && byId.has(element.containerId)) {
      boundWords.set(element.containerId, firstLine(element.text));
    }
  }
  const row = (element: ElementLike): BoardLayer => {
    const kind = kindOf(element);
    const frameId = element.frameId && byId.has(element.frameId) ? element.frameId : null;
    let name = "";
    switch (kind) {
      case "page":
        break;
      case "note": {
        const note = noteOf(element);
        name = firstLine(note ? noteText(note) : "");
        break;
      }
      case "video":
        name = videoOf(element)?.file ?? "";
        break;
      case "bookmark": {
        const bookmark = bookmarkOf(element);
        name = bookmark?.title || bookmark?.url || "";
        break;
      }
      case "text":
        name = firstLine(element.text);
        break;
      case "frame":
        name = (element.name ?? "").trim();
        break;
      default:
        name = boundWords.get(element.id) ?? "";
    }
    return {
      id: element.id,
      kind,
      name: name || (kind === "page" ? "" : layerKindName(kind)),
      pageId: kind === "page" ? cardPageId(element) : null,
      locked: element.locked === true,
      hidden: isHidden(element),
      frameId,
    };
  };
  // Top to bottom: the list reversed. A shape's bound words are not a row;
  // a frame's shapes wait for the frame's row and follow it.
  const topDown = [...live].reverse().filter((element) => !(element.type === "text" && element.containerId && byId.has(element.containerId)));
  const rows: BoardLayer[] = [];
  for (const element of topDown) {
    if (element.frameId && byId.has(element.frameId)) continue;
    rows.push(row(element));
    if (element.type === "frame" || element.type === "magicframe") {
      for (const inner of topDown) {
        if (inner.frameId === element.id) rows.push(row(inner));
      }
    }
  }
  return rows;
}

/**
 * The ids that move with `id`: the element, the words bound to it, and —
 * for a frame — everything inside it with their bound words. The unit a
 * row stands for.
 */
export function layerUnit(elements: readonly unknown[], id: string): Set<string> {
  const live = (elements as ElementLike[]).filter((element) => !element.isDeleted);
  const unit = new Set<string>([id]);
  const head = live.find((element) => element.id === id);
  if (head && (head.type === "frame" || head.type === "magicframe")) {
    for (const element of live) if (element.frameId === id) unit.add(element.id);
  }
  for (const element of live) {
    if (element.type === "text" && element.containerId && unit.has(element.containerId)) unit.add(element.id);
  }
  return unit;
}

/**
 * The elements with `movedId`'s unit put just above or below `targetId`'s
 * in the drawing — `side` is the panel's: "above" is nearer the top row,
 * so later in the list. Null when the move is not one the panel makes:
 * onto itself or into its own unit, or between a frame and the outside,
 * since which frame a shape is in is decided on the drawing, by where it
 * is put. Everything else keeps its order; deleted elements stay where
 * they are.
 */
export function movedLayer<T>(elements: readonly T[], movedId: string, targetId: string, side: "above" | "below"): T[] | null {
  if (movedId === targetId) return null;
  const like = elements as unknown as readonly ElementLike[];
  const moved = like.find((element) => element.id === movedId);
  const target = like.find((element) => element.id === targetId);
  if (!moved || !target || moved.isDeleted || target.isDeleted) return null;
  if ((moved.frameId ?? null) !== (target.frameId ?? null)) return null;
  const unit = layerUnit(elements, movedId);
  if (unit.has(targetId)) return null;
  const targetUnit = layerUnit(elements, targetId);
  const lifted = elements.filter((element) => unit.has((element as unknown as ElementLike).id));
  const rest = elements.filter((element) => !unit.has((element as unknown as ElementLike).id));
  let first = -1;
  let last = -1;
  rest.forEach((element, index) => {
    if (!targetUnit.has((element as unknown as ElementLike).id)) return;
    if (first === -1) first = index;
    last = index;
  });
  if (first === -1) return null;
  const at = side === "above" ? last + 1 : first;
  return [...rest.slice(0, at), ...lifted, ...rest.slice(at)];
}

/**
 * The fields that hide a shape: see-through and locked, with what they
 * were kept on `customData` so showing it again puts them back. Locked as
 * well as see-through because a shape nobody can see must not take a
 * click.
 */
export function hiddenFields(element: unknown): { opacity: number; locked: boolean; customData: Record<string, unknown> } {
  const record = element as ElementLike;
  return {
    opacity: 0,
    locked: true,
    customData: { ...(record.customData ?? {}), hidden: { opacity: record.opacity ?? 100, locked: record.locked === true } },
  };
}

/** The fields that show a hidden shape again, as it was before. */
export function shownFields(element: unknown): { opacity: number; locked: boolean; customData: Record<string, unknown> } {
  const record = element as ElementLike;
  const { hidden, ...customData } = record.customData ?? {};
  const was = hidden && typeof hidden === "object" ? (hidden as { opacity?: unknown; locked?: unknown }) : {};
  return {
    opacity: typeof was.opacity === "number" ? was.opacity : 100,
    locked: was.locked === true,
    customData,
  };
}

/** The library's view: where it is scrolled to, how far zoomed, and how big. */
export type BoardView = { scrollX: number; scrollY: number; zoom: number; width: number; height: number };

/**
 * Whether none of a shape's box is on screen, so selecting it from a row
 * should bring it into view. The box unturned: near enough for the
 * question, which is "would she see anything happen".
 */
export function layerOffScreen(element: unknown, view: BoardView): boolean {
  const box = element as ElementLike;
  if (typeof box.x !== "number" || typeof box.y !== "number" || typeof box.width !== "number" || typeof box.height !== "number") return false;
  const left = (box.x + view.scrollX) * view.zoom;
  const top = (box.y + view.scrollY) * view.zoom;
  const right = left + box.width * view.zoom;
  const bottom = top + box.height * view.zoom;
  return right < 0 || bottom < 0 || left > view.width || top > view.height;
}
