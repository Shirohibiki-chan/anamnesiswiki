// The table layout. Phase 23.
//
// **The only layout you can type into.** Text, number, date and the dropdowns
// are edited in the cell; long text, refs and pictures open the page, because
// they want more room than a column has. The other three layouts are for
// looking rather than filling in, so they read the same values and do not
// offer to change them — see PageDatabase.
import type { Node } from "../../constants/schema";
import { isEditableInRow, type DatabaseCell, type DatabaseSurface } from "../../hooks/use-database";
import { useProject } from "../../hooks/use-project";
import type { RenderableProperty } from "../../services/property-service";
import { NodeIcon } from "../blocks/IconPicker";
import { DatabaseCellEditor } from "./DatabaseCellEditor";
import { DatabaseChip, DatabaseValue } from "./DatabaseValue";

// Kept beside each other because they are one decision: how much room a column
// is allowed to be squeezed into before the table stops fitting and scrolls.
// The name column gets more because it is the row's identity and the only part
// of the row that navigates. Matches the floors in database.css.
const COLUMN_FLOOR_REM = 11;
const NAME_FLOOR_REM = 14;
// Narrower again inside a sidebar block, which is a third of a page wide. The
// page's floors there would push almost every table into sideways scrolling,
// and a column of wrapped words beats a scrollbar in a panel that narrow.
const DENSE_FLOOR_REM = 6;
const DENSE_NAME_REM = 7;

export function DatabaseTable({ data, dense }: { data: DatabaseSurface; dense?: boolean }) {
  const { rows, columns, groups, cell } = data;

  return (
    // Its own scroller rather than the page's: a table wide enough to scroll
    // must not take the writing underneath it sideways as well.
    <div className="database-scroll">
      {/* Every column gets a floor, so a table wide enough to need it scrolls
          sideways in its own scroller instead of squeezing every column until
          the words break mid-phrase. Inline because it depends on how many
          columns there are, which CSS cannot see. */}
      <table
        className="database-table"
        style={{ minWidth: `${(dense ? DENSE_FLOOR_REM : COLUMN_FLOOR_REM) * columns.length + (dense ? DENSE_NAME_REM : NAME_FLOOR_REM)}rem` }}
      >
        <thead>
          <tr>
            <th scope="col" className="database-th-name">
              Name
            </th>
            {columns.map((column) => (
              <th scope="col" key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        {groups ? (
          // A tbody per section rather than one long one with heading rows in
          // it: that is what a table body is for, and it means a screen reader
          // announces the section rather than reading a heading as a row.
          groups.map((group) => (
            <tbody key={group.key || "none"}>
              <tr className="database-group-row">
                <th scope="colgroup" colSpan={columns.length + 1}>
                  <DatabaseChip label={group.label} color={group.color} />
                  <span className="database-group-count">{group.rows.length}</span>
                </th>
              </tr>
              {group.rows.map((row) => (
                <Row key={row.id} row={row} columns={columns} cell={cell} data={data} />
              ))}
            </tbody>
          ))
        ) : (
          <tbody>
            {rows.map((row) => (
              <Row key={row.id} row={row} columns={columns} cell={cell} data={data} />
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}

function Row({
  row,
  columns,
  cell,
  data,
}: {
  row: Node;
  columns: RenderableProperty[];
  cell: (row: Node, column: RenderableProperty) => DatabaseCell;
  /** Passed through to the cell editor, which needs the option list and the writer. */
  data: DatabaseSurface;
}) {
  const { selectNode } = useProject();

  return (
    <tr>
      <th scope="row" className="database-th-name">
        {/* A button rather than the whole row being clickable: step 3 puts
            editable cells in this same row, and a row that navigates when you
            click into a cell would fight them. The name is the way in, the way
            it is in the tree. */}
        <button type="button" className="database-name" onClick={() => selectNode(row.id)}>
          <NodeIcon icon={row.icon} templateKey={row.templateKey} size={14} />
          <span className="database-name-text">{row.name}</span>
        </button>
      </th>
      {columns.map((column) => (
        <td key={column.key} data-editable={isEditableInRow(column) && data.onEdit ? "" : undefined}>
          {isEditableInRow(column) && data.onEdit ? (
            <DatabaseCellEditor row={row} column={column} value={cell(row, column)} data={data} />
          ) : (
            <DatabaseValue value={cell(row, column)} />
          )}
        </td>
      ))}
    </tr>
  );
}
