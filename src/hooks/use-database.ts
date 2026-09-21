// The only import path components have into database-service.ts. See
// CLAUDE.md's layer order — components never import services directly.
import { useCallback, useMemo } from "react";
import type { Block, DatabaseField, DatabaseView, Node } from "../constants/schema";
import type { CellEdit } from "../services/database-service";
import {
  databaseCell,
  databaseRows,
  defaultBlockView,
  fieldChoices,
  newDatabaseView,
  presentDatabase,
  scopeHasNoUniverse,
  type DatabaseCell,
  type DatabaseGroup,
} from "../services/database-service";
import type { RenderableProperty } from "../services/property-service";
import { getPropertySchema, getTemplate } from "../services/template-registry";
import { useCollection } from "./use-link-index";
import { useProject, useProjectActions } from "./use-project";

export type { DatabaseCell, DatabaseGroup } from "../services/database-service";

/**
 * Everything a layout needs to draw, and nothing about where it came from.
 *
 * The four layout components take this rather than a node, so the same
 * components draw a page-level database and an index block — the only
 * difference between the two is which hook filled this in.
 */
export type DatabaseSurface = {
  rows: Node[];
  columns: RenderableProperty[];
  groups: DatabaseGroup[] | null;
  cell: (row: Node, column: RenderableProperty) => DatabaseCell;
  choicesFor: (field: DatabaseField) => string[];
  /** The view being drawn, for the layout and the board's grouping. */
  view: DatabaseView;
  /** Absent on a surface that only shows values. */
  onEdit?: (rowId: string, column: RenderableProperty, edit: CellEdit) => void;
};

// Re-exported because the settings menus need them and a component may not
// reach into services. The same reason `use-tree-data` re-exports the tree's
// search modes.
export {
  isEditableInRow,
  fieldId,
  fieldLabel,
  filterableFields,
  groupableFields,
  isMultiValued,
  operatorsFor,
  sameField,
  takesValue,
  takesTypedValue,
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
export function useDatabase(node: Node | undefined): Omit<DatabaseSurface, "onEdit"> & {
  allRows: Node[];
  allColumns: RenderableProperty[];
} {
  const { project, nodes } = useProject();

  return useMemo(() => {
    const empty = {
      rows: [],
      allRows: [],
      columns: [],
      allColumns: [],
      groups: null,
      view: { layout: "table" } as DatabaseView,
      cell: () => ({ kind: "empty" }) as DatabaseCell,
      choicesFor: () => [],
    };
    if (!node?.view) return empty;

    const view = node.view;
    const allRows = databaseRows(nodes, project?.childOrder, node.id, view.scope);
    const shown = presentDatabase(allRows, view, nodes, getPropertySchema, templateLabel);

    return {
      ...shown,
      allRows,
      view,
      cell: (row: Node, column: RenderableProperty) => databaseCell(row, column, nodes),
      choicesFor: (field: DatabaseField) =>
        fieldChoices(allRows, field, shown.allColumns, nodes, templateLabel),
    };
  }, [node, nodes, project?.childOrder]);
}

/**
 * What a settings menu needs of a view, and no more: the record, the columns
 * it can name, the values it can offer, and one way to change it.
 *
 * **One shape for a page and for a block, so the menus are written once.**
 * The five menus were built against a page's `node.view` and lived on the
 * bar above a full-page table; a Subpage index block in the sidebar draws
 * through the same pipeline but had only the layout switcher, because a
 * narrow column has nowhere to put six buttons — Queued Adjustments,
 * 2026-09-21. The menus now take this and neither know nor care whose view
 * it is; what differs is where the buttons go (`DatabaseToolbar` for the
 * page, `DatabaseBlockSettings` for the block) and `scopeable`: a page's
 * view can widen where its rows come from, a block's rows are its source's.
 */
export type DatabaseViewHandle = {
  view: DatabaseView;
  allColumns: RenderableProperty[];
  choicesFor: (field: DatabaseField) => string[];
  update: (patch: Partial<DatabaseView>) => void;
  scopeable: boolean;
};

/** The handle for a page shown as a database. Its menus do nothing on a page without a view. */
export function usePageViewHandle(node: Node): DatabaseViewHandle {
  const { allColumns, choicesFor, view } = useDatabase(node);
  const update = useUpdateDatabaseView();
  return useMemo(
    () => ({ view, allColumns, choicesFor, update: (patch) => update(node, patch), scopeable: true }),
    [view, allColumns, choicesFor, update, node],
  );
}

/** The handle for an index block drawn as a database. */
export function useBlockViewHandle(host: Node, block: Block): DatabaseViewHandle {
  const { allColumns, choicesFor, view } = useBlockDatabase(host, block);
  const { setBlockView } = useProjectActions();
  return useMemo(
    () => ({
      view,
      allColumns,
      choicesFor,
      update: (patch) => setBlockView(host.id, block.id, { ...view, ...patch }),
      scopeable: false,
    }),
    [view, allColumns, choicesFor, setBlockView, host.id, block.id],
  );
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

/**
 * Whether this view is scoped to a universe on a page that is not in one.
 *
 * Its own hook because the answer needs the node graph and the component only
 * wants a yes or no — and because an empty table with no explanation is the
 * shape a bug takes.
 */
export function useDatabaseScopeGap(node: Node | undefined): boolean {
  const { nodes } = useProject();
  if (!node?.view) return false;
  return scopeHasNoUniverse(nodes, node.id, node.view.scope);
}

/**
 * The database an index block draws.
 *
 * **Its rows come from the block's own source, not from a scope.** A Subpage
 * index has always listed the host page's children and a Tag index the pages
 * carrying its tags; that stays exactly as it was, in `useCollection`. What is
 * new is everything after the rows — columns, filters, sorts, grouping and the
 * four layouts — which is the same pipeline a page-level database uses, so the
 * two cannot drift apart in what they think a Status means.
 *
 * A block that has never been changed has no stored view and draws as a list,
 * which is what it always looked like.
 */
export function useBlockDatabase(
  host: Node | undefined,
  block: Block,
): {
  view: DatabaseView;
  rows: Node[];
  allRows: Node[];
  columns: RenderableProperty[];
  allColumns: RenderableProperty[];
  groups: DatabaseGroup[] | null;
  cell: (row: Node, column: RenderableProperty) => DatabaseCell;
  choicesFor: (field: DatabaseField) => string[];
} {
  const { nodes } = useProject();
  const collected = useCollection(nodes, host, block);

  return useMemo(() => {
    const allRows = collected.map((row) => row.node);
    const view = block.view ?? defaultBlockView(allRows);
    const shown = presentDatabase(allRows, view, nodes, getPropertySchema, templateLabel);

    return {
      view,
      allRows,
      ...shown,
      cell: (row: Node, column: RenderableProperty) => databaseCell(row, column, nodes),
      choicesFor: (field: DatabaseField) =>
        fieldChoices(allRows, field, shown.allColumns, nodes, templateLabel),
    };
  }, [collected, block, nodes]);
}

/** Whether this block draws through the database pipeline at all. */
export function isDatabaseBlock(block: Block): boolean {
  // Manual links is a list picked by hand and Backlinks is "pages that mention
  // this one" — neither is a set a database can describe, so neither becomes
  // one. Her call 2026-09-07; see `docs/shipped.md` Phase 23.
  return block.kind === "collection" && (block.source === "subpages" || block.source === "tags");
}
