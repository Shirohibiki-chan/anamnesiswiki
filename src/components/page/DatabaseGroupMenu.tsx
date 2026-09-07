// What a database's rows are gathered under. Phase 23, step 2.
//
// **Only fields a page has exactly one of** — see `groupableFields`. Grouping
// by tags would list a page carrying three of them three times, so a table
// showing nine rows would count twelve, and no heading would be wrong enough
// to look like a bug.
import type { Node } from "../../constants/schema";
import {
  fieldId,
  fieldLabel,
  groupableFields,
  sameField,
  useDatabase,
  useUpdateDatabaseView,
} from "../../hooks/use-database";

export function DatabaseGroupMenu({ node }: { node: Node }) {
  const { allColumns } = useDatabase(node);
  const update = useUpdateDatabaseView();

  const fields = groupableFields(allColumns);
  const current = node.view?.groupBy;

  return (
    <div className="database-menu-body">
      <p className="database-menu-head">Group</p>

      <button
        type="button"
        className="database-menu-item"
        data-on={current ? undefined : ""}
        onClick={() => update(node, { groupBy: undefined })}
      >
        Don't group
      </button>

      {fields.map((field) => (
        <button
          key={fieldId(field)}
          type="button"
          className="database-menu-item"
          data-on={current && sameField(current, field) ? "" : undefined}
          onClick={() => update(node, { groupBy: field })}
        >
          {fieldLabel(field, allColumns)}
        </button>
      ))}

      {/* The list is only ever Template plus this table's dropdown properties,
          so on a world that has not made any it holds one item and looks
          broken. Saying what would go in it is the difference between an empty
          menu and an answer. */}
      {fields.length <= 1 && (
        <p className="database-menu-note">
          Add a dropdown or status property to these pages and it can be grouped by that too.
        </p>
      )}
    </div>
  );
}
