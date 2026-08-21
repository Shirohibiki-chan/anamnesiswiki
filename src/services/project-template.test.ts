import { describe, expect, it } from "vitest";
import { createNode, FOLDER_TEMPLATE_KEY, type Node } from "../constants/schema";
import { PROJECT_TEMPLATE_FORMAT, type ProjectTemplateFile } from "../constants/project-template";
import { DEFAULT_PROJECT_TEMPLATE } from "../constants/default-project-template";
import {
  buildProjectTemplate,
  materializeProjectTemplate,
  MAX_TEMPLATE_NODES,
  parseProjectTemplate,
  serializeProjectTemplate,
  summarizeTemplate,
} from "./project-template";

// Creation times are handed out in sequence rather than left to `Date.now()`.
// `orderSiblings` falls back to comparing ids when two nodes were made in the
// same millisecond, which every node in a test is — so without this, sibling
// order is whichever UUID happened to sort first.
let clock = 0;

function node(input: { name: string; templateKey: string; parentId?: string | null } & Partial<Node>): Node {
  clock += 1;
  const made = createNode({
    parentId: input.parentId ?? null,
    templateKey: input.templateKey,
    name: input.name,
    tags: input.tags ?? [],
    ...(input.color ? { color: input.color } : {}),
  });
  return { ...made, createdAt: clock, ...(input.hidden ? { hidden: true } : {}) };
}

function folder(name: string, parentId: string | null = null, extra: Partial<Node> = {}): Node {
  return node({ name, templateKey: FOLDER_TEMPLATE_KEY, parentId, ...extra });
}

describe("buildProjectTemplate", () => {
  it("keeps every folder and collapses pages to one starter per kind", () => {
    const characters = folder("Characters");
    const nodes = [
      characters,
      node({ name: "Valera Jiang", templateKey: "character", parentId: characters.id }),
      node({ name: "Ren", templateKey: "character", parentId: characters.id }),
      node({ name: "Ashe", templateKey: "character", parentId: characters.id }),
      node({ name: "A stray thought", templateKey: "note", parentId: characters.id }),
    ];

    const file = buildProjectTemplate({ name: "Mine", description: "", nodes, rootOrder: [characters.id] });

    expect(file.nodes.map((n) => n.name)).toEqual(["Characters", "Character", "Note"]);
    expect(summarizeTemplate(file)).toEqual({ folders: 1, pages: 2 });
  });

  it("collapses per parent, not per project", () => {
    const heroes = folder("Heroes");
    const villains = folder("Villains");
    const nodes = [
      heroes,
      villains,
      node({ name: "Valera", templateKey: "character", parentId: heroes.id }),
      node({ name: "The Hollow Emperor", templateKey: "character", parentId: villains.id }),
    ];

    const file = buildProjectTemplate({
      name: "Mine",
      description: "",
      nodes,
      rootOrder: [heroes.id, villains.id],
    });

    expect(file.nodes.map((n) => n.name)).toEqual(["Heroes", "Character", "Villains", "Character"]);
  });

  it("carries a folder's colour and tags but not a page's", () => {
    const antagonists = folder("Antagonists", null, { color: "rose", tags: ["canon"] });
    const nodes = [
      antagonists,
      node({
        name: "The Hollow Emperor",
        templateKey: "character",
        parentId: antagonists.id,
        color: "amber",
        tags: ["dead", "spoilers"],
      }),
    ];

    const file = buildProjectTemplate({ name: "Mine", description: "", nodes, rootOrder: [antagonists.id] });

    expect(file.nodes[0]).toMatchObject({ name: "Antagonists", color: "rose", tags: ["canon"] });
    expect(file.nodes[1].color).toBeUndefined();
    expect(file.nodes[1].tags).toBeUndefined();
  });

  it("walks into the starter it kept, so nesting habits travel", () => {
    const characters = folder("Characters");
    const valera = node({ name: "Valera Jiang", templateKey: "character", parentId: characters.id });
    const nodes = [
      characters,
      valera,
      node({ name: "Her Sword", templateKey: "item", parentId: valera.id }),
      node({ name: "Ren", templateKey: "character", parentId: characters.id }),
    ];

    const file = buildProjectTemplate({ name: "Mine", description: "", nodes, rootOrder: [characters.id] });

    expect(file.nodes.map((n) => n.name)).toEqual(["Characters", "Character", "Item"]);
    // The Item hangs off the Character, not off Characters.
    expect(file.nodes[2].parentId).toBe(file.nodes[1].id);
  });

  it("leaves hidden pages and everything under them behind", () => {
    const secrets = folder("Secrets", null, { hidden: true });
    const nodes = [
      secrets,
      node({ name: "The twist", templateKey: "note", parentId: secrets.id }),
      folder("Canon"),
    ];

    const file = buildProjectTemplate({ name: "Mine", description: "", nodes, rootOrder: [secrets.id] });

    expect(file.nodes.map((n) => n.name)).toEqual(["Canon"]);
  });

  it("puts parents before their children", () => {
    const canon = folder("Canon");
    const characters = folder("Characters", canon.id);
    const nodes = [
      node({ name: "Valera", templateKey: "character", parentId: characters.id }),
      characters,
      canon,
    ];

    const file = buildProjectTemplate({ name: "Mine", description: "", nodes, rootOrder: [canon.id] });

    const positions = new Map(file.nodes.map((n, index) => [n.id, index]));
    for (const entry of file.nodes) {
      if (entry.parentId === null) continue;
      expect(positions.get(entry.parentId)!).toBeLessThan(positions.get(entry.id)!);
    }
  });

  it("follows the manual sibling order rather than creation order", () => {
    const canon = folder("Canon");
    const aus = folder("AUs");
    const file = buildProjectTemplate({
      name: "Mine",
      description: "",
      nodes: [canon, aus],
      rootOrder: [aus.id, canon.id],
    });

    expect(file.nodes.map((n) => n.name)).toEqual(["AUs", "Canon"]);
  });
});

