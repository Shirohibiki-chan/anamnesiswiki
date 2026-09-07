import { describe, expect, it } from "vitest";
import { createNode, type CustomPropertySpec, type Node } from "../constants/schema";
import {
  applyFilters,
  applySorts,
  databaseCell,
  databaseColumns,
  databaseRows,
  fieldChoices,
  fieldId,
  filterableFields,
  groupRows,
  groupableFields,
  isEditableInRow,
  matchesFilter,
  planCellEdit,
  newDatabaseView,
  operatorsFor,
  suggestColumnTemplate,
  visibleColumns,
} from "./database-service";
import type { RenderableProperty } from "./property-service";

function page(patch: Partial<Node> = {}): Node {
  return { ...createNode({ parentId: null, templateKey: "character", name: "Valera" }), ...patch };
}

function graph(...list: Node[]): Record<string, Node> {
  return Object.fromEntries(list.map((node) => [node.id, node]));
}

const schema: Record<string, RenderableProperty[]> = {
  character: [
    { key: "age", label: "Age", type: "text" },
    { key: "friends", label: "Friends", type: "refs" },
  ],
  location: [{ key: "region", label: "Region", type: "text" }],
};
const schemaFor = (key: string) => schema[key] ?? [];

describe("databaseRows", () => {
  it("returns only the page's own children", () => {
    const parent = page({ name: "Characters", templateKey: "folder" });
    const inside = page({ parentId: parent.id, name: "Valera" });
    const elsewhere = page({ name: "Somewhere else" });

    const rows = databaseRows(graph(parent, inside, elsewhere), undefined, parent.id);

    expect(rows.map((row) => row.name)).toEqual(["Valera"]);
  });

  it("follows the tree's own order rather than inventing one", () => {
    const parent = page({ templateKey: "folder" });
    const a = page({ parentId: parent.id, name: "A" });
    const b = page({ parentId: parent.id, name: "B" });
    const c = page({ parentId: parent.id, name: "C" });

    const rows = databaseRows(graph(parent, a, b, c), { [parent.id]: [c.id, a.id, b.id] }, parent.id);

    expect(rows.map((row) => row.name)).toEqual(["C", "A", "B"]);
  });

  it("is empty for a page with nothing inside it", () => {
    const lonely = page();
    expect(databaseRows(graph(lonely), undefined, lonely.id)).toEqual([]);
  });
});

describe("suggestColumnTemplate", () => {
  it("picks whatever the pages inside are mostly made of", () => {
    const rows = [
      page({ templateKey: "character" }),
      page({ templateKey: "character" }),
      page({ templateKey: "location" }),
    ];
    expect(suggestColumnTemplate(rows)).toBe("character");
  });

  it("ignores folders and universes, which describe filing rather than content", () => {
    const rows = [
      page({ templateKey: "folder" }),
      page({ templateKey: "folder" }),
      page({ templateKey: "folder" }),
      page({ templateKey: "character" }),
    ];
    expect(suggestColumnTemplate(rows)).toBe("character");
  });

  it("has no answer when there is nothing but containers", () => {
    expect(suggestColumnTemplate([page({ templateKey: "folder" })])).toBeUndefined();
    expect(suggestColumnTemplate([])).toBeUndefined();
  });
});

