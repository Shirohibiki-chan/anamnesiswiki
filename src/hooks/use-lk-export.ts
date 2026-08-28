// The only import path components have into lk-export.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { dataUriFor } from "../services/asset-sources";
import { listAssetImages, readAssetImage, writeRawFile } from "../services/filesystem-service";
import { buildExportFile, packLkBytes, type ExportPlan } from "../services/lk-export";
import { orderedSiblingIds } from "../services/node-edit-service";
import { useProjectStore } from "../state/project-store";

export function useLkExport() {
  // Read at call time rather than subscribed to: this hook's consumers only
  // ever act on a click, and a subscription here would re-render the modal on
  // every keystroke typed into the editor behind it.
  function planExport(rootIds: string[], assetData?: Record<string, string>): ExportPlan | null {
    const { project, nodes, assetSources } = useProjectStore.getState();
    if (!project) return null;
    return buildExportFile({
      project,
      nodes: Object.values(nodes),
      rootIds,
      // The tree's own ordering lives in the project (rootOrder/childOrder),
      // so exported `pos` keys match what the user actually sees rather than
      // creation order.
      orderedIdsFor: (parentId) => orderedSiblingIds(useProjectStore.getState().nodes, project, parentId),
      // What lets a picture that came from LegendKeeper go back to it. Empty
      // for a world that was never imported, which reads as "every picture
      // here is local" — the right answer for one.
      assetSources,
      assetData,
    });
  }

  /**
   * What carrying the pictures inside the file would cost, in bytes.
   *
   * Read from the directory listing rather than by opening the files: the
   * answer is shown next to a checkbox she hasn't ticked yet, and reading
   * fifty megabytes to label a checkbox is the wrong trade. The real figure is
   * about a third higher than this once encoded, which the caller says.
   */
  async function sizeOfLocalPictures(fileNames: string[]): Promise<number> {
    const { rootPath } = useProjectStore.getState();
    if (!rootPath || fileNames.length === 0) return 0;
    const wanted = new Set(fileNames);
    const files = await listAssetImages(rootPath);
    return files.filter((file) => wanted.has(file.fileName)).reduce((total, file) => total + file.size, 0);
  }

  /**
   * The pictures themselves, as `data:` URIs ready to be written into the file.
   *
   * One that can't be read is left out rather than failing the export — the
   * result is the picture missing from that page in LegendKeeper, which is
   * exactly what happens without this feature at all.
   */
  async function loadLocalPictures(fileNames: string[]): Promise<Record<string, string>> {
    const { rootPath } = useProjectStore.getState();
    if (!rootPath) return {};

    const loaded: Record<string, string> = {};
    for (const fileName of fileNames) {
      try {
        loaded[fileName] = dataUriFor(fileName, await readAssetImage(rootPath, fileName));
      } catch {
        // See above.
      }
    }
    return loaded;
  }

  async function writeExport(plan: ExportPlan, path: string): Promise<void> {
    await writeRawFile(path, await packLkBytes(plan.file));
  }

  return { planExport, sizeOfLocalPictures, loadLocalPictures, writeExport };
}
