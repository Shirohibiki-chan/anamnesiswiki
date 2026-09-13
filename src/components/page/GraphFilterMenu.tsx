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
import { GRAPH_EDGE_KINDS, type GraphEdgeKind } from "../../services/graph-service";

type GraphFilterMenuProps = {
  filters: DatabaseFilter[];
  onChange: (filters: DatabaseFilter[]) => void;
  choicesFor: (field: DatabaseField) => string[];
  hideLone: boolean;
  onHideLone: (hide: boolean) => void;
  kinds: ReadonlySet<GraphEdgeKind>;
  onKinds: (kinds: ReadonlySet<GraphEdgeKind>) => void;
  lineNames: string[];
  hiddenLabels: ReadonlySet<string>;
  onHiddenLabels: (hidden: ReadonlySet<string>) => void;
};

/**
 * What each kind of line is called to her. The kinds are link-index's, and
 * the tree's; the words are the ones the rest of the app uses for the same
 * things — a mention in the writing, a reference field in the sidebar, a
 * manual links block, a storyline's scene, a shape on a board, and where the
 * page is filed.
 */
const KIND_LABELS: Record<GraphEdgeKind, string> = {
  prose: "Mentions in the writing",
  property: "Reference fields",
  manual: "Manual links",
  storyline: "Storylines",
  board: "Boards",
  tree: "Filed under",
};

export function GraphFilterMenu({
  filters,
  onChange,
  choicesFor,
  hideLone,
  onHideLone,
  kinds,
  onKinds,
  lineNames,
  hiddenLabels,
  onHiddenLabels,
}: GraphFilterMenuProps) {
  function toggleKind(kind: GraphEdgeKind) {
    const next = new Set(kinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    onKinds(next);
  }

  function toggleLabel(label: string) {
    const next = new Set(hiddenLabels);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    onHiddenLabels(next);
  }

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
      {filters.length === 0 && !hideLone && kinds.size === GRAPH_EDGE_KINDS.length && hiddenLabels.size === 0 && (
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

      {/* Obsidian's Orphans switch, hers 2026-09-13. A checkbox rather than a
          filter row because it is not a condition on a field — it is about
          the lines, which no page carries as a property. Nothing written
          counts; where a page is filed does not, or nothing would be lone. */}
      <label className="graph-check">
        <input type="checkbox" checked={hideLone} onChange={(event) => onHideLone(event.target.checked)} />
        <span>Hide pages nothing points at</span>
      </label>

      {/* Which kinds of line are drawn — hers 2026-09-13. On a whole-world
          graph a kind switched off is taken off the settled picture; on a
          page's graph it is not walked along either, so nothing floats. */}
      <p className="graph-menu-head">Lines to show</p>
      {GRAPH_EDGE_KINDS.map((kind) => (
        <div key={kind}>
          <label className="graph-check">
            <input type="checkbox" checked={kinds.has(kind)} onChange={() => toggleKind(kind)} />
            <span>{KIND_LABELS[kind]}</span>
          </label>
          {/* Under Reference fields, each relationship the graph knows by
              name — Friends, Enemies, Leader — to switch on its own. Hers
              2026-09-13: "friends/enemies/etc". Only a reference field knows
              what to call itself, so only this kind opens up. */}
          {kind === "property" &&
            kinds.has(kind) &&
            lineNames.map((label) => (
              <label key={label} className="graph-check graph-check-sub">
                <input type="checkbox" checked={!hiddenLabels.has(label)} onChange={() => toggleLabel(label)} />
                <span>{label}</span>
              </label>
            ))}
        </div>
      ))}

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
