// A Subpage index or Tag index block, drawn as a database. Phase 23, step 5.
//
// **The block you already had, with more it can do.** Her call, 2026-09-07: Add
// Block keeps all four names rather than gaining a fifth that overlaps two of
// them, so picking Subpage index still gives you a Subpage index — it is simply
// a database underneath now, and can become a table, cards or a board.
//
// **The source is untouched.** `block.source`, `block.tags` and the tag picker
// beside it still decide *which* pages; the view only decides how they are
// drawn. Two places holding "which tags" is how they drift apart, which is why
// a tag filter is never written into the view.
//
// A block nobody has changed has no stored view and draws as a list — exactly
// what it looked like the day before this shipped. See `defaultBlockView`.
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Block, DatabaseLayout, Node } from "../../constants/schema";
import { groupableFields, useBlockDatabase } from "../../hooks/use-database";
import { useProjectActions } from "../../hooks/use-project";
import { DatabaseLayouts } from "../page/DatabaseLayouts";
import { DatabaseLayoutSubmenu } from "../tree/DatabaseLayoutSubmenu";
import { TreePopover } from "../tree/TreePopover";

const LAYOUT_LABELS: Record<DatabaseLayout, string> = {
  table: "Table",
  cards: "Cards",
  board: "Board",
  list: "List",
};

export function DatabaseBlock({ node, block }: { node: Node; block: Block }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const surface = useBlockDatabase(node, block);
  const { setBlockView, editRowCell } = useProjectActions();

  function pick(layout: DatabaseLayout) {
    setRect(null);
    if (layout !== "board" || surface.view.groupBy) {
      setBlockView(node.id, block.id, { ...surface.view, layout });
      return;
    }
    // Same reasoning as the page-level switcher: a board grouped by template is
    // one column in a folder of one kind of page, which looks broken on arrival.
    const fields = groupableFields(surface.allColumns);
    setBlockView(node.id, block.id, {
      ...surface.view,
      layout,
      groupBy: fields.find((field) => field.kind === "property") ?? fields[0],
    });
  }

  return (
    <div className="block-database">
      {/* A quiet control, like the source picker above it — the block's own
          title strip already says what this is. */}
      <button
        type="button"
        className="block-collection-source"
        onClick={(event) => setRect(event.currentTarget.getBoundingClientRect())}
      >
        {LAYOUT_LABELS[surface.view.layout]} <ChevronDown size={11} />
      </button>

      <DatabaseLayouts data={{ ...surface, onEdit: editRowCell }} allColumns={surface.allColumns} dense />

      {rect && (
        <TreePopover anchorRect={rect} onClose={() => setRect(null)}>
          <DatabaseLayoutSubmenu onSelect={pick} onBack={() => setRect(null)} />
        </TreePopover>
      )}
    </div>
  );
}
