// The bar above a database: what it is a table of, and the four settings.
// Phase 23, step 2.
//
// **One fixed bar rather than controls that appear when they apply.** A Group
// button that only existed once a page had a status property would move the
// other three every time a template changed, and a row of controls that is in
// a different place per page is the thing that reads as chaos. They are always
// here; a menu with nothing to offer says so inside itself.
import { useState } from "react";
import { ArrowDownUp, Columns3, Filter, Group, LayoutGrid } from "lucide-react";
import type { Node } from "../../constants/schema";
import { useDatabase } from "../../hooks/use-database";
import { useTemplates } from "../../hooks/use-templates";
import { TreePopover } from "../tree/TreePopover";
import { DatabaseColumnsMenu } from "./DatabaseColumnsMenu";
import { DatabaseFilterMenu } from "./DatabaseFilterMenu";
import { DatabaseGroupMenu } from "./DatabaseGroupMenu";
import { DatabaseLayoutMenu } from "./DatabaseLayoutMenu";
import { DatabaseSortMenu } from "./DatabaseSortMenu";

type Menu = "layout" | "columns" | "filter" | "sort" | "group";

// The button wears the layout's own name rather than the word "Layout", so the
// bar says what you are looking at as well as offering to change it.
const LAYOUT_NAMES: Record<string, string> = {
  table: "Table",
  cards: "Cards",
  board: "Board",
  list: "List",
};

export function DatabaseToolbar({ node }: { node: Node }) {
  const [open, setOpen] = useState<{ menu: Menu; rect: DOMRect } | null>(null);
  const { rows, allRows, allColumns } = useDatabase(node);
  const { getLabel } = useTemplates();

  const view = node.view;
  if (!view) return null;

  const hiddenCount = (view.hiddenColumns ?? []).filter((key) =>
    allColumns.some((column) => column.key === key),
  ).length;
  const filterCount = (view.filters ?? []).length;
  const sortCount = (view.sorts ?? []).length;

  function button(menu: Menu, label: string, icon: React.ReactNode, count: number) {
    return (
      <button
        type="button"
        className="database-tool"
        // A stable hook for the app test suite. The visible name gains a count
        // the moment a setting is doing something, so "the Filter button" is
        // called "Filter 1" half the time and cannot be found by its name.
        data-tool={menu}
        aria-expanded={open?.menu === menu}
        data-on={count > 0 ? "" : undefined}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setOpen((current) => (current?.menu === menu ? null : { menu, rect }));
        }}
      >
        {icon}
        {label}
        {count > 0 && <span className="database-tool-count">{count}</span>}
      </button>
    );
  }

  return (
    <div className="database-toolbar">
      {/* Says what the grid is a grid *of*, which is the one thing a column of
          blanks cannot tell you — a Location among the characters has empty
          cells for a reason, and this is where that reason is written.

          The count says how many were left out rather than only how many are
          left, because a filter that hides everything and a page with nothing
          in it look identical otherwise. */}
      <div className="ui-eyebrow database-meta">
        {rows.length === allRows.length
          ? rows.length === 1
            ? "1 page"
            : `${rows.length} pages`
          : `${rows.length} of ${allRows.length} pages`}
        {view.templateKey && <> · {getLabel(view.templateKey)}</>}
      </div>

      <div className="database-tools">
        {/* First, because it is the question you answer before the others —
            which shape is this, and then how is it filled in. */}
        {button("layout", LAYOUT_NAMES[view.layout] ?? "Table", <LayoutGrid size={13} />, 0)}
        {button("columns", "Columns", <Columns3 size={13} />, hiddenCount)}
        {button("filter", "Filter", <Filter size={13} />, filterCount)}
        {button("sort", "Sort", <ArrowDownUp size={13} />, sortCount)}
        {button("group", "Group", <Group size={13} />, view.groupBy ? 1 : 0)}
      </div>

      {open && (
        <TreePopover anchorRect={open.rect} onClose={() => setOpen(null)} className="database-menu">
          {open.menu === "layout" && <DatabaseLayoutMenu node={node} />}
          {open.menu === "columns" && <DatabaseColumnsMenu node={node} />}
          {open.menu === "filter" && <DatabaseFilterMenu node={node} />}
          {open.menu === "sort" && <DatabaseSortMenu node={node} />}
          {open.menu === "group" && <DatabaseGroupMenu node={node} />}
        </TreePopover>
      )}
    </div>
  );
}
