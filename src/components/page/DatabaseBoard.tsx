// The board layout. Phase 23, step 4.
//
// **A board you cannot drag on is a list with extra steps.** Moving a card
// between columns is the whole reason this layout exists, so it sets the value
// it is grouped by — one undoable move, through the same `editRowCell` the
// table's cells use, so a card dragged and a cell typed into are the same edit.
//
// **Dragging is off when the board is grouped by template**, because a card's
// column would then be what kind of page it is, and moving it would mean
// rewriting the page's template — a conversion, not a value. The board still
// draws; it just says why it will not be dragged.
import { useState } from "react";
import type { DatabaseField, Node } from "../../constants/schema";
import { useDatabase } from "../../hooks/use-database";
import { useProject, useProjectActions } from "../../hooks/use-project";
import type { RenderableProperty } from "../../services/property-service";
import { NodeIcon } from "../blocks/IconPicker";
import { DatabaseChip, DatabasePicture, DatabaseValue } from "./DatabaseValue";

export function DatabaseBoard({ node }: { node: Node }) {
  const { columns, groups, allColumns, cell } = useDatabase(node);
  const { editRowCell } = useProjectActions();
  const [over, setOver] = useState<string | null>(null);

  const groupBy: DatabaseField | undefined = node.view?.groupBy;
  // The column the board is grouped by, when that is a property this can
  // actually write to. `template` gives nothing back here, which is what turns
  // dragging off.
  const groupColumn =
    groupBy?.kind === "property" ? allColumns.find((column) => column.key === groupBy.key) : undefined;

  if (!groups) {
    // Only reachable if a stored view has a layout of board and no grouping —
    // switching to board picks one. Worth saying rather than drawing nothing.
    return <p className="database-empty">A board needs something to make its columns. Pick one under Group.</p>;
  }

  function drop(groupLabel: string, rowId: string) {
    setOver(null);
    if (!groupColumn) return;
    // The "no value" column clears it, which is the only way to take something
    // off a board without opening the page.
    editRowCell(rowId, groupColumn, { kind: "options", labels: groupLabel ? [groupLabel] : [] });
  }

  return (
    <>
      {!groupColumn && (
        <p className="database-menu-note">
          Grouped by template, so cards stay where they are — a card's column is what kind of page it is. Group by a
          dropdown or a status to move them around.
        </p>
      )}
      <div className="database-board">
        {groups.map((group) => (
          <section
            key={group.key || "none"}
            className="database-board-column"
            data-over={over === group.key ? "" : undefined}
            onDragOver={(event) => {
              if (!groupColumn) return;
              // Without this the drop never fires — the browser's default is
              // to refuse.
              event.preventDefault();
              setOver(group.key);
            }}
            onDragLeave={() => setOver((current) => (current === group.key ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              // The section with no key is the "no value" one, whatever its
              // heading reads — dropping there clears rather than setting.
              drop(group.key ? group.label : "", event.dataTransfer.getData("text/plain"));
            }}
          >
            <h3 className="database-group-heading">
              <DatabaseChip label={group.label} color={group.color} />
              <span className="database-group-count">{group.rows.length}</span>
            </h3>
            <div className="database-board-cards">
              {group.rows.map((row) => (
                <BoardCard key={row.id} row={row} columns={columns} cell={cell} draggable={Boolean(groupColumn)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function BoardCard({
  row,
  columns,
  cell,
  draggable,
}: {
  row: Node;
  columns: RenderableProperty[];
  cell: (row: Node, column: RenderableProperty) => ReturnType<ReturnType<typeof useDatabase>["cell"]>;
  draggable: boolean;
}) {
  const { selectNode } = useProject();

  return (
    <div
      className="database-board-card"
      draggable={draggable}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", row.id)}
    >
      <button type="button" className="database-card-open" onClick={() => selectNode(row.id)}>
        <DatabasePicture row={row} />
        <span className="database-card-name">
          <NodeIcon icon={row.icon} templateKey={row.templateKey} size={14} />
          {row.name}
        </span>
      </button>
      {columns.map((column) => {
        const value = cell(row, column);
        if (value.kind === "empty") return null;
        return <DatabaseValue key={column.key} value={value} />;
      })}
    </div>
  );
}
