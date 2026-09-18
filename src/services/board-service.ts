// A board page's drawing: what is read off disk and what is written back.
// Board spike, 2026-09-13.
//
// **Deliberately thin.** The storyline service knows what a scene is, what an
// edge means and when a canvas is untidy, because the app draws that canvas
// itself. A board is drawn by Excalidraw, and the app's whole job is to keep
// the drawing safe between one open and the next: read it tolerantly, write
// it whole, and never reach inside an element. Anything that reads inside
// would be a second copy of the library's own rules.
import {
  BOARD_CARD_CASCADE,
  BOARD_CARD_HEIGHT,
  BOARD_CARD_ICON_MAX_WIDTH,
  BOARD_CARD_ROW_MAX_HEIGHT,
  BOARD_CARD_WIDTH,
  BOARD_DOT_MIN_SCREEN_SPACING,
  BOARD_DOT_SPACING,
  BOARD_PAGE_LINK_PREFIX,
  LIBRARY_DEFAULT_BACKGROUND,
} from "../constants/board";
import { UNIVERSE_TEMPLATE_KEY, type Board, type Node } from "../constants/schema";
import { linkTargets } from "./storyline-service";

export function createBoard(): Board {
  return { version: 1, elements: [], appState: {}, files: {}, dots: true };
}

/**
 * A board read off disk, or an empty one for a file that will not parse into
 * the shape. Same posture as `readStoryline`: a damaged drawing file is an
 * empty board rather than a page that fails to open.
 */
export function readBoard(raw: unknown): Board {
  if (!raw || typeof raw !== "object") return createBoard();
  const record = raw as Record<string, unknown>;
  return {
    version: 1,
    elements: Array.isArray(record.elements) ? record.elements : [],
    appState: plainObject(record.appState),
    files: plainObject(record.files),
    // Absent means on: every board written before the dots existed gets them.
    dots: record.dots !== false,
  };
}

// An array is an object to `typeof`, and a `files` that came back as one
// would be spread into the library as a map with numeric keys.
function plainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * The slice of the drawing library's view state worth keeping between opens.
 *
 * Not the whole of it: most of `appState` is what is selected, which tool is
 * in hand, whether a menu is open — live session state that would be wrong
 * the moment the page was reopened. What survives is what she would notice
 * missing: the background colour, the grid, and where she was looking.
 */
const KEPT_APP_STATE = ["viewBackgroundColor", "gridSize", "gridModeEnabled", "zoom", "scrollX", "scrollY"] as const;

/**
 * Whether one drawing differs from another in a way worth writing.
 *
 * The library reports a change on every pointer move, so the answer here is
 * what stands between a board and a disk write per mouse pixel. Elements
 * carry a `version` the library bumps on every real edit, and a deleted
 * element stays in the list marked `isDeleted` — so the fingerprint is the
 * ids, versions and deletion of every element plus the kept view state,
 * which is what a save would actually change.
 */
export function boardFingerprint(elements: readonly unknown[], appState: Record<string, unknown>, dots: boolean): string {
  const parts: string[] = [`dots=${dots ? 1 : 0}`];
  for (const entry of elements) {
    const element = entry as { id?: string; version?: number; isDeleted?: boolean };
    parts.push(`${element.id}:${element.version}:${element.isDeleted ? 1 : 0}`);
  }
  for (const key of KEPT_APP_STATE) {
    const value = appState[key];
    parts.push(`${key}=${typeof value === "object" && value ? JSON.stringify(value) : String(value)}`);
  }
  return parts.join("|");
}

/**
 * The board to write, from what the library handed back.
 *
 * Deleted elements are dropped: the library keeps them in memory so an undo
 * can bring them back within the session, but on disk they would be a
 * drawing that grows forever with things nobody can see. Pictures are kept
 * only when an element still points at them, for the same reason.
 */
