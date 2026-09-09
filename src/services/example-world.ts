// Turning the description in `constants/example-world.ts` into a project's
// worth of nodes and canvases. Pure — no disk, no React. The store owns writing
// what comes out of here.
//
// **Two passes, because the world links to itself.** A page's prose points at
// pages further down the list — Start Here links to the storyline, Maren links
// to a scene inside it — and a mention holds the target's id. So every node is
// made first and the writing is filled in second, which also means the
// description can be reordered without quietly breaking a link.
//
// **Everything a template supplies is built here rather than stored.** Tabs,
// the property schema and the sidebar blocks come from `template-registry` at
// build time, the same way `materializeProjectTemplate` does it: a page in this
// world arrives with today's prompts on the tabs nobody wrote into, instead of
// a copy of whatever they said when the world was written.
import {
  EXAMPLE_PAGES,
  EXAMPLE_STORYLINES,
  type ExampleBlock,
  type ExamplePage,
  type ExampleSpan,
} from "../constants/example-world";
import { createNode, type BlockNoteDocument, type Node, type Storyline } from "../constants/schema";
import { seedBlocks } from "./block-service";
import { getDefaultTabs, getPropertySchema } from "./template-registry";

export type BuiltExampleWorld = {
  nodes: Node[];
  rootOrder: string[];
  /** Which pages the tree opens showing the insides of. */
  expandedIds: string[];
  /**
   * The order the pages inside each page are drawn in.
   *
   * Written rather than left to fall out of creation order, which is what
   * `orderSiblings` does when nothing says otherwise — every node here is made
   * in the same millisecond, so that comparison lands on the ids and the tree
   * comes out in a different order every time the world is made. Start Here
   * says Maren is the most written page in this world; she cannot be below
   * Thessaly on one install and above her on the next.
   */
  childOrder: Record<string, string[]>;
  /** The page the world opens on. */
  homeNodeId: string;
  /** One canvas per storyline page, by that page's id. */
  storylines: { pageId: string; storyline: Storyline }[];
};

function inline(spans: ExampleSpan[], idByKey: Map<string, string>, nameByKey: Map<string, string>): unknown[] {
  return spans.map((span) => {
    if (typeof span === "string") return { type: "text", text: span, styles: {} };
    const nodeId = idByKey.get(span.to);
    // A key naming no page is a mistake in the description, and
    // `example-world.test.ts` is what makes sure there isn't one. Rendering the
    // key as plain text rather than dropping the span keeps the sentence around
    // it whole if one ever slips through — a paragraph with a hole in it reads
    // as the app having lost something.
    if (!nodeId) return { type: "text", text: span.to, styles: {} };
    return { type: "mention", props: { nodeId, label: nameByKey.get(span.to) ?? span.to } };
  });
}

/**
 * One block of writing.
 *
 * No `id` on anything, matching the template seeds: BlockNote mints them when
 * the document is first opened, and inventing them here would be a second
 * source of block ids for no gain.
 */
function blockOf(block: ExampleBlock, idByKey: Map<string, string>, nameByKey: Map<string, string>): unknown {
  if (block.kind === "h2") return { type: "heading", props: { level: 2 }, content: [{ type: "text", text: block.text, styles: {} }] };
  const content = inline(block.spans, idByKey, nameByKey);
  switch (block.kind) {
    case "info":
      return { type: "calloutInfo", content };
    case "quote":
      return { type: "calloutQuote", content };
    case "bullet":
      return { type: "bulletListItem", content };
    default:
      return { type: "paragraph", content };
  }
}

function documentOf(blocks: ExampleBlock[], idByKey: Map<string, string>, nameByKey: Map<string, string>): BlockNoteDocument {
  return blocks.map((block) => blockOf(block, idByKey, nameByKey));
}

function refValues(page: ExamplePage, idByKey: Map<string, string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, targets] of Object.entries(page.refs ?? {})) {
    const ids = targets.map((target) => idByKey.get(target)).filter((id): id is string => Boolean(id));
    if (ids.length > 0) out[key] = ids;
  }
  return out;
}

