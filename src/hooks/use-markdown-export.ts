// The only import path components have into the markdown export. See
// CLAUDE.md's layer order — components never import services directly.
import { assetPath, writeFileTree, writeTextTo, type FileTreeResult } from "../services/filesystem-service";
import { planSingleMarkdown, type SingleFilePlan } from "../services/markdown-single";
import { planMarkdownVault, type VaultPlan } from "../services/markdown-vault";
import { useProjectStore } from "../state/project-store";
import { readExportWorld } from "./use-export-world";

export function useMarkdownExport() {
  // Everything both markdown exports need from the store, resolved once —
  // see `readExportWorld` for why it is read rather than subscribed to.
  const common = readExportWorld;

  function planVault(rootIds: string[]): VaultPlan | null {
    const shared = common();
    return shared ? planMarkdownVault({ ...shared, rootIds }) : null;
  }

  function planSingleFile(rootIds: string[]): SingleFilePlan | null {
    const shared = common();
    return shared ? planSingleMarkdown({ ...shared, rootIds, projectName: shared.project.name }) : null;
  }

  async function writeSingleFile(plan: SingleFilePlan, path: string): Promise<void> {
    await writeTextTo(path, plan.text);
  }

  /**
   * Writes the plan into a new folder inside the one she picked.
   *
   * A folder of her own rather than the files loose in whatever she chose:
   * a vault is a hundred files, and putting them straight into Documents is
   * not something anybody means by "export here".
   */
  async function writeVault(plan: VaultPlan, parentDir: string): Promise<FileTreeResult> {
    const { project, rootPath } = useProjectStore.getState();
    return writeFileTree(parentDir, project?.name || "Export", {
      folders: plan.folders,
      files: plan.files,
      copies: rootPath ? plan.assets.map((asset) => ({ from: assetPath(rootPath, asset.fileName), to: asset.path })) : [],
    });
  }

  return { planVault, writeVault, planSingleFile, writeSingleFile };
}
