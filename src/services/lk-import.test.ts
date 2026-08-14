import { describe, expect, it } from "vitest";
import { applyBodyImage, buildImportPlan } from "./lk-import";
import type { Node } from "../constants/schema";

type RawDoc = { id: string; name: string; pos: string; isHidden?: boolean; content?: unknown };
type RawResource = {
  id: string;
  parentId?: string | null;
  name: string;
  pos: string;
  iconColor?: string;
  isHidden?: boolean;
  documents: RawDoc[];
  properties?: unknown[];
  tags?: string[];
  banner?: { enabled?: boolean; url?: string; yPosition?: number };
};

function doc(id: string, name: string, pos: string, content: unknown[] = [], opts: Partial<RawDoc> = {}): RawDoc {
  return { id, name, pos, content: { type: "doc", content }, ...opts };
}

function resource(id: string, name: string, pos: string, opts: Partial<RawResource> = {}): RawResource {
  return { id, parentId: null, name, pos, documents: [doc(`${id}-main`, "Main", "A")], ...opts };
}

function text(value: string, marks?: unknown[]) {
  return { type: "text", text: value, ...(marks ? { marks } : {}) };
}

function paragraph(content: unknown[]) {
  return { type: "paragraph", content };
}

function exportFile(resources: RawResource[]) {
  return { version: 1, resources };
}

// Every fixture gets an implicit no-parent "project root" resource (mirrors
// LK's real export shape — one resource with no parentId, which becomes the
// Project itself rather than a Node, see docs/handoff.md's Phase 8 notes) so
// tests can focus on the resources that actually become nodes.
function withRoot(children: RawResource[], rootOverrides: Partial<RawResource> = {}) {
  const root = resource("root", "Valeraverse", "A", { parentId: null, ...rootOverrides });
  return exportFile([root, ...children.map((c) => ({ ...c, parentId: c.parentId ?? "root" }))]);
}

