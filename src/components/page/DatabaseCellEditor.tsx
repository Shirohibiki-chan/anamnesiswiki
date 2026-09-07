// Changing a value from inside a row. Phase 23, step 3.
//
// **Only the types that read on one line at a column's width.** Long text, refs
// and pictures still open the page — a refs field is a page picker, not
// something that fits in a cell — and that line is the rule for placing a type
// that does not exist yet. See `docs/plan.md` Phase 23.
//
// The input is always there rather than appearing on a click. A cell you have
// to arm before you can type into it is two interactions for one edit, and the
// table's whole point is that the grid is the thing you work in.
import { useState } from "react";
import { Check } from "lucide-react";
import type { Node } from "../../constants/schema";
import { getPaletteHex } from "../../constants/palette";
import type { DatabaseCell, DatabaseSurface } from "../../hooks/use-database";
import type { RenderableProperty } from "../../services/property-service";
import { TreePopover } from "../tree/TreePopover";

export function DatabaseCellEditor({
  row,
  column,
  value,
  data,
}: {
  row: Node;
  column: RenderableProperty;
  value: DatabaseCell;
  data: DatabaseSurface;
}) {
  if (column.type === "select" || column.type === "status" || column.type === "multiselect") {
    return <OptionCell row={row} column={column} value={value} data={data} />;
  }
  return <TextCell row={row} column={column} value={value} data={data} />;
}

function TextCell({
  row,
  column,
  value,
  data,
}: {
  row: Node;
  column: RenderableProperty;
  value: DatabaseCell;
  data: DatabaseSurface;
}) {
  const text = value.kind === "text" ? value.text : "";

  return (
    <input
      // Numbers get a numeric keypad and the browser's own validation without
      // becoming a spinner — `NumberProperty` made the same call in the panel.
      type={column.type === "number" ? "number" : "text"}
      className="database-cell-input"
      aria-label={`${column.label} for ${row.name}`}
      value={text}
      onChange={(event) =>
        data.onEdit?.(row.id, column, {
          kind: column.type === "number" ? "number" : "text",
          text: event.target.value,
        })
      }
    />
  );
}

function OptionCell({
  row,
  column,
  value,
  data,
}: {
  row: Node;
  column: RenderableProperty;
  value: DatabaseCell;
  data: DatabaseSurface;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [query, setQuery] = useState("");
  const { choicesFor } = data;

  const chosen = value.kind === "chips" ? value.chips.map((chip) => chip.label) : [];
  const multiple = column.type === "multiselect";
  // Everything this property is called anywhere in the table, so choosing on
  // one row offers what another row already says rather than making her retype
  // her own vocabulary per page.
  const choices = choicesFor({ kind: "property", key: column.key });

  const trimmed = query.trim();
  const matches = choices.filter((choice) => choice.toLowerCase().includes(trimmed.toLowerCase()));
  const isNew = trimmed.length > 0 && !choices.some((choice) => choice.toLowerCase() === trimmed.toLowerCase());

  function write(labels: string[]) {
    data.onEdit?.(row.id, column, { kind: "options", labels });
  }

  function toggle(label: string) {
    if (!multiple) {
      write(chosen.some((current) => current.toLowerCase() === label.toLowerCase()) ? [] : [label]);
      setRect(null);
      return;
    }
    const already = chosen.some((current) => current.toLowerCase() === label.toLowerCase());
    write(already ? chosen.filter((current) => current.toLowerCase() !== label.toLowerCase()) : [...chosen, label]);
  }

  return (
    <>
      <button
        type="button"
        className="database-cell-chips"
        aria-label={`${column.label} for ${row.name}`}
        onClick={(event) => setRect(event.currentTarget.getBoundingClientRect())}
      >
        {value.kind === "chips" ? (
          value.chips.map((chip) => {
            const hex = getPaletteHex(chip.color);
            return (
              <span key={chip.id} className="database-chip" style={hex ? { backgroundColor: `${hex}26` } : undefined}>
                {chip.label}
              </span>
            );
          })
        ) : (
          // Something to aim at. An empty cell that is also a button has to
          // look like one or the column reads as uneditable.
          <span className="database-cell-blank">—</span>
        )}
      </button>

      {rect && (
        <TreePopover anchorRect={rect} onClose={() => setRect(null)} className="database-menu">
          <div className="database-menu-body">
            <input
              type="text"
              className="database-select"
              placeholder="Find or add"
              aria-label={`Find or add a ${column.label}`}
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {matches.map((choice) => {
              const on = chosen.some((current) => current.toLowerCase() === choice.toLowerCase());
              return (
                <button
                  key={choice}
                  type="button"
                  className="database-menu-item database-option"
                  data-on={on ? "" : undefined}
                  onClick={() => toggle(choice)}
                >
                  {choice}
                  {on && <Check size={13} />}
                </button>
              );
            })}
            {isNew && (
              <button
                type="button"
                className="database-menu-add"
                onClick={() => {
                  toggle(trimmed);
                  setQuery("");
                }}
              >
                Add “{trimmed}”
              </button>
            )}
            {matches.length === 0 && !isNew && (
              <p className="database-menu-note">Nothing to choose yet. Type a value to make the first one.</p>
            )}
          </div>
        </TreePopover>
      )}
    </>
  );
}
