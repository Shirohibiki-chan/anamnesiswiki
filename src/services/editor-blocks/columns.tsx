// Columns: side-by-side lanes of writing in the page. Phase 19.5.
//
// **Two blocks, because a row of columns is a container of containers.** A
// The row draws nothing itself; each lane inside it holds ordinary
// blocks as BlockNote children, so a paragraph in a lane is the same paragraph
// it would be anywhere else — it can be typed in, formatted, dragged out, and
// it exports as itself.
//
// **Written against BlockNote's own block API rather than installed.** The
// official `@blocknote/xl-multi-column` is `GPL-3.0 OR PROPRIETARY` and this
// app is MIT, so it is a licence change to the whole app or a fee, for one
// block. Settled 2026-08-27; `docs/plan.md` Phase 19.5 carries the reasoning.
//
// **The layout is CSS on BlockNote's own nesting, not a layout of our own.**
// The children of any block are rendered by the editor into a `.bn-block-group`
// beside the block's content; for a row of columns that group is turned into a
// flex row (blocks.css). That is the whole trick, and it is why dragging,
// selection, undo and the slash menu keep working inside a lane — none of them
// are being reimplemented.
import { createReactBlockSpec } from "@blocknote/react";
import { COLUMN_LIST_TYPE, COLUMN_TYPE } from "../../constants/schema";
import { ColumnLane, ColumnRow } from "./ColumnLane";

export const columnListConfig = {
  type: COLUMN_LIST_TYPE,
  // **Every lane's share, on the row rather than on the lanes.** One prop means
  // a drag writes once, so half a resize cannot be undone on its own — and a
  // lane cannot end up disagreeing with its neighbour about how the row adds
  // up. Empty means an even split, which is what a row that has never been
  // dragged has. See parseColumnWidths in block-service.ts.
  propSchema: { widths: { default: "" } },
  content: "none",
} as const;

export const columnConfig = {
  type: COLUMN_TYPE,
  propSchema: {},
  content: "none",
} as const;

export const columnListSpec = createReactBlockSpec(columnListConfig, {
  render: ({ block }) => <ColumnRow blockId={block.id} widths={block.props.widths} />,
})();

export const columnSpec = createReactBlockSpec(columnConfig, {
  render: ({ block }) => <ColumnLane blockId={block.id} />,
})();