describe("databaseColumns", () => {
  it("takes the named template's own fields", () => {
    const columns = databaseColumns([], "character", schemaFor);
    expect(columns.map((column) => column.key)).toEqual(["age", "friends"]);
  });

  it("adds custom properties the rows of that template carry", () => {
    const status: CustomPropertySpec = { key: "status", label: "Status", type: "status", options: [] };
    const rows = [page({ customProperties: [status] })];

    const columns = databaseColumns(rows, "character", schemaFor);

    expect(columns.map((column) => column.key)).toEqual(["age", "friends", "status"]);
  });

  it("ignores custom properties on rows of a different template", () => {
    const rows = [
      page({ templateKey: "location", customProperties: [{ key: "climate", label: "Climate", type: "text" }] }),
    ];

    const columns = databaseColumns(rows, "character", schemaFor);

    expect(columns.map((column) => column.key)).toEqual(["age", "friends"]);
  });

  it("takes a repeated name once, wearing the spelling the first row used", () => {
    const rows = [
      page({ customProperties: [{ key: "uuid-a", label: "Rank", type: "text" }] }),
      page({ customProperties: [{ key: "uuid-b", label: "rank", type: "number" }] }),
    ];

    const columns = databaseColumns(rows, "character", schemaFor);
    const rank = columns.filter((column) => column.label.toLowerCase() === "rank");

    expect(rank).toHaveLength(1);
    expect(rank[0].label).toBe("Rank");
    // Two spellings of one name are one property everywhere else in the app,
    // so two differently-spelled ones are not two columns here either.
    expect(rank[0].type).toBe("text");
  });

  it("names a custom column by its label, so nothing points at one page's copy", () => {
    const rows = [page({ customProperties: [{ key: "uuid-a", label: "Rank", type: "text" }] })];
    const [rank] = databaseColumns(rows, "character", schemaFor).filter((column) => column.label === "Rank");
    expect(rank.key).toBe("rank");
  });

  // The bug this was written for: a custom property's `key` is a uuid minted
  // per page (see the store's addCustomProperty), so nine characters each
  // carrying a Status produced nine columns all called Status. Everywhere else
  // in the app a property is identified by its label — see indexProperties.
  it("takes one column per name, however many pages define it", () => {
    const rows = [
      page({ customProperties: [{ key: "uuid-a", label: "Status", type: "status", options: [] }] }),
      page({ customProperties: [{ key: "uuid-b", label: "Status", type: "status", options: [] }] }),
      page({ customProperties: [{ key: "uuid-c", label: "status", type: "status", options: [] }] }),
    ];

    const columns = databaseColumns(rows, "character", schemaFor);

    expect(columns.filter((column) => column.label.toLowerCase() === "status")).toHaveLength(1);
  });

  it("has no columns when nothing named a template", () => {
    expect(databaseColumns([page()], undefined, schemaFor)).toEqual([]);
  });
});

describe("databaseCell", () => {
  const text: RenderableProperty = { key: "age", label: "Age", type: "text" };

  // The other half of one-column-per-name: the column is named once, but each
  // row stores that value under its own key, so the cell has to look it up per
  // row or every page but the first draws blank.
  it("finds a value through each row's own key for the column", () => {
    const rows = [
      page({ name: "A", customProperties: [{ key: "uuid-a", label: "Rank", type: "text" }], properties: { "uuid-a": "First" } }),
      page({ name: "B", customProperties: [{ key: "uuid-b", label: "Rank", type: "text" }], properties: { "uuid-b": "Second" } }),
    ];
    const [rank] = databaseColumns(rows, "character", schemaFor).filter((column) => column.label === "Rank");

    expect(databaseCell(rows[0], rank, {})).toEqual({ kind: "text", text: "First" });
    expect(databaseCell(rows[1], rank, {})).toEqual({ kind: "text", text: "Second" });
  });

  it("reads plain text, and calls whitespace empty", () => {
    expect(databaseCell(page({ properties: { age: "31" } }), text, {})).toEqual({ kind: "text", text: "31" });
    expect(databaseCell(page({ properties: { age: "   " } }), text, {})).toEqual({ kind: "empty" });
    expect(databaseCell(page(), text, {})).toEqual({ kind: "empty" });
  });

  it("keeps zero, which is a number and not an absence", () => {
    const number: RenderableProperty = { key: "n", label: "N", type: "number" };
    expect(databaseCell(page({ properties: { n: 0 } }), number, {})).toEqual({ kind: "text", text: "0" });
  });

  it("resolves refs to the pages they name, and drops ones that are gone", () => {
    const friend = page({ name: "Kestrel" });
    const subject = page({ properties: { friends: [friend.id, "deleted-id"] } });
    const refs: RenderableProperty = { key: "friends", label: "Friends", type: "refs" };

    expect(databaseCell(subject, refs, graph(friend, subject))).toEqual({
      kind: "chips",
      chips: [{ id: friend.id, label: "Kestrel" }],
    });
  });

  // The one that would go wrong quietly: an option list lives per page, so a
  // cell resolved against the column's options rather than the row's own would
  // draw whichever page happened to define the column first.
  it("resolves an option against the row's own list, not another page's", () => {
    const status: RenderableProperty = { key: "status", label: "Status", type: "status" };
    const row = page({
      customProperties: [
        { key: "status", label: "Status", type: "status", options: [{ id: "opt-1", label: "Alive", color: "green" }] },
      ],
      properties: { status: "opt-1" },
    });

    expect(databaseCell(row, status, {})).toEqual({
      kind: "chips",
      chips: [{ id: "opt-1", label: "Alive", color: "green" }],
    });
  });

  it("is empty when the option it points at no longer exists", () => {
    const status: RenderableProperty = { key: "status", label: "Status", type: "status" };
    const row = page({
      customProperties: [{ key: "status", label: "Status", type: "status", options: [] }],
      properties: { status: "opt-gone" },
    });

    expect(databaseCell(row, status, {})).toEqual({ kind: "empty" });
  });

  it("reads a multi-select as every option it holds", () => {
    const multi: RenderableProperty = { key: "kinds", label: "Kinds", type: "multiselect" };
    const row = page({
      customProperties: [
        {
          key: "kinds",
          label: "Kinds",
          type: "multiselect",
          options: [
            { id: "a", label: "Rogue", color: "blue" },
            { id: "b", label: "Noble", color: "amber" },
          ],
        },
      ],
      properties: { kinds: ["b", "a"] },
    });

    expect(databaseCell(row, multi, {})).toEqual({
      kind: "chips",
      chips: [
        { id: "b", label: "Noble", color: "amber" },
        { id: "a", label: "Rogue", color: "blue" },
      ],
    });
  });
});

