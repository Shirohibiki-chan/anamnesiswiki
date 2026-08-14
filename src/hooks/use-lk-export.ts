// The only import path components have into lk-export.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { writeRawFile } from "../services/filesystem-service";
import { buildExportFile, packLkBytes, type ExportPlan } from "../services/lk-export";
import { orderedSiblingIds, useProjectStore } from "../state/project-store";

export function useLkExport() {
  // Read at call time rather than subscribed to: this hook's consumers only
  // ever act on a click, and a subscription here would re-render the modal on
  // every keystroke typed into the editor behind it.
  function planExport(rootIds: string[]): ExportPlan | null {
    const { project, nodes, assetSources } = useProjectStore.getState();
    if (!project) return null;
    return buildExportFile({
      project,
      nodes: Object.values(nodes),
      rootIds,
      // What lets a picture that came from LegendKeeper go back to it. Empty
      // for a world that was never imported, which reads as "every picture
      // here is local" — the right answer for one.
      assetSources,
      // The tree's own ordering lives in the project (rootOrder/childOrder),
      // so exported `pos` keys match what the user actually sees rather than
      // creation order.
      orderedIdsFor: (parentId) => orderedSiblingIds(useProjectStore.getState().nodes, project, parentId),
    });
  }

  async function writeExport(plan: ExportPlan, path: string): Promise<void> {
    await writeRawFile(path, await packLkBytes(plan.file));
  }

  return { planExport, writeExport };
}
