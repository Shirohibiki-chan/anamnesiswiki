// A graph's filters: which pages are worth drawing at all. Phase 24, step 2.
//
// **Phase 23's filter model, pointed at a different renderer** — the plan's
// promise, and the reason this is dropdowns rather than a box to type a query
// into. The types, the operators and `matchesFilter` are the database's; what
// this file adds is the shorter field list a picture wants, and the fact that a
// page failing a condition is not walked *through* rather than merely hidden.
import { Plus, X } from "lucide-react";
import type { DatabaseField, DatabaseFilter, DatabaseOperator } from "../../constants/schema";
import {
  fieldId,
  fieldLabel,
  graphOperatorsFor,
  takesValue,
  GRAPH_FILTER_FIELDS,
  OPERATOR_LABELS,
} from "../../hooks/use-graph";

type GraphFilterMenuProps = {
  filters: DatabaseFilter[];
  onChange: (filters: DatabaseFilter[]) => void;
  choicesFor: (field: DatabaseField) => string[];
};

export function GraphFilterMenu({ filters, onChange, choicesFor }: GraphFilterMenuProps) {
  function add() {
    const field = GRAPH_FILTER_FIELDS[0];
    onChange([...filters, { id: crypto.randomUUID(), field, operator: graphOperatorsFor(field)[0] }]);
  }

  function change(id: string, patch: Partial<DatabaseFilter>) {
    onChange(filters.map((filter) => (filter.id === id ? { ...filter, ...patch } : filter)));
  }

  function pickField(id: string, chosen: DatabaseField) {
    // The operator and the value belong to the old field, not the new one — the
    // same rule DatabaseFilterMenu follows, and for the same reason: a Tags
    // condition left reading "is not Character" after a switch is a condition
    // nobody asked for, quietly hiding pages.
    change(id, { field: chosen, operator: graphOperatorsFor(chosen)[0], value: undefined });
  }

  return (
    <div className="graph-menu-body">
      {filters.length === 0 && (
        <p className="graph-menu-note">
          No filters. Every page connected to this one is drawn.
        </p>
      )}

      {filters.map((filter) => {
        const choices = takesValue(filter.operator) ? choicesFor(filter.field) : [];
        return (
          <div key={filter.id} className="graph-filter-row">
            <select
              className="graph-select"
              aria-label="What to filter on"
              value={fieldId(filter.field)}
              onChange={(event) => {
                const chosen = GRAPH_FILTER_FIELDS.find((candidate) => fieldId(candidate) === event.target.value);
                if (chosen) pickField(filter.id, chosen);
              }}
            >
              {GRAPH_FILTER_FIELDS.map((field) => (
                <option key={fieldId(field)} value={fieldId(field)}>
                  {fieldLabel(field, [])}
                </option>
              ))}
            </select>

            <select
              className="graph-select"
              aria-label="How to compare it"
              value={filter.operator}
              onChange={(event) => change(filter.id, { operator: event.target.value as DatabaseOperator })}
            >
              {graphOperatorsFor(filter.field).map((operator) => (
                <option key={operator} value={operator}>
                  {OPERATOR_LABELS[operator]}
                </option>
              ))}
            </select>

            {takesValue(filter.operator) && (
              <select
                className="graph-select"
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
            )}

            <button
              type="button"
              className="ui-inline-remove"
              aria-label={`Remove the ${fieldLabel(filter.field, [])} filter`}
              // Focus goes back to the popover before this button stops
              // existing. Without it focus lands on `body`, and TreePopover
              // listens for Escape on its own element — so removing the last
              // filter would quietly turn the Escape key off.
              onClick={(event) => {
                const popover = event.currentTarget.closest<HTMLElement>(".tree-popover");
                onChange(filters.filter((other) => other.id !== filter.id));
                popover?.focus();
              }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}

      <button type="button" className="graph-menu-add" onClick={add}>
        <Plus size={13} /> Add a filter
      </button>

      {/* Said here rather than left to be discovered: on a picture, hiding a
          page also cuts every route that ran through it, so filtering at two
          connections out can remove pages that match perfectly well. That is
          the only reading of a filtered graph that stays connected — see
          graphAround. */}
      <p className="graph-menu-note">
        A page that is filtered out takes its lines with it, so anything only reachable through it goes too.
      </p>
    </div>
  );
}
