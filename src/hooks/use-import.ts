// The only import path components have into the importers. See CLAUDE.md's
// layer order — components never import services directly.
//
// **One entry, whatever was picked.** A `.lk`, a folder of markdown or web
// pages, a zip of one, or a single note all end as the same `ImportPlan`, and
// which one it was is decided here from the pick and the file's own first
// bytes rather than by the modal. The modal's buttons say where a world is
// coming from so she can find the one she wants; they only choose which
// picker opens, and a file picked through the "wrong" one still imports as
// what it is.
//
// **A world's own files are the exception** — the JSON backup, or a project
// folder — and come back as a `BackupPlan`, restored as they are.
import { useCallback } from "react";
import { PROJECT_FILE } from "../constants/paths";
import { isWorldDir, listFolderContents, readFolderFile, readRawFile, restoreWorldBackup, sanitizeSegment } from "../services/filesystem-service";
import type { BackupPlan, ImportPlan } from "../services/import-plan";
import { backupFromListing, inputFromFolder, inputFromText, nameFromPath, readZip, sniffFile, type ImportPick } from "../services/import-source";
import { buildImportPlan, parseLkBytes } from "../services/lk-import";
import { planMarkdownImport } from "../services/markdown-import";
import { isReservedWorldName } from "../services/world-scan";
import { useProject } from "./use-project";

/** Obsidian's own folders and anything else dotted are not the writer's. */
function isDotted(relativePath: string): boolean {
  return relativePath.split("/").some((segment) => segment.startsWith("."));
}

/** A site's front page, which stands for the whole site it is the front of. */
function isFrontPage(path: string): boolean {
  return /[\\/]index\.html?$/i.test(path);
}

function parentOf(path: string): string {
  return path.replace(/[\\/][^\\/]*$/, "");
}

export function useImport() {
  const { importProject, loadProject } = useProject();

  const parseFolder = useCallback(async (path: string): Promise<ImportPlan | BackupPlan> => {
    if (await isWorldDir(path)) {
      // Everything, dotted or not: `.history` is her earlier versions.
      const entries = await listFolderContents(path, () => false);
      const decoder = new TextDecoder();
      const projectJson = decoder.decode(await readFolderFile(path, PROJECT_FILE));
      return backupFromListing(nameFromPath(path), entries.map((entry) => entry.path), projectJson, (relativePath) => readFolderFile(path, relativePath));
    }
    const entries = await listFolderContents(path, (relativePath) => isDotted(relativePath));
    const input = await inputFromFolder(
      nameFromPath(path),
      entries.map((entry) => entry.path),
      (relativePath) => readFolderFile(path, relativePath),
    );
    return planMarkdownImport(input);
  }, []);

  // Stable, so the drop listener that takes it does not re-subscribe on
  // every render of the modal.
  const parseImport = useCallback(
    async (pick: ImportPick): Promise<ImportPlan | BackupPlan> => {
      if (pick.kind === "folder") return parseFolder(pick.path);

      // A site's `index.html` is how a saved website is picked with a file
      // picker, which cannot pick its folder: it means the site, not the one
      // page.
      if (isFrontPage(pick.path)) return parseFolder(parentOf(pick.path));

      const bytes = await readRawFile(pick.path);
      const name = nameFromPath(pick.path);
      // The bytes first, the name only when they say nothing: a `.lk` that
      // arrived as `world.lk.zip`, or a file whose extension Windows is hiding,
      // still opens as what it is.
      const sniffed = sniffFile(bytes);
      const kind = sniffed !== "text" ? sniffed : pick.path.toLowerCase().endsWith(".lk") ? "lk" : "text";

      if (kind === "lk") return buildImportPlan(await parseLkBytes(bytes));
      if (kind === "zip") {
        const read = readZip(name, bytes);
        return read.kind === "backup" ? read.plan : planMarkdownImport(read.input);
      }
      const fileName = pick.path.split(/[\\/]/).pop() ?? `${name}.md`;
      return planMarkdownImport(inputFromText(name, /\.(md|markdown|txt|html?)$/i.test(fileName) ? fileName : `${fileName}.md`, bytes));
    },
    [parseFolder],
  );

  const restoreBackup = useCallback(
    async (parentDir: string, name: string, plan: BackupPlan, onProgress?: (done: number, total: number) => void): Promise<{ ok: true; rootPath: string } | { ok: false; error: string }> => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "Give your project a name." };
      if (isReservedWorldName(trimmed)) return { ok: false, error: "That name belongs to one of the app's own folders. Try another." };
      let rootPath: string;
      try {
        rootPath = await restoreWorldBackup(parentDir, sanitizeSegment(trimmed), trimmed, plan.files, onProgress);
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "The backup couldn't be restored." };
      }
      // Opened the way a world in the library is, since unlike the other
      // importers nothing here built the world in memory: it is on disk, and
      // the loader is what reads a world off disk. A world written but not
      // readable is still there to be found, so the message says where.
      try {
        if (await loadProject(rootPath)) return { ok: true, rootPath };
      } catch (e) {
        return { ok: false, error: `The backup was restored to ${rootPath}, but it couldn't be opened: ${e instanceof Error ? e.message : String(e)}.` };
      }
      return { ok: false, error: `The backup was restored to ${rootPath}, but it couldn't be opened.` };
    },
    [loadProject],
  );

  return { parseImport, importProject, restoreBackup };
}
