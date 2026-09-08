// The controls above a graph. Phase 24, step 2.
//
// **One fixed row, the same rule DatabaseToolbar states.** Nothing here appears
// or disappears with the state of the graph — *Put it back* is present and
// disabled until something has been moved, rather than arriving and shoving the
// other controls sideways. A row of controls that sits somewhere different
// depending on what the page holds is the thing that reads as chaos.
import { Filter, Undo2 } from "lucide-react";
import { GRAPH_REACHES, GRAPH_REACH_EVERYTHING, type GraphReach } from "../../constants/graph";
import type { DatabaseField, DatabaseFilter } from "../../constants/schema";
import { GRAPH_EDGE_LABELS, type GraphEdgeLabels } from "../../services/preferences-service";
import { TreePopover } from "../tree/TreePopover";
import { GraphFilterMenu } from "./GraphFilterMenu";
import { useState } from "react";

const REACH_LABELS: Record<GraphReach, string> = {
  1: "1 connection out",
  2: "2 connections out",
  3: "3 connections out",
  [GRAPH_REACH_EVERYTHING]: "Everything",
};

const LABEL_MODES: Record<GraphEdgeLabels, string> = {
  selected: "Names when pointed at",
  all: "Names always",
};

type GraphToolbarProps = {
  /** How many pages are drawn, and how many the reach found before filtering. */
  drawn: number;
  reached: number;
  reach: GraphReach;
  onReach: (reach: GraphReach) => void;
  /** Hops need a centre to be counted from; a whole universe has none. */
  reachDisabled?: boolean;
  labels: GraphEdgeLabels;
  onLabels: (mode: GraphEdgeLabels) => void;
  filters: DatabaseFilter[];
  onFilters: (filters: DatabaseFilter[]) => void;
  choicesFor: (field: DatabaseField) => string[];
  /** Whether anything has been dragged, here or on a previous visit. */
  arranged: boolean;
  onPutBack: () => void;
};

export function GraphToolbar({
  drawn,
  reached,
  reach,
  onReach,
  reachDisabled = false,
  labels,
  onLabels,
  filters,
  onFilters,
  choicesFor,
  arranged,
  onPutBack,
}: GraphToolbarProps) {
  const [filterRect, setFilterRect] = useState<DOMRect | null>(null);

  // Both numbers when a filter is on, because a filter that hides everything
  // and a page connected to nothing look identical otherwise — the same reason
  // the database's bar counts this way.
  const count =
    drawn === reached
      ? reached === 1
        ? "1 page"
        : `${reached} pages`
      : `${drawn} of ${reached} pages`;

  return (
    <div className="graph-tools">
      <span className="ui-eyebrow graph-count">{count}</span>

      <label className="graph-tool-label">
        Reach
        <select
          className="graph-select"
          aria-label="How far out to reach"
          value={reach}
          disabled={reachDisabled}
          title={reachDisabled ? "This graph has no page at its centre to count connections from" : undefined}
          onChange={(event) => {
            const chosen = event.target.value;
            onReach(chosen === GRAPH_REACH_EVERYTHING ? GRAPH_REACH_EVERYTHING : (Number(chosen) as GraphReach));
          }}
        >
          {GRAPH_REACHES.map((option) => (
            <option key={option} value={option}>
              {REACH_LABELS[option]}
            </option>
          ))}
        </select>
      </label>

      {/* A preference rather than part of the project — which of the two
          pictures she likes is a habit that follows her between worlds. The
          control lives here rather than in Settings because it is the kind of
          thing you change while looking at the thing it changes. */}
      <label className="graph-tool-label">
        Lines
        <select
          className="graph-select"
          aria-label="When to write what a line is"
          value={labels}
          onChange={(event) => onLabels(event.target.value as GraphEdgeLabels)}
        >
          {GRAPH_EDGE_LABELS.map((mode) => (
            <option key={mode} value={mode}>
              {LABEL_MODES[mode]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="graph-tool"
        // A stable hook for the app suite: the visible name gains a count the
        // moment a filter is on, so "the Filter button" is called "Filter 1"
        // half the time and cannot be found by its name.
        data-tool="filter"
        aria-expanded={filterRect !== null}
        data-on={filters.length > 0 ? "" : undefined}
        // The rect is read here rather than inside the updater, which is the
        // shape DatabaseToolbar uses and the reason is not style: React clears
        // a synthetic event’s currentTarget once the handler returns, and a
        // lazy updater runs after that. It appeared to work, because React
        // evaluates an updater eagerly while its queue is empty — so the first
        // click opened the menu and a later one did nothing at all.
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setFilterRect((current) => (current ? null : rect));
        }}
      >
        <Filter size={13} />
        Filter
        {filters.length > 0 && <span className="graph-tool-count">{filters.length}</span>}
      </button>

      <button
        type="button"
        className="graph-tool"
        data-tool="put-back"
        disabled={!arranged}
        title={arranged ? "Lay the graph out again" : "Nothing has been moved on this graph"}
        onClick={onPutBack}
      >
        <Undo2 size={13} />
        Put it back
      </button>

      {filterRect && (
        <TreePopover anchorRect={filterRect} onClose={() => setFilterRect(null)} className="graph-menu">
          <GraphFilterMenu filters={filters} onChange={onFilters} choicesFor={choicesFor} />
        </TreePopover>
      )}
    </div>
  );
}
