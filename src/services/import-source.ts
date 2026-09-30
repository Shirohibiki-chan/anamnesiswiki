// Where an import's files come from (Phase 20).
//
// Text & Markdown, Obsidian, HTML, a folder and a zip are one importer wearing
// five hats, and this is the hat rack: each of the three shapes a person can
// hand over — a folder on disk, a zip, a single file — becomes the same
// listing of paths and note texts that `markdown-import.ts` reads. A web page
// is turned into its note on the way (`html-import.ts`). Nothing here decides
// what a page is; it only says what files there are and how to get their
// bytes.
//
// **The one listing that is not notes is a world's own files** — the JSON
// backup, or a project folder — which is recognised by `project.json` at its
// top and restored as it is rather than read (2026-09-30; it used to be
// refused with directions to unzip it by hand).
//
// **The folder reader takes its reads as arguments** rather than importing
// the filesystem service, so unpacking a zip and listing a folder are the
// same testable shape — and so the hook stays the only place that knows
// which one it is holding.
import { unzipSync } from "fflate";
import { ASSETS_DIR, BOARD_FILE, OPEN_MARKER_FILE, PROJECT_FILE, STORYLINE_FILE } from "../constants/paths";
import { inputWithHtmlAsNotes, isHtmlPath } from "./html-import";
import type { BackupFile, BackupPlan } from "./import-plan";
import type { MarkdownImportInput } from "./markdown-import";
import { isNotePath } from "./markdown-import";

/** What the picker or the drop handed over, before anything has been read. */
export type ImportPick = { kind: "folder"; path: string } | { kind: "file"; path: string };

const decoder = new TextDecoder();

/** The last path segment, without its extension — the name a project takes. */
export function nameFromPath(path: string): string {
  const segment = path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "";
  const dot = segment.lastIndexOf(".");
  return dot > 0 ? segment.slice(0, dot) : segment;
}

/**
 * A folder on disk as an import's input.
 *
 * `entries` is the recursive listing and `readBytes` fetches one of them;
 * both come from the caller, which is the only thing that knows the disk.
 * Every note is read up front — the plan needs every title before it can
 * resolve a single link — and the pictures are left where they are until the
 * plan says which ones are wanted.
 */
export async function inputFromFolder(
  name: string,
  entries: string[],
  readBytes: (relativePath: string) => Promise<Uint8Array>,
): Promise<MarkdownImportInput> {
  const texts = new Map<string, string>();
  const html = new Map<string, string>();
  for (const path of entries) {
    if (isNotePath(path)) texts.set(path, decoder.decode(await readBytes(path)));
    else if (isHtmlPath(path)) html.set(path, decoder.decode(await readBytes(path)));
  }
  return inputWithHtmlAsNotes({ name, files: entries, texts, readBytes }, html);
}

/** A single `.md`, `.txt` or `.html` as an import of one page. */
export function inputFromText(name: string, fileName: string, bytes: Uint8Array): MarkdownImportInput {
  const text = decoder.decode(bytes);
  if (isHtmlPath(fileName)) {
    return inputWithHtmlAsNotes({ name, files: [fileName], texts: new Map(), readBytes: async () => bytes }, new Map([[fileName, text]]));
  }
  return { name, files: [fileName], texts: new Map([[fileName, text]]), readBytes: async () => bytes };
}

/** Whether a listing is a world's own files: `project.json` at its top. */
export function isWorldListing(paths: string[]): boolean {
  return paths.includes(PROJECT_FILE);
}

/**
 * A world's own files as a backup to restore.
 *
 * Counted rather than read: the preview says how many pages, pictures and
 * earlier versions there are, and the files are only opened when she presses
 * Import. The marker saying the world was open when it was copied is left
 * behind — a restored world is not open anywhere, and carrying the claim in
 * would make the app refuse the thing she just restored. The JSON export
 * already leaves it out; a folder copied by hand may not have.
 */