describe("newDatabaseView", () => {
  it("starts as a table with its columns already guessed", () => {
    expect(newDatabaseView([page({ templateKey: "location" })])).toEqual({
      layout: "table",
      templateKey: "location",
    });
  });
});

// ---- View settings (step 2) ----

const label = (key: string) => (key === "character" ? "Character" : key === "location" ? "Location" : key);

const statusColumn: RenderableProperty = { key: "status", label: "Status", type: "status" };
const kindsColumn: RenderableProperty = { key: "kinds", label: "Kinds", type: "multiselect" };
const ageColumn: RenderableProperty = { key: "age", label: "Age", type: "number" };
const columns2 = [statusColumn, kindsColumn, ageColumn];

/**
 * A page carrying a status whose option list is its own, the way the app stores
 * it — the option id is minted per page, so two pages saying the same word hold
 * different ids. That is the thing the matching has to survive.
 */
let optionSeq = 0;
function withStatus(name: string, value: string, patch: Partial<Node> = {}): Node {
  const id = `opt-${(optionSeq += 1)}`;
  return page({
    name,
    customProperties: [
      { key: "status", label: "Status", type: "status", options: [{ id, label: value, color: "green" }] },
    ],
    properties: { status: id },
    ...patch,
  });
}

describe("operatorsFor", () => {
  it("offers has / does not have on a field a page can hold several of", () => {
    expect(operatorsFor({ kind: "property", key: "kinds" }, columns2)).toEqual([
      "has",
      "does-not-have",
      "is-empty",
      "is-not-empty",
    ]);
    expect(operatorsFor({ kind: "tag" }, columns2)).toContain("has");
  });

  it("offers is / is not / contains on a field with one value", () => {
    expect(operatorsFor({ kind: "property", key: "status" }, columns2)).toEqual([
      "is",
      "is-not",
      "contains",
      "is-empty",
      "is-not-empty",
    ]);
    expect(operatorsFor({ kind: "template" }, columns2)).toContain("is");
  });
});

