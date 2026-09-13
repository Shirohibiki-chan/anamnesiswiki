// A board page's drawing: what is read off disk and what is written back.
// Board spike, 2026-09-13.
//
// **Deliberately thin.** The storyline service knows what a scene is, what an
// edge means and when a canvas is untidy, because the app draws that canvas
// itself. A board is drawn by Excalidraw, and the app's whole job is to keep
// the drawing safe between one open and the next: read it tolerantly, write
// it whole, and never reach inside an element. Anything that reads inside
// would be a second copy of the library's own rules.
import type { Board } from "../constants/schema";

export function createBoard(): Board {
  return { version: 1, elements: [], appState: {}, files: {} };
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
export function boardFingerprint(elements: readonly unknown[], appState: Record<string, unknown>): string {
  const parts: string[] = [];
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
  return { version: 1, elements: kept, appState: keptState, files: keptFiles };
}