export function boardFromScene(
  elements: readonly unknown[],
  appState: Record<string, unknown>,
  files: Record<string, unknown>,
  dots: boolean,
): Board {
  const kept = elements.filter((entry) => !(entry as { isDeleted?: boolean }).isDeleted);
  const referenced = new Set<string>();
  for (const entry of kept) {
    const fileId = (entry as { fileId?: string | null }).fileId;
    if (typeof fileId === "string") referenced.add(fileId);
  }
  const keptFiles: Record<string, unknown> = {};
  for (const [id, file] of Object.entries(files)) {
    if (referenced.has(id)) keptFiles[id] = file;
  }
  const keptState: Record<string, unknown> = {};
  for (const key of KEPT_APP_STATE) {
    if (appState[key] !== undefined) keptState[key] = appState[key];
  }
  return { version: 1, elements: kept, appState: keptState, files: keptFiles, dots };
}

/**
 * The view state the library starts a board from: what the file kept, over
 * a transparent canvas so the dots show through. The library's own default
 * white is dropped on the way in — the spike's boards carry it because the
 * library wrote it, not because anyone chose it — and any other colour she
 * picked is kept, dots or no dots.
 */
export function boardStartState(kept: Record<string, unknown>): Record<string, unknown> {
  const state: Record<string, unknown> = { viewBackgroundColor: "transparent", ...kept };
  if (state.viewBackgroundColor === LIBRARY_DEFAULT_BACKGROUND) state.viewBackgroundColor = "transparent";
  return state;
}

/**
 * Where the dots go for a view scrolled to (`scrollX`, `scrollY`) at `zoom`,
 * as a tile size and offset in screen pixels — so a dot stays under the
 * same point of the drawing as it is panned and zoomed. Zoomed far out the
 * spacing doubles until the dots are at least `BOARD_DOT_MIN_SCREEN_SPACING`
 * apart on screen.
 */
export function dotsLayout(scrollX: number, scrollY: number, zoom: number): { size: number; x: number; y: number } {
  let spacing = BOARD_DOT_SPACING;
  while (spacing * zoom < BOARD_DOT_MIN_SCREEN_SPACING) spacing *= 2;
  const size = spacing * zoom;
  const wrap = (value: number) => ((value % size) + size) % size;
  return { size, x: wrap(scrollX * zoom), y: wrap(scrollY * zoom) };
}

// ---- Links: a shape that points at a page ----

/** The link a shape carries to point at `pageId`. */
export function pageLinkFor(pageId: string): string {
  return `${BOARD_PAGE_LINK_PREFIX}${pageId}`;
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export type BoardLinkTarget =
  | { kind: "page"; pageId: string }
  | { kind: "external"; url: string }
  /** A page link whose page is gone, or a typed name no single page answers to. */
  | { kind: "missing"; text: string };

/**
 * What a shape's link means.
 *
 * Three cases, told apart by the front of the string. A link the picker wrote
 * carries a page id behind the app's own prefix and survives any rename. A
 * link with some other scheme is a web address and is opened outside. A link
 * with no scheme is a name typed into the library's own link box — resolved
 * by the storyline notes' rule, so a name two pages answer to points at
 * neither rather than guessing, and aliases count.
 */
export function boardLinkTarget(link: string, nodes: Record<string, Node>): BoardLinkTarget {
  return resolveLink(link, nodes, linkTargets(nodes));
}

function resolveLink(link: string, nodes: Record<string, Node>, targets: Map<string, string | null>): BoardLinkTarget {
  const trimmed = link.trim();
  if (trimmed.startsWith(BOARD_PAGE_LINK_PREFIX)) {
    const pageId = trimmed.slice(BOARD_PAGE_LINK_PREFIX.length);
    return nodes[pageId] ? { kind: "page", pageId } : { kind: "missing", text: trimmed };
  }
  if (HAS_SCHEME.test(trimmed)) return { kind: "external", url: trimmed };
  const pageId = targets.get(trimmed.toLowerCase());
  return pageId ? { kind: "page", pageId } : { kind: "missing", text: trimmed };
}

/** The link on a shape, or null — the one place an element's field is read by name. */
export function elementLink(element: unknown): string | null {
  const link = (element as { link?: unknown }).link;
  return typeof link === "string" && link.trim() ? link : null;
}

/**
 * Every page a board's shapes point at, deduplicated, for the link index.
 * `targets` is `linkTargets(nodes)`, built once by the caller for every board.
 */
export function boardPageLinks(board: Board, nodes: Record<string, Node>, targets: Map<string, string | null>): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const element of board.elements) {
    const link = elementLink(element);
    if (!link) continue;
    const target = resolveLink(link, nodes, targets);
    if (target.kind !== "page" || seen.has(target.pageId)) continue;
    seen.add(target.pageId);
    found.push(target.pageId);
  }
  return found;
}

