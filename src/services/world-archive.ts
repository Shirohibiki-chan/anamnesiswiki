// The world's own folder, zipped (Phase 28).
//
// **The most honest export in the phase, and the least clever.** Her writing
// is already JSON files on disk — that is the whole storage design — so
// "export as JSON" is re-zipping what is already there rather than converting
// anything. It is the format that survives this app disappearing: unzip it and
// the folder works, because it *is* the folder.
//
// **Labelled JSON in the menu, her call 2026-08-14.** People arriving from
// other tools go looking for the word, and "Zip" alone says nothing about
// what is inside.
//
// **It reads the disk, not the store.** That is the argument for calling it
// honest: what it hands over is the files exactly as they are, including
// anything the app has never loaded — a page it could not parse, a stray file
// she put in the folder herself.
import { zip } from "fflate";
import { HISTORY_DIR, MOVE_TEMP_PREFIX, OPEN_MARKER_FILE } from "../constants/paths";
import type { FolderEntry } from "./filesystem-service";

/**
 * What never travels.
 *
 * A short list on purpose — the default is "everything", and each exclusion
 * has to earn itself against the honesty argument above.
 *
 *   - **The open marker** says *this project is open in a running copy of the
 *     app right now*. Carried into an archive and unzipped somewhere else, it
 *     tells the app somebody else has the world open and makes a fresh copy
 *     look locked. It is a fact about this moment, not about the world.
 *   - **A parked move** is half of an interrupted rename that the loader
 *     repairs on the way in. Zipping one preserves a broken intermediate state
 *     that the original folder will have healed by the time anybody opens the
 *     archive.
 *
 * **History is deliberately *not* here.** It is the biggest thing in a mature
 * project folder and the obvious thing to drop, but it is also hers — every
 * earlier version of every page — and this is the format whose entire claim is
 * that it hands back the folder. Zip compresses near-identical JSON extremely
 * well, so it costs far less than its uncompressed size suggests, and the
 * preview shows the number before she commits.
 */
export function isExcludedFromArchive(relativePath: string): boolean {
  const name = relativePath.split("/").pop() ?? "";
  return name === OPEN_MARKER_FILE || name.startsWith(MOVE_TEMP_PREFIX);
}

export type ArchivePlan = {
  entries: FolderEntry[];
  /** Uncompressed total. The zip will be smaller, usually much. */
  totalBytes: number;
  /** How much of that is version history, which is the surprising part. */
  historyBytes: number;
  fileCount: number;
  notes: string[];
};

function isHistory(path: string): boolean {
  return path.split("/").includes(HISTORY_DIR);
}

export function planArchive(entries: FolderEntry[]): ArchivePlan {
  const totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  const history = entries.filter((entry) => isHistory(entry.path));
  const historyBytes = history.reduce((sum, entry) => sum + entry.size, 0);

  const notes: string[] = [];
  if (history.length > 0) {
    const count =
      history.length === 1 ? "One of them is an earlier version of a page" : `${history.length} of them are earlier versions of your pages`;
    notes.push(
      `${count}. They're in here because they're yours too — and because they're nearly identical to each other, they squash down to a fraction of their size in the zip.`,
    );
  }
  notes.push("Nothing is converted. This is your project folder as it sits on disk, so unzipping it somewhere gives you a working world back.");

  return { entries, totalBytes, historyBytes, fileCount: entries.length, notes };
}

/**
 * Builds the zip.
 *
 * fflate's async `zip` rather than `zipSync`: a world with a folder of
 * pictures in it is tens of megabytes, and doing that synchronously freezes
 * the window for the duration. MIT-licensed and about 30KB — see
 * `docs/plan.md` § Phase 28 for why a dependency was needed at all
 * (`CompressionStream` does one stream and cannot make an archive).
 *
 * **The folder's own name is the top level inside the archive.** Unzipping
 * then produces `Valeraverse/` rather than emptying seventy files into
 * whatever folder she happened to be in.
 */
export function packWorldZip(folderName: string, files: { path: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  const tree: Record<string, Uint8Array> = {};
  for (const file of files) tree[`${folderName}/${file.path}`] = file.bytes;

  return new Promise((resolve, reject) => {
    // Level 6 is fflate's default and the usual balance. JSON squashes hard at
    // any level; pictures do not squash at any level, so paying for 9 buys
    // almost nothing here and costs seconds.
    zip(tree, { level: 6 }, (error, data) => (error ? reject(error) : resolve(data)));
  });
}
