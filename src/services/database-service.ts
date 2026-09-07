// A page shown as a database: which pages are its rows, which properties are
// its columns, and what one cell says. Phase 23, step 1.
//
// **Everything here reads and nothing here owns.** A database is a lens over
// pages that already exist, so this file derives its whole answer from the
// node graph on every call and stores nothing of its own — which is what makes
// the two promises in `docs/plan.md` Phase 23 true by construction rather than
// by care: removing a view cannot remove a page, and two views over the same
// pages need no link between them because neither one holds anything.
import type { DatabaseView, Node, PropertyOption } from "../constants/schema";
import { FOLDER_TEMPLATE_KEY, UNIVERSE_TEMPLATE_KEY } from "../constants/schema";
import { defaultPropertyOrder } from "./block-service";
import type { RenderableProperty } from "./property-service";
import { orderSiblings } from "./tree-service";

/**
 * The rows: the pages inside this one, in the order the tree shows them.
 *
 * Sub-pages are the source for step 1 and the default forever after — it is
 * what answers where a new page would go, and a rule that gathers from
 * elsewhere is a widening added at step 5. Reusing `orderSiblings` rather than
 * sorting here is the point: a table whose rows disagreed with the tree they
 * mirror would be two answers to one question.
 */
export function databaseRows(
  nodes: Record<string, Node>,
  childOrder: Record<string, string[]> | undefined,
  nodeId: string,
): Node[] {
  const children = Object.values(nodes).filter((node) => node.parentId === nodeId);
  return orderSiblings(children, childOrder?.[nodeId]);
}

/**
 * Which template a new view should take its columns from — whatever the pages
 * inside are mostly made of.
 *
 * Guessing rather than asking, because the guess is right almost every time (a
 * Characters folder holds characters) and a picker in front of a feature is a
 * form to fill in before you are allowed to look at anything. It is stored on
 * the view rather than re-derived, so adding one Location to a folder of
 * Characters cannot silently re-column the table.
 *
 * **Containers don't count.** A folder or a universe among the rows describes
 * how the pages are filed, not what they are, and neither has properties to
 * offer — letting them win the count would produce a table with no columns
 * over pages that have plenty.
 */
export function suggestColumnTemplate(rows: Node[]): string | undefined {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.templateKey === FOLDER_TEMPLATE_KEY || row.templateKey === UNIVERSE_TEMPLATE_KEY) continue;
    counts.set(row.templateKey, (counts.get(row.templateKey) ?? 0) + 1);
  }

  let best: string | undefined;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

/**
 * The columns: the named template's own fields, then the custom properties the
 * rows of that template actually carry.
 *
 * The second half is not padding. Every rich type — number, select, status —
 * only exists as a custom property, so a table built from the template's fixed
 * fields alone would show text and dates and none of the things worth lining
 * up in a grid. Only rows *of that template* contribute, matching what the
 * view says it is a table of, and a key is taken once from the first row that
 * has it — the label and type follow that row, which is the same first-wins
 * rule the property index uses for a name spelled two ways.
 */
export function databaseColumns(
  rows: Node[],
  templateKey: string | undefined,
  schemaFor: (key: string) => RenderableProperty[],
): RenderableProperty[] {
  if (!templateKey) return [];

  const columns = defaultPropertyOrder(schemaFor(templateKey), []);
  const seen = new Set(columns.map((column) => column.key));

  for (const row of rows) {
    if (row.templateKey !== templateKey) continue;
    for (const spec of row.customProperties ?? []) {
      if (seen.has(spec.key)) continue;
      seen.add(spec.key);
      columns.push(spec);
    }
  }
  return columns;
}

/**
 * What one cell shows.
 *
 * Three shapes rather than a string, because a select rendered as its option's
 * label loses the colour that is most of what makes a chip readable at a
 * glance, and a ref rendered as a name loses that it is a page you can open.
 * `empty` is its own case so the table can draw nothing at all instead of an
 * empty string that still takes a line's height.
 */
export type DatabaseCell =
  | { kind: "empty" }
  | { kind: "text"; text: string }
  | { kind: "chips"; chips: { id: string; label: string; color?: string }[] };

const EMPTY: DatabaseCell = { kind: "empty" };

/**
 * **Options are resolved against the row's own spec, not the column's.** An
 * option list lives per page (see `CustomPropertySpec`), so the column only
 * says which key and what type; the labels and colours have to come from the
 * page the value is on, or a page whose Status reads "Draft" would be drawn
 * with whichever page happened to define the column's options first.
 */
export function databaseCell(
  row: Node,
  column: RenderableProperty,
  nodes: Record<string, Node>,
): DatabaseCell {
  const raw = row.properties[column.key];
  if (raw === undefined || raw === null || raw === "") return EMPTY;

  switch (column.type) {
    case "number":
      return typeof raw === "number" && Number.isFinite(raw) ? { kind: "text", text: String(raw) } : EMPTY;

    case "refs": {
      const ids = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
      const chips = ids
        .map((id) => nodes[id])
        .filter((node): node is Node => Boolean(node))
        .map((node) => ({ id: node.id, label: node.name }));
      return chips.length > 0 ? { kind: "chips", chips } : EMPTY;
    }

    case "select":
    case "status":
    case "multiselect": {
      const ids = Array.isArray(raw)
        ? raw.filter((id): id is string => typeof id === "string")
        : typeof raw === "string"
          ? [raw]
          : [];
      const options = optionsOn(row, column.key);
      const chips = ids
        .map((id) => options.find((option) => option.id === id))
        .filter((option): option is PropertyOption => Boolean(option))
        .map((option) => ({ id: option.id, label: option.label, color: option.color }));
      return chips.length > 0 ? { kind: "chips", chips } : EMPTY;
    }

    default: {
      const text = typeof raw === "string" ? raw.trim() : "";
      return text ? { kind: "text", text } : EMPTY;
    }
  }
}

function optionsOn(row: Node, key: string): PropertyOption[] {
  return row.customProperties?.find((spec) => spec.key === key)?.options ?? [];
}

/** A new view over these rows, with its columns already guessed. */
export function newDatabaseView(rows: Node[]): DatabaseView {
  return { layout: "table", templateKey: suggestColumnTemplate(rows) };
}
