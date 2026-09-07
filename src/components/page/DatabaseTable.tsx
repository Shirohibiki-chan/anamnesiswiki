// A page drawn as a table of the pages inside it. Phase 23, steps 1 and 2.
//
// **Read-only on purpose, and only for now.** Step 3 teaches the cells that
// hold one line — text, number, date, select, multi-select, status — to be
// edited in place; long text, refs and pictures stay a click through to the
// page, because they want more room than a column has. Splitting it this way
// is what kept the phase shippable: an editor for every type, with undo
// covering all of them, was the expensive half.
import type { Node } from "../../constants/schema";
import { getPaletteHex } from "../../constants/palette";
import { useDatabase, type DatabaseCell } from "../../hooks/use-database";
import { useCreatePageIn } from "../../hooks/use-new-page";
import { useProject } from "../../hooks/use-project";
import type { RenderableProperty } from "../../services/property-service";
import { NodeIcon } from "../blocks/IconPicker";
import { DatabaseToolbar } from "./DatabaseToolbar";
import "./database.css";

export function DatabaseTable({ node }: { node: Node }) {
  const { rows, allRows, columns, groups, cell } = useDatabase(node);
  const createPageIn = useCreatePageIn();

  return (
    <div className="database-view">
      <DatabaseToolbar node={node} />

      {allRows.length === 0 ? (
        <p className="database-empty">Nothing inside this page yet. Pages you add here become its rows.</p>
      ) : rows.length === 0 ? (
        // Distinct from the line above on purpose. "Nothing inside this page"
        // in front of a folder holding forty pages is the app telling her a
        // lie about her own world; this says where they went.
        <p className="database-empty">No page here matches the filters.</p>
      ) : (
        // Its own scroller rather than the page's: a table wide enough to
        // scroll must not take the writing underneath it sideways as well.
        <div className="database-scroll">
          <table className="database-table">
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
              // A tbody per section rather than one long one with heading rows
              // in it: that is what a table body is for, and it means a screen
              // reader announces the section rather than reading a heading as
              // a row of data.
              groups.map((group) => (
                <tbody key={group.key || "none"}>
                  <tr className="database-group-row">
                    <th scope="colgroup" colSpan={columns.length + 1}>
                      <span
                        className="database-group-label"
                        style={
                          getPaletteHex(group.color)
                            ? { backgroundColor: `${getPaletteHex(group.color)}26` }
                            : undefined
                        }
                      >
                        {group.label}
                      </span>
                      <span className="database-group-count">{group.rows.length}</span>
                    </th>
                  </tr>
                  {group.rows.map((row) => (
                    <Row key={row.id} row={row} columns={columns} cell={cell} />
                  ))}
                </tbody>
              ))
            ) : (
              <tbody>
                {rows.map((row) => (
                  <Row key={row.id} row={row} columns={columns} cell={cell} />
                ))}
              </tbody>
            )}
          </table>
        </div>
      )}

      {/* Kept whether or not the table is empty, and kept at all because a
          folder that became a table would otherwise have lost the only way to
          make a page inside the thing you are looking at. See FolderView. */}
      <button type="button" className="ui-btn ui-btn-secondary database-add" onClick={() => createPageIn(node.id)}>
        Add a page
      </button>
    </div>
  );
}

function Row({
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
        <td key={column.key}>
          <Cell value={cell(row, column)} />
        </td>
      ))}
    </tr>
  );
}

function Cell({ value }: { value: DatabaseCell }) {
  if (value.kind === "empty") return null;
  if (value.kind === "text") return <span className="database-cell-text">{value.text}</span>;

  return (
    <span className="database-chips">
      {value.chips.map((chip) => {
        // A tint behind ordinary text, never coloured text — the palette is
        // pastels picked against dark themes and would fail the contrast floor
        // the moment anyone switched to Daylight. Same trick as SelectProperty.
        const hex = getPaletteHex(chip.color);
        return (
          <span key={chip.id} className="database-chip" style={hex ? { backgroundColor: `${hex}26` } : undefined}>
            {chip.label}
          </span>
        );
      })}
    </span>
  );
}