describe("filterableFields and groupableFields", () => {
  it("filters by more than the columns — name, template and tags come first", () => {
    const fields = filterableFields(columns2).map(fieldId);
    expect(fields.slice(0, 3)).toEqual(["name", "template", "tag"]);
    expect(fields).toContain("property:status");
  });

  // Grouping by tags would list a page carrying three of them three times.
  it("groups only by fields a page has exactly one of", () => {
    const fields = groupableFields(columns2).map(fieldId);
    expect(fields).toEqual(["template", "property:status"]);
    expect(fields).not.toContain("tag");
    expect(fields).not.toContain("property:kinds");
  });
});

describe("matchesFilter", () => {
  const alive = withStatus("Valera", "Alive");
  const field = { kind: "property", key: "status" } as const;

  it("matches an option by its label, not by an id another page minted", () => {
    // The two pages agree on the word and disagree on the id, which is exactly
    // what the app stores — an option list lives per page. Matching on the id
    // would find one of these and not the other.
    const other = withStatus("Kestrel", "Alive");
    expect(other.customProperties?.[0].options?.[0].id).not.toBe(alive.customProperties?.[0].options?.[0].id);

    const filter = { id: "f", field, operator: "is" as const, value: "Alive" };
    expect(matchesFilter(alive, filter, columns2, {}, label)).toBe(true);
    expect(matchesFilter(other, filter, columns2, {}, label)).toBe(true);
    expect(matchesFilter(withStatus("Rhone", "Dead"), filter, columns2, {}, label)).toBe(false);
  });

  it("is case-insensitive, because two spellings of a word are one answer", () => {
    const filter = { id: "f", field, operator: "is" as const, value: "alive" };
    expect(matchesFilter(alive, filter, columns2, {}, label)).toBe(true);
  });

  it("reads is-not as true for a page with no value at all", () => {
    const blank = page({ name: "Nobody" });
    const filter = { id: "f", field, operator: "is-not" as const, value: "Alive" };
    expect(matchesFilter(blank, filter, columns2, {}, label)).toBe(true);
  });

  it("asks about presence without a value", () => {
    const blank = page({ name: "Nobody" });
    expect(matchesFilter(blank, { id: "f", field, operator: "is-empty" }, columns2, {}, label)).toBe(true);
    expect(matchesFilter(alive, { id: "f", field, operator: "is-empty" }, columns2, {}, label)).toBe(false);
    expect(matchesFilter(alive, { id: "f", field, operator: "is-not-empty" }, columns2, {}, label)).toBe(true);
  });

  // A filter half-built must not empty the table while she is still picking.
  it("matches everything while no value has been chosen yet", () => {
    const filter = { id: "f", field, operator: "is" as const };
    expect(matchesFilter(alive, filter, columns2, {}, label)).toBe(true);
    expect(matchesFilter(page({ name: "Nobody" }), filter, columns2, {}, label)).toBe(true);
  });

  it("filters on the template and on tags, which are not columns", () => {
    const row = page({ templateKey: "location", tags: ["port", "ruined"] });
    expect(
      matchesFilter(row, { id: "f", field: { kind: "template" }, operator: "is", value: "Location" }, columns2, {}, label),
    ).toBe(true);
    expect(
      matchesFilter(row, { id: "f", field: { kind: "tag" }, operator: "has", value: "ruined" }, columns2, {}, label),
    ).toBe(true);
    expect(
      matchesFilter(row, { id: "f", field: { kind: "tag" }, operator: "does-not-have", value: "ruined" }, columns2, {}, label),
    ).toBe(false);
  });

  it("matches part of a name with contains", () => {
    const row = page({ name: "Verity Jiang" });
    const filter = { id: "f", field: { kind: "name" } as const, operator: "contains" as const, value: "jia" };
    expect(matchesFilter(row, filter, columns2, {}, label)).toBe(true);
  });
});

