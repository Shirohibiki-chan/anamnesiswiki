// The cards layout. Phase 23, step 4.
//
// **A card is a picture and a name**, which is why this is the layout a mixed
// set reads well in — a Location among the characters looks like a Location
// rather than like a row of blanks. The properties under the name are whatever
// columns are showing, so the Columns menu trims a card the same way it trims
// a table.
import type { Node } from "../../constants/schema";
import type { DatabaseCell, DatabaseSurface } from "../../hooks/use-database";
import { useProject } from "../../hooks/use-project";
import type { RenderableProperty } from "../../services/property-service";
import { NodeIcon } from "../blocks/IconPicker";
import { DatabaseChip, DatabasePicture, DatabaseValue } from "./DatabaseValue";

export function DatabaseCards({ data }: { data: DatabaseSurface }) {
  const { rows, columns, groups, cell } = data;

  if (!groups) return <Grid rows={rows} columns={columns} cell={cell} />;

  return (
    <div className="database-card-groups">
      {groups.map((group) => (
        <section key={group.key || "none"} className="database-card-group">
          <h3 className="database-group-heading">
            <DatabaseChip label={group.label} color={group.color} />
            <span className="database-group-count">{group.rows.length}</span>
          </h3>
          <Grid rows={group.rows} columns={columns} cell={cell} />
        </section>
      ))}
    </div>
  );
}

function Grid({
  rows,
  columns,
  cell,
}: {
  rows: Node[];
  columns: RenderableProperty[];
  cell: (row: Node, column: RenderableProperty) => DatabaseCell;
}) {
  return (
    <div className="database-cards">
      {rows.map((row) => (
        <Card key={row.id} row={row} columns={columns} cell={cell} />
      ))}
    </div>
  );
}

function Card({
  row,
  columns,
  cell,
}: {
  row: Node;
  columns: RenderableProperty[];
  cell: (row: Node, column: RenderableProperty) => DatabaseCell;
}) {
  const { selectNode } = useProject();

  return (
    <button type="button" className="database-card" onClick={() => selectNode(row.id)}>
      <DatabasePicture row={row} />
      <span className="database-card-name">
        <NodeIcon icon={row.icon} templateKey={row.templateKey} size={14} />
        {row.name}
      </span>
      {columns.map((column) => {
        const value = cell(row, column);
        if (value.kind === "empty") return null;
        return (
          <span key={column.key} className="database-card-field">
            <span className="ui-eyebrow database-card-label">{column.label}</span>
            <DatabaseValue value={value} />
          </span>
        );
      })}
    </button>
  );
}
