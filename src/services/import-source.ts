// Where an import's files come from (Phase 20).
//
// Text & Markdown, Obsidian, a folder and a zip are one importer wearing four
// hats, and this is the hat rack: each of the three shapes a person can hand
// over — a folder on disk, a zip, a single file — becomes the same listing of
// paths and note texts that `markdown-import.ts` reads. Nothing here decides
// what a page is; it only says what files there are and how to get their
// bytes.
//
// **The folder reader takes its reads as arguments** rather than importing
// the filesystem service, so unpacking a zip and listing a folder are the
// same testable shape — and so the hook stays the only place that knows
// which one it is holding.
import { unzipSync } from "fflate";
import { PROJECT_FILE } from "../constants/paths";
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
  for (const path of entries) {
    if (!isNotePath(path)) continue;
    texts.set(path, decoder.decode(await readBytes(path)));
  }
  return { name, files: entries, texts, readBytes };
}

/** A single `.md` or `.txt` as an import of one page. */
export function inputFromText(name: string, fileName: string, bytes: Uint8Array): MarkdownImportInput {
  const text = decoder.decode(bytes);
  return { name, files: [fileName], texts: new Map([[fileName, text]]), readBytes: async () => bytes };
}

/**
 * A zip as an import's input, unpacked in memory.
 *
 * **A zip of one folder is that folder.** Zipping `MyVault/` on any desktop
 * produces an archive whose every entry starts with `MyVault/`, and reading
 * that literally would give the world one root page holding everything. The
 * common prefix comes off and names the project.
 *
 * **A world's own files are refused with directions rather than read.** The
 * JSON export (Phase 28) is a zip too, and it is not markdown — it is the
 * project folder as it sits on disk, and the way to bring one back is to
 * unzip it into the projects folder. Reading its `.json` files as nothing and
 * its pictures as orphans would be an import that silently produced an empty
 * world.
 */
export function inputFromZip(name: string, bytes: Uint8Array): MarkdownImportInput {
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

  if (paths.some((path) => strip(path) === PROJECT_FILE)) {
    throw new Error(
      "This zip is a world's own files, not a folder of notes. Unzip it into your projects folder and it will show up in the library.",
    );
  }

  paths = paths.map(strip).filter(Boolean);
  const byStripped = new Map(paths.map((path) => [path, `${prefix}${path}`]));

  const texts = new Map<string, string>();
  for (const path of paths) {
    if (isNotePath(path)) texts.set(path, decoder.decode(unpacked[byStripped.get(path)!]));
  }

  return {
    name: projectName,
    files: paths,
    texts,
    readBytes: async (path) => {
      const entry = unpacked[byStripped.get(path) ?? path];
      if (!entry) throw new Error(`${path} is not in the zip.`);
      return entry;
    },
  };
}

/** What a file's first bytes say it is, for when its name doesn't. */
export function sniffFile(bytes: Uint8Array): "lk" | "zip" | "text" {
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) return "lk";
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)) return "zip";
  return "text";
}
