import { describe, expect, it } from "vitest";
import { EXAMPLE_PAGES, EXAMPLE_STORYLINES, type ExampleBlock, type ExampleSpan } from "../constants/example-world";
import { getPropertySchema, getTemplate } from "./template-registry";
import { linkTargets, needsTidying, noteSegments } from "./storyline-service";
import { buildExampleWorld } from "./example-world";

const world = buildExampleWorld();
const byName = new Map(world.nodes.map((node) => [node.name, node]));
const nodesById = Object.fromEntries(world.nodes.map((node) => [node.id, node]));

function spansOf(block: ExampleBlock): ExampleSpan[] {
  return block.kind === "h2" ? [] : block.spans;
}

function allSpans(): ExampleSpan[] {
  return EXAMPLE_PAGES.flatMap((page) => (page.tabs ?? []).flatMap((tab) => tab.blocks.flatMap(spansOf)));
}

function proseOf(node: { tabs: { content: unknown[] }[] }): string {
  const out: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (record.type === "text" && typeof record.text === "string") out.push(record.text);
    walk(record.content);
    walk(record.children);
  };
  node.tabs.forEach((tab) => walk(tab.content));
  return out.join(" ");
}

describe("the example world's description", () => {
  it("names a template that exists on every page", () => {
    for (const page of EXAMPLE_PAGES) {
      expect(getTemplate(page.templateKey), page.key).toBeTruthy();
    }
  });

  it("has a page for every parent, written before its children", () => {
    const seen = new Set<string>();
    for (const page of EXAMPLE_PAGES) {
      if (page.parent !== null) expect(seen.has(page.parent), page.key).toBe(true);
      seen.add(page.key);
    }
  });

  it("gives every page a distinct key and a distinct name", () => {
    expect(new Set(EXAMPLE_PAGES.map((page) => page.key)).size).toBe(EXAMPLE_PAGES.length);
    // Names as well as keys, because a note on a canvas links by name — two
    // pages called the same thing make `[[The Drowned Chapel]]` ambiguous.
    expect(new Set(EXAMPLE_PAGES.map((page) => page.name)).size).toBe(EXAMPLE_PAGES.length);
  });

  it("points every link in the writing at a page that exists", () => {
    const keys = new Set(EXAMPLE_PAGES.map((page) => page.key));
    for (const span of allSpans()) {
      if (typeof span === "string") continue;
      expect(keys.has(span.to), span.to).toBe(true);
    }
  });

  it("writes only into tabs the template actually has", () => {
    for (const page of EXAMPLE_PAGES) {
      const ids = new Set((getTemplate(page.templateKey)?.tabs ?? []).map((tab) => tab.id));
      for (const tab of page.tabs ?? []) {
        expect(ids.has(tab.id), `${page.key}/${tab.id}`).toBe(true);
      }
    }
  });

  it("fills only properties the template actually has", () => {
    for (const page of EXAMPLE_PAGES) {
      const schema = getPropertySchema(page.templateKey);
      const plain = new Set(schema.filter((spec) => spec.type !== "refs").map((spec) => spec.key));
      const refs = new Set(schema.filter((spec) => spec.type === "refs").map((spec) => spec.key));
      for (const key of Object.keys(page.properties ?? {})) expect(plain.has(key), `${page.key}.${key}`).toBe(true);
      for (const key of Object.keys(page.refs ?? {})) expect(refs.has(key), `${page.key}.${key}`).toBe(true);
    }
  });

  it("keeps the interface out of the writing", () => {
    // The rule the phase rests on: this world explains what a world is made
    // of, and the tour explains where things are. Prose here that names a
    // panel or a button is the half that goes stale when a later phase moves
    // something, and it is not allowed to live in this file.
    const forbidden = /\b(click|button|sidebar|toolbar|the rail|menu|tab bar|top right|left-hand)\b/i;
    for (const page of EXAMPLE_PAGES) {
      for (const tab of page.tabs ?? []) {
        for (const block of tab.blocks) {
          const words = block.kind === "h2" ? block.text : spansOf(block).filter((span) => typeof span === "string").join(" ");
          expect(forbidden.test(words), `${page.key}: ${words}`).toBe(false);
        }
      }
    }
  });
});

