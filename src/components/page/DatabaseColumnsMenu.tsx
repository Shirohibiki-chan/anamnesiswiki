// Which of a database's columns are on screen. Phase 23, step 2.
//
// **Stored as what is off, not what is on** (see `hiddenColumns`), so a
// property added to a template later turns up in views that already exist
// rather than staying invisible until somebody thinks to come in here.
import type { Node } from "../../constants/schema";
import { useDatabase, useUpdateDatabaseView } from "../../hooks/use-database";

export function DatabaseColumnsMenu({ node }: { node: Node }) {
  const { allColumns } = useDatabase(node);
  const update = useUpdateDatabaseView();

  const hidden = new Set(node.view?.hiddenColumns ?? []);

  function toggle(key: string) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    update(node, { hiddenColumns: [...next] });
  }

  if (allColumns.length === 0) {
    return (
      <p className="database-menu-empty">
        This table has no columns yet. Columns come from the properties on the pages inside it.
      </p>
    );
  }

  return (
    <div className="database-menu-body">
      <p className="database-menu-head">Columns</p>
      {allColumns.map((column) => (
        <label key={column.key} className="database-check">
          <input type="checkbox" checked={!hidden.has(column.key)} onChange={() => toggle(column.key)} />
          <span>{column.label}</span>
        </label>
      ))}
      {/* The Name column is not in the list because a row with no name is not a
          row you could click on — it is the identity, not a property. Saying so
          is cheaper than letting someone hunt for the one column that isn't
          there. */}
      <p className="database-menu-note">A row's name always shows.</p>
    </div>
  );
}