describe("applyFilters", () => {
  it("requires every filter to hold, not any of them", () => {
    const rows = [
      withStatus("Valera", "Alive", { tags: ["noble"] }),
      withStatus("Kestrel", "Alive", { tags: ["rogue"] }),
      withStatus("Rhone", "Dead", { tags: ["noble"] }),
    ];
    const filters = [
      { id: "a", field: { kind: "property", key: "status" } as const, operator: "is" as const, value: "Alive" },
      { id: "b", field: { kind: "tag" } as const, operator: "has" as const, value: "noble" },
    ];

    expect(applyFilters(rows, filters, columns2, {}, label).map((row) => row.name)).toEqual(["Valera"]);
  });

  it("leaves the rows alone when there is nothing to apply", () => {
    const rows = [page({ name: "A" })];
    expect(applyFilters(rows, undefined, columns2, {}, label)).toBe(rows);
  });
});

describe("applySorts", () => {
  it("sorts text without minding case", () => {
    const rows = [page({ name: "banana" }), page({ name: "Apple" }), page({ name: "cherry" })];
    const sorted = applySorts(rows, [{ field: { kind: "name" }, direction: "asc" }], columns2, {}, label);
    expect(sorted.map((row) => row.name)).toEqual(["Apple", "banana", "cherry"]);
  });

  it("sorts numbers as numbers, not as text", () => {
    const rows = [
      page({ name: "nine", customProperties: [{ key: "age", label: "Age", type: "number" }], properties: { age: 9 } }),
      page({ name: "ten", customProperties: [{ key: "age", label: "Age", type: "number" }], properties: { age: 10 } }),
    ];
    const sorted = applySorts(rows, [{ field: { kind: "property", key: "age" }, direction: "asc" }], columns2, {}, label);
    expect(sorted.map((row) => row.name)).toEqual(["nine", "ten"]);
  });

  // Reversing a sort should turn the list over, not bring the blanks to the top.
  it("puts blanks last whichever way it is pointing", () => {
    const rows = [page({ name: "blank" }), withStatus("Alive one", "Alive"), withStatus("Dead one", "Dead")];
    const field = { kind: "property", key: "status" } as const;

    expect(applySorts(rows, [{ field, direction: "asc" }], columns2, {}, label).map((row) => row.name)).toEqual([
      "Alive one",
      "Dead one",
      "blank",
    ]);
    expect(applySorts(rows, [{ field, direction: "desc" }], columns2, {}, label).map((row) => row.name)).toEqual([
      "Dead one",
      "Alive one",
      "blank",
    ]);
  });

  it("uses the second rung to break a tie on the first", () => {
    const rows = [
      withStatus("Zara", "Alive"),
      withStatus("Adan", "Alive"),
      withStatus("Mira", "Dead"),
    ];
    const sorted = applySorts(
      rows,
      [
        { field: { kind: "property", key: "status" }, direction: "asc" },
        { field: { kind: "name" }, direction: "asc" },
      ],
      columns2,
      {},
      label,
    );
    expect(sorted.map((row) => row.name)).toEqual(["Adan", "Zara", "Mira"]);
  });

  it("does not disturb the tree's order when nothing is sorted", () => {
    const rows = [page({ name: "C" }), page({ name: "A" })];
    expect(applySorts(rows, [], columns2, {}, label).map((row) => row.name)).toEqual(["C", "A"]);
  });
});

describe("groupRows", () => {
  it("gathers rows alphabetically and puts the ones with no value last", () => {
    const rows = [withStatus("Rhone", "Dead"), page({ name: "Nobody" }), withStatus("Valera", "Alive")];

    const groups = groupRows(rows, { kind: "property", key: "status" }, columns2, {}, label);

    expect(groups?.map((group) => group.label)).toEqual(["Alive", "Dead", "No Status"]);
    expect(groups?.[2].rows.map((row) => row.name)).toEqual(["Nobody"]);
  });

  it("leaves out the empty section when every row has a value", () => {
    const rows = [withStatus("Valera", "Alive")];
    expect(groupRows(rows, { kind: "property", key: "status" }, columns2, {}, label)).toHaveLength(1);
  });

  it("is null when nothing is grouped, which is how the table knows to draw one list", () => {
    expect(groupRows([page()], undefined, columns2, {}, label)).toBeNull();
  });
});

