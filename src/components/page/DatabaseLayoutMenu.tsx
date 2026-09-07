// Which of the four layouts a database is drawn in. Phase 23, step 4.
//
// **Switching is a menu, not a conversion.** All four read the same record, so
// nothing is lost either way round — a board's columns are still there when you
// go back to the table, because they were the view's grouping all along.
import type { DatabaseLayout, Node } from "../../constants/schema";
import { DATABASE_LAYOUTS } from "../../constants/schema";
import { groupableFields, useDatabase, useUpdateDatabaseView } from "../../hooks/use-database";

const LAYOUT_LABELS: Record<DatabaseLayout, string> = {
  table: "Table",
  cards: "Cards",
  board: "Board",
  list: "List",
};

const LAYOUT_HINTS: Record<DatabaseLayout, string> = {
  table: "A row per page, and the only one you can type into",
  cards: "A picture and a name each",
  board: "Columns you can drag between",
  list: "A name a line, quietly",
};

export function DatabaseLayoutMenu({ node }: { node: Node }) {
  const { allColumns } = useDatabase(node);
  const update = useUpdateDatabaseView();

  const current = node.view?.layout ?? "table";

  function choose(layout: DatabaseLayout) {
    if (layout !== "board" || node.view?.groupBy) {
      update(node, { layout });
      return;
    }
    // A board with nothing to make columns from has nothing to draw, so
    // choosing it picks a grouping rather than landing on one column and asking
    // her to go and find the Group menu.
    //
    // **A dropdown in preference to the template**, even though the template is
    // always available: a board grouped by template is one column per kind of
    // page, and in a folder of characters that is a single column — a board
    // that looks broken on arrival. Template is the fallback, not the default.
    const fields = groupableFields(allColumns);
    update(node, { layout, groupBy: fields.find((field) => field.kind === "property") ?? fields[0] });
  }

  return (
    <div className="database-menu-body">
      <p className="database-menu-head">Layout</p>
      {DATABASE_LAYOUTS.map((layout) => (
        <button
          key={layout}
          type="button"
          className="database-menu-item database-layout-item"
          data-on={current === layout ? "" : undefined}
          onClick={() => choose(layout)}
        >
          <span>{LAYOUT_LABELS[layout]}</span>
          <span className="database-menu-hint">{LAYOUT_HINTS[layout]}</span>
        </button>
      ))}
    </div>
  );
}
