// What every export of the world needs from the store, resolved once.
//
// Shared by the Markdown exports and the published site (Phase 1.5) because
// the formats differ in how they arrange a world, not in which pages are in
// it, what a collection block lists or what a database's rows are — and two
// copies of that is how a Backlinks block starts listing different pages
// depending on which export she picked.
//
// Read at call time rather than subscribed to, exactly as `use-lk-export`
// does: the consumers only act on a click, and a subscription here would
// re-render the modal on every keystroke typed into the editor behind it.
import type { Block, Node } from "../constants/schema";
import { databaseCell, databaseRows, presentDatabase } from "../services/database-service";
import type { DatabaseTable } from "../services/html-page";
import { linkIndex, pagesWithAnyTag } from "../services/link-index";
import { orderedSiblingIds } from "../services/node-edit-service";
import { getPropertySchema, getTemplate } from "../services/template-registry";
import { useProjectStore } from "../state/project-store";

export type ExportWorld = {
  project: NonNullable<ReturnType<typeof useProjectStore.getState>["project"]>;
  nodes: Node[];
  orderedIdsFor: (parentId: string | null) => string[];
  rowsFor: (node: Node, block: Block) => Node[];
  databaseFor: (node: Node) => DatabaseTable | null;
};

export function readExportWorld(): ExportWorld | null {
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

  /**
   * A page shown as a database, as the rows and cells the app would draw —
   * the same services `use-database` composes, minus the editing.
   */
  function databaseFor(node: Node): DatabaseTable | null {
    const view = node.view;
    if (!view) return null;
    const gathered = databaseRows(nodes, project!.childOrder, node.id, view.scope);
    const { rows, columns } = presentDatabase(gathered, view, nodes, getPropertySchema, (key) => getTemplate(key)?.label ?? key);
    return {
      columns: columns.map((column) => column.label),
      rows: rows.map((row) => ({ id: row.id, name: row.name, cells: columns.map((column) => databaseCell(row, column, nodes)) })),
    };
  }

  return {
    project,
    nodes: Object.values(nodes),
    // The tree's own ordering lives in the project, so an export comes out
    // in the order she arranged rather than in creation order.
    orderedIdsFor: (parentId: string | null) => orderedSiblingIds(useProjectStore.getState().nodes, project, parentId),
    rowsFor,
    databaseFor,
  };
}