describe("parseProjectTemplate", () => {
  it("round-trips what buildProjectTemplate wrote", () => {
    const canon = folder("Canon");
    const file = buildProjectTemplate({
      name: "Worldbuilding Starter",
      description: "A shape",
      nodes: [canon, node({ name: "Valera", templateKey: "character", parentId: canon.id })],
      rootOrder: [canon.id],
    });

    const parsed = parseProjectTemplate(serializeProjectTemplate(file));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.name).toBe("Worldbuilding Starter");
    expect(parsed.file.description).toBe("A shape");
    expect(parsed.file.nodes.map((n) => n.name)).toEqual(["Canon", "Character"]);
  });

  it("reads the template the app ships", () => {
    const parsed = parseProjectTemplate(serializeProjectTemplate(DEFAULT_PROJECT_TEMPLATE));
    expect(parsed.ok).toBe(true);
  });

  it("refuses something that isn't JSON at all", () => {
    expect(parseProjectTemplate("not json")).toMatchObject({ ok: false });
  });

  it("refuses a JSON file that isn't one of ours", () => {
    const parsed = parseProjectTemplate(JSON.stringify({ version: 1, nodes: [] }));
    expect(parsed).toMatchObject({ ok: false });
    if (parsed.ok) return;
    expect(parsed.error).toContain("isn't an Anamnesis project template");
  });

  it("refuses a file from a newer build rather than guessing at it", () => {
    const parsed = parseProjectTemplate(
      JSON.stringify({ format: PROJECT_TEMPLATE_FORMAT, version: 99, name: "x", nodes: [] }),
    );
    expect(parsed).toMatchObject({ ok: false });
    if (parsed.ok) return;
    expect(parsed.error).toContain("newer version");
  });

  it("refuses a file describing more than the cap", () => {
    const nodes = Array.from({ length: MAX_TEMPLATE_NODES + 1 }, (_, index) => ({
      id: `n${index}`,
      parentId: null,
      templateKey: "folder",
      name: `Folder ${index}`,
    }));
    const parsed = parseProjectTemplate(
      JSON.stringify({ format: PROJECT_TEMPLATE_FORMAT, version: 1, name: "Huge", nodes }),
    );
    expect(parsed).toMatchObject({ ok: false });
  });

  it("refuses an empty one, and skips entries it can't read", () => {
    const parsed = parseProjectTemplate(
      JSON.stringify({ format: PROJECT_TEMPLATE_FORMAT, version: 1, name: "x", nodes: [{ id: 1 }, "nope"] }),
    );
    expect(parsed).toMatchObject({ ok: false });
    if (parsed.ok) return;
    expect(parsed.error).toContain("empty");
  });
});