export function backupFromListing(name: string, paths: string[], projectJson: string, read: (path: string) => Promise<Uint8Array>): BackupPlan {
  let projectName = name;
  try {
    const parsed = JSON.parse(projectJson) as { name?: unknown };
    if (typeof parsed.name === "string" && parsed.name.trim()) projectName = parsed.name.trim();
  } catch {
    throw new Error("This looks like a backup, but its project.json couldn't be read. It may be damaged.");
  }

  const kept = paths.filter((path) => path !== OPEN_MARKER_FILE);
  const inHistory = (path: string) => path.split("/").includes(".history");
  const inAssets = (path: string) => path.startsWith(`${ASSETS_DIR}/`);
  const base = (path: string) => path.slice(path.lastIndexOf("/") + 1);
  const isPage = (path: string) =>
    path.endsWith(".json") &&
    !inHistory(path) &&
    !inAssets(path) &&
    path !== PROJECT_FILE &&
    !base(path).startsWith(".") &&
    base(path) !== STORYLINE_FILE &&
    base(path) !== BOARD_FILE;

  const files: BackupFile[] = kept.map((path) => ({ path, read: () => read(path) }));
  return {
    kind: "backup",
    projectName,
    pageCount: kept.filter(isPage).length,
    pictureCount: kept.filter((path) => inAssets(path) && !path.endsWith(".json")).length,
    versionCount: kept.filter(inHistory).length,
    files,
  };
}

/**
 * A zip as an import's input, unpacked in memory.
 *
 * **A zip of one folder is that folder.** Zipping `MyVault/` on any desktop
 * produces an archive whose every entry starts with `MyVault/`, and reading
 * that literally would give the world one root page holding everything. The
 * common prefix comes off and names the project.
 *
 * **A world's own files are a backup, not notes.** The JSON export (Phase 28)
 * is a zip too, and it is not markdown — it is the project folder as it sits
 * on disk — so it comes back as a `BackupPlan` to be restored whole. Reading
 * its `.json` files as nothing and its pictures as orphans would be an import
 * that silently produced an empty world.
 */
export function readZip(name: string, bytes: Uint8Array): { kind: "notes"; input: MarkdownImportInput } | { kind: "backup"; plan: BackupPlan } {
  let unpacked: Record<string, Uint8Array>;
  try {
    unpacked = unzipSync(bytes);
  } catch {
    throw new Error("That zip couldn't be opened. It may be damaged, or not a zip at all.");
  }

  let paths = Object.keys(unpacked)
    .filter((path) => !path.endsWith("/"))
    .map((path) => path.replace(/\\/g, "/"));

  // Strip a single top-level folder that holds everything.
  const firstSegments = new Set(paths.map((path) => path.split("/")[0]));
  const onlyRoot = firstSegments.size === 1 && paths.every((path) => path.includes("/")) ? [...firstSegments][0] : null;
  const prefix = onlyRoot ? `${onlyRoot}/` : "";
  const projectName = onlyRoot ?? name;
  const strip = (path: string) => (prefix ? path.slice(prefix.length) : path);

  paths = paths.map(strip).filter(Boolean);
  const byStripped = new Map(paths.map((path) => [path, `${prefix}${path}`]));
  const readBytes = async (path: string) => {
    const entry = unpacked[byStripped.get(path) ?? path];
    if (!entry) throw new Error(`${path} is not in the zip.`);
    return entry;
  };

  if (isWorldListing(paths)) {
    return { kind: "backup", plan: backupFromListing(projectName, paths, decoder.decode(unpacked[byStripped.get(PROJECT_FILE)!]), readBytes) };
  }

  const texts = new Map<string, string>();
  const html = new Map<string, string>();
  for (const path of paths) {
    if (isNotePath(path)) texts.set(path, decoder.decode(unpacked[byStripped.get(path)!]));
    else if (isHtmlPath(path)) html.set(path, decoder.decode(unpacked[byStripped.get(path)!]));
  }

  return { kind: "notes", input: inputWithHtmlAsNotes({ name: projectName, files: paths, texts, readBytes }, html) };
}

/** What a file's first bytes say it is, for when its name doesn't. */
export function sniffFile(bytes: Uint8Array): "lk" | "zip" | "text" {
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) return "lk";
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)) return "zip";
  return "text";
}
