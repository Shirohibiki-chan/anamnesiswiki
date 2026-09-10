// The only import path components have into the JSON zip. See CLAUDE.md's
// layer order — components never import services directly.
import { listFolderContents, readFolderFile, writeRawFile } from "../services/filesystem-service";
import { isExcludedFromArchive, packWorldZip, planArchive, type ArchivePlan } from "../services/world-archive";
import { useProjectStore } from "../state/project-store";

export function useWorldZip() {
  /**
   * What is in the folder and how big it is, without reading any of it.
   *
   * Async where the other two exports' planners are not, and that is the
   * point of the format: this one asks the disk rather than the store, so it
   * cannot answer synchronously. The bytes are left on disk until she has
   * picked a destination.
   */
  async function planZip(): Promise<ArchivePlan | null> {
    const { rootPath } = useProjectStore.getState();
    if (!rootPath) return null;
    return planArchive(await listFolderContents(rootPath, (path) => isExcludedFromArchive(path)));
  }

  /**
   * Reads every file and writes the archive.
   *
   * One at a time rather than all at once: the whole folder is in memory only
   * as the zip is built, and reading in parallel would hold two copies of a
   * world's worth of pictures at the peak for no gain — the cost here is the
   * disk, not the waiting.
   *
   * **A file that has gone since the listing is skipped rather than fatal.**
   * Between the preview and the save she may have deleted a page, and losing
   * the archive over one missing file is worse than an archive without it.
   */
  async function writeZip(plan: ArchivePlan, path: string): Promise<{ written: number; missing: number }> {
    const { rootPath, project } = useProjectStore.getState();
    if (!rootPath) return { written: 0, missing: 0 };

    const files: { path: string; bytes: Uint8Array }[] = [];
    let missing = 0;
    for (const entry of plan.entries) {
      try {
        files.push({ path: entry.path, bytes: await readFolderFile(rootPath, entry.path) });
      } catch {
        missing += 1;
      }
    }

    await writeRawFile(path, await packWorldZip(project?.name || "World", files));
    return { written: files.length, missing };
  }

  return { planZip, writeZip };
}