describe("materializeProjectTemplate", () => {
  const file: ProjectTemplateFile = DEFAULT_PROJECT_TEMPLATE;

  it("mints fresh ids, so two projects from one template share none", () => {
    const first = materializeProjectTemplate(file);
    const second = materializeProjectTemplate(file);

    const firstIds = new Set(first.nodes.map((n) => n.id));
    for (const made of second.nodes) expect(firstIds.has(made.id)).toBe(false);
    // And none of the file's own ids leak through.
    for (const made of first.nodes) expect(file.nodes.some((entry) => entry.id === made.id)).toBe(false);
  });

  it("rebuilds the parent wiring against the new ids", () => {
    const { nodes } = materializeProjectTemplate(file);
    const byId = new Map(nodes.map((n) => [n.id, n]));

    const characters = nodes.find((n) => n.name === "Characters")!;
    const character = nodes.find((n) => n.name === "Character")!;
    expect(character.parentId).toBe(characters.id);
    expect(byId.get(characters.parentId!)!.name).toBe("Canon");
  });

  it("lists exactly the roots, in file order", () => {
    const { nodes, rootOrder } = materializeProjectTemplate(file);
    const roots = nodes.filter((n) => n.parentId === null);
    expect(rootOrder).toEqual(roots.map((n) => n.id));
    expect(roots.map((n) => n.name)).toEqual(["Canon", "AUs", "Worldbuilding"]);
  });

  it("seeds pages from the registry rather than from the file", () => {
    const { nodes } = materializeProjectTemplate(file);
    const character = nodes.find((n) => n.name === "Character")!;
    expect(character.tabs.map((tab) => tab.label)).toContain("Overview");
    expect(nodes.find((n) => n.name === "Canon")!.tabs).toEqual([]);
  });

  it("turns an unknown template key into a blank page rather than an empty one", () => {
    const { nodes } = materializeProjectTemplate({
      ...file,
      nodes: [{ id: "a", parentId: null, templateKey: "spaceship", name: "Ship" }],
    });
    expect(nodes[0].templateKey).toBe("blank");
    expect(nodes[0].name).toBe("Ship");
  });

  it("makes a root of a child whose parent it never saw, instead of dropping or hanging", () => {
    const { nodes, rootOrder } = materializeProjectTemplate({
      ...file,
      nodes: [
        { id: "a", parentId: "b", templateKey: "folder", name: "Orphan" },
        { id: "b", parentId: "a", templateKey: "folder", name: "Cycle" },
      ],
    });
    expect(nodes.map((n) => n.name)).toEqual(["Orphan", "Cycle"]);
    expect(rootOrder).toEqual([nodes[0].id]);
    expect(nodes[1].parentId).toBe(nodes[0].id);
  });

  it("names an entry that arrived with a blank name", () => {
    const { nodes } = materializeProjectTemplate({
      ...file,
      nodes: [{ id: "a", parentId: null, templateKey: "folder", name: "   " }],
    });
    expect(nodes[0].name).toBe("Untitled");
  });
});