describe("buildImportPlan", () => {
  it("throws on a file that isn't a LegendKeeper export", () => {
    expect(() => buildImportPlan({ nonsense: true })).toThrow();
    expect(() => buildImportPlan(null)).toThrow();
  });

  it("takes the project name from the sole no-parent resource", () => {
    const plan = buildImportPlan(withRoot([resource("a", "Sampo Koski", "A")]));
    expect(plan.projectName).toBe("Valeraverse");
  });

  it("brings the root in as the project home page — keeping its name, first in the tree", () => {
    const plan = buildImportPlan(
      withRoot([resource("a", "Page", "A")], {
        documents: [doc("root-main", "Main", "A", [paragraph([text("The world of Valera.")])])],
      }),
    );
    const home = plan.nodes.find((n) => n.id === plan.homeNodeId)!;
    expect(home.name).toBe("Valeraverse");
    expect(home.templateKey).toBe("note");
    expect(home.parentId).toBeNull();
    const blocks = home.tabs[0].content as Record<string, unknown>[];
    expect((blocks[0].content as Record<string, unknown>[])[0]).toMatchObject({ text: "The world of Valera." });
    expect(plan.rootOrder[0]).toBe(home.id);
  });

  it("still designates a home page when the root has nothing on it, with somewhere to type", () => {
    const plan = buildImportPlan(withRoot([resource("a", "Page", "A")], { documents: [] }));
    const home = plan.nodes.find((n) => n.id === plan.homeNodeId)!;
    expect(home).toBeDefined();
    expect(home.tabs).toHaveLength(1);
    expect(home.tabs[0].content).toEqual([]);
  });

  it("leaves LK's stock welcome tutorial out of the home page, and says so", () => {
    const plan = buildImportPlan(
      withRoot([resource("a", "Page", "A")], {
        documents: [
          doc("root-main", "Main", "A", [
            { type: "heading", attrs: { level: 1 }, content: [text("Welcome to LegendKeeper")] },
            paragraph([text("This page is your Project Home.")]),
          ]),
        ],
      }),
    );
    const home = plan.nodes.find((n) => n.id === plan.homeNodeId)!;
    expect(home.tabs[0].content).toEqual([]);
    expect(plan.lossyNotes.some((note) => note.includes("Welcome to LegendKeeper"))).toBe(true);
  });

  // The root is a page now, so a mention pointing at it resolves like any
  // other — 15 of these came across as plain text in the user's real export.
  it("resolves a mention pointing at the project root to the home page", () => {
    const plan = buildImportPlan(
      withRoot([
        resource("a", "Page", "A", {
          documents: [
            doc("a-main", "Main", "A", [paragraph([{ type: "mention", attrs: { id: "root", text: "Valeraverse" } }])]),
          ],
        }),
      ]),
    );
    const blocks = plan.nodes[0].tabs[0].content as Record<string, unknown>[];
    const inline = (blocks[0].content as Record<string, unknown>[])[0];
    expect(inline).toEqual({ type: "mention", props: { nodeId: plan.homeNodeId, label: "Valeraverse" } });
    expect(plan.lossyNotes.some((note) => note.includes("cross-reference"))).toBe(false);
  });

  it("orders siblings by LK's fractional-index pos, not resource order", () => {
    const plan = buildImportPlan(
      withRoot([resource("second", "Second", "M"), resource("first", "First", "A")]),
    );
    // Home leads the tree; the imported siblings follow it in pos order.
    expect(plan.rootOrder.map((id) => plan.nodes.find((n) => n.id === id)?.name)).toEqual([
      "Valeraverse",
      "First",
      "Second",
    ]);
  });

  describe("template inference", () => {
    it("infers character from [Overview, Backstory]", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Valera", "A", { documents: [doc("d1", "Overview", "A"), doc("d2", "Backstory", "B")] }),
        ]),
      );
      expect(plan.nodes[0].templateKey).toBe("character");
    });

    it("infers location from [Overview, Map, History]", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Belobog", "A", {
            documents: [doc("d1", "Overview", "A"), doc("d2", "Map", "B"), doc("d3", "History", "C")],
          }),
        ]),
      );
      expect(plan.nodes[0].templateKey).toBe("location");
    });

    it("infers species from [Overview, Biology, Lifestyle, Beliefs, Relations]", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Foxians", "A", {
            documents: [
              doc("d1", "Overview", "A"),
              doc("d2", "Biology", "B"),
              doc("d3", "Lifestyle", "C"),
              doc("d4", "Beliefs", "D"),
              doc("d5", "Relations", "E"),
            ],
          }),
        ]),
      );
      expect(plan.nodes[0].templateKey).toBe("species");
    });

    it("infers folder for a [Main]-only resource with children", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("parent", "Canon", "A", { documents: [doc("d1", "Main", "A")] }),
          resource("child", "Page", "B", { parentId: "parent" }),
        ]),
      );
      const parentNode = plan.nodes.find((n) => n.name === "Canon");
      expect(parentNode?.templateKey).toBe("folder");
    });

    it("infers note for a [Main]-only leaf resource", () => {
      const plan = buildImportPlan(withRoot([resource("a", "Untitled", "A", { documents: [doc("d1", "Main", "A")] })]));
      expect(plan.nodes[0].templateKey).toBe("note");
    });

    it("infers note for an unrecognized tab signature, preserving the tabs as-is", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Odd Page", "A", { documents: [doc("d1", "Notes", "A"), doc("d2", "Gallery", "B")] }),
        ]),
      );
      expect(plan.nodes[0].templateKey).toBe("note");
      expect(plan.nodes[0].tabs.map((t) => t.label)).toEqual(["Notes", "Gallery"]);
    });

    // LK treats tabs as freeform per page, so a signature is a subset test,
    // not an exact match — this is the real "Valera Jiang" shape from the
    // user's own export, which exact-matching misfiled as a note.
    it("matches a signature when the page carries extra tabs of its own", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Valera Jiang", "A", {
            documents: [doc("d1", "Overview", "A"), doc("d2", "Gallery", "B"), doc("d3", "Backstory", "C")],
          }),
        ]),
      );
      expect(plan.nodes[0].templateKey).toBe("character");
      expect(plan.nodes[0].tabs.map((t) => t.label)).toEqual(["Overview", "Gallery", "Backstory"]);
    });

    it("prefers the most specific signature when several could match", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Foxians", "A", {
            documents: [
              doc("d1", "Overview", "A"),
              doc("d2", "Backstory", "B"),
              doc("d3", "Biology", "C"),
              doc("d4", "Lifestyle", "D"),
              doc("d5", "Beliefs", "E"),
              doc("d6", "Relations", "F"),
            ],
          }),
        ]),
      );
      expect(plan.nodes[0].templateKey).toBe("species");
    });
  });

  describe("pages that hold pages", () => {
    // Until 2026-08-10 this asserted the opposite: a resource with children
    // was forced to `folder`, because our leaf templates couldn't hold pages.
    // Now they can, so the inferred template stands and the page keeps its own
    // writing — which is what the .lk file said in the first place.
    it("keeps the inferred template for a resource that has children", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("parent", "Magic System", "A", { documents: [doc("d1", "Rules", "A")] }),
          resource("child", "Blood Magic", "B", { parentId: "parent" }),
        ]),
      );
      const parent = plan.nodes.find((n) => n.name === "Magic System")!;
      const child = plan.nodes.find((n) => n.name === "Blood Magic")!;
      expect(parent.templateKey).toBe("note");
      expect(child.parentId).toBe(parent.id);
    });

    it("keeps the text of a page that has both sub-pages and its own writing", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("parent", "Magic System", "A", {
            documents: [doc("d1", "Rules", "A", [paragraph([text("Mana is finite.")])])],
          }),
          resource("child", "Blood Magic", "B", { parentId: "parent" }),
        ]),
      );
      const parent = plan.nodes.find((n) => n.name === "Magic System")!;
      expect(parent.tabs.length).toBeGreaterThan(0);
      expect(JSON.stringify(parent.tabs)).toContain("Mana is finite.");
      expect(plan.lossyNotes.some((note) => note.includes("sub-pages and their own text"))).toBe(false);
    });

    it("keeps a leaf template for the same page when it has no children", () => {
      const plan = buildImportPlan(
        withRoot([resource("a", "Magic System", "A", { documents: [doc("d1", "Rules", "A")] })]),
      );
      expect(plan.nodes[0].templateKey).toBe("note");
    });

    it("gives a folder-classified resource no tabs, and flags it if it had real text", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("parent", "Canon", "A", { documents: [doc("d1", "Main", "A", [paragraph([text("Not actually empty")])])] }),
          resource("child", "Page", "B", { parentId: "parent" }),
        ]),
      );
      const parentNode = plan.nodes.find((n) => n.name === "Canon");
      expect(parentNode?.tabs).toEqual([]);
      expect(plan.lossyNotes.some((n) => n.includes("organizing page"))).toBe(true);
    });
  });

  describe("block content conversion", () => {
    it("converts headings, paragraphs, and bold/italic/link marks", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            documents: [
              doc("d1", "Main", "A", [
                { type: "heading", attrs: { level: 2 }, content: [text("Title")] },
                paragraph([text("bold", [{ type: "strong" }]), text("ital", [{ type: "em" }]), text("link", [{ type: "link", attrs: { href: "https://example.com" } }])]),
              ]),
            ],
          }),
        ]),
      );
      const blocks = plan.nodes[0].tabs[0].content as Record<string, unknown>[];
      expect(blocks[0]).toMatchObject({ type: "heading", props: { level: 2 } });
      const para = blocks[1].content as Record<string, unknown>[];
      expect(para[0]).toMatchObject({ text: "bold", styles: { bold: true } });
      expect(para[1]).toMatchObject({ text: "ital", styles: { italic: true } });
      expect(para[2]).toMatchObject({ type: "link", href: "https://example.com" });
    });

    it("maps panel type=info/note/warning to the info/quote/secret callouts", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            documents: [
              doc("d1", "Main", "A", [
                { type: "panel", attrs: { panelType: "info" }, content: [paragraph([text("i")])] },
                { type: "panel", attrs: { panelType: "note" }, content: [paragraph([text("n")])] },
                { type: "panel", attrs: { panelType: "warning" }, content: [paragraph([text("w")])] },
              ]),
            ],
          }),
        ]),
      );
      const blocks = plan.nodes[0].tabs[0].content as Record<string, unknown>[];
      expect(blocks.map((b) => b.type)).toEqual(["calloutInfo", "calloutQuote", "calloutSecret"]);
    });

    it("maps a plain blockquote to BlockNote's native quote block", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            documents: [doc("d1", "Main", "A", [{ type: "blockquote", content: [paragraph([text("quoted")])] }])],
          }),
        ]),
      );
      const blocks = plan.nodes[0].tabs[0].content as Record<string, unknown>[];
      expect(blocks[0].type).toBe("quote");
    });

    it("converts a rule to a divider", () => {
      const plan = buildImportPlan(withRoot([resource("a", "Page", "A", { documents: [doc("d1", "Main", "A", [{ type: "rule" }])] })]));
      expect((plan.nodes[0].tabs[0].content as Record<string, unknown>[])[0]).toEqual({ type: "divider" });
    });

    // Regression: before a codeBlock case existed, one fell to the default
    // branch, which recurses into children — and a code block's children are
    // bare text nodes, which the block-level switch drops. The code arrived
    // empty rather than unformatted, which is data loss on import.
    it("keeps a code block's text, newlines and all", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            documents: [
              doc("d1", "Main", "A", [
                { type: "codeBlock", attrs: { language: "json" }, content: [text('{\n  "name": "Valera"\n}')] },
              ]),
            ],
          }),
        ]),
      );
      expect((plan.nodes[0].tabs[0].content as Record<string, unknown>[])[0]).toEqual({
        type: "codeBlock",
        props: { language: "json" },
        content: [{ type: "text", text: '{\n  "name": "Valera"\n}', styles: {} }],
      });
    });

    it("falls back to plain text for a language the app doesn't offer", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            documents: [doc("d1", "Main", "A", [{ type: "codeBlock", attrs: { language: "brainfuck" }, content: [text("+++")] }])],
          }),
        ]),
      );
      const block = (plan.nodes[0].tabs[0].content as Record<string, unknown>[])[0];
      expect(block).toMatchObject({ type: "codeBlock", props: { language: "text" } });
    });

    it("converts nested bullet lists into bulletListItem blocks with children", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            documents: [
              doc("d1", "Main", "A", [
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [paragraph([text("top")]), { type: "bulletList", content: [{ type: "listItem", content: [paragraph([text("nested")])] }] }],
                    },
                  ],
                },
              ]),
            ],
          }),
        ]),
      );
      const blocks = plan.nodes[0].tabs[0].content as Record<string, unknown>[];
      expect(blocks[0].type).toBe("bulletListItem");
      const children = blocks[0].children as Record<string, unknown>[];
      expect(children[0].type).toBe("bulletListItem");
    });

    it("resolves a mention to the target's new node id via the id-map", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("target", "Target Page", "A"),
          resource("a", "Page", "B", {
            documents: [doc("d1", "Main", "A", [paragraph([{ type: "mention", attrs: { id: "target", text: "Target Page" } }])])],
          }),
        ]),
      );
      const source = plan.nodes.find((n) => n.name === "Page")!;
      const targetId = plan.nodes.find((n) => n.name === "Target Page")!.id;
      const para = source.tabs[0].content as Record<string, unknown>[];
      const mention = (para[0].content as Record<string, unknown>[])[0];
      expect(mention).toEqual({ type: "mention", props: { nodeId: targetId, label: "Target Page" } });
    });

    it("falls back to plain text and flags a broken mention pointing outside the import", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            documents: [doc("d1", "Main", "A", [paragraph([{ type: "mention", attrs: { id: "nowhere", text: "Ghost" } }])])],
          }),
        ]),
      );
      const para = plan.nodes[0].tabs[0].content as Record<string, unknown>[];
      expect((para[0].content as Record<string, unknown>[])[0]).toEqual({ type: "text", text: "Ghost", styles: {} });
      expect(plan.lossyNotes.some((n) => n.includes("cross-reference"))).toBe(true);
    });

    it("flattens layoutSection/layoutColumn and flags it as lossy", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            documents: [
              doc("d1", "Main", "A", [
                { type: "layoutSection", content: [{ type: "layoutColumn", content: [paragraph([text("col1")])] }, { type: "layoutColumn", content: [paragraph([text("col2")])] }] },
              ]),
            ],
          }),
        ]),
      );
      const blocks = plan.nodes[0].tabs[0].content as Record<string, unknown>[];
      expect(blocks).toHaveLength(2);
      expect(plan.lossyNotes.some((n) => n.includes("column"))).toBe(true);
    });

    it("strips inlineExtension icons and flags them as lossy", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            documents: [doc("d1", "Main", "A", [paragraph([{ type: "inlineExtension", attrs: {} }, text("after")])])],
          }),
        ]),
      );
      const para = plan.nodes[0].tabs[0].content as Record<string, unknown>[];
      expect(para[0].content).toEqual([{ type: "text", text: "after", styles: {} }]);
      expect(plan.lossyNotes.some((n) => n.includes("icon"))).toBe(true);
    });

    it("maps a bodiedExtension block-secret to the secret callout losslessly", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            documents: [
              doc("d1", "Main", "A", [{ type: "bodiedExtension", attrs: { extensionKey: "block-secret" }, content: [paragraph([text("shh")])] }]),
            ],
          }),
        ]),
      );
      const blocks = plan.nodes[0].tabs[0].content as Record<string, unknown>[];
      expect(blocks[0].type).toBe("calloutSecret");
      expect(plan.lossyNotes.some((n) => n.includes("LegendKeeper feature"))).toBe(false);
    });

    it("flags an unrecognized bodiedExtension and an embed extension as lossy", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            documents: [
              doc("d1", "Main", "A", [
                { type: "bodiedExtension", attrs: { extensionKey: "block-poll" }, content: [paragraph([text("vote")])] },
                { type: "extension", attrs: { extensionKey: "block-youtube", parameters: { embedUrl: "https://youtu.be/x" } } },
              ]),
            ],
          }),
        ]),
      );
      expect(plan.lossyNotes.some((n) => n.includes("LegendKeeper feature"))).toBe(true);
      expect(plan.lossyNotes.some((n) => n.includes("embedded video"))).toBe(true);
    });

    it("maps an expand block to a real toggleListItem, title and content intact, losslessly", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            documents: [doc("d1", "Main", "A", [{ type: "expand", attrs: { title: "Secret Form" }, content: [paragraph([text("body")])] }])],
          }),
        ]),
      );
      const blocks = plan.nodes[0].tabs[0].content as Record<string, unknown>[];
      expect(blocks[0].type).toBe("toggleListItem");
      expect(blocks[0].content).toEqual([{ type: "text", text: "Secret Form", styles: {} }]);
      const children = blocks[0].children as Record<string, unknown>[];
      expect(children[0]).toMatchObject({ type: "paragraph" });
      expect(plan.lossyNotes.some((n) => n.includes("collapsible"))).toBe(false);
    });
  });

  describe("property conversion", () => {
    it("imports a TEXT_FIELD as a longtext custom property", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            properties: [{ title: "SUMMARY", type: "TEXT_FIELD", data: { fragment: { content: [paragraph([text("A conman.")])] } } }],
          }),
        ]),
      );
      const node = plan.nodes[0];
      expect(node.customProperties).toEqual([{ key: expect.any(String), label: "SUMMARY", type: "longtext" }]);
      const key = node.customProperties![0].key;
      expect(node.properties[key]).toBe("A conman.");
    });

    it("imports a RESOURCE_LINK as a refs custom property, resolved via the id-map", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("friend", "Sampo", "A"),
          resource("a", "Valera", "B", {
            properties: [{ title: "FRIENDS", type: "RESOURCE_LINK", data: { items: [{ resourceId: "friend" }] } }],
          }),
        ]),
      );
      const valera = plan.nodes.find((n) => n.name === "Valera")!;
      const sampoId = plan.nodes.find((n) => n.name === "Sampo")!.id;
      const key = valera.customProperties![0].key;
      expect(valera.customProperties![0]).toMatchObject({ label: "FRIENDS", type: "refs" });
      expect(valera.properties[key]).toEqual([sampoId]);
    });

    it("skips an empty property (no fragment text, no items)", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            properties: [
              { title: "SUMMARY", type: "TEXT_FIELD", data: { fragment: { content: [] } } },
              { title: "FRIENDS", type: "RESOURCE_LINK", data: { items: [] } },
            ],
          }),
        ]),
      );
      expect(plan.nodes[0].customProperties).toEqual([]);
    });

    it("fills a template's own fixed field instead of duplicating it as a custom property", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("friend", "Sampo", "A"),
          resource("a", "Valera", "B", {
            documents: [doc("d1", "Overview", "A"), doc("d2", "Backstory", "B")],
            properties: [
              { title: "SUMMARY", type: "TEXT_FIELD", data: { fragment: { content: [paragraph([text("A succubus.")])] } } },
              { title: "FRIENDS", type: "RESOURCE_LINK", data: { items: [{ resourceId: "friend" }] } },
            ],
          }),
        ]),
      );
      const valera = plan.nodes.find((n) => n.name === "Valera")!;
      const sampoId = plan.nodes.find((n) => n.name === "Sampo")!.id;
      // Character's template already has "summary" and "friends" fields —
      // the import should land in those, not spawn duplicate custom ones.
      expect(valera.customProperties).toEqual([]);
      expect(valera.properties.summary).toBe("A succubus.");
      expect(valera.properties.friends).toEqual([sampoId]);
    });

    it("queues both the IMAGE property and the banner independently — they're separate slots on a node", () => {
      const plan = buildImportPlan(
        withRoot([
          resource("a", "Page", "A", {
            properties: [{ title: "IMAGE", type: "IMAGE", data: { url: "https://assets.legendkeeper.com/image.png" } }],
            banner: { enabled: true, url: "https://assets.legendkeeper.com/banner.png", yPosition: 30 },
          }),
        ]),
      );
      const nodeId = plan.nodes[0].id;
      expect(plan.pendingImages).toEqual(
        expect.arrayContaining([
          { nodeId, url: "https://assets.legendkeeper.com/image.png", field: "image" },
          { nodeId, url: "https://assets.legendkeeper.com/banner.png", field: "banner" },
        ]),
      );
      expect(plan.nodes[0].bannerFocusY).toBe(30);
    });

    it("queues just the banner when there's no IMAGE property", () => {
      const plan = buildImportPlan(
        withRoot([resource("a", "Page", "A", { banner: { enabled: true, url: "https://assets.legendkeeper.com/banner.png" } })]),
      );
      expect(plan.pendingImages).toEqual([{ nodeId: plan.nodes[0].id, url: "https://assets.legendkeeper.com/banner.png", field: "banner" }]);
    });
  });

  describe("pictures in a page's writing", () => {
    const media = (url: string, attrs: Record<string, unknown> = {}) => ({
      type: "mediaSingle",
      attrs,
      content: [{ type: "media", attrs: { id: "", type: "external", collection: "", url, __external: false } }],
    });

    function planWith(content: unknown[]) {
      return buildImportPlan(withRoot([resource("a", "Page", "A", { documents: [doc("a-main", "Main", "A", content)] })]));
    }

    it("brings a picture in the writing across as an image block, queued for download", () => {
      const plan = planWith([paragraph([text("Before")]), media("https://assets.legendkeeper.com/cat.png"), paragraph([text("After")])]);
      const blocks = plan.nodes[0].tabs[0].content as { id: string; type: string; props: Record<string, unknown> }[];

      expect(blocks.map((b) => b.type)).toEqual(["paragraph", "image", "paragraph"]);
      expect(blocks[1].props.url).toBe("https://assets.legendkeeper.com/cat.png");
      expect(plan.pendingImages).toEqual([
        { nodeId: plan.nodes[0].id, url: "https://assets.legendkeeper.com/cat.png", field: "body", blockId: blocks[1].id },
      ]);
    });

    it("turns LK's percentage width into pixels of our own text column", () => {
      const plan = planWith([media("https://assets.legendkeeper.com/cat.png", { layout: "center", width: 50 })]);
      const block = (plan.nodes[0].tabs[0].content as { props: Record<string, unknown> }[])[0];
      // Half of READING_COLUMN_WIDTH.
      expect(block.props.previewWidth).toBe(440);
      expect(block.props.textAlignment).toBe("center");
    });

    it("leaves the width alone when LK didn't record one, so the picture keeps its own size", () => {
      const plan = planWith([media("https://assets.legendkeeper.com/cat.png")]);
      const block = (plan.nodes[0].tabs[0].content as { props: Record<string, unknown> }[])[0];
      expect("previewWidth" in block.props).toBe(false);
    });

    it("maps LK's wrapping and full-width layouts onto the side they lean towards", () => {
      const plan = planWith([
        media("https://assets.legendkeeper.com/a.png", { layout: "wrap-left" }),
        media("https://assets.legendkeeper.com/b.png", { layout: "align-end" }),
        media("https://assets.legendkeeper.com/c.png", { layout: "full-width" }),
        media("https://assets.legendkeeper.com/d.png", { layout: "something-new" }),
      ]);
      const blocks = plan.nodes[0].tabs[0].content as { props: Record<string, unknown> }[];
      expect(blocks.map((b) => b.props.textAlignment)).toEqual(["left", "right", "center", "center"]);
    });

    it("says so rather than silently dropping a picture the export has no address for", () => {
      const plan = planWith([{ type: "mediaSingle", attrs: {}, content: [{ type: "media", attrs: { id: "", type: "file" } }] }]);
      expect(plan.nodes[0].tabs[0].content).toEqual([]);
      expect(plan.pendingImages).toEqual([]);
      expect(plan.lossyNotes.join(" ")).toMatch(/1 picture .*no address/);
    });

    it("keeps each page's pictures to that page", () => {
      // The collector is shared across the whole walk, so a page that leaked
      // its pictures into the next one would be the obvious way to get this
      // wrong — and the second page would import someone else's portrait.
      const plan = buildImportPlan(
        withRoot([
          resource("a", "First", "A", { documents: [doc("a-main", "Main", "A", [media("https://assets.legendkeeper.com/one.png")])] }),
          resource("b", "Second", "B", { documents: [doc("b-main", "Main", "A", [media("https://assets.legendkeeper.com/two.png")])] }),
        ]),
      );
      const first = plan.nodes.find((n) => n.name === "First")!;
      const second = plan.nodes.find((n) => n.name === "Second")!;
      expect(plan.pendingImages.filter((p) => p.nodeId === first.id).map((p) => p.url)).toEqual(["https://assets.legendkeeper.com/one.png"]);
      expect(plan.pendingImages.filter((p) => p.nodeId === second.id).map((p) => p.url)).toEqual(["https://assets.legendkeeper.com/two.png"]);
    });

    it("finds a picture nested under a list item, not just one at the top level", () => {
      const plan = planWith([
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [paragraph([text("Item")]), media("https://assets.legendkeeper.com/deep.png")] }],
        },
      ]);
      // The list item keeps the paragraph; the picture flattens out beside it,
      // which is what convertListItem does with anything that isn't a
      // paragraph or a nested list.
      expect(plan.pendingImages.map((p) => p.url)).toEqual(["https://assets.legendkeeper.com/deep.png"]);
    });
  });

  describe("applyBodyImage", () => {
    const nodeWith = (content: unknown[]): Node =>
      ({ id: "n", tabs: [{ id: "t", label: "Main", content }] }) as unknown as Node;

    it("points the block it was issued for at the downloaded file", () => {
      const node = nodeWith([
        { id: "one", type: "image", props: { url: "https://assets.legendkeeper.com/a.png" } },
        { id: "two", type: "image", props: { url: "https://assets.legendkeeper.com/b.png" } },
      ]);
      applyBodyImage(node, "two", "9f8c.png");
      const blocks = node.tabs[0].content as { props: { url: string } }[];
      expect(blocks[0].props.url).toBe("https://assets.legendkeeper.com/a.png");
      expect(blocks[1].props.url).toBe("anamnesis-asset:9f8c.png");
    });

    it("reaches a block nested inside another one", () => {
      const node = nodeWith([
        { id: "list", type: "bulletListItem", props: {}, children: [{ id: "deep", type: "image", props: { url: "https://x/y.png" } }] },
      ]);
      applyBodyImage(node, "deep", "9f8c.png");
      const blocks = node.tabs[0].content as { children: { props: { url: string } }[] }[];
      expect(blocks[0].children[0].props.url).toBe("anamnesis-asset:9f8c.png");
    });

    it("leaves the page alone when the block isn't there — a failed download shouldn't damage anything", () => {
      const node = nodeWith([{ id: "one", type: "image", props: { url: "https://x/y.png" } }]);
      applyBodyImage(node, "missing", "9f8c.png");
      expect((node.tabs[0].content as { props: { url: string } }[])[0].props.url).toBe("https://x/y.png");
    });
  });

  describe("hidden pages", () => {
    it("carries LK's page-level isHidden across", () => {
      const plan = buildImportPlan(withRoot([resource("a", "Page", "A", { isHidden: true })]));
      expect(plan.nodes[0].hidden).toBe(true);
    });

    it("leaves the field off entirely for a visible page", () => {
      // So an imported page and one made here are the same file on disk, and
      // `hidden: false` never has to mean anything.
      const plan = buildImportPlan(withRoot([resource("a", "Page", "A")]));
      expect("hidden" in plan.nodes[0]).toBe(false);
    });

    it("is separate from the same flag on a tab", () => {
      // Both exist in LK and mean different things — the page nobody sees, and
      // the tab nobody sees on a page they do. Reading only the second is what
      // this app did until 2026-08-10.
      const plan = buildImportPlan(
        withRoot([resource("a", "Page", "A", { documents: [doc("a-main", "Main", "A", [], { isHidden: true })] })]),
      );
      expect(plan.nodes[0].hidden).toBeUndefined();
      expect(plan.nodes[0].tabs[0].hidden).toBe(true);
    });
  });

  describe("color mapping", () => {
    it("skips LK's white/unset iconColor", () => {
      const plan = buildImportPlan(withRoot([resource("a", "Page", "A", { iconColor: "#FFFFFF" })]));
      expect(plan.nodes[0].color).toBeUndefined();
    });

    it("maps a custom iconColor to the nearest palette key", () => {
      const plan = buildImportPlan(withRoot([resource("a", "Page", "A", { iconColor: "#5eead4" })]));
      expect(plan.nodes[0].color).toBe("teal");
    });
  });

  it("counts inferred templates and total imported resources, counting the home page but not the root as a resource", () => {
    const plan = buildImportPlan(
      withRoot([
        resource("a", "Valera", "A", { documents: [doc("d1", "Overview", "A"), doc("d2", "Backstory", "B")] }),
        resource("b", "Sampo", "B", { documents: [doc("d1", "Overview", "A"), doc("d2", "Backstory", "B")] }),
        resource("c", "Untitled", "C"),
      ]),
    );
    expect(plan.templateCounts).toEqual({ character: 2, note: 2 });
    expect(plan.totalResources).toBe(3);
  });
});
