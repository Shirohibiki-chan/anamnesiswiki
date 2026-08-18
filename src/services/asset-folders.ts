// Folders in the picture library.
//
// A folder is a *label on a file*, not a place it lives — see
// `ASSET_FOLDERS_FILE` in constants/paths.ts for why that isn't a shortcut.
// Everything here is therefore pure record-shuffling, with no disk in sight:
// the store writes the result, the same way it does the template library.
//
// **Nothing in here may ever make a picture unreachable.** Deleting a folder
// keeps every file in it and drops only the labels; a label pointing at a
// folder that's gone reads as unsorted rather than as an error. The worst
// outcome a bad edit to this file can produce is a picture in the wrong
// folder, and that is deliberate — the alternative is a tab that hides part of
// her library and can't say why.
import type { AssetFile } from "./asset-usage";

export type AssetFolder = { id: string; name: string };

export type AssetFolders = {
  /** In display order. */
  folders: AssetFolder[];
  /** Filename → folder id. A file with no entry here is unsorted. */
  assign: Record<string, string>;
};

/** The selected view: everything, the unsorted ones, or one folder. */
export type FolderFilter = { kind: "all" } | { kind: "unsorted" } | { kind: "folder"; id: string };

export const ALL_PICTURES: FolderFilter = { kind: "all" };

// Its counterpart, added when the folder dropdown started building its rows
// from a list rather than writing each one out — the two fixed rows have to be
// the same kind of thing as each other to sit in one array.
export const UNSORTED_PICTURES: FolderFilter = { kind: "unsorted" };

export function createAssetFolders(): AssetFolders {
  return { folders: [], assign: {} };
}

/**
 * Read the file back, forgiving anything that doesn't hold up.
 *
 * Same posture as `parseTemplateLibrary` and `loadProject`: this sits in a
 * folder she can open and a sync client can conflict-copy, so a malformed
 * entry drops out on its own rather than taking the library with it. A file
 * that won't parse at all reads as "no folders yet", which is a true statement
 * about what the app can show her and leaves every picture visible under
 * All pictures.
 */
export function parseAssetFolders(raw: unknown): AssetFolders {
  if (!raw || typeof raw !== "object") return createAssetFolders();
  const source = raw as { folders?: unknown; assign?: unknown };

  const folders: AssetFolder[] = [];
  const seen = new Set<string>();
  if (Array.isArray(source.folders)) {
    for (const entry of source.folders) {
      if (!entry || typeof entry !== "object") continue;
      const { id, name } = entry as { id?: unknown; name?: unknown };
      if (typeof id !== "string" || typeof name !== "string" || !id || seen.has(id)) continue;
      seen.add(id);
      folders.push({ id, name });
    }
  }

  const assign: Record<string, string> = {};
  if (source.assign && typeof source.assign === "object") {
    for (const [fileName, folderId] of Object.entries(source.assign as Record<string, unknown>)) {
      // A label pointing at a folder that isn't in the list is dropped here
      // rather than kept and ignored later, so `folderOf` never has to answer
      // for an id nothing can show.
      if (typeof folderId === "string" && seen.has(folderId)) assign[fileName] = folderId;
    }
  }

  return { folders, assign };
}

/**
 * A name no other folder already has.
 *
 * Same ` (2)` convention as sibling pages on disk, because it's the one the
 * user has already met. Two folders called "Maps" would be a tab where the
 * same click does two different things depending on which one you hit.
 */
function uniqueName(folders: AssetFolder[], wanted: string, ignoreId?: string): string {
  const taken = new Set(
    folders.filter((folder) => folder.id !== ignoreId).map((folder) => folder.name.toLowerCase()),
  );
  if (!taken.has(wanted.toLowerCase())) return wanted;
  for (let n = 2; ; n++) {
    const candidate = `${wanted} (${n})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

export function addAssetFolder(state: AssetFolders, id: string, name: string): AssetFolders {
  return { ...state, folders: [...state.folders, { id, name: uniqueName(state.folders, name.trim() || "Folder") }] };
}

/** An empty new name is ignored rather than applied — see the tree's rename. */
export function renameAssetFolder(state: AssetFolders, id: string, name: string): AssetFolders {
  const trimmed = name.trim();
  if (!trimmed) return state;
  return {
    ...state,
    folders: state.folders.map((folder) =>
      folder.id === id ? { ...folder, name: uniqueName(state.folders, trimmed, id) } : folder,
    ),
  };
}

/** Removes the folder and the labels pointing at it. **No file is touched.** */
export function removeAssetFolder(state: AssetFolders, id: string): AssetFolders {
  const assign: Record<string, string> = {};
  for (const [fileName, folderId] of Object.entries(state.assign)) {
    if (folderId !== id) assign[fileName] = folderId;
  }
  return { folders: state.folders.filter((folder) => folder.id !== id), assign };
}

/** `null` puts it back in Unsorted. */
export function assignAsset(state: AssetFolders, fileName: string, folderId: string | null): AssetFolders {
  if (folderId !== null && !state.folders.some((folder) => folder.id === folderId)) return state;
  const assign = { ...state.assign };
  if (folderId === null) delete assign[fileName];
  else assign[fileName] = folderId;
  return { ...state, assign };
}

/**
 * Drop labels for files that are no longer in `assets/`.
 *
 * Called with the directory listing rather than on a delete, because a picture
 * can also leave by being removed in Explorer — and a label for a file that
 * isn't there would keep a folder's count wrong forever with nothing on screen
 * to explain it.
 */
export function pruneAssignments(state: AssetFolders, files: AssetFile[]): AssetFolders {
  const present = new Set(files.map((file) => file.fileName));
  const kept = Object.entries(state.assign).filter(([fileName]) => present.has(fileName));
  if (kept.length === Object.keys(state.assign).length) return state;
  return { ...state, assign: Object.fromEntries(kept) };
}

export function folderOf(state: AssetFolders, fileName: string): string | null {
  return state.assign[fileName] ?? null;
}

export function matchesFilter(state: AssetFolders, fileName: string, filter: FolderFilter): boolean {
  if (filter.kind === "all") return true;
  const id = folderOf(state, fileName);
  return filter.kind === "unsorted" ? id === null : id === filter.id;
}

/**
 * How many pictures each view holds, computed once for the whole strip.
 *
 * One pass rather than a filter per chip: the counts are drawn on every
 * render of a panel that also re-renders as she types, and a filter per folder
 * over every file is the shape that gets slow quietly.
 */
export function countByFilter(
  state: AssetFolders,
  files: AssetFile[],
): { all: number; unsorted: number; byFolder: Record<string, number> } {
  const byFolder: Record<string, number> = {};
  for (const folder of state.folders) byFolder[folder.id] = 0;
  let unsorted = 0;
  for (const file of files) {
    const id = folderOf(state, file.fileName);
    if (id === null || !(id in byFolder)) unsorted++;
    else byFolder[id]++;
  }
  return { all: files.length, unsorted, byFolder };
}
