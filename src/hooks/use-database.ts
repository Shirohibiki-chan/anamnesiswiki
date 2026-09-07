// The only import path components have into database-service.ts. See
// CLAUDE.md's layer order — components never import services directly.
import { useCallback, useMemo } from "react";
import type { DatabaseView, Node } from "../constants/schema";
import {
  applyFilters,
  applySorts,
  databaseCell,
  databaseColumns,
  databaseRows,
  fieldChoices,
  groupRows,
  newDatabaseView,
  visibleColumns,
  type DatabaseCell,
  type DatabaseGroup,
} from "../services/database-service";
import type { RenderableProperty } from "../services/property-service";
import { getPropertySchema, getTemplate } from "../services/template-registry";
import { useProject, useProjectActions } from "./use-project";

export type { DatabaseCell, DatabaseGroup } from "../services/database-service";

// Re-exported because the settings menus need them and a component may not
// reach into services. The same reason `use-tree-data` re-exports the tree's
// search modes.
export {
  fieldId,
  fieldLabel,
  filterableFields,
  groupableFields,
  isMultiValued,
  operatorsFor,
  sameField,
  takesValue,
  OPERATOR_LABELS,
} from "../services/database-service";

function templateLabel(key: string): string {
  return getTemplate(key)?.label ?? key;
}

/**
 * What a page shown as a database draws: its rows, its columns, and a reader
 * for one cell.
 *
 * **`rows` is what survived the view's settings; `allRows` is everything
 * inside the page.** Both are needed at once — the filter's value picker has to
 * offer values that are currently filtered out, or removing a filter becomes
 * the only way to see what you could filter by, and the count has to be able to
 * say three of twelve rather than just three.
 *
 * `cell` is handed out as a function rather than a pre-built grid because the
 * grid is rows × columns and most of it is empty — a folder of two hundred
 * pages with a dozen columns would allocate two thousand cell objects on every
 * keystroke anywhere in the project, to draw the few dozen actually on screen.
 */
export function useDatabase(node: Node | undefined): {
  rows: Node[];
  allRows: Node[];
  columns: RenderableProperty[];
  allColumns: RenderableProperty[];
  groups: DatabaseGroup[] | null;
  cell: (row: Node, column: RenderableProperty) => DatabaseCell;
  choicesFor: (field: Parameters<typeof fieldChoices>[1]) => string[];
} {
  const { project, nodes } = useProject();

  return useMemo(() => {
    const empty = {
      rows: [],
      allRows: [],
      columns: [],
      allColumns: [],
      groups: null,
      cell: () => ({ kind: "empty" }) as DatabaseCell,
      choicesFor: () => [],
    };
    if (!node?.view) return empty;

    const view = node.view;
    const allRows = databaseRows(nodes, project?.childOrder, node.id);
    const allColumns = databaseColumns(allRows, view.templateKey, getPropertySchema);

    // Filters and sorts read every column, not only the shown ones. Hiding a
    // column is about what is on screen; a view sorted by a column she then
    // turned off should stay in the order she asked for.
    const filtered = applyFilters(allRows, view.filters, allColumns, nodes, templateLabel);
    const rows = applySorts(filtered, view.sorts, allColumns, nodes, templateLabel);

    return {
      rows,
      allRows,
      columns: visibleColumns(allColumns, view.hiddenColumns),
      allColumns,
      groups: groupRows(rows, view.groupBy, allColumns, nodes, templateLabel),
      cell: (row: Node, column: RenderableProperty) => databaseCell(row, column, nodes),
      choicesFor: (field: Parameters<typeof fieldChoices>[1]) =>
        fieldChoices(allRows, field, allColumns, nodes, templateLabel),
    };
  }, [node, nodes, project?.childOrder]);
}

/**
 * A fresh view for this page, with its columns guessed from what is inside it.
 *
 * Lives here rather than at the click site so the guess is made against the
 * same ordered rows the table will draw, not against an unordered sweep of the
 * node map that happens to agree today.
 */
export function useNewDatabaseView(): (nodeId: string) => DatabaseView {
  const { project, nodes } = useProject();
  return (nodeId: string) => newDatabaseView(databaseRows(nodes, project?.childOrder, nodeId));
}

/**
 * Changes part of a page's view, leaving the rest alone.
 *
 * A patch rather than a whole view because every settings menu changes one
 * thing, and each of them writing the entire record back is how a menu left
 * open across an undo clobbers what the undo restored.
 */
export function useUpdateDatabaseView(): (node: Node, patch: Partial<DatabaseView>) => void {
  const { setNodeView } = useProjectActions();
  return useCallback(
    (node: Node, patch: Partial<DatabaseView>) => {
      if (!node.view) return;
      setNodeView(node.id, { ...node.view, ...patch });
    },
    [setNodeView],
  );
}
