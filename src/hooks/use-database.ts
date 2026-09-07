// The only import path components have into database-service.ts. See
// CLAUDE.md's layer order — components never import services directly.
import { useMemo } from "react";
import type { Node } from "../constants/schema";
import { databaseCell, databaseColumns, databaseRows, newDatabaseView, type DatabaseCell } from "../services/database-service";
import type { RenderableProperty } from "../services/property-service";
import { getPropertySchema } from "../services/template-registry";
import { useProject } from "./use-project";

export type { DatabaseCell } from "../services/database-service";

/**
 * What a page shown as a database draws: its rows, its columns, and a reader
 * for one cell.
 *
 * `cell` is handed out as a function rather than a pre-built grid because the
 * grid is rows × columns and most of it is empty — a folder of two hundred
 * pages with a dozen columns would allocate two thousand cell objects on every
 * keystroke anywhere in the project, to draw the few dozen actually on screen.
 */
export function useDatabase(node: Node | undefined): {
  rows: Node[];
  columns: RenderableProperty[];
  cell: (row: Node, column: RenderableProperty) => DatabaseCell;
} {
  const { project, nodes } = useProject();

  return useMemo(() => {
    if (!node?.view) return { rows: [], columns: [], cell: () => ({ kind: "empty" }) as DatabaseCell };

    const rows = databaseRows(nodes, project?.childOrder, node.id);
    const columns = databaseColumns(rows, node.view.templateKey, getPropertySchema);
    return { rows, columns, cell: (row, column) => databaseCell(row, column, nodes) };
  }, [node, nodes, project?.childOrder]);
}

/**
 * A fresh view for this page, with its columns guessed from what is inside it.
 *
 * Lives here rather than at the click site so the guess is made against the
 * same ordered rows the table will draw, not against an unordered sweep of the
 * node map that happens to agree today.
 */
export function useNewDatabaseView(): (nodeId: string) => ReturnType<typeof newDatabaseView> {
  const { project, nodes } = useProject();
  return (nodeId: string) => newDatabaseView(databaseRows(nodes, project?.childOrder, nodeId));
}