describe("building the example world", () => {
  it("makes one node per described page, with the tree it described", () => {
    expect(world.nodes).toHaveLength(EXAMPLE_PAGES.length);
    const maren = byName.get("Maren Kell");
    const characters = byName.get("Characters");
    expect(maren?.parentId).toBe(characters?.id);
    expect(world.rootOrder).toHaveLength(EXAMPLE_PAGES.filter((page) => page.parent === null).length);
  });

  it("puts the pages inside a page in the order they were described", () => {
    // Creation order cannot carry this: every node is made in the same
    // millisecond, so `orderSiblings` falls back to comparing ids and the tree
    // would come out differently on every install.
    const characters = byName.get("Characters");
    expect(world.childOrder[characters!.id]).toEqual([byName.get("Maren Kell")?.id, byName.get("Old Thessaly")?.id]);
  });

  it("opens on Start Here", () => {
    expect(world.homeNodeId).toBe(byName.get("Start Here")?.id);
  });

  it("resolves links into mentions of real pages", () => {
    const start = byName.get("Start Here");
    const mentions: string[] = [];
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (!value || typeof value !== "object") return;
      const record = value as Record<string, unknown>;
      if (record.type === "mention") {
        const props = record.props as { nodeId?: string } | undefined;
        if (props?.nodeId) mentions.push(props.nodeId);
      }
      walk(record.content);
    };
    start?.tabs.forEach((tab) => walk(tab.content));

    expect(mentions.length).toBeGreaterThan(3);
    for (const id of mentions) expect(nodesById[id]).toBeTruthy();
    // A key that failed to resolve renders as its own key in plain text rather
    // than vanishing — so the prose would still read, and only this would
    // catch it.
    expect(proseOf(start!)).not.toMatch(/salt-tide|tidewrights/);
  });

  it("turns reference properties into ids", () => {
    const guild = byName.get("The Tidewrights");
    expect(guild?.properties.members).toEqual([byName.get("Maren Kell")?.id, byName.get("Old Thessaly")?.id]);
    expect(guild?.properties.summary).toContain("guild");
  });

  it("leaves a tab nobody wrote into holding its template's prompts", () => {
    // Old Thessaly is deliberately half-finished: her Ties tab is the
    // template's, which is what most pages in most worlds look like.
    const thessaly = byName.get("Old Thessaly");
    const ties = thessaly?.tabs.find((tab) => tab.id === "ties");
    expect(ties?.content.length).toBeGreaterThan(0);
    expect(JSON.stringify(ties?.content)).toContain("Rivals");
  });

  it("gives the pages their template's sidebar rather than an empty one", () => {
    const maren = byName.get("Maren Kell");
    expect(maren?.blocks?.length).toBeGreaterThan(0);
  });

  it("shows Places as a table of what is inside it", () => {
    const places = byName.get("Places");
    expect(places?.view).toEqual({ layout: "table", templateKey: "location", scope: "subpages" });
    // No tabs and the prompt dismissed, so the page *is* the table rather than
    // a table with an unanswered "what kind of page is this?" under it.
    expect(places?.tabs).toHaveLength(0);
    expect(places?.hideTemplatePrompt).toBe(true);
    expect(world.nodes.filter((node) => node.parentId === places?.id)).toHaveLength(2);
  });
});

describe("the example world's storyline", () => {
  const canvas = world.storylines[0];

  it("belongs to the storyline page and holds every scene", () => {
    expect(canvas.pageId).toBe(byName.get("The Salt Tide")?.id);
    expect(canvas.storyline.nodes).toHaveLength(EXAMPLE_STORYLINES[0].scenes.length);
    for (const node of canvas.storyline.nodes) expect(nodesById[node.pageId]).toBeTruthy();
  });

  it("joins scenes that are on it, and forks and rejoins", () => {
    const ids = new Set(canvas.storyline.nodes.map((node) => node.id));
    for (const edge of canvas.storyline.edges) {
      expect(ids.has(edge.fromId)).toBe(true);
      expect(ids.has(edge.toId)).toBe(true);
    }
    const out = canvas.storyline.edges.filter((edge) => edge.fromId === canvas.storyline.nodes[0].id);
    expect(out).toHaveLength(2);
  });

  it("arrives tidy, so nothing is waiting to be pressed", () => {
    expect(needsTidying(canvas.storyline)).toBe(false);
  });

  it("has a note whose wikilink resolves", () => {
    const note = canvas.storyline.notes[0];
    const segments = noteSegments(note.text, nodesById);
    const links = segments.filter((segment) => segment.kind === "link");
    expect(links).toHaveLength(1);
    expect(linkTargets(nodesById).get("the drowned chapel")).toBe(byName.get("The Drowned Chapel")?.id);
  });

  it("labels a stretch of it", () => {
    expect(canvas.storyline.bands[0].label).toBeTruthy();
  });
});
