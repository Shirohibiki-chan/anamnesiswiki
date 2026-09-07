// The list layout. Phase 23, step 4.
//
// **The quiet one.** A name per line with its values trailing after it, for
// when the point is to see what is in the folder rather than to compare
// columns. It is the closest of the four to what the app already had in a
// Subpage index block — which is the observation behind the one decision left
// in `docs/shipped.md` Phase 23, about whether that block and this are one thing.
import type { Node } from "../../constants/schema";
import type { DatabaseCell, DatabaseSurface } from "../../hooks/use-database";
import { useProject } from "../../hooks/use-project";
import type { RenderableProperty } from "../../services/property-service";
import { NodeIcon } from "../blocks/IconPicker";
import { DatabaseChip, DatabaseValue } from "./DatabaseValue";

export function DatabaseList({ data }: { data: DatabaseSurface }) {
  const { rows, columns, groups, cell } = data;

  if (!groups) return <Lines rows={rows} columns={columns} cell={cell} />;

  return (
    <div className="database-list-groups">
      {groups.map((group) => (
        <section key={group.key || "none"}>
          <h3 className="database-group-heading">
            <DatabaseChip label={group.label} color={group.color} />
            <span className="database-group-count">{group.rows.length}</span>
          </h3>
          <Lines rows={group.rows} columns={columns} cell={cell} />
        </section>
      ))}
    </div>
  );
}

function Lines({
  rows,
  columns,
  cell,
}: {
  rows: Node[];
  columns: RenderableProperty[];
  cell: (row: Node, column: RenderableProperty) => DatabaseCell;
}) {
  const { selectNode } = useProject();

  return (
    <ul className="database-list">
      {rows.map((row) => (
        <li key={row.id}>
          <button type="button" className="database-list-row" onClick={() => selectNode(row.id)}>
            <NodeIcon icon={row.icon} templateKey={row.templateKey} size={14} />
            <span className="database-list-name">{row.name}</span>
            <span className="database-list-values">
              {columns.map((column) => {
                const value = cell(row, column);
                if (value.kind === "empty") return null;
                return <DatabaseValue key={column.key} value={value} />;
              })}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
