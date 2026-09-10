// The only import path components have into the importers. See CLAUDE.md's
// layer order — components never import services directly.
//
// **One entry, whatever was picked.** A `.lk`, a folder of markdown, a zip of
// one, or a single note all end as the same `ImportPlan`, and which one it
// was is decided here from the pick and the file's own first bytes rather
// than by the modal — the errand is "bring my world in", and which program
// it came out of is a detail of the file (docs/plan.md § Phase 20).
import { useCallback } from "react";
import { listFolderContents, readFolderFile, readRawFile } from "../services/filesystem-service";
import type { ImportPlan } from "../services/import-plan";
import { inputFromFolder, inputFromText, inputFromZip, nameFromPath, sniffFile, type ImportPick } from "../services/import-source";
import { buildImportPlan, parseLkBytes } from "../services/lk-import";
import { planMarkdownImport } from "../services/markdown-import";
import { useProject } from "./use-project";

/** Obsidian's own folders and anything else dotted are not the writer's. */
function isDotted(relativePath: string): boolean {
  return relativePath.split("/").some((segment) => segment.startsWith("."));
}

export function useImport() {
  const { importProject } = useProject();

  // Stable, so the drop listener that takes it does not re-subscribe on
  // every render of the modal.
  const parseImport = useCallback(async (pick: ImportPick): Promise<ImportPlan> => {
    if (pick.kind === "folder") {
      const entries = await listFolderContents(pick.path, (relativePath) => isDotted(relativePath));
      const input = await inputFromFolder(
        nameFromPath(pick.path),
        entries.map((entry) => entry.path),
        (relativePath) => readFolderFile(pick.path, relativePath),
      );
      return planMarkdownImport(input);
    }

    const bytes = await readRawFile(pick.path);
    const name = nameFromPath(pick.path);
    // The bytes first, the name only when they say nothing: a `.lk` that
    // arrived as `world.lk.zip`, or a file whose extension Windows is hiding,
    // still opens as what it is.
    const sniffed = sniffFile(bytes);
    const kind = sniffed !== "text" ? sniffed : pick.path.toLowerCase().endsWith(".lk") ? "lk" : "text";

    if (kind === "lk") return buildImportPlan(await parseLkBytes(bytes));
    if (kind === "zip") return planMarkdownImport(inputFromZip(name, bytes));
    const fileName = pick.path.split(/[\\/]/).pop() ?? `${name}.md`;
    return planMarkdownImport(inputFromText(name, /\.(md|markdown|txt)$/i.test(fileName) ? fileName : `${fileName}.md`, bytes));
  }, []);

  return { parseImport, importProject };
}
