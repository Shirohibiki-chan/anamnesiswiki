import { describe, expect, it } from "vitest";
import { buildExportFile, collectSubtree, packLkBytes, positionKey } from "./lk-export";
import { applyBodyImage, buildImportPlan, parseLkBytes } from "./lk-import";
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

  describe("hidden pages", () => {
    it("carries a hidden page across as LK's isHidden", () => {
      const nodes = [node({ id: "a", name: "Sampo", parentId: null, templateKey: "note", tabs: [tab("Main")], hidden: true })];
      expect(findResource(exportOf(nodes, ["a"]), "Sampo").isHidden).toBe(true);
    });

    it("writes false for a visible page", () => {
      const nodes = [node({ id: "a", name: "Sampo", parentId: null, templateKey: "note", tabs: [tab("Main")] })];
      expect(findResource(exportOf(nodes, ["a"]), "Sampo").isHidden).toBe(false);
    });

    it("does not mark the children of a hidden page — LK cascades it the same way", () => {
      // Writing it onto every descendant would come back on the next import as
      // a flag on each of them, and un-hiding the parent would no longer
      // un-hide anything.
      const nodes = [
        node({ id: "canon", name: "Canon", parentId: null, templateKey: "folder", hidden: true }),
        node({ id: "a", name: "Sampo", parentId: "canon", templateKey: "note", tabs: [tab("Main")] }),
      ];
      const plan = exportOf(nodes, ["canon"]);
      expect(findResource(plan, "Canon").isHidden).toBe(true);
      expect(findResource(plan, "Sampo").isHidden).toBe(false);
    });
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
      expect(plan.localPictureNote).toContain("1 picture");
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

    // Phase 16 put pictures inside the writing, and a `.lk` has nowhere to put
    // one — it stores addresses on LK's servers, never data. Before this case
    // existed an image block fell to the default branch and left an empty
    // paragraph with nothing said about it.
    it("counts a picture in the writing as lossy, and keeps its caption", () => {
      const nodes = [
        node({
          id: "a",
          name: "Page",
          parentId: null,
          templateKey: "note",
          tabs: [
            tab("Main", [
              { type: "image", props: { url: "anamnesis-asset:cat.png", caption: "Valera, age 19" } },
              { type: "paragraph", content: [{ type: "text", text: "after", styles: {} }] },
            ]),
          ],
        }),
      ];
      const plan = exportOf(nodes, ["a"]);
      const out = firstDocContent(plan, "Page");

      expect(out[0]).toEqual({ type: "paragraph", content: [{ type: "text", text: "Valera, age 19" }] });
      expect(out[1]).toEqual({ type: "paragraph", content: [{ type: "text", text: "after" }] });
      expect(plan.localPictureNote).toContain("1 picture");
    });

    describe("a picture that knows where it came from", () => {
      const pageWith = (props: Record<string, unknown>) => [
        node({ id: "a", name: "Page", parentId: null, templateKey: "note", tabs: [tab("Main", [{ type: "image", props }])] }),
      ];
      const exportWithSources = (nodes: Node[], assetSources: Record<string, string>) =>
        buildExportFile({ project: project(), nodes, rootIds: ["a"], orderedIdsFor: ordererFor(nodes), assetSources });

      it("goes home as a mediaSingle pointing at the address it was downloaded from", () => {
        const plan = exportWithSources(pageWith({ url: "anamnesis-asset:cat.png" }), {
          "cat.png": "https://assets.legendkeeper.com/cat.png",
        });
        expect(firstDocContent(plan, "Page")[0]).toEqual({
          type: "mediaSingle",
          attrs: { layout: "center" },
          content: [
            {
              type: "media",
              attrs: { id: "", type: "external", collection: "", url: "https://assets.legendkeeper.com/cat.png", __external: false },
            },
          ],
        });
        expect(plan.lossyNotes).toEqual([]);
      });

      it("turns the pixel width back into a percentage of the text column", () => {
        const plan = exportWithSources(pageWith({ url: "anamnesis-asset:cat.png", previewWidth: 440, textAlignment: "right" }), {
          "cat.png": "https://assets.legendkeeper.com/cat.png",
        });
        // 440 is half of READING_COLUMN_WIDTH — the inverse of the import test.
        expect(firstDocContent(plan, "Page")[0].attrs).toEqual({ layout: "align-end", width: 50 });
      });

      it("sends a picture embedded by web address straight back, with no lookup needed", () => {
        const plan = exportWithSources(pageWith({ url: "https://example.com/cat.png" }), {});
        const media = firstDocContent(plan, "Page")[0].content![0];
        expect(media.attrs!.url).toBe("https://example.com/cat.png");
        expect(plan.lossyNotes).toEqual([]);
      });

      it("still reports a picture uploaded here, which has no address to go back to", () => {
        const plan = exportWithSources(pageWith({ url: "anamnesis-asset:local.png", caption: "Mine" }), {
          "cat.png": "https://assets.legendkeeper.com/cat.png",
        });
        expect(firstDocContent(plan, "Page")[0]).toEqual({ type: "paragraph", content: [{ type: "text", text: "Mine" }] });
        expect(plan.localPictureNote).toContain("1 picture");
        // And it names the file, so the caller can offer to carry it.
        expect(plan.localAssetFiles).toEqual(["local.png"]);
      });
    });

    // Verified against a real LegendKeeper account 2026-08-14: a picture
    // written into the address as a data: URI imports and renders, for both
    // media types LK writes. See docs/lk-format.md.
    describe("carrying a picture inside the file", () => {
      const DATA_URI = "data:image/png;base64,iVBORw0KGgo=";

      it("writes the picture's own bytes as the address when asked", () => {
        const nodes = [
          node({ id: "a", name: "Page", parentId: null, templateKey: "note", tabs: [tab("Main", [{ type: "image", props: { url: "anamnesis-asset:mine.png" } }])] }),
        ];
        const plan = buildExportFile({
          project: project(),
          nodes,
          rootIds: ["a"],
          orderedIdsFor: ordererFor(nodes),
          assetData: { "mine.png": DATA_URI },
        });

        const media = firstDocContent(plan, "Page")[0];
        expect(media.type).toBe("mediaSingle");
        expect(media.content![0].attrs!.url).toBe(DATA_URI);
        // Nothing was left behind, so there's nothing to report or to offer.
        expect(plan.localPictureNote).toBeNull();
        expect(plan.localAssetFiles).toEqual([]);
      });

      it("carries a portrait and a banner too, not just a picture in the writing", () => {
        const nodes = [
          node({ id: "a", name: "Page", parentId: null, templateKey: "note", tabs: [tab("Main")], image: "face.png", banner: "cover.png", bannerFocusY: 30 }),
        ];
        const plan = buildExportFile({
          project: project(),
          nodes,
          rootIds: ["a"],
          orderedIdsFor: ordererFor(nodes),
          assetData: { "face.png": DATA_URI, "cover.png": DATA_URI },
        });

        const resource = findResource(plan, "Page");
        expect(resource.properties.find((p) => p.type === "IMAGE")!.data.url).toBe(DATA_URI);
        expect(resource.banner).toEqual({ enabled: true, url: DATA_URI, yPosition: 30 });
        expect(plan.localPictureNote).toBeNull();
      });

      it("prefers the address it came from over the picture's own bytes", () => {
        // Same file, both answers available. The address is a fraction of the
        // size and points at the same image, so it wins.
        const nodes = [
          node({ id: "a", name: "Page", parentId: null, templateKey: "note", tabs: [tab("Main", [{ type: "image", props: { url: "anamnesis-asset:cat.png" } }])] }),
        ];
        const plan = buildExportFile({
          project: project(),
          nodes,
          rootIds: ["a"],
          orderedIdsFor: ordererFor(nodes),
          assetSources: { "cat.png": "https://assets.legendkeeper.com/cat.png" },
          assetData: { "cat.png": DATA_URI },
        });
        expect(firstDocContent(plan, "Page")[0].content![0].attrs!.url).toBe("https://assets.legendkeeper.com/cat.png");
      });

      it("names each missing file once even when it's on several pages", () => {
        const picture = { type: "image", props: { url: "anamnesis-asset:map.png" } };
        const nodes = [
          node({ id: "a", name: "One", parentId: null, templateKey: "note", tabs: [tab("Main", [picture])] }),
          node({ id: "b", name: "Two", parentId: null, templateKey: "note", tabs: [tab("Main", [picture])] }),
        ];
        const plan = buildExportFile({ project: project(), nodes, rootIds: ["a", "b"], orderedIdsFor: ordererFor(nodes) });
        expect(plan.localAssetFiles).toEqual(["map.png"]);
        // Counted twice in the note, though — two pages really do lose a picture.
        expect(plan.localPictureNote).toContain("2 pictures");
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

    // The newline is the point. Everywhere else in this file a "\n" is split
    // into hardBreak nodes, because ProseMirror forbids a literal newline in an
    // ordinary text node — but a code block's text node is the one place it's
    // allowed, and splitting there would shatter one block into line fragments.
    it("converts a code block to an LK code block, keeping its newlines whole", () => {
      const out = blocksOf([
        { type: "codeBlock", props: { language: "json" }, content: [{ type: "text", text: '{\n  "a": 1\n}', styles: {} }] },
        { type: "codeBlock", props: { language: "text" }, content: [] },
      ]);
      expect(out[0]).toEqual({ type: "codeBlock", attrs: { language: "json" }, content: [{ type: "text", text: '{\n  "a": 1\n}' }] });
      // An empty one still exports, rather than vanishing from the document.
      expect(out[1]).toEqual({ type: "codeBlock", attrs: { language: "text" } });
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

    it("sends a coloured Info back out as the panel severity it came in as", () => {
      // The matching half of the import change: LK's warning, error and success
      // panels arrive as a coloured Info, so a world imported and re-exported
      // has to come back with those panels intact rather than flattened to
      // plain info. Round-trip is the promise in CLAUDE.md.
      const out = blocksOf([
        { type: "calloutInfo", props: { color: "amber" }, content: [{ type: "text", text: "careful", styles: {} }] },
        { type: "calloutInfo", props: { color: "red" }, content: [{ type: "text", text: "stop", styles: {} }] },
        { type: "calloutInfo", props: { color: "emerald" }, content: [{ type: "text", text: "good", styles: {} }] },
        // A colour LK has no panel for. It goes out as a plain info panel —
        // the colour is ours and does not survive, which is the honest answer
        // rather than inventing a severity she never meant.
        { type: "calloutInfo", props: { color: "purple" }, content: [{ type: "text", text: "ours", styles: {} }] },
        // A colour on a Quote is ours too: LK's note panel carries no severity.
        { type: "calloutQuote", props: { color: "amber" }, content: [{ type: "text", text: "said", styles: {} }] },
      ]);

      expect(out.map((node) => node.attrs?.panelType)).toEqual(["warning", "error", "success", "info", "note"]);
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

  // The whole point of the sources file. Import can't do this leg itself — the
  // download happens in the store — so the filename it would have produced is
  // stood in for here, which is exactly what `importLkProject` records.
  it("sends a picture in the writing back to the address it came from", () => {
    const withPicture = {
      version: 1,
      resources: [
        { id: "root", parentId: null, name: "Valeraverse", pos: "A", documents: [{ id: "d", name: "Main", pos: "A", content: { type: "doc", content: [] } }] },
        {
          id: "page",
          parentId: "root",
          name: "Valera Jiang",
          pos: "A",
          documents: [
            {
              id: "d1",
              name: "Main",
              pos: "A",
              content: {
                type: "doc",
                content: [
                  {
                    type: "mediaSingle",
                    attrs: { layout: "center", width: 50 },
                    content: [{ type: "media", attrs: { id: "", type: "external", collection: "", url: "https://assets.legendkeeper.com/sword.png", __external: false } }],
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const first = buildImportPlan(withPicture);
    const pending = first.pendingImages.find((p) => p.field === "body")!;
    expect(pending.url).toBe("https://assets.legendkeeper.com/sword.png");

    // Stand in for the download: the store writes the bytes to a UUID
    // filename, points the block at it, and records where it came from.
    const page = first.nodes.find((n) => n.name === "Valera Jiang")!;
    applyBodyImage(page, pending.blockId, "9f8c.png");
    const assetSources = { "9f8c.png": pending.url };

    const exported = buildExportFile({
      project: { ...createProject({ name: first.projectName, rootOrder: first.rootOrder }), homeNodeId: first.homeNodeId },
      nodes: first.nodes,
      rootIds: first.rootOrder,
      orderedIdsFor: (parentId) => (parentId === null ? first.rootOrder : first.nodes.filter((n) => n.parentId === parentId).map((n) => n.id)),
      assetSources,
    });

    const out = findResource(exported, "Valera Jiang").documents[0].content.content!;
    expect(out[0].type).toBe("mediaSingle");
    expect(out[0].attrs).toEqual({ layout: "center", width: 50 });
    expect(out[0].content![0].attrs!.url).toBe("https://assets.legendkeeper.com/sword.png");
    expect(exported.lossyNotes).toEqual([]);

    // And it survives a second lap, which is the actual promise.
    const second = buildImportPlan(JSON.parse(JSON.stringify(exported.file)));
    expect(second.pendingImages.filter((p) => p.field === "body").map((p) => p.url)).toEqual(["https://assets.legendkeeper.com/sword.png"]);
  });
});
