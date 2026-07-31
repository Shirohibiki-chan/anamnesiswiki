import { describe, expect, it } from "vitest";
import { buildExportFile, collectSubtree, packLkBytes, positionKey } from "./lk-export";
import { buildImportPlan, parseLkBytes } from "./lk-import";
import { createProject, type Node, type Project } from "../constants/schema";

function node(overrides: Partial<Node> & Pick<Node, "id" | "name" | "parentId" | "templateKey">): Node {
  return {
    tabs: [],
    properties: {},
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function tab(label: string, content: unknown[] = []) {
  return { id: `tab-${label}`, label, hidden: false, content };
}

function project(overrides: Partial<Project> = {}): Project {
  return { ...createProject({ name: "Valeraverse" }), ...overrides };
}

// The tree's sibling order lives in the project, not on the nodes, so the
// service takes it as a function. Creation order is a fine stand-in here.
function ordererFor(nodes: Node[]) {
  return (parentId: string | null) => nodes.filter((n) => n.parentId === parentId).map((n) => n.id);
}

function exportOf(nodes: Node[], rootIds: string[], proj: Project = project()) {
  return buildExportFile({ project: proj, nodes, rootIds, orderedIdsFor: ordererFor(nodes) });
}

function findResource(plan: ReturnType<typeof buildExportFile>, name: string) {
  return plan.file.resources.find((r) => r.name === name)!;
}

function firstDocContent(plan: ReturnType<typeof buildExportFile>, name: string) {
  return findResource(plan, name).documents[0].content.content!;
}

describe("positionKey", () => {
  it("sorts by plain string comparison, which is all import does with it", () => {
    const keys = Array.from({ length: 200 }, (_, i) => positionKey(i));
    const sorted = [...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(sorted).toEqual(keys);
  });
});

describe("collectSubtree", () => {
  it("takes descendants along, however deep — a .lk export has no subpage option", () => {
    const nodes = [
      node({ id: "a", name: "Canon", parentId: null, templateKey: "folder" }),
      node({ id: "b", name: "Valera", parentId: "a", templateKey: "character" }),
      node({ id: "c", name: "Her Sword", parentId: "b", templateKey: "item" }),
      node({ id: "d", name: "Elsewhere", parentId: null, templateKey: "note" }),
    ];
    expect([...collectSubtree(["a"], nodes)].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("buildExportFile", () => {
  it("synthesises a single parentless root from the project name when no home page is included", () => {
    const nodes = [node({ id: "a", name: "Sampo", parentId: null, templateKey: "note", tabs: [tab("Main")] })];
    const plan = exportOf(nodes, ["a"]);

    const roots = plan.file.resources.filter((r) => r.parentId === null);
    expect(roots).toHaveLength(1);
    expect(roots[0].name).toBe("Valeraverse");
    expect(findResource(plan, "Sampo").parentId).toBe(roots[0].id);
    expect(plan.pageCount).toBe(1);
  });

  it("uses the designated home page as LK's root, rather than adding one above it", () => {
    const nodes = [
      node({ id: "home", name: "Valeraverse", parentId: null, templateKey: "note", tabs: [tab("Main")] }),
      node({ id: "a", name: "Sampo", parentId: null, templateKey: "note", tabs: [tab("Main")] }),
    ];
    const plan = exportOf(nodes, ["home", "a"], project({ homeNodeId: "home" }));

    const roots = plan.file.resources.filter((r) => r.parentId === null);
    expect(roots).toHaveLength(1);
    expect(roots[0].name).toBe("Valeraverse");
    // Top-level pages hang off the home page, which is where LK keeps them.
    expect(findResource(plan, "Sampo").parentId).toBe(roots[0].id);
    expect(plan.pageCount).toBe(2);
  });

  it("exports a nested page without dragging its ancestors along", () => {
    const nodes = [
      node({ id: "canon", name: "Canon", parentId: null, templateKey: "folder" }),
      node({ id: "valera", name: "Valera", parentId: "canon", templateKey: "character", tabs: [tab("Overview")] }),
      node({ id: "sword", name: "Her Sword", parentId: "valera", templateKey: "item", tabs: [tab("Main")] }),
    ];
    const plan = exportOf(nodes, ["valera"]);

    expect(plan.file.resources.map((r) => r.name).sort()).toEqual(["Her Sword", "Valera", "Valeraverse"]);
    const root = plan.file.resources.find((r) => r.parentId === null)!;
    expect(findResource(plan, "Valera").parentId).toBe(root.id);
    expect(findResource(plan, "Her Sword").parentId).toBe(findResource(plan, "Valera").id);
  });

  it("keeps sibling order in the pos keys", () => {
    const nodes = [
      node({ id: "a", name: "First", parentId: null, templateKey: "note", tabs: [tab("Main")] }),
      node({ id: "b", name: "Second", parentId: null, templateKey: "note", tabs: [tab("Main")] }),
    ];
    const plan = exportOf(nodes, ["a", "b"]);
    expect(findResource(plan, "First").pos < findResource(plan, "Second").pos).toBe(true);
  });

  it("gives a folder one empty tab, since LK has no folder-only concept", () => {
    const nodes = [node({ id: "a", name: "Canon", parentId: null, templateKey: "folder" })];
    const plan = exportOf(nodes, ["a"]);

    expect(findResource(plan, "Canon").documents.map((d) => d.name)).toEqual(["Main"]);
    expect(plan.lossyNotes.some((n) => n.includes("folder"))).toBe(true);
  });

  it("carries tags and maps a palette colour back to its hex", () => {
    const nodes = [
      node({ id: "a", name: "Sampo", parentId: null, templateKey: "note", tabs: [tab("Main")], tags: ["npc"], color: "teal" }),
    ];
    const resource = findResource(exportOf(nodes, ["a"]), "Sampo");
    expect(resource.tags).toEqual(["npc"]);
    expect(resource.iconColor).toBe("#5eead4");
  });

  describe("images", () => {
    it("exports a picture that came from LegendKeeper, using the address it came from", () => {
      const nodes = [
        node({
          id: "a",
          name: "Sampo",
          parentId: null,
          templateKey: "note",
          tabs: [tab("Main")],
          image: "local-file.png",
          imageSource: "https://assets.legendkeeper.com/sampo.png",
          banner: "local-banner.png",
          bannerSource: "https://assets.legendkeeper.com/banner.png",
          bannerFocusY: 30,
        }),
      ];
      const resource = findResource(exportOf(nodes, ["a"]), "Sampo");

      expect(resource.properties).toContainEqual(
        expect.objectContaining({ type: "IMAGE", data: { url: "https://assets.legendkeeper.com/sampo.png" } }),
      );
      expect(resource.banner).toEqual({ enabled: true, url: "https://assets.legendkeeper.com/banner.png", yPosition: 30 });
    });

    it("leaves out a picture added here, and says how many", () => {
      const nodes = [
        node({ id: "a", name: "Sampo", parentId: null, templateKey: "note", tabs: [tab("Main")], image: "mine.png" }),
      ];
      const plan = exportOf(nodes, ["a"]);

      expect(findResource(plan, "Sampo").properties.filter((p) => p.type === "IMAGE")).toEqual([]);
      expect(plan.lossyNotes.some((n) => n.includes("1 picture"))).toBe(true);
    });
  });

  describe("block conversion", () => {
    function blocksOf(content: unknown[]) {
      const nodes = [node({ id: "a", name: "Page", parentId: null, templateKey: "note", tabs: [tab("Main", content)] })];
      return firstDocContent(exportOf(nodes, ["a"]), "Page");
    }

    it("converts headings, marks, and links", () => {
      const out = blocksOf([
        { type: "heading", props: { level: 2 }, content: [{ type: "text", text: "Title", styles: {} }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bold", styles: { bold: true } },
            { type: "link", href: "https://example.com", content: [{ type: "text", text: "link", styles: {} }] },
          ],
        },
      ]);

      expect(out[0]).toEqual({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] });
      expect(out[1].content![0]).toEqual({ type: "text", text: "bold", marks: [{ type: "strong" }] });
      expect(out[1].content![1]).toEqual({
        type: "text",
        text: "link",
        marks: [{ type: "link", attrs: { href: "https://example.com" } }],
      });
    });

    it("converts a divider to a rule and a quote block to a blockquote", () => {
      const out = blocksOf([
        { type: "divider" },
        { type: "quote", content: [{ type: "text", text: "Said so.", styles: {} }] },
      ]);
      expect(out[0]).toEqual({ type: "rule" });
      expect(out[1]).toEqual({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Said so." }] }] });
    });

    it("maps the info and quote callouts back to LK panels, and secret to LK's own Secret block", () => {
      const out = blocksOf([
        { type: "calloutInfo", content: [{ type: "text", text: "note", styles: {} }] },
        { type: "calloutQuote", content: [{ type: "text", text: "quote", styles: {} }] },
        { type: "calloutSecret", content: [{ type: "text", text: "hidden", styles: {} }] },
      ]);

      expect(out[0]).toMatchObject({ type: "panel", attrs: { panelType: "info" } });
      expect(out[1]).toMatchObject({ type: "panel", attrs: { panelType: "note" } });
      expect(out[2]).toMatchObject({ type: "bodiedExtension", attrs: { extensionKey: "block-secret" } });
    });

    it("gathers consecutive list items into one list, keeping nesting", () => {
      const out = blocksOf([
        {
          type: "bulletListItem",
          content: [{ type: "text", text: "one", styles: {} }],
          children: [{ type: "bulletListItem", content: [{ type: "text", text: "nested", styles: {} }] }],
        },
        { type: "bulletListItem", content: [{ type: "text", text: "two", styles: {} }] },
        { type: "numberedListItem", content: [{ type: "text", text: "first", styles: {} }] },
      ]);

      expect(out).toHaveLength(2);
      expect(out[0].type).toBe("bulletList");
      expect(out[0].content).toHaveLength(2);
      expect(out[0].content![0].content![1]).toMatchObject({ type: "bulletList" });
      expect(out[1].type).toBe("orderedList");
    });

    it("maps a toggle back to LK's expand block, title and body intact", () => {
      const out = blocksOf([
        {
          type: "toggleListItem",
          content: [{ type: "text", text: "Spoilers", styles: {} }],
          children: [{ type: "paragraph", content: [{ type: "text", text: "the body", styles: {} }] }],
        },
      ]);

      expect(out[0]).toEqual({
        type: "expand",
        attrs: { title: "Spoilers" },
        content: [{ type: "paragraph", content: [{ type: "text", text: "the body" }] }],
      });
    });

    it("splits an embedded newline back into a hardBreak", () => {
      const out = blocksOf([{ type: "paragraph", content: [{ type: "text", text: "one\ntwo", styles: {} }] }]);
      expect(out[0].content).toEqual([
        { type: "text", text: "one" },
        { type: "hardBreak" },
        { type: "text", text: "two" },
      ]);
    });

    it("resolves a mention to the exported resource's new id, and degrades one pointing outside the export", () => {
      const nodes = [
        node({
          id: "a",
          name: "Page",
          parentId: null,
          templateKey: "note",
          tabs: [
            tab("Main", [
              { type: "paragraph", content: [{ type: "mention", props: { nodeId: "b", label: "Valera" } }] },
              { type: "paragraph", content: [{ type: "mention", props: { nodeId: "gone", label: "Missing" } }] },
            ]),
          ],
        }),
        node({ id: "b", name: "Valera", parentId: null, templateKey: "character", tabs: [tab("Overview")] }),
      ];
      const plan = exportOf(nodes, ["a", "b"]);
      const blocks = firstDocContent(plan, "Page");

      expect(blocks[0].content![0]).toEqual({
        type: "mention",
        attrs: { id: findResource(plan, "Valera").id, text: "Valera" },
      });
      expect(blocks[1].content![0]).toEqual({ type: "text", text: "Missing" });
    });
  });

  describe("properties", () => {
    it("exports filled template fields and custom fields, skipping empty ones", () => {
      const nodes = [
        node({
          id: "a",
          name: "Valera",
          parentId: null,
          templateKey: "character",
          tabs: [tab("Overview")],
          properties: { role: "Swordswoman", friends: ["b"], "custom-1": "A secret" },
          customProperties: [{ key: "custom-1", label: "Rumours", type: "longtext" }],
        }),
        node({ id: "b", name: "Sampo", parentId: null, templateKey: "character", tabs: [tab("Overview")] }),
      ];
      const plan = exportOf(nodes, ["a", "b"]);
      const properties = findResource(plan, "Valera").properties;

      const rumours = properties.find((p) => p.title === "Rumours")!;
      expect(rumours.type).toBe("TEXT_FIELD");

      const refs = properties.find((p) => p.type === "RESOURCE_LINK")!;
      expect(refs.data).toEqual({ items: [{ resourceId: findResource(plan, "Sampo").id }] });

      // Nothing empty makes the trip — LK's own unfilled fields don't either.
      expect(properties.every((p) => p.type === "IMAGE" || p.data.fragment || p.data.items)).toBe(true);
    });
  });
});

describe("packLkBytes", () => {
  it("gzips to something the importer can read straight back", async () => {
    const nodes = [node({ id: "a", name: "Sampo", parentId: null, templateKey: "note", tabs: [tab("Main")] })];
    const plan = exportOf(nodes, ["a"]);

    const bytes = await packLkBytes(plan.file);
    const parsed = (await parseLkBytes(bytes)) as { resources: unknown[] };
    expect(parsed.resources).toHaveLength(plan.file.resources.length);
  });
});

// The Phase 9 acceptance test. Compares *content*, not bytes: LK stamps its own
// resource ids and pos keys, and we mint fresh ones on both legs, so a byte
// diff would fail on files that are identical in every way the user can see.
describe("round trip through LK format", () => {
  const lkFile = {
    version: 1,
    resources: [
      { id: "root", parentId: null, name: "Valeraverse", pos: "A", documents: [{ id: "d", name: "Main", pos: "A", content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "The world." }] }] } }] },
      {
        id: "canon",
        parentId: "root",
        name: "Canon",
        pos: "A",
        documents: [{ id: "d1", name: "Main", pos: "A", content: { type: "doc", content: [] } }],
      },
      {
        id: "valera",
        parentId: "canon",
        name: "Valera Jiang",
        pos: "A",
        tags: ["pc"],
        documents: [
          {
            id: "d2",
            name: "Overview",
            pos: "A",
            content: {
              type: "doc",
              content: [
                { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Who she is" }] },
                { type: "paragraph", content: [{ type: "text", text: "A swordswoman.", marks: [{ type: "strong" }] }] },
                { type: "panel", attrs: { panelType: "info" }, content: [{ type: "paragraph", content: [{ type: "text", text: "An aside." }] }] },
                { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "a point" }] }] }] },
                { type: "expand", attrs: { title: "Spoilers" }, content: [{ type: "paragraph", content: [{ type: "text", text: "hidden" }] }] },
                { type: "paragraph", content: [{ type: "mention", attrs: { id: "sampo", text: "Sampo Koski" } }] },
              ],
            },
          },
          { id: "d3", name: "Backstory", pos: "B", content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Born somewhere." }] }] } },
        ],
      },
      {
        id: "sampo",
        parentId: "canon",
        name: "Sampo Koski",
        pos: "B",
        documents: [
          { id: "d4", name: "Overview", pos: "A", content: { type: "doc", content: [] } },
          { id: "d5", name: "Backstory", pos: "B", content: { type: "doc", content: [] } },
        ],
      },
    ],
  };

  function shapeOf(plan: ReturnType<typeof buildImportPlan>) {
    const nameById = new Map(plan.nodes.map((n) => [n.id, n.name]));
    return plan.nodes
      .map((n) => ({
        name: n.name,
        parent: n.parentId ? nameById.get(n.parentId) : null,
        templateKey: n.templateKey,
        tabs: n.tabs.map((t) => t.label),
        tags: n.tags,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  it("comes back with the same tree, templates, tabs and tags", async () => {
    const first = buildImportPlan(lkFile);

    const exported = buildExportFile({
      project: { ...createProject({ name: first.projectName, rootOrder: first.rootOrder }), homeNodeId: first.homeNodeId },
      nodes: first.nodes,
      rootIds: first.rootOrder,
      orderedIdsFor: (parentId) =>
        parentId === null ? first.rootOrder : first.nodes.filter((n) => n.parentId === parentId).map((n) => n.id),
    });

    const second = buildImportPlan(JSON.parse(JSON.stringify(exported.file)));

    expect(second.projectName).toBe(first.projectName);
    expect(shapeOf(second)).toEqual(shapeOf(first));
  });

  it("keeps a page's blocks and its cross-reference intact", () => {
    const first = buildImportPlan(lkFile);
    const exported = buildExportFile({
      project: { ...createProject({ name: first.projectName, rootOrder: first.rootOrder }), homeNodeId: first.homeNodeId },
      nodes: first.nodes,
      rootIds: first.rootOrder,
      orderedIdsFor: (parentId) =>
        parentId === null ? first.rootOrder : first.nodes.filter((n) => n.parentId === parentId).map((n) => n.id),
    });
    const second = buildImportPlan(JSON.parse(JSON.stringify(exported.file)));

    const before = first.nodes.find((n) => n.name === "Valera Jiang")!;
    const after = second.nodes.find((n) => n.name === "Valera Jiang")!;

    const strip = (blocks: unknown) => JSON.stringify(blocks).replace(/"nodeId":"[^"]+"/g, '"nodeId":"<id>"');
    expect(strip(after.tabs[0].content)).toBe(strip(before.tabs[0].content));

    // The mention still points at a real page, not at plain text.
    const mentions = JSON.stringify(after.tabs[0].content);
    expect(mentions).toContain('"type":"mention"');
    expect(second.lossyNotes.some((note) => note.includes("cross-reference"))).toBe(false);
  });
});
