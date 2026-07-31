import { describe, expect, it } from "vitest";
import { documentText, searchProject, snippetAround } from "./search-service";
import { MAX_SEARCH_RESULTS } from "../constants/limits";
import type { BlockNoteDocument, Node, Tab } from "../constants/schema";

function tab(overrides: Partial<Tab> & Pick<Tab, "id" | "label">): Tab {
  return { hidden: false, content: [], ...overrides };
}

function node(overrides: Partial<Node> & Pick<Node, "id" | "name">): Node {
  return {
    parentId: null,
    templateKey: "character",
    tabs: [],
    properties: {},
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function byId(nodes: Node[]): Record<string, Node> {
  return Object.fromEntries(nodes.map((n) => [n.id, n]));
}

function paragraph(text: string): BlockNoteDocument[number] {
  return { type: "paragraph", content: [{ type: "text", text, styles: {} }] };
}

describe("documentText", () => {
  it("returns an empty string for an empty or malformed document", () => {
    expect(documentText([])).toBe("");
    expect(documentText(undefined as unknown as BlockNoteDocument)).toBe("");
  });

  it("joins the text of sibling blocks", () => {
    expect(documentText([paragraph("She drew the sword."), paragraph("It sang.")])).toBe("She drew the sword. It sang.");
  });

  it("reaches text nested in children, not just the top level", () => {
    const doc = [{ type: "bulletListItem", content: [{ type: "text", text: "Allies", styles: {} }], children: [paragraph("Nitwit")] }];
    expect(documentText(doc)).toBe("Allies Nitwit");
  });

  it("reads a mention as its label, not its node id", () => {
    const doc = [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Sister of ", styles: {} },
          { type: "mention", props: { nodeId: "abc-123", label: "Valera Jiang" } },
        ],
      },
    ];
    expect(documentText(doc)).toBe("Sister of Valera Jiang");
  });

  it("reads the visible words of a link", () => {
    const doc = [{ type: "paragraph", content: [{ type: "link", href: "https://example.com", content: [{ type: "text", text: "the treaty", styles: {} }] }] }];
    expect(documentText(doc)).toBe("the treaty");
  });

  it("collapses newlines and runs of spaces so a snippet stays one line", () => {
    expect(documentText([paragraph("one\n\ntwo   three")])).toBe("one two three");
  });
});

describe("snippetAround", () => {
  it("returns the whole string with no ellipses when it already fits", () => {
    expect(snippetAround("a short line", 2, 5)).toEqual({ snippet: "a short line", matchStart: 2, matchEnd: 7 });
  });

  it("marks both cut ends and keeps the offsets pointing at the match", () => {
    const text = `${"filler ".repeat(40)}sword${" filler".repeat(40)}`;
    const at = text.indexOf("sword");
    const result = snippetAround(text, at, 5);

    expect(result.snippet.startsWith("…")).toBe(true);
    expect(result.snippet.endsWith("…")).toBe(true);
    expect(result.snippet.slice(result.matchStart, result.matchEnd)).toBe("sword");
  });

  it("does not cut the leading ellipsis past the match itself", () => {
    const text = `${"x".repeat(300)} sword`;
    const at = text.indexOf("sword");
    const result = snippetAround(text, at, 5);
    expect(result.snippet.slice(result.matchStart, result.matchEnd)).toBe("sword");
  });
});

describe("searchProject", () => {
  const valera = node({
    id: "valera",
    name: "Valera Jiang",
    tags: ["antagonist"],
    tabs: [tab({ id: "t1", label: "Overview", content: [paragraph("She carries a broken sword.")] })],
  });
  const nitwit = node({
    id: "nitwit",
    name: "Nitwit",
    tabs: [
      tab({ id: "n1", label: "Overview", content: [paragraph("Nothing of note.")] }),
      tab({ id: "n2", label: "Backstory", content: [paragraph("The sword was a gift.")] }),
    ],
  });
  const nodes = byId([valera, nitwit]);

  it("returns nothing for an empty query, rather than everything", () => {
    expect(searchProject(nodes, "")).toEqual([]);
    expect(searchProject(nodes, "   ")).toEqual([]);
    expect(searchProject(nodes, "#")).toEqual([]);
  });

  it("finds a page by name", () => {
    const results = searchProject(nodes, "Valera");
    expect(results[0]).toMatchObject({ nodeId: "valera", kind: "name" });
  });

  it("tolerates a near-miss in a name", () => {
    expect(searchProject(nodes, "Valerra").map((r) => r.nodeId)).toContain("valera");
  });

  it("finds text inside a tab and says which tab it was", () => {
    const results = searchProject(nodes, "gift");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ nodeId: "nitwit", kind: "content", tabId: "n2", tabLabel: "Backstory" });
    expect(results[0].snippet.slice(results[0].matchStart, results[0].matchEnd)).toBe("gift");
  });

  it("matches prose case-insensitively", () => {
    expect(searchProject(nodes, "SWORD").map((r) => r.nodeId).sort()).toEqual(["nitwit", "valera"]);
  });

  it("does not fuzzy-match prose", () => {
    // "swrod" would be within Fuse's threshold of "sword"; content is exact
    // substring only, or every long page matches everything.
    expect(searchProject(nodes, "swrod")).toEqual([]);
  });

  it("lists a page once, on its strongest match", () => {
    // "Valera" is both her name and absent from her prose; "sword" is in her
    // prose only. Neither should produce two rows for one page.
    const results = searchProject(nodes, "sword");
    expect(results.filter((r) => r.nodeId === "valera")).toHaveLength(1);
  });

  it("puts name and tag hits ahead of prose hits", () => {
    const sworded = node({ id: "blade", name: "Sword of Dawn", tabs: [] });
    const results = searchProject(byId([valera, nitwit, sworded]), "sword");
    expect(results[0].nodeId).toBe("blade");
    expect(results[0].kind).toBe("name");
  });

  it("takes the first matching tab in the page's own order", () => {
    const both = node({
      id: "both",
      name: "Both",
      tabs: [tab({ id: "a", label: "Overview", content: [paragraph("a sword")] }), tab({ id: "b", label: "Later", content: [paragraph("a sword")] })],
    });
    expect(searchProject(byId([both]), "sword")[0].tabId).toBe("a");
  });

  it("finds text in a hidden tab and flags that it is hidden", () => {
    const secret = node({
      id: "secret",
      name: "Secret",
      tabs: [tab({ id: "s1", label: "Notes", hidden: true, content: [paragraph("the real ending")] })],
    });
    expect(searchProject(byId([secret]), "ending")[0]).toMatchObject({ tabHidden: true, tabLabel: "Notes" });
  });

  it("searches tags only behind a leading #", () => {
    const results = searchProject(nodes, "#antagonist");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ nodeId: "valera", kind: "tag", snippet: "antagonist" });
  });

  it("does not return prose or name hits in tag mode", () => {
    // "Nitwit" is a name, not a tag, and nothing is tagged "sword".
    expect(searchProject(nodes, "#Nitwit")).toEqual([]);
    expect(searchProject(nodes, "#sword")).toEqual([]);
  });

  it("caps how many results come back", () => {
    const many = byId(
      Array.from({ length: MAX_SEARCH_RESULTS + 10 }, (_, i) =>
        node({ id: `n${i}`, name: `Page ${i}`, tabs: [tab({ id: `t${i}`, label: "Overview", content: [paragraph("a sword")] })] }),
      ),
    );
    expect(searchProject(many, "sword")).toHaveLength(MAX_SEARCH_RESULTS);
  });
});
