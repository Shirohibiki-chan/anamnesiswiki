import { describe, expect, it } from "vitest";
import { buildPathIndex, planRelocations, resolveNodePath } from "./filesystem-service";
import { FOLDER_TEMPLATE_KEY, type Node } from "../constants/schema";

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

describe("resolveNodePath", () => {
  it("resolves a root-level leaf page (item/event/note) to a bare .json file", () => {
    const page = node({ id: "1", name: "A Mysterious Letter", parentId: null, templateKey: "note" });
    expect(resolveNodePath(page, [page])).toEqual({ dirSegments: [], fileName: "A Mysterious Letter.json" });
  });

  it("resolves a root-level nestable page (character/location/faction/species) to its own directory + _page.json", () => {
    const page = node({ id: "1", name: "Valera Jiang", parentId: null, templateKey: "character" });
    expect(resolveNodePath(page, [page])).toEqual({ dirSegments: ["Valera Jiang"], fileName: "_page.json" });
  });

  it("resolves a root-level folder to its own directory + _folder.json", () => {
    const folder = node({ id: "1", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    expect(resolveNodePath(folder, [folder])).toEqual({ dirSegments: ["Canon"], fileName: "_folder.json" });
  });

  it("nests a leaf page inside ancestor folder directories", () => {
    const aus = node({ id: "aus", name: "AUs", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const demonic = node({ id: "demonic", name: "Demonic AU", parentId: "aus", templateKey: FOLDER_TEMPLATE_KEY });
    const page = node({ id: "page", name: "A Mysterious Letter", parentId: "demonic", templateKey: "note" });
    const all = [aus, demonic, page];
    expect(resolveNodePath(page, all)).toEqual({
      dirSegments: ["AUs", "Demonic AU"],
      fileName: "A Mysterious Letter.json",
    });
  });

  it("nests a nestable page inside ancestor folder directories, giving it its own directory too", () => {
    const aus = node({ id: "aus", name: "AUs", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const demonic = node({ id: "demonic", name: "Demonic AU", parentId: "aus", templateKey: FOLDER_TEMPLATE_KEY });
    const page = node({ id: "page", name: "Valera Jiang", parentId: "demonic", templateKey: "character" });
    const all = [aus, demonic, page];
    expect(resolveNodePath(page, all)).toEqual({
      dirSegments: ["AUs", "Demonic AU", "Valera Jiang"],
      fileName: "_page.json",
    });
  });

  it("nests a folder inside ancestor folder directories", () => {
    const aus = node({ id: "aus", name: "AUs", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const demonic = node({ id: "demonic", name: "Demonic AU", parentId: "aus", templateKey: FOLDER_TEMPLATE_KEY });
    const all = [aus, demonic];
    expect(resolveNodePath(demonic, all)).toEqual({
      dirSegments: ["AUs", "Demonic AU"],
      fileName: "_folder.json",
    });
  });

  it("nests a page under a nestable page's own directory (a character's own items/sub-pages)", () => {
    const character = node({ id: "char", name: "Valera Jiang", parentId: null, templateKey: "character" });
    const item = node({ id: "item", name: "Her Sword", parentId: "char", templateKey: "item" });
    const all = [character, item];
    expect(resolveNodePath(item, all)).toEqual({
      dirSegments: ["Valera Jiang"],
      fileName: "Her Sword.json",
    });
  });

  it("suffixes the second same-named leaf sibling on its filename, ordered by creation time", () => {
    const first = node({ id: "1", name: "Untitled Note", parentId: null, templateKey: "note", createdAt: 1 });
    const second = node({ id: "2", name: "Untitled Note", parentId: null, templateKey: "note", createdAt: 2 });
    const all = [first, second];
    expect(resolveNodePath(first, all).fileName).toBe("Untitled Note.json");
    expect(resolveNodePath(second, all).fileName).toBe("Untitled Note (2).json");
  });

  it("suffixes the second same-named nestable-page sibling on its directory, ordered by creation time", () => {
    const first = node({ id: "1", name: "Sampo Koski", parentId: null, templateKey: "character", createdAt: 1 });
    const second = node({ id: "2", name: "Sampo Koski", parentId: null, templateKey: "character", createdAt: 2 });
    const all = [first, second];
    expect(resolveNodePath(first, all)).toEqual({ dirSegments: ["Sampo Koski"], fileName: "_page.json" });
    expect(resolveNodePath(second, all)).toEqual({ dirSegments: ["Sampo Koski (2)"], fileName: "_page.json" });
  });

  it("does not collide a folder and a same-named leaf page, since one's a directory and the other's a plain file", () => {
    const folder = node({ id: "f", name: "Foxians", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 1 });
    const page = node({ id: "p", name: "Foxians", parentId: null, templateKey: "note", createdAt: 2 });
    const all = [folder, page];
    expect(resolveNodePath(folder, all)).toEqual({ dirSegments: ["Foxians"], fileName: "_folder.json" });
    expect(resolveNodePath(page, all)).toEqual({ dirSegments: [], fileName: "Foxians.json" });
  });

  it("collides a folder and a same-named nestable page, since both are directories", () => {
    const folder = node({ id: "f", name: "Foxians", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 1 });
    const page = node({ id: "p", name: "Foxians", parentId: null, templateKey: "species", createdAt: 2 });
    const all = [folder, page];
    expect(resolveNodePath(folder, all)).toEqual({ dirSegments: ["Foxians"], fileName: "_folder.json" });
    expect(resolveNodePath(page, all)).toEqual({ dirSegments: ["Foxians (2)"], fileName: "_page.json" });
  });

  it("sanitizes filesystem-illegal characters out of the segment name", () => {
    const page = node({ id: "1", name: 'Who Is "Them"? / A Mystery', parentId: null, templateKey: "note" });
    expect(resolveNodePath(page, [page]).fileName).toBe("Who Is _Them__ _ A Mystery.json");
  });
});

// Regression: renaming, moving, or deleting one of several same-name siblings
// renumbers the ` (2)`/` (3)` suffixes on the others. Those siblings didn't
// change, but their resolved path did — and if disk isn't brought in line, the
// next write to one lands at its new computed path while its real directory
// stays at the old one, leaving two directories holding the same node id.
describe("planRelocations", () => {
  const dir = (id: string, name: string, createdAt: number, parentId: string | null = null) =>
    node({ id, name, parentId, templateKey: "location", createdAt });

  it("is empty when nothing moved", () => {
    const a = dir("a", "Ruins", 1);
    expect(planRelocations([a], [a])).toEqual([]);
  });

  it("relocates the renamed node itself", () => {
    const a = dir("a", "Ruins", 1);
    const renamed = { ...a, name: "Old Ruins" };
    expect(planRelocations([a], [renamed])).toEqual([{ oldSegments: ["Ruins"], newSegments: ["Old Ruins"] }]);
  });

  it("also relocates the sibling that loses its suffix when the first is renamed", () => {
    const a = dir("a", "Ruins", 1);
    const b = dir("b", "Ruins", 2);
    const plan = planRelocations([a, b], [{ ...a, name: "Old Ruins" }, b]);
    expect(plan).toContainEqual({ oldSegments: ["Ruins"], newSegments: ["Old Ruins"] });
    expect(plan).toContainEqual({ oldSegments: ["Ruins (2)"], newSegments: ["Ruins"] });
  });

  it("renumbers every following sibling, not just the next one", () => {
    const a = dir("a", "Ruins", 1);
    const b = dir("b", "Ruins", 2);
    const c = dir("c", "Ruins", 3);
    const plan = planRelocations([a, b, c], [b, c]); // a deleted
    expect(plan).toEqual([
      { oldSegments: ["Ruins (2)"], newSegments: ["Ruins"] },
      { oldSegments: ["Ruins (3)"], newSegments: ["Ruins (2)"] },
    ]);
  });

  it("suffixes an existing sibling when a rename creates a new collision ahead of it", () => {
    const older = dir("older", "Keep", 1);
    const newer = dir("newer", "Ruins", 2);
    // "Keep" is renamed to "Ruins"; it was created first, so it takes the bare
    // name and the existing "Ruins" gets pushed to "Ruins (2)".
    const plan = planRelocations([older, newer], [{ ...older, name: "Ruins" }, newer]);
    expect(plan).toContainEqual({ oldSegments: ["Keep"], newSegments: ["Ruins"] });
    expect(plan).toContainEqual({ oldSegments: ["Ruins"], newSegments: ["Ruins (2)"] });
  });

  it("ignores same-name siblings that don't share a storage kind", () => {
    const page = dir("page", "Ruins", 1);
    const leaf = node({ id: "leaf", name: "Ruins", parentId: null, templateKey: "note", createdAt: 2 });
    // One is a directory, the other a bare .json — they never collided, so
    // renaming the directory must not disturb the file.
    const plan = planRelocations([page, leaf], [{ ...page, name: "Old Ruins" }, leaf]);
    expect(plan).toEqual([{ oldSegments: ["Ruins"], newSegments: ["Old Ruins"] }]);
  });

  it("relocates same-name leaf siblings too", () => {
    const a = node({ id: "a", name: "Letter", parentId: null, templateKey: "note", createdAt: 1 });
    const b = node({ id: "b", name: "Letter", parentId: null, templateKey: "note", createdAt: 2 });
    const plan = planRelocations([a, b], [b]); // a deleted
    expect(plan).toEqual([{ oldSegments: ["Letter (2).json"], newSegments: ["Letter.json"] }]);
  });

  it("does not relocate descendants that ride along with their parent's directory", () => {
    const parent = dir("parent", "Ruins", 1);
    const child = node({ id: "child", name: "Notes", parentId: "parent", templateKey: "note", createdAt: 2 });
    const plan = planRelocations([parent, child], [{ ...parent, name: "Old Ruins" }, child]);
    expect(plan).toEqual([{ oldSegments: ["Ruins"], newSegments: ["Old Ruins"] }]);
  });

  it("handles a move out of a folder renumbering the siblings left behind", () => {
    const folder = node({ id: "f", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 0 });
    const a = dir("a", "Ruins", 1, "f");
    const b = dir("b", "Ruins", 2, "f");
    const plan = planRelocations([folder, a, b], [folder, { ...a, parentId: null }, b]);
    expect(plan).toContainEqual({ oldSegments: ["Canon", "Ruins"], newSegments: ["Ruins"] });
    expect(plan).toContainEqual({ oldSegments: ["Canon", "Ruins (2)"], newSegments: ["Canon", "Ruins"] });
  });
});

// resolveNodePath accepts either a raw node array or a prebuilt index. The two
// must agree exactly — the array form is what most call sites use, the index
// form is what the batch paths use, and a disagreement between them would mean
// a node written to one location and looked for at another.
describe("buildPathIndex", () => {
  const aus = node({ id: "aus", name: "AUs", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 1 });
  const valera = node({ id: "v", name: "Valera Jiang", parentId: "aus", templateKey: "character", createdAt: 2 });
  const sampoA = node({ id: "sa", name: "Sampo Koski", parentId: "aus", templateKey: "character", createdAt: 3 });
  const sampoB = node({ id: "sb", name: "Sampo Koski", parentId: "aus", templateKey: "character", createdAt: 4 });
  const sampoNote = node({ id: "sn", name: "Sampo Koski", parentId: "aus", templateKey: "note", createdAt: 5 });
  const letter = node({ id: "l", name: "A Letter", parentId: "v", templateKey: "note", createdAt: 6 });
  const world = [aus, valera, sampoA, sampoB, sampoNote, letter];

  it("resolves every node identically whether given a raw array or a prebuilt index", () => {
    const index = buildPathIndex(world);
    for (const n of world) {
      expect(resolveNodePath(n, index)).toEqual(resolveNodePath(n, world));
    }
  });

  it("assigns collision suffixes by creation order, not array order", () => {
    const shuffled = [letter, sampoB, aus, sampoNote, sampoA, valera];
    const index = buildPathIndex(shuffled);
    expect(resolveNodePath(sampoA, index).dirSegments).toEqual(["AUs", "Sampo Koski"]);
    expect(resolveNodePath(sampoB, index).dirSegments).toEqual(["AUs", "Sampo Koski (2)"]);
  });

  it("does not count a leaf page as colliding with a same-name directory page", () => {
    // One is a directory, the other a plain .json — they coexist, so the note
    // keeps the bare name rather than being suffixed into third place.
    expect(resolveNodePath(sampoNote, buildPathIndex(world)).fileName).toBe("Sampo Koski.json");
  });

  it("falls back to the plain sanitized name for a node missing from the index", () => {
    const orphan = node({ id: "orphan", name: "Not Indexed", parentId: null, templateKey: "note" });
    expect(resolveNodePath(orphan, buildPathIndex(world)).fileName).toBe("Not Indexed.json");
  });

  it("resolves an ancestor chain through the index rather than the passed node", () => {
    expect(resolveNodePath(letter, buildPathIndex(world))).toEqual({
      dirSegments: ["AUs", "Valera Jiang"],
      fileName: "A Letter.json",
    });
  });
});
