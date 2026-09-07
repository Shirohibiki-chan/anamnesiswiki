import { describe, expect, it } from "vitest";
import { createNode, type CustomPropertySpec, type Node } from "../constants/schema";
import {
  databaseCell,
  databaseColumns,
  databaseRows,
  newDatabaseView,
  suggestColumnTemplate,
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

  it("takes a repeated key once, from the first row that has it", () => {
    const rows = [
      page({ customProperties: [{ key: "rank", label: "Rank", type: "text" }] }),
      page({ customProperties: [{ key: "rank", label: "Ranking", type: "number" }] }),
    ];

    const columns = databaseColumns(rows, "character", schemaFor);

    expect(columns.filter((column) => column.key === "rank")).toHaveLength(1);
    expect(columns.find((column) => column.key === "rank")?.label).toBe("Rank");
  });

  it("has no columns when nothing named a template", () => {
    expect(databaseColumns([page()], undefined, schemaFor)).toEqual([]);
  });
});

describe("databaseCell", () => {
  const text: RenderableProperty = { key: "age", label: "Age", type: "text" };

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