export function buildExampleWorld(): BuiltExampleWorld {
  const idByKey = new Map<string, string>();
  const nameByKey = new Map<string, string>(EXAMPLE_PAGES.map((page) => [page.key, page.name]));
  const nodeByKey = new Map<string, Node>();
  const nodes: Node[] = [];
  const rootOrder: string[] = [];

  for (const page of EXAMPLE_PAGES) {
    const parentId = page.parent === null ? null : (idByKey.get(page.parent) ?? null);
    const node = createNode({
      parentId,
      templateKey: page.templateKey,
      name: page.name,
      tabs: getDefaultTabs(page.templateKey),
      // The sidebar a page of this kind gets when it is made in the app. Left
      // to `createNode`'s default it would be an authored *empty* list and
      // every page here would arrive with a blank panel — the same trap
      // `materializeProjectTemplate` documents.
      blocks: seedBlocks(page.templateKey, getPropertySchema(page.templateKey)),
      tags: page.tags ?? [],
    });
    idByKey.set(page.key, node.id);
    nodeByKey.set(page.key, node);
    nodes.push(node);
    if (parentId === null) rootOrder.push(node.id);
  }

  for (const page of EXAMPLE_PAGES) {
    const node = nodeByKey.get(page.key);
    if (!node) continue;

    node.properties = { ...(page.properties ?? {}), ...refValues(page, idByKey) };

    const written = new Map((page.tabs ?? []).map((tab) => [tab.id, tab.blocks]));
    node.tabs = node.tabs.map((tab) => {
      const blocks = written.get(tab.id);
      return blocks ? { ...tab, content: documentOf(blocks, idByKey, nameByKey) } : tab;
    });

    if (page.view) node.view = page.view;
    if (page.hideTemplatePrompt) node.hideTemplatePrompt = true;
  }

  const storylines = EXAMPLE_STORYLINES.map((described) => {
    const sceneIdByKey = new Map<string, string>();
    const canvasNodes = described.scenes.flatMap((scene) => {
      const pageId = idByKey.get(scene.page);
      if (!pageId) return [];
      const id = crypto.randomUUID();
      sceneIdByKey.set(scene.page, id);
      return [{ id, pageId, x: scene.x, y: scene.y }];
    });

    const storyline: Storyline = {
      version: 1,
      nodes: canvasNodes,
      edges: described.edges.flatMap(([from, to]) => {
        const fromId = sceneIdByKey.get(from);
        const toId = sceneIdByKey.get(to);
        return fromId && toId ? [{ id: crypto.randomUUID(), fromId, toId }] : [];
      }),
      notes: described.notes.map((note) => ({ id: crypto.randomUUID(), ...note })),
      bands: described.bands.map((band) => ({ id: crypto.randomUUID(), ...band })),
    };

    return { pageId: idByKey.get(described.page) ?? "", storyline };
  }).filter((entry) => entry.pageId !== "");

  const childOrder: Record<string, string[]> = {};
  for (const page of EXAMPLE_PAGES) {
    if (page.parent === null) continue;
    const parentId = idByKey.get(page.parent);
    const id = idByKey.get(page.key);
    if (!parentId || !id) continue;
    childOrder[parentId] = [...(childOrder[parentId] ?? []), id];
  }

  // The pages whose insides are worth seeing without being asked for: the two
  // containers Start Here talks about. Not the storyline — its scenes are on
  // its canvas, and listing them in the tree as well is the same night written
  // twice.
  const expandedIds = ["characters", "places"].flatMap((key) => {
    const id = idByKey.get(key);
    return id ? [id] : [];
  });

  return {
    nodes,
    rootOrder,
    childOrder,
    expandedIds,
    homeNodeId: idByKey.get("start") ?? nodes[0]?.id ?? "",
    storylines,
  };
}
