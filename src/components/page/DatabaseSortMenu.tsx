// How a database's rows are ordered. Phase 23, step 2.
//
// **Several rungs, in order, because one is not enough for the obvious case**:
// grouping characters by status and then wanting them alphabetical inside
// that. The first entry decides, the ones after it break ties, which is what
// the arrows in the list are for.
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import type { DatabaseField, DatabaseSort, Node } from "../../constants/schema";
import {
  fieldId,
  fieldLabel,
  filterableFields,
  sameField,
  useDatabase,
  useUpdateDatabaseView,
} from "../../hooks/use-database";

export function DatabaseSortMenu({ node }: { node: Node }) {
  const { allColumns } = useDatabase(node);
  const update = useUpdateDatabaseView();

  const sorts = node.view?.sorts ?? [];
  const fields = filterableFields(allColumns);
  // A field already sorted by is not offered again — two rungs on one column
  // is a tie-break against itself, which can only ever do nothing.
  const spare = fields.filter((field) => !sorts.some((sort) => sameField(sort.field, field)));

  function write(next: DatabaseSort[]) {
    update(node, { sorts: next });
  }

  function change(at: number, patch: Partial<DatabaseSort>) {
    write(sorts.map((sort, index) => (index === at ? { ...sort, ...patch } : sort)));
  }

  return (
    <div className="database-menu-body">
      <p className="database-menu-head">Sort</p>

      {sorts.length === 0 && (
        <p className="database-menu-note">Not sorted. Rows are in the order the tree has them.</p>
      )}

      {sorts.map((sort, at) => (
        <div key={fieldId(sort.field)} className="database-filter-row">
          <select
            className="database-select"
            aria-label="What to sort by"
            value={fieldId(sort.field)}
            onChange={(event) => {
              const chosen = fields.find((candidate) => fieldId(candidate) === event.target.value);
              if (chosen) change(at, { field: chosen });
            }}
          >
            {[sort.field, ...spare].map((field: DatabaseField) => (
              <option key={fieldId(field)} value={fieldId(field)}>
                {fieldLabel(field, allColumns)}
              </option>
            ))}
          </select>

          {/* A toggle rather than a two-item dropdown: there are exactly two
              directions and the arrow says which one it is at a glance. */}
          <button
            type="button"
            className="database-direction"
            aria-label={sort.direction === "asc" ? "Sorted A to Z — click for Z to A" : "Sorted Z to A — click for A to Z"}
            onClick={() => change(at, { direction: sort.direction === "asc" ? "desc" : "asc" })}
          >
            {sort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            {sort.direction === "asc" ? "A–Z" : "Z–A"}
          </button>

          <button
            type="button"
            className="ui-inline-remove"
            aria-label={`Stop sorting by ${fieldLabel(sort.field, allColumns)}`}
            // Focus goes back to the popover before this button stops
            // existing. Without it focus lands on `body`, and TreePopover
            // listens for Escape on its own element — so removing the last
            // sort quietly turns the Escape key off.
            onClick={(event) => {
              const popover = event.currentTarget.closest<HTMLElement>(".tree-popover");
              write(sorts.filter((_, index) => index !== at));
              popover?.focus();
            }}
          >
            <X size={12} />
          </button>
        </div>
      ))}

      {spare.length > 0 && (
        <button
          type="button"
          className="database-menu-add"
          onClick={() => write([...sorts, { field: spare[0], direction: "asc" }])}
        >
          <Plus size={13} /> Add a sort
        </button>
      )}

      {sorts.length > 0 && <p className="database-menu-note">Blank values go last, either way round.</p>}
    </div>
  );
}