/**
 * The pages the picker offers for `query`: by name or alias, the board itself
 * left out because a shape pointing at the page it is on goes nowhere, and
 * universes left out because they are containers rather than pages.
 */
export function linkCandidates(query: string, boardId: string, nodes: Record<string, Node>, limit: number): Node[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  const matches: Node[] = [];
  for (const node of Object.values(nodes)) {
    if (node.id === boardId || node.templateKey === UNIVERSE_TEMPLATE_KEY) continue;
    const names = [node.name, ...(node.aliases ?? [])];
    if (!names.some((name) => name.toLowerCase().includes(trimmed))) continue;
    matches.push(node);
  }
  return matches.sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit);
}

// ---- Page cards: a page that is on the board, not just pointed at ----
//
// A card is the library's *embed* element carrying a page link — the same
// `anamnesis://page/<id>` a linked shape carries, so everything that follows
// links (the index, the click handler, the picker's "Linked to") already
// understands a card. What differs is only what is drawn inside the box,
// and that is the app's card component rather than the library's iframe.
// Reading `type` here is the second named exception to "never read inside
// an element", beside `link` above: an embed's address and kind are the
// app's own, because the app put them there.

/** Whether `element` is a page card: an embed whose address is a page link. */
export function isPageCard(element: unknown): boolean {
  const record = element as { type?: unknown; link?: unknown };
  return record.type === "embeddable" && typeof record.link === "string" && record.link.startsWith(BOARD_PAGE_LINK_PREFIX);
}

/** The page a card is for, or null for anything that is not a card. */
export function cardPageId(element: unknown): string | null {
  if (!isPageCard(element)) return null;
  return (element as { link: string }).link.slice(BOARD_PAGE_LINK_PREFIX.length);
}

export type CardPresentation = "icon" | "row" | "picture";

/**
 * How a card of this size presents its page: the icon alone when it is
 * narrow, icon and name in a row when it is short, and the picture with the
 * name over it otherwise. LK's boards make the same three of one card by
 * resizing, which is why the answer comes off the box and is never stored.
 */
export function cardPresentation(width: number, height: number): CardPresentation {
  if (width < BOARD_CARD_ICON_MAX_WIDTH) return "icon";
  if (height < BOARD_CARD_ROW_MAX_HEIGHT) return "row";
  return "picture";
}

/**
 * Where the `index`th card of a batch goes when the batch is centred on
 * `centre`: the first card sits centred there, each later one a step down
 * and to the right, so several pages put on in a row are all visible and
 * all still under the hand. `x`/`y` are the card's top-left, the library's
 * convention.
 */
export function cardPlacement(centre: { x: number; y: number }, index: number): { x: number; y: number } {
  return {
    x: centre.x - BOARD_CARD_WIDTH / 2 + index * BOARD_CARD_CASCADE,
    y: centre.y - BOARD_CARD_HEIGHT / 2 + index * BOARD_CARD_CASCADE,
  };
}

/**
 * The page ids a drag from the tree carries, or none for any other drag or
 * a payload something else wrote — a board drop must not act on a string
 * it did not put there.
 */
export function draggedPageIds(payload: string): string[] {
  try {
    const parsed: unknown = JSON.parse(payload);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
  } catch {
    return [];
  }
}