describe("fieldChoices", () => {
  it("offers what the rows actually hold, once each and in order", () => {
    const rows = [withStatus("a", "Dead"), withStatus("b", "Alive"), withStatus("c", "Alive")];
    expect(fieldChoices(rows, { kind: "property", key: "status" }, columns2, {}, label)).toEqual(["Alive", "Dead"]);
  });
});

describe("visibleColumns", () => {
  it("drops the ones turned off and keeps the rest in order", () => {
    expect(visibleColumns(columns2, ["kinds"]).map((column) => column.key)).toEqual(["status", "age"]);
  });

  it("shows everything when nothing is hidden", () => {
    expect(visibleColumns(columns2, undefined)).toBe(columns2);
  });
});

// ---- Editing a cell (step 3) ----

describe("isEditableInRow", () => {
  it("takes the types that read on one line and leaves the rest to the page", () => {
    const editable = ["text", "number", "date", "select", "multiselect", "status"] as const;
    for (const type of editable) {
      expect(isEditableInRow({ key: "k", label: "L", type })).toBe(true);
    }
    for (const type of ["longtext", "refs"] as const) {
      expect(isEditableInRow({ key: "k", label: "L", type })).toBe(false);
    }
  });
});

describe("planCellEdit", () => {
  const rank: RenderableProperty = { key: "rank", label: "Rank", type: "text" };
  const status: RenderableProperty = { key: "status", label: "Status", type: "status" };
  const kinds: RenderableProperty = { key: "kinds", label: "Kinds", type: "multiselect" };
  const count: RenderableProperty = { key: "count", label: "Count", type: "number" };

  it("writes into the row's own key when it already has the property", () => {
    const row = page({
      customProperties: [{ key: "uuid-a", label: "Rank", type: "text" }],
      properties: { "uuid-a": "Sergeant" },
    });

    const patch = planCellEdit(row, rank, { kind: "text", text: "Captain" }, schemaFor, []);

    expect(patch.properties).toEqual({ "uuid-a": "Captain" });
    // Nothing was created, so nothing else is in the patch.
    expect(patch.customProperties).toBeUndefined();
    expect(patch.blocks).toBeUndefined();
  });

  // The column exists because some *other* page carries the property.
  it("creates the property, and a block for it, on a page that lacks it", () => {
    const row = page({ customProperties: [] });

    const patch = planCellEdit(row, rank, { kind: "text", text: "Captain" }, schemaFor, []);

    expect(patch.customProperties).toHaveLength(1);
    expect(patch.customProperties?.[0].label).toBe("Rank");
    const key = patch.customProperties![0].key;
    expect(patch.properties?.[key]).toBe("Captain");
    // Without the block the page's own panel cannot draw the field, so the
    // value would be one only the table could see.
    expect(patch.blocks?.some((block) => block.propertyKey === key)).toBe(true);
  });

  it("writes a template's own field under the template's key, inventing nothing", () => {
    const row = page({ templateKey: "character" });
    const age: RenderableProperty = { key: "age", label: "Age", type: "text" };

    const patch = planCellEdit(row, age, { kind: "text", text: "31" }, schemaFor, []);

    expect(patch.properties).toEqual({ age: "31" });
    expect(patch.customProperties).toBeUndefined();
  });

  it("reads an emptied number box as not set rather than as zero", () => {
    const row = page({ customProperties: [{ key: "uuid-n", label: "Count", type: "number" }], properties: { "uuid-n": 4 } });

    expect(planCellEdit(row, count, { kind: "number", text: "" }, schemaFor, []).properties).toEqual({
      "uuid-n": undefined,
    });
    expect(planCellEdit(row, count, { kind: "number", text: "0" }, schemaFor, []).properties).toEqual({ "uuid-n": 0 });
    // Half-typed rubbish must not land as NaN on her disk.
    expect(planCellEdit(row, count, { kind: "number", text: "-" }, schemaFor, []).properties).toEqual({
      "uuid-n": undefined,
    });
  });

  it("stores a status as the row's own id for that word", () => {
    const row = page({
      customProperties: [
        { key: "uuid-s", label: "Status", type: "status", options: [{ id: "mine", label: "Alive", color: "green" }] },
      ],
    });

    const patch = planCellEdit(row, status, { kind: "options", labels: ["Alive"] }, schemaFor, []);

    expect(patch.properties).toEqual({ "uuid-s": "mine" });
  });

  // The heart of it: an option list lives per page, so choosing a word another
  // page already uses has to arrive as the same option, not a lookalike.
  it("borrows the id and colour the rest of the world uses for that word", () => {
    const row = page({ customProperties: [{ key: "uuid-s", label: "Status", type: "status", options: [] }] });
    const known = [{ id: "shared-alive", label: "Alive", color: "green" }];

    const patch = planCellEdit(row, status, { kind: "options", labels: ["Alive"] }, schemaFor, known);

    expect(patch.properties).toEqual({ "uuid-s": "shared-alive" });
    expect(patch.customProperties?.[0].options).toEqual([{ id: "shared-alive", label: "Alive", color: "green" }]);
  });

  it("makes a brand new option when nobody has used that word yet", () => {
    const row = page({ customProperties: [{ key: "uuid-s", label: "Status", type: "status", options: [] }] });

    const patch = planCellEdit(row, status, { kind: "options", labels: ["Missing"] }, schemaFor, []);

    const options = patch.customProperties?.[0].options ?? [];
    expect(options).toHaveLength(1);
    expect(options[0].label).toBe("Missing");
    expect(patch.properties?.["uuid-s"]).toBe(options[0].id);
  });

  it("seeds a new property's option list from what the world already says", () => {
    const row = page({ customProperties: [] });
    const known = [
      { id: "a", label: "Alive", color: "green" },
      { id: "b", label: "Dead", color: "wine" },
    ];

    const patch = planCellEdit(row, status, { kind: "options", labels: ["Dead"] }, schemaFor, known);

    expect(patch.customProperties?.[0].options).toEqual(known);
    expect(patch.properties?.[patch.customProperties![0].key]).toBe("b");
  });

  it("holds several values for a multi-select and one for a status", () => {
    const row = page({
      customProperties: [
        { key: "uuid-k", label: "Kinds", type: "multiselect", options: [] },
        { key: "uuid-s", label: "Status", type: "status", options: [] },
      ],
    });

    const many = planCellEdit(row, kinds, { kind: "options", labels: ["Rogue", "Noble"] }, schemaFor, []);
    expect(many.properties?.["uuid-k"]).toHaveLength(2);

    const one = planCellEdit(row, status, { kind: "options", labels: ["Alive"] }, schemaFor, []);
    expect(typeof one.properties?.["uuid-s"]).toBe("string");
  });

  it("clears a status back to nothing, and a multi-select to an empty list", () => {
    const row = page({
      customProperties: [
        { key: "uuid-s", label: "Status", type: "status", options: [{ id: "x", label: "Alive", color: "green" }] },
        { key: "uuid-k", label: "Kinds", type: "multiselect", options: [{ id: "y", label: "Rogue", color: "blue" }] },
      ],
      properties: { "uuid-s": "x", "uuid-k": ["y"] },
    });

    expect(planCellEdit(row, status, { kind: "options", labels: [] }, schemaFor, []).properties?.["uuid-s"]).toBeUndefined();
    expect(planCellEdit(row, kinds, { kind: "options", labels: [] }, schemaFor, []).properties?.["uuid-k"]).toEqual([]);
  });

  it("keeps the options a page already had when adding another", () => {
    const row = page({
      customProperties: [
        { key: "uuid-k", label: "Kinds", type: "multiselect", options: [{ id: "y", label: "Rogue", color: "blue" }] },
      ],
      properties: { "uuid-k": ["y"] },
    });

    const patch = planCellEdit(row, kinds, { kind: "options", labels: ["Rogue", "Noble"] }, schemaFor, []);

    expect(patch.customProperties?.[0].options?.map((option) => option.label)).toEqual(["Rogue", "Noble"]);
  });
});
