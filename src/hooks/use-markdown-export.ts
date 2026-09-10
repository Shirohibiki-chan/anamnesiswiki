// The only import path components have into the markdown export. See
// CLAUDE.md's layer order — components never import services directly.
import type { Block, Node } from "../constants/schema";
import { assetPath, writeFileTree, writeTextTo, type FileTreeResult } from "../services/filesystem-service";
import { linkIndex, pagesWithAnyTag } from "../services/link-index";
import { planSingleMarkdown, type SingleFilePlan } from "../services/markdown-single";
import { planMarkdownVault, type VaultPlan } from "../services/markdown-vault";
import { orderedSiblingIds } from "../services/node-edit-service";
import { useProjectStore } from "../state/project-store";

export function useMarkdownExport() {
  // Read at call time rather than subscribed to, exactly as `use-lk-export`
  // does: the consumers only act on a click, and a subscription here would
  // re-render the modal on every keystroke typed into the editor behind it.
  /**
   * Everything both markdown exports need from the store, resolved once.
   *
   * Shared rather than duplicated because the two formats differ in how they
   * arrange a world, not in which pages are in it or what a collection block
   * lists — and two copies of that is how a Backlinks block starts listing
   * different pages depending on which export she picked.
   */
  function common() {
    const { project, nodes, storylines } = useProjectStore.getState();
    if (!project) return null;

    // Built once for the whole export rather than per block. Every collection
    // source resolves through this one index — that is the point of Phase 18b,
    // and rebuilding it for each of a hundred sidebar blocks would make the
    // preview visibly slow on her world.
    const index = linkIndex(nodes, storylines);

    /**
     * The pages a collection block lists.
     *
     * The same four branches `use-collection` draws with, so a Backlinks block
     * exports the list it shows. It is duplicated rather than shared because
     * that one is a hook wrapped in `useMemo` and this is not a render — but
     * if a fifth source ever appears, the two have to move together.
     */
    function rowsFor(node: Node, block: Block): Node[] {
      const source = block.source ?? "manual";

      if (source === "mentions") {
        return (index.mentionsOf.get(node.id) ?? []).map((mention) => nodes[mention.fromId]).filter(Boolean);
      }
      if (source === "subpages") {
        return (index.childrenOf.get(node.id) ?? []).map((id) => nodes[id]).filter(Boolean);
      }
      if (source === "tags") {
        // A block with no tags chosen shows nothing rather than everything,
        // which is what the sidebar does with one.
        return pagesWithAnyTag(index, block.tags ?? [])
          .filter((id) => id !== node.id)
          .map((id) => nodes[id])
          .filter(Boolean);
      }
      // Manual keeps her order rather than the tree's, and skips anything
      // since deleted.
      return (block.targetIds ?? []).map((id) => nodes[id]).filter(Boolean);
    }

    return {
      project,
      nodes: Object.values(nodes),
      // The tree's own ordering lives in the project, so an export comes out
      // in the order she arranged rather than in creation order.
      orderedIdsFor: (parentId: string | null) => orderedSiblingIds(useProjectStore.getState().nodes, project, parentId),
      rowsFor,
    };
  }

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
