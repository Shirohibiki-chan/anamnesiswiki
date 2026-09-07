// A page shown as a database: which pages are its rows, which properties are
// its columns, and what one cell says. Phase 23, step 1.
//
// **Everything here reads and nothing here owns.** A database is a lens over
// pages that already exist, so this file derives its whole answer from the
// node graph on every call and stores nothing of its own — which is what makes
// the two promises in `docs/plan.md` Phase 23 true by construction rather than
// by care: removing a view cannot remove a page, and two views over the same
// pages need no link between them because neither one holds anything.
import type {
  DatabaseField,
  DatabaseFilter,
  DatabaseOperator,
  DatabaseSort,
  DatabaseView,
  Node,
  PropertyOption,
} from "../constants/schema";
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
  const seen = new Set(columns.map((column) => column.label.toLowerCase()));

  for (const row of rows) {
    if (row.templateKey !== templateKey) continue;
    for (const spec of row.customProperties ?? []) {
      const name = spec.label.toLowerCase();
      if (seen.has(name)) continue;
      seen.add(name);
      // **The column's key is the name, not the spec's own key.** A custom
      // property's key is a uuid minted per page (see the store's
      // addCustomProperty), so the spec's key would name one page's copy of
      // Status — nine characters carrying one would have made nine columns,
      // and a filter or a hidden column would have gone stale the moment the
      // page that happened to define it first was deleted. Everywhere else in
      // the app a property is identified by its label; see indexProperties.
      columns.push({ ...spec, key: name });
    }
  }
  return columns;
}

/**
 * The key *this row* stores a column's value under.
 *
 * A template's field has the same key on every page of that template, so the
 * column's key is already right. A custom one does not, so it is found by name
 * — which is the same answer the property index gives and the reason two pages
 * can disagree about the uuid and still be showing the same column.
 */
