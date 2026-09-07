// A database's filters: stacked conditions a row has to meet to appear.
// Phase 23, step 2.
//
// **Visible controls, not a query language** — the plan's words, and the reason
// this is three dropdowns per row rather than a box you type an expression
// into. Every condition applies; there is no and/or nesting, because that is
// the query builder the plan says not to build and because stacked conditions
// that all hold is what a person means by filtering.
//
// **Phase 24's graph is meant to reuse this**, filtering by template and by tag
// rather than inventing a second language for the same job — so the field list
// here deliberately holds more than the table's own columns.
import { Plus, X } from "lucide-react";
import type { DatabaseField, DatabaseFilter, DatabaseOperator, DatabaseScope, Node } from "../../constants/schema";
import { DATABASE_SCOPES } from "../../constants/schema";
import {
  fieldId,
  fieldLabel,
  filterableFields,
  operatorsFor,
  takesValue,
  useDatabase,
  useUpdateDatabaseView,
  OPERATOR_LABELS,
} from "../../hooks/use-database";
import { useTemplates } from "../../hooks/use-templates";

const SCOPE_LABELS: Record<DatabaseScope, string> = {
  subpages: "The pages inside this one",
  universe: "This universe",
  everywhere: "Everywhere in this world",
};

export function DatabaseFilterMenu({ node }: { node: Node }) {
  const { allColumns, choicesFor } = useDatabase(node);
  const update = useUpdateDatabaseView();
  const { getLabel } = useTemplates();

  const filters = node.view?.filters ?? [];
  const fields = filterableFields(allColumns);

  function write(next: DatabaseFilter[]) {
    update(node, { filters: next });
  }

  function add() {
    const field = fields[0];
    write([
      ...filters,
      { id: crypto.randomUUID(), field, operator: operatorsFor(field, allColumns)[0] },
    ]);
  }

  function change(id: string, patch: Partial<DatabaseFilter>) {
    write(filters.map((filter) => (filter.id === id ? { ...filter, ...patch } : filter)));
  }

  /**
   * Widening the net also narrows it, the first time.
   *
   * "Everywhere" with no conditions is every page in the world, which is a
   * useless answer and looks like the setting broke something. Adding the
   * template the table is already of makes the widened view mean what she went
   * looking for — and it arrives as a visible filter she can see and remove,
   * rather than as a hidden rule.
   */
  function pickScope(scope: DatabaseScope) {
    const templateKey = node.view?.templateKey;
    if (scope === "subpages" || filters.length > 0 || !templateKey) {
      update(node, { scope });
      return;
    }
    update(node, {
      scope,
      filters: [
        {
          id: crypto.randomUUID(),
          field: { kind: "template" },
          operator: "is",
          value: getLabel(templateKey),
        },
      ],
    });
  }

  function pickField(id: string, chosen: DatabaseField) {
    // The operator and the value go with the old field, not the new one — a
    // Tags filter reading "does not have Alive" after a switch from Status is
    // a condition nobody asked for, quietly hiding rows.
    change(id, { field: chosen, operator: operatorsFor(chosen, allColumns)[0], value: undefined });
  }

  return (
    <div className="database-menu-body">
      {/* Where the rows come from sits above the conditions rather than in a
          sixth button on the bar, because it is the same question asked at its
          widest — which pages are we even considering. The bar says which scope
          is on, so a widened view still advertises itself without one. */}
      <p className="database-menu-head">Looking in</p>
      <select
        className="database-select"
        aria-label="Where to look for rows"
        value={node.view?.scope ?? "subpages"}
        onChange={(event) => pickScope(event.target.value as DatabaseScope)}
      >
        {DATABASE_SCOPES.map((scope) => (
          <option key={scope} value={scope}>
            {SCOPE_LABELS[scope]}
          </option>
        ))}
      </select>
      {(node.view?.scope ?? "subpages") !== "subpages" && (
        <p className="database-menu-note">
          Pages gathered from elsewhere, so there is nowhere obvious to put a new one — Add a page is only offered
          while a database is showing what is inside it.
        </p>
      )}

      <p className="database-menu-head">Filter</p>

      {filters.length === 0 && (
        <p className="database-menu-note">No filters. Every page inside this one is showing.</p>
      )}

      {filters.map((filter) => {
        const operators = operatorsFor(filter.field, allColumns);
        const choices = takesValue(filter.operator) ? choicesFor(filter.field) : [];
        return (
          <div key={filter.id} className="database-filter-row">
            <select
              className="database-select"
              aria-label="What to filter on"
              value={fieldId(filter.field)}
              onChange={(event) => {
                const chosen = fields.find((candidate) => fieldId(candidate) === event.target.value);
                if (chosen) pickField(filter.id, chosen);
              }}
            >
              {fields.map((field) => (
                <option key={fieldId(field)} value={fieldId(field)}>
                  {fieldLabel(field, allColumns)}
                </option>
              ))}
            </select>

            <select
              className="database-select"
              aria-label="How to compare it"
              value={filter.operator}
              onChange={(event) => change(filter.id, { operator: event.target.value as DatabaseOperator })}
            >
              {operators.map((operator) => (
                <option key={operator} value={operator}>
                  {OPERATOR_LABELS[operator]}
                </option>
              ))}
            </select>

            {takesValue(filter.operator) &&
              // `contains` is the one that wants typing — it exists so she can
              // match part of a name or a summary, which by definition is not
              // in a list of the values that are already there.
              (filter.operator === "contains" ? (
                <input
                  type="text"
                  className="database-select"
                  aria-label="What to look for"
                  value={filter.value ?? ""}
                  onChange={(event) => change(filter.id, { value: event.target.value })}
                />
              ) : (
                <select
                  className="database-select"
                  aria-label="What to look for"
                  value={filter.value ?? ""}
                  onChange={(event) => change(filter.id, { value: event.target.value })}
                >
                  <option value="">Choose…</option>
                  {choices.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              ))}

            <button
              type="button"
              className="ui-inline-remove"
              aria-label={`Remove the ${fieldLabel(filter.field, allColumns)} filter`}
              // Focus goes back to the popover before this button stops
              // existing. Without it focus lands on `body`, and TreePopover
              // listens for Escape on its own element — so removing the last
              // filter quietly turns the Escape key off.
              onClick={(event) => {
                const popover = event.currentTarget.closest<HTMLElement>(".tree-popover");
                write(filters.filter((other) => other.id !== filter.id));
                popover?.focus();
              }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}

      <button type="button" className="database-menu-add" onClick={add}>
        <Plus size={13} /> Add a filter
      </button>
    </div>
  );
}
