// The settings an index block's database has beyond its layout — columns,
// filter, sort, group — reached from one quiet control on the block's own
// bar (Queued Adjustments, 2026-09-21).
//
// **One control, not four, because of the width.** The page-level bar lays
// five buttons across a full-page table; a block sits in a sidebar column
// with room for the layout switcher and little else. So the block gets the
// layout switcher beside a single *Settings* control, and the four menus open
// from a list inside the popover, each with a way back — the same menus the
// page uses, handed the block's own view through `useBlockViewHandle`, so
// what "Filter" means cannot drift between the two.
import { useState } from "react";
import { ArrowDownUp, ArrowLeft, Columns3, Filter, Group, SlidersHorizontal } from "lucide-react";
import type { Block, Node } from "../../constants/schema";
import { useBlockViewHandle } from "../../hooks/use-database";
import { DatabaseColumnsMenu } from "../page/DatabaseColumnsMenu";
import { DatabaseFilterMenu } from "../page/DatabaseFilterMenu";
import { DatabaseGroupMenu } from "../page/DatabaseGroupMenu";
import { DatabaseSortMenu } from "../page/DatabaseSortMenu";
import { TreePopover } from "../tree/TreePopover";

type Menu = "columns" | "filter" | "sort" | "group";

const MENU_LABELS: Record<Menu, string> = {
  columns: "Columns",
  filter: "Filter",
  sort: "Sort",
  group: "Group",
};

export function DatabaseBlockSettings({ node, block }: { node: Node; block: Block }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const handle = useBlockViewHandle(node, block);
  const { view, allColumns } = handle;

  const counts: Record<Menu, number> = {
    columns: (view.hiddenColumns ?? []).filter((key) => allColumns.some((column) => column.key === key)).length,
    filter: (view.filters ?? []).length,
    sort: (view.sorts ?? []).length,
    group: view.groupBy ? 1 : 0,
  };
  const active = Object.values(counts).filter((count) => count > 0).length;

  function close() {
    setRect(null);
    setMenu(null);
  }

  const icons: Record<Menu, React.ReactNode> = {
    columns: <Columns3 size={13} />,
    filter: <Filter size={13} />,
    sort: <ArrowDownUp size={13} />,
    group: <Group size={13} />,
  };

  return (
    <>
      <button
        type="button"
        className="block-collection-source block-database-settings"
        data-tool="block-settings"
        aria-haspopup="menu"
        aria-expanded={rect !== null}
        // A count the moment a setting is doing something, the way the page's
        // bar shows one per button — here summed, since there is one button.
        data-on={active > 0 ? "" : undefined}
        onClick={(event) => setRect(event.currentTarget.getBoundingClientRect())}
      >
        <SlidersHorizontal size={11} /> Settings
        {active > 0 && <span className="database-tool-count">{active}</span>}
      </button>

      {rect && (
        <TreePopover anchorRect={rect} onClose={close} className="database-menu">
          {menu === null ? (
            <div className="database-menu-body">
              {(Object.keys(MENU_LABELS) as Menu[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className="database-menu-item block-database-settings-item"
                  data-tool={key}
                  data-on={counts[key] > 0 ? "" : undefined}
                  onClick={() => setMenu(key)}
                >
                  {icons[key]}
                  {MENU_LABELS[key]}
                  {counts[key] > 0 && <span className="database-tool-count">{counts[key]}</span>}
                </button>
              ))}
            </div>
          ) : (
            <>
              <button type="button" className="tree-context-menu-back block-database-settings-back" onClick={() => setMenu(null)}>
                <ArrowLeft size={13} /> Settings
              </button>
              {menu === "columns" && <DatabaseColumnsMenu handle={handle} />}
              {menu === "filter" && <DatabaseFilterMenu handle={handle} />}
              {menu === "sort" && <DatabaseSortMenu handle={handle} />}
              {menu === "group" && <DatabaseGroupMenu handle={handle} />}
            </>
          )}
        </TreePopover>
      )}
    </>
  );
}