function keyOn(row: Node, column: RenderableProperty): string {
  const own = (row.customProperties ?? []).find(
    (spec) => spec.key === column.key || spec.label.toLowerCase() === column.label.toLowerCase(),
  );
  return own?.key ?? column.key;
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
  const key = keyOn(row, column);
  const raw = row.properties[key];
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
      const options = optionsOn(row, key);
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

// ---- View settings (Phase 23, step 2) ----
//
// **Filters, sorts and groups all read a field the same way**, through
// `valuesOn` below, which is what keeps them agreeing with each other and with
// the table. A sort that read a Status differently from the filter that hid
// half the rows would be a bug nobody could see.

/** A field flattened to a string, for comparing two of them and for React keys. */
export function fieldId(field: DatabaseField): string {
  return field.kind === "property" ? `property:${field.key}` : field.kind;
}

export function sameField(a: DatabaseField, b: DatabaseField): boolean {
  return fieldId(a) === fieldId(b);
}

/**
 * What one field holds on one row: nothing, or a list of labelled values.
 *
 * **Labels, not ids, and that is the load-bearing detail.** A select's option
 * ids are minted per page, so a filter storing an id would match the page it
 * was built from and nothing else. Comparing on the label is also what a
 * person means — two pages both saying "Alive" are the same answer however
 * their option lists were made.
 */
function valuesOn(
  row: Node,
  field: DatabaseField,
  columns: RenderableProperty[],
  nodes: Record<string, Node>,
  templateLabel: (key: string) => string,
): { label: string; color?: string }[] {
  switch (field.kind) {
    case "name":
      return row.name ? [{ label: row.name }] : [];
    case "template":
      return [{ label: templateLabel(row.templateKey) }];
    case "tag":
      return (row.tags ?? []).map((tag) => ({ label: tag }));
    case "property": {
      const column = columns.find((candidate) => candidate.key === field.key);
      if (!column) return [];
      const cell = databaseCell(row, column, nodes);
      if (cell.kind === "empty") return [];
      if (cell.kind === "text") return [{ label: cell.text }];
      return cell.chips.map((chip) => ({ label: chip.label, color: chip.color }));
    }
  }
}

/** Whether a page can hold several of these at once, which decides its operators. */
export function isMultiValued(field: DatabaseField, columns: RenderableProperty[]): boolean {
  if (field.kind === "tag") return true;
  if (field.kind !== "property") return false;
  const type = columns.find((column) => column.key === field.key)?.type;
  return type === "multiselect" || type === "refs";
}

/** The operators worth offering on a field. See DATABASE_OPERATORS for why there are two sets. */
export function operatorsFor(field: DatabaseField, columns: RenderableProperty[]): DatabaseOperator[] {
  if (isMultiValued(field, columns)) return ["has", "does-not-have", "is-empty", "is-not-empty"];
  return ["is", "is-not", "contains", "is-empty", "is-not-empty"];
}

/** Whether an operator asks about a value at all. */
export function takesValue(operator: DatabaseOperator): boolean {
  return operator !== "is-empty" && operator !== "is-not-empty";
}

export const OPERATOR_LABELS: Record<DatabaseOperator, string> = {
  is: "is",
  "is-not": "is not",
  contains: "contains",
  has: "has",
  "does-not-have": "does not have",
  "is-empty": "is empty",
  "is-not-empty": "is not empty",
};

/** Everything a view can filter or sort by: its columns, plus the three the app arranges by anyway. */
export function filterableFields(columns: RenderableProperty[]): DatabaseField[] {
  return [
    { kind: "name" },
    { kind: "template" },
    { kind: "tag" },
    ...columns.map((column): DatabaseField => ({ kind: "property", key: column.key })),
  ];
}

/**
 * What a view can be grouped by — the fields a page has exactly one of.
 *
 * Tags and multi-selects are absent on purpose: a page carrying three of them
 * would appear under three headings, so a count of nine rows would list twelve.
 */
export function groupableFields(columns: RenderableProperty[]): DatabaseField[] {
  return [
    { kind: "template" },
    ...columns
      .filter((column) => column.type === "select" || column.type === "status")
      .map((column): DatabaseField => ({ kind: "property", key: column.key })),
  ];
}

export function fieldLabel(field: DatabaseField, columns: RenderableProperty[]): string {
  switch (field.kind) {
    case "name":
      return "Name";
    case "template":
      return "Template";
    case "tag":
      return "Tags";
    case "property":
      return columns.find((column) => column.key === field.key)?.label ?? field.key;
  }
}

/**
 * The values a field actually has across these rows, for the filter's value picker.
 *
 * Read off the rows rather than off a template's declared options, so the list
 * offers what is in front of her — including a value only two pages use, which
 * is exactly the one worth filtering to.
 */
export function fieldChoices(
  rows: Node[],
  field: DatabaseField,
  columns: RenderableProperty[],
  nodes: Record<string, Node>,
  templateLabel: (key: string) => string,
): string[] {
  const seen = new Map<string, string>();
  for (const row of rows) {
    for (const value of valuesOn(row, field, columns, nodes, templateLabel)) {
      const key = value.label.toLowerCase();
      if (!seen.has(key)) seen.set(key, value.label);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function matchesFilter(
  row: Node,
  filter: DatabaseFilter,
  columns: RenderableProperty[],
  nodes: Record<string, Node>,
  templateLabel: (key: string) => string,
): boolean {
  const values = valuesOn(row, filter.field, columns, nodes, templateLabel);

  if (filter.operator === "is-empty") return values.length === 0;
  if (filter.operator === "is-not-empty") return values.length > 0;

  // A filter with nothing chosen yet is still being built, and hiding every
  // row while she picks would make the list flash empty between two clicks.
  const wanted = (filter.value ?? "").trim().toLowerCase();
  if (!wanted) return true;

  const labels = values.map((value) => value.label.toLowerCase());
  switch (filter.operator) {
    case "is":
    case "has":
      return labels.some((label) => label === wanted);
    case "is-not":
    case "does-not-have":
      return !labels.some((label) => label === wanted);
    case "contains":
      return labels.some((label) => label.includes(wanted));
    default:
      return true;
  }
}

export function applyFilters(
  rows: Node[],
  filters: DatabaseFilter[] | undefined,
  columns: RenderableProperty[],
  nodes: Record<string, Node>,
  templateLabel: (key: string) => string,
): Node[] {
  if (!filters || filters.length === 0) return rows;
  return rows.filter((row) => filters.every((filter) => matchesFilter(row, filter, columns, nodes, templateLabel)));
}

/**
 * Orders rows by the view's sorts, falling back to the tree's own order.
 *
 * **Empty sorts last in both directions.** Reversing a sort should turn the
 * list over, not bring forty blank rows to the top — the blanks are the least
 * interesting thing in the column whichever way it is pointing.
 */
export function applySorts(
  rows: Node[],
  sorts: DatabaseSort[] | undefined,
  columns: RenderableProperty[],
  nodes: Record<string, Node>,
  templateLabel: (key: string) => string,
): Node[] {
  if (!sorts || sorts.length === 0) return rows;

  const numeric = new Set(columns.filter((column) => column.type === "number").map((column) => column.key));

  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const left = valuesOn(a, sort.field, columns, nodes, templateLabel);
      const right = valuesOn(b, sort.field, columns, nodes, templateLabel);
      if (left.length === 0 && right.length === 0) continue;
      if (left.length === 0) return 1;
      if (right.length === 0) return -1;

      const isNumber = sort.field.kind === "property" && numeric.has(sort.field.key);
      const compared = isNumber
        ? Number(left[0].label) - Number(right[0].label)
        : left[0].label.localeCompare(right[0].label, undefined, { sensitivity: "base" });
      if (compared !== 0) return sort.direction === "desc" ? -compared : compared;
    }
    return 0;
  });
}

export type DatabaseGroup = {
  /** The value's label, lowercased, or "" for the rows that have none. */
  key: string;
  label: string;
  color?: string;
  rows: Node[];
};

/**
 * Splits rows into sections under a field's values.
 *
 * Alphabetical, with the rows that have no value last under a heading that says
 * so rather than under a blank one — a section with no name reads as a
 * rendering fault rather than as an answer.
 */
export function groupRows(
  rows: Node[],
  groupBy: DatabaseField | undefined,
  columns: RenderableProperty[],
  nodes: Record<string, Node>,
  templateLabel: (key: string) => string,
): DatabaseGroup[] | null {
  if (!groupBy) return null;

  const groups = new Map<string, DatabaseGroup>();
  const none: DatabaseGroup = { key: "", label: `No ${fieldLabel(groupBy, columns)}`, rows: [] };

  for (const row of rows) {
    const [value] = valuesOn(row, groupBy, columns, nodes, templateLabel);
    if (!value) {
      none.rows.push(row);
      continue;
    }
    const key = value.label.toLowerCase();
    const existing = groups.get(key);
    if (existing) existing.rows.push(row);
    else groups.set(key, { key, label: value.label, color: value.color, rows: [row] });
  }

  const ordered = [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
  return none.rows.length > 0 ? [...ordered, none] : ordered;
}

/** The columns left after the ones she has turned off. */
export function visibleColumns(columns: RenderableProperty[], hidden: string[] | undefined): RenderableProperty[] {
  if (!hidden || hidden.length === 0) return columns;
  const off = new Set(hidden);
  return columns.filter((column) => !off.has(column.key));
}
