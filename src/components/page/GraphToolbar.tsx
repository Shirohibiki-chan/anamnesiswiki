// The controls above a graph. Phase 24, step 2.
//
// **One fixed row, the same rule DatabaseToolbar states.** Nothing here appears
// or disappears with the state of the graph — *Reset positions* is present and
// disabled until something has been moved, rather than arriving and shoving the
// other controls sideways. A row of controls that sits somewhere different
// depending on what the page holds is the thing that reads as chaos.
import { Filter, SlidersHorizontal, Undo2 } from "lucide-react";
import {
  GRAPH_NAME_ZOOM_MAX,
  GRAPH_NAME_ZOOM_MIN,
  GRAPH_NAME_ZOOM_STEP,
  GRAPH_REACHES,
  GRAPH_REACH_EVERYTHING,
  type GraphReach,
} from "../../constants/graph";
import type { DatabaseField, DatabaseFilter } from "../../constants/schema";
import { GRAPH_EDGE_KINDS, type GraphEdgeKind } from "../../services/graph-service";
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
  pointed: "Only when pointed at",
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
  /** Whether pages nothing written points at are left off. In the filter menu, since it hides pages. */
  hideLone: boolean;
  onHideLone: (hide: boolean) => void;
  /** Which kinds of line are drawn. Also in the filter menu, since it hides lines. */
  kinds: ReadonlySet<GraphEdgeKind>;
  onKinds: (kinds: ReadonlySet<GraphEdgeKind>) => void;
  /** What the relationships on this graph are called, and which are switched off. */
  lineNames: string[];
  hiddenLabels: ReadonlySet<string>;
  onHiddenLabels: (hidden: ReadonlySet<string>) => void;
  /** The zoom below which no names are drawn — hers to move, see the Display menu. */
  nameZoom: number;
  onNameZoom: (zoom: number) => void;
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
  hideLone,
  onHideLone,
  kinds,
  onKinds,
  lineNames,
  hiddenLabels,
  onHiddenLabels,
  nameZoom,
  onNameZoom,
  arranged,
  onPutBack,
}: GraphToolbarProps) {
  const [filterRect, setFilterRect] = useState<DOMRect | null>(null);
  const [displayRect, setDisplayRect] = useState<DOMRect | null>(null);
  const hiding = filters.length + (hideLone ? 1 : 0) + (GRAPH_EDGE_KINDS.length - kinds.size) + hiddenLabels.size;

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
          {/* Greyed with the reason written in it, not only on a tooltip. A
              disabled control whose only explanation is a hover reads as a
              broken one — she reported it as "still can't access Reach"
              three times on 2026-09-13 and chose this over a line beside it,
              which would have made the bar taller in one state than the
              other. The option text is the one place the reason can sit
              without moving anything. */}
          {reachDisabled ? (
            <option value={GRAPH_REACH_EVERYTHING}>{REACH_LABELS[GRAPH_REACH_EVERYTHING]} — open a page's graph to count from it</option>
          ) : (
            GRAPH_REACHES.map((option) => (
              <option key={option} value={option}>
                {REACH_LABELS[option]}
              </option>
            ))
          )}
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
        aria-haspopup="menu"
        aria-expanded={filterRect !== null}
        data-on={hiding > 0 ? "" : undefined}
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
        {hiding > 0 && <span className="graph-tool-count">{hiding}</span>}
      </button>

      {/* Obsidian's sliders, the one of them she asked for (2026-09-13): how
          close is close enough for names. A preference, like the label mode,
          and changed here rather than in Settings for the same reason — it is
          the kind of thing you move while looking at what it changes. */}
      <button
        type="button"
        className="graph-tool"
        data-tool="display"
        aria-haspopup="menu"
        aria-expanded={displayRect !== null}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setDisplayRect((current) => (current ? null : rect));
        }}
      >
        <SlidersHorizontal size={13} />
        Display
      </button>

      <button
        type="button"
        className="graph-tool"
        // The hook keeps its old name: the suite and this file know it, and
        // a rename buys nothing.
        data-tool="put-back"
        disabled={!arranged}
        title={
          arranged
            ? "Forget where pages were dragged and lay the graph out again"
            : "No page has been dragged on this graph"
        }
        onClick={onPutBack}
      >
        <Undo2 size={13} />
        {/* "Put it back" until 2026-09-15 — hers: it did not say what it put
            back. This names the thing it resets. */}
        Reset positions
      </button>

      {filterRect && (
        <TreePopover anchorRect={filterRect} onClose={() => setFilterRect(null)} className="graph-menu">
          <GraphFilterMenu
            filters={filters}
            onChange={onFilters}
            choicesFor={choicesFor}
            hideLone={hideLone}
            onHideLone={onHideLone}
            kinds={kinds}
            onKinds={onKinds}
            lineNames={lineNames}
            hiddenLabels={hiddenLabels}
            onHiddenLabels={onHiddenLabels}
          />
        </TreePopover>
      )}

      {displayRect && (
        <TreePopover anchorRect={displayRect} onClose={() => setDisplayRect(null)} className="graph-menu">
          <div className="graph-menu-body">
            <label className="graph-slider">
              <span className="graph-slider-label">
                Names appear when zoomed in to
                <span className="graph-slider-value">{Math.round(nameZoom * 100)}%</span>
              </span>
              <input
                type="range"
                className="graph-range"
                min={GRAPH_NAME_ZOOM_MIN}
                max={GRAPH_NAME_ZOOM_MAX}
                step={GRAPH_NAME_ZOOM_STEP}
                value={nameZoom}
                aria-label="Names appear when zoomed in to"
                onChange={(event) => onNameZoom(Number(event.target.value))}
              />
            </label>
            <p className="graph-menu-note">
              Lower means names show from further out; higher keeps the picture to dots until you are close.
            </p>
          </div>
        </TreePopover>
      )}
    </div>
  );
}
