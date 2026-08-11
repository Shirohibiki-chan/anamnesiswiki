import { beforeEach, describe, expect, it, vi } from "vitest";
// Only the pure path logic is unit-tested here; saveNode is included because
// its length guard runs before it touches disk, and the fs plugin is mocked
// out to nothing so nothing is written either way.
vi.mock("@tauri-apps/api/path", () => ({ sep: () => "/" }));
// Spies rather than bare stubs, because the batch delete/move paths are about
// *which* paths get touched and in what order — that's the whole risk they
// carry, and it's invisible from their return values.
const fsMock = vi.hoisted(() => ({
  mkdir: vi.fn<(path: string, options?: unknown) => Promise<void>>(async () => {}),
  writeTextFile: vi.fn<(path: string, contents: string) => Promise<void>>(async () => {}),
  exists: vi.fn<(path: string) => Promise<boolean>>(async () => false),
  readDir: vi.fn<(path: string) => Promise<unknown[]>>(async () => []),
  readTextFile: vi.fn<(path: string) => Promise<string>>(async () => ""),
  remove: vi.fn<(path: string, options?: unknown) => Promise<void>>(async () => {}),
  rename: vi.fn<(from: string, to: string) => Promise<void>>(async () => {}),
  readFile: vi.fn<(path: string) => Promise<Uint8Array>>(async () => new Uint8Array()),
  writeFile: vi.fn<(path: string, data: Uint8Array) => Promise<void>>(async () => {}),
  watch: vi.fn<(paths: string[], cb: (event: { paths: string[] }) => void, options?: unknown) => Promise<() => void>>(
    async () => () => {},
  ),
}));
vi.mock("@tauri-apps/plugin-fs", () => fsMock);

import {
  addNodes,
  buildPathIndex,
  deleteNodes,
  fileNameFromPath,
  findNodeOnDisk,
  moveNodes,
  PathTooLongError,
  planRelocations,
  resolveNodePath,
  sanitizeSegment,
  saveNode,
  watchCssDirs,
} from "./filesystem-service";
import { FOLDER_TEMPLATE_KEY, type Node } from "../constants/schema";
import { MAX_SEGMENT_CHARS } from "../constants/limits";
import { PROBE_TEMP_PREFIX } from "../constants/paths";

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

// Regression: Windows and macOS default to case-insensitive filesystems, so two
// siblings whose names differ only in case are distinct to us and the same file
// to the OS. Without case-folded collision detection neither got a ` (2)`
// suffix, both resolved to the same path, and the second write silently
// overwrote the first.
describe("case-insensitive sibling collisions", () => {
  it("suffixes a leaf sibling that differs from another only in case", () => {
    const first = node({ id: "1", name: "Ruins", parentId: null, templateKey: "note", createdAt: 1 });
    const second = node({ id: "2", name: "ruins", parentId: null, templateKey: "note", createdAt: 2 });
    const all = [first, second];
    expect(resolveNodePath(first, all).fileName).toBe("Ruins.json");
    expect(resolveNodePath(second, all).fileName).toBe("ruins (2).json");
  });

  it("suffixes a directory-storage sibling that differs only in case", () => {
    const first = node({ id: "1", name: "Foxians", parentId: null, templateKey: "species", createdAt: 1 });
    const second = node({ id: "2", name: "FOXIANS", parentId: null, templateKey: "species", createdAt: 2 });
    const all = [first, second];
    expect(resolveNodePath(first, all).dirSegments).toEqual(["Foxians"]);
    expect(resolveNodePath(second, all).dirSegments).toEqual(["FOXIANS (2)"]);
  });

  it("keeps the node's own capitalisation in the segment it does get", () => {
    // Only the collision *test* folds case — the name on disk still reads the
    // way the user typed it.
    const first = node({ id: "1", name: "ruins", parentId: null, templateKey: "note", createdAt: 1 });
    const second = node({ id: "2", name: "RUINS", parentId: null, templateKey: "note", createdAt: 2 });
    expect(resolveNodePath(first, [first, second]).fileName).toBe("ruins.json");
    expect(resolveNodePath(second, [first, second]).fileName).toBe("RUINS (2).json");
  });

  it("still does not collide a directory node with a same-name leaf differing in case", () => {
    const folder = node({ id: "f", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 1 });
    const page = node({ id: "p", name: "canon", parentId: null, templateKey: "note", createdAt: 2 });
    expect(resolveNodePath(folder, [folder, page]).dirSegments).toEqual(["Canon"]);
    expect(resolveNodePath(page, [folder, page]).fileName).toBe("canon.json");
  });

  it("relocates the case-variant sibling when the first of the pair is renamed", () => {
    const a = node({ id: "a", name: "Ruins", parentId: null, templateKey: "location", createdAt: 1 });
    const b = node({ id: "b", name: "ruins", parentId: null, templateKey: "location", createdAt: 2 });
    const plan = planRelocations([a, b], [{ ...a, name: "Old Ruins" }, b]);
    expect(plan).toContainEqual({ oldSegments: ["ruins (2)"], newSegments: ["ruins"] });
  });
});

// The app used to refuse any path over 200 characters rather than attempt it.
// It doesn't guess any more — the OS decides, and a failure is reported like
// any other failed write, with the length mentioned only when it's plausibly
// the cause. See constants/limits.ts for the measurements behind that.
describe("long paths", () => {
  // A chain of pages, each inside the last, so depth is what runs the path up
  // rather than any one silly name.
  function chain(depth: number, name: string): Node[] {
    return Array.from({ length: depth }, (_, i) =>
      node({ id: `n${i}`, name, parentId: i === 0 ? null : `n${i - 1}`, templateKey: "location" }),
    );
  }

  beforeEach(() => {
    fsMock.writeTextFile.mockReset();
    fsMock.writeTextFile.mockImplementation(async () => {});
    fsMock.remove.mockClear();
  });

  // The user's own project, and the case that made the old limit worth
  // removing: five levels of ordinary page names, refused by this app and by
  // nothing else. Comes to 203 characters.
  it("saves five levels of real page names under a OneDrive project folder", async () => {
    const root = "C:/Users/shiro/OneDrive/Documents/Anamnesis/this is the story of a girl";
    const names = [
      "Locations",
      "who cried a river and drowned the whole world",
      "and while she looked so sad in photographs",
      "i absolutely love her",
    ];
    const nodes = names.map((name, i) =>
      node({ id: `n${i}`, name, parentId: i === 0 ? null : `n${i - 1}`, templateKey: "location" }),
    );
    nodes.push(node({ id: "leaf", name: "Untitled", parentId: "n3", templateKey: "note" }));

    await expect(saveNode(root, nodes[4], nodes)).resolves.toBeUndefined();
  });

  it("attempts a path the app would once have refused, rather than deciding for the OS", async () => {
    const nodes = chain(12, "and while she looked so sad in photographs");
    await expect(saveNode("C:/Projects/World", nodes[11], nodes)).resolves.toBeUndefined();
    expect(fsMock.writeTextFile.mock.calls[0][0].length).toBeGreaterThan(500);
  });

  // Which of the two messages a failure gets is decided by asking the disk,
  // not by assuming. `supportsLongPaths` memoises per project root, so each of
  // these uses a root of its own — otherwise the first answer would be the
  // only one either test ever sees.
  it("blames the machine's setting when the disk won't take a long path either", async () => {
    // The probe writes into its own directory; failing that write is what a
    // machine with long paths switched off looks like.
    fsMock.writeTextFile.mockRejectedValue(new Error("os error 3"));
    const nodes = chain(12, "A Very Long Page Name That Goes On A While");

    const failed = saveNode("C:/Short-Paths-Off", nodes[11], nodes);
    await expect(failed).rejects.toThrow(PathTooLongError);
    await expect(failed).rejects.toThrow(/A Very Long Page/);
    await expect(failed).rejects.toThrow(/is set to stop at 260/);
    await expect(failed).rejects.toThrow(/os error 3/);
  });

  it("says the length may not be the reason when the disk does take long paths", async () => {
    // Everything writes except this one page — so the probe succeeds and the
    // length is a red herring.
    fsMock.writeTextFile.mockRejectedValueOnce(new Error("the file is locked"));
    const nodes = chain(12, "A Very Long Page Name That Goes On A While");

    const failed = saveNode("C:/Long-Paths-On", nodes[11], nodes);
    await expect(failed).rejects.toThrow(PathTooLongError);
    await expect(failed).rejects.toThrow(/may not be the reason/);
    await expect(failed).rejects.toThrow(/the file is locked/);
  });

  it("asks the disk once per project, not once per failed save", async () => {
    fsMock.writeTextFile.mockRejectedValue(new Error("os error 3"));
    const nodes = chain(12, "Another Long Page Name That Goes On A While");
    const probeWrites = () =>
      fsMock.writeTextFile.mock.calls.filter(([path]) => path.includes(PROBE_TEMP_PREFIX)).length;

    await expect(saveNode("C:/Asked-Once", nodes[11], nodes)).rejects.toThrow(PathTooLongError);
    expect(probeWrites()).toBe(1);
    await expect(saveNode("C:/Asked-Once", nodes[10], nodes)).rejects.toThrow(PathTooLongError);
    expect(probeWrites()).toBe(1);
  });

  it("cleans up after the probe, deepest first", async () => {
    fsMock.writeTextFile.mockRejectedValue(new Error("os error 3"));
    const nodes = chain(12, "Yet Another Long Page Name That Goes On");

    await expect(saveNode("C:/Tidied-Up", nodes[11], nodes)).rejects.toThrow(PathTooLongError);

    const removed = fsMock.remove.mock.calls.map(([path]) => path).filter((path) => path.includes(PROBE_TEMP_PREFIX));
    expect(removed).toHaveLength(3);
    expect(removed[0].length).toBeGreaterThan(removed[1].length);
    expect(removed[1].length).toBeGreaterThan(removed[2].length);
    // Never recursive — that flag is what would turn tidying up into deleting
    // whatever happened to be underneath.
    expect(fsMock.remove.mock.calls.every(([, options]) => options === undefined)).toBe(true);
  });

  it("passes a failure on an ordinary path straight through, unembellished", async () => {
    fsMock.writeTextFile.mockRejectedValueOnce(new Error("the disk is full"));
    const ordinary = node({ id: "o", name: "Valera Jiang", parentId: null, templateKey: "character" });

    const failed = saveNode("C:/Projects/World", ordinary, [ordinary]);
    await expect(failed).rejects.toThrow("the disk is full");
    await expect(failed).rejects.not.toThrow(PathTooLongError);
  });

  it("allows an ordinary path through untouched", async () => {
    const ordinary = node({ id: "o", name: "Valera Jiang", parentId: null, templateKey: "character" });
    await expect(saveNode("C:/Projects/World", ordinary, [ordinary])).resolves.toBeUndefined();
  });
});

// A page title is not a filename. The name lives in the node's JSON and the
// tree reads it from there, so the on-disk segment can be shortened without
// the user ever seeing a truncated title — which is the difference between
// "your page saved" and "your page didn't".
describe("long page names", () => {
  it("shortens the filename rather than refusing the page", async () => {
    const essay = node({ id: "e", name: "x".repeat(400), parentId: null, templateKey: "note" });
    await expect(saveNode("C:/Projects/World", essay, [essay])).resolves.toBeUndefined();
  });

  it("keeps the whole name for anything of a sane length", () => {
    const name = "who cried a river and drowned the whole world";
    expect(sanitizeSegment(name)).toBe(name);
  });

  it("never ends a shortened name in a space or a dot", () => {
    // The cut lands mid-word on a name made of two-character units, so the
    // character it stops on is a space.
    expect(sanitizeSegment("ab ".repeat(60)).endsWith(" ")).toBe(false);
  });

  it("cuts by character, so an emoji name can't be split down the middle", () => {
    // Whole moons, not half of one: a UTF-16 slice would end on a lone
    // surrogate, which is not a filename any OS will take.
    expect(sanitizeSegment("🌙".repeat(200))).toBe("🌙".repeat(MAX_SEGMENT_CHARS));
  });

  it("suffixes two long names that shorten to the same thing", () => {
    const shared = "The Very Long Chapter Title That Keeps Going On And On Past Any Reasonable Length For A Filename";
    const a = node({ id: "a", name: `${shared} one`, parentId: null, templateKey: "location", createdAt: 1 });
    const b = node({ id: "b", name: `${shared} two`, parentId: null, templateKey: "location", createdAt: 2 });
    const index = buildPathIndex([a, b]);

    expect(resolveNodePath(a, index).dirSegments).not.toEqual(resolveNodePath(b, index).dirSegments);
  });
});

// Deleting or moving a multi-selection is one operation, not a loop over the
// single-node calls — every relocation renumbers colliding siblings across the
// whole graph, so a second pass would resolve its target against a layout the
// first had already rearranged underneath it. See docs/handoff.md §Storage.
describe("batch delete and move", () => {
  beforeEach(() => {
    fsMock.remove.mockClear();
    fsMock.rename.mockClear();
    fsMock.writeTextFile.mockClear();
  });

  it("resolves every deleted path against the pre-delete layout", async () => {
    const first = node({ id: "1", name: "Ruins", parentId: null, templateKey: "note", createdAt: 1 });
    const second = node({ id: "2", name: "Ruins", parentId: null, templateKey: "note", createdAt: 2 });

    await deleteNodes("/root", [first, second], [first, second], []);

    // Not ["/root/Ruins.json", "/root/Ruins.json"] — which is what resolving
    // the second one against a graph the first had already left would give,
    // deleting one file twice and leaving the other on disk forever.
    expect(fsMock.remove.mock.calls.map((call) => call[0])).toEqual(["/root/Ruins.json", "/root/Ruins (2).json"]);
  });

  it("renumbers a surviving collision sibling once, after the deletes", async () => {
    const first = node({ id: "1", name: "Ruins", parentId: null, templateKey: "note", createdAt: 1 });
    const second = node({ id: "2", name: "Ruins", parentId: null, templateKey: "note", createdAt: 2 });

    await deleteNodes("/root", [first], [first, second], [second]);

    expect(fsMock.remove.mock.calls.map((call) => call[0])).toEqual(["/root/Ruins.json"]);
    // "Ruins (2)" is now the only Ruins, so it takes the unsuffixed name.
    expect(fsMock.rename.mock.calls).toEqual([["/root/Ruins (2).json", "/root/Ruins.json"]]);
  });

  it("moves several nodes into a folder in one pass, rewriting each one's own file", async () => {
    const canon = node({ id: "canon", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const before = [
      canon,
      node({ id: "a", name: "Sampo", parentId: null, templateKey: "note" }),
      node({ id: "b", name: "Valera", parentId: null, templateKey: "note" }),
    ];
    const after = [
      canon,
      node({ id: "a", name: "Sampo", parentId: "canon", templateKey: "note" }),
      node({ id: "b", name: "Valera", parentId: "canon", templateKey: "note" }),
    ];

    await moveNodes("/root", before, after, ["a", "b"]);

    // Two relocations means applyRelocations stages via temp paths first (so a
    // crash mid-shuffle can't leave one node sitting on another's path), hence
    // four renames rather than two — what matters is where they start and end.
    const sources = fsMock.rename.mock.calls.map((call) => call[0]);
    const destinations = fsMock.rename.mock.calls.map((call) => call[1]);
    expect(sources).toContain("/root/Sampo.json");
    expect(sources).toContain("/root/Valera.json");
    expect(destinations).toContain("/root/Canon/Sampo.json");
    expect(destinations).toContain("/root/Canon/Valera.json");
    // Both files rewritten at their new homes — a rename moves the path but
    // leaves the stale parentId inside the file.
    expect(fsMock.writeTextFile.mock.calls.map((call) => call[0])).toEqual([
      "/root/Canon/Sampo.json",
      "/root/Canon/Valera.json",
    ]);
  });
});

describe("watchCssDirs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fsMock.watch.mockImplementation(async () => () => {});
  });

  it("watches the folders that exist and skips the ones that don't", async () => {
    fsMock.exists.mockImplementation(async (path: string) => path === "/p/themes");

    await watchCssDirs(["/p/themes", "/p/snippets"], () => {});

    expect(fsMock.watch.mock.calls[0][0]).toEqual(["/p/themes"]);
  });

  it("refuses when neither folder is there, rather than watching nothing", async () => {
    fsMock.exists.mockImplementation(async () => false);

    await expect(watchCssDirs(["/p/themes", "/p/snippets"], () => {})).rejects.toThrow();
    expect(fsMock.watch).not.toHaveBeenCalled();
  });

  // Non-recursive is load-bearing: `themes/backups` is inside the folder being
  // watched and the app writes to it, so a recursive watch reloads off its own
  // safety copy. Debounced because saving a file is rarely one event.
  it("asks for a debounced, non-recursive watch", async () => {
    fsMock.exists.mockImplementation(async () => true);

    await watchCssDirs(["/p/themes"], () => {});

    expect(fsMock.watch.mock.calls[0][2]).toMatchObject({ recursive: false });
    expect((fsMock.watch.mock.calls[0][2] as { delayMs: number }).delayMs).toBeGreaterThan(0);
  });

  it("reports a stylesheet changing, and ignores an editor's swap files", async () => {
    fsMock.exists.mockImplementation(async () => true);
    const onChange = vi.fn();
    await watchCssDirs(["/p/themes"], onChange);
    const notify = fsMock.watch.mock.calls[0][1];

    notify({ paths: ["/p/themes/Abyssal.css"] });
    expect(onChange).toHaveBeenCalledTimes(1);

    notify({ paths: ["/p/themes/.Abyssal.css.swp", "/p/themes/4913"] });
    notify({ paths: [] });
    expect(onChange).toHaveBeenCalledTimes(1);

    // A rename over the original reports both paths; one of them is the theme.
    notify({ paths: ["/p/themes/Abyssal.css.tmp", "/p/themes/Abyssal.css"] });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("hands back the plugin's own way of stopping", async () => {
    fsMock.exists.mockImplementation(async () => true);
    const stop = vi.fn();
    fsMock.watch.mockImplementation(async () => stop);

    (await watchCssDirs(["/p/themes"], () => {}))();

    expect(stop).toHaveBeenCalled();
  });
});

describe("fileNameFromPath", () => {
  it("takes the last segment, whichever slash the path was built with", () => {
    expect(fileNameFromPath(String.raw`C:\Users\shiro\Downloads\Abyssal.css`)).toBe("Abyssal.css");
    expect(fileNameFromPath("/home/shiro/palettes/charsnap.json")).toBe("charsnap.json");
    // Native pickers on Windows hand back backslashes and the app's own
    // joinPath uses forward slashes, so a path can be either or both.
    expect(fileNameFromPath(String.raw`C:\Projects/Anamnesis\themes/Grove.css`)).toBe("Grove.css");
  });

  it("hands back a bare name unchanged, and an empty string for a trailing slash", () => {
    expect(fileNameFromPath("Abyssal.css")).toBe("Abyssal.css");
    expect(fileNameFromPath("/p/themes/")).toBe("");
  });
});

describe("findNodeOnDisk", () => {
  it("points at a leaf page's own .json file", async () => {
    fsMock.exists.mockImplementation(async () => true);
    const page = node({ id: "1", name: "A Mysterious Letter", parentId: null, templateKey: "note" });

    expect(await findNodeOnDisk("/p", page, [page])).toBe("/p/A Mysterious Letter.json");
  });

  it("points at a directory-storage node's directory, not its _page.json", async () => {
    fsMock.exists.mockImplementation(async () => true);
    const page = node({ id: "1", name: "Valera Jiang", parentId: null, templateKey: "character" });

    // The directory is the unit that moves when the row is dragged, so it's
    // the thing to select in a file manager — showing the metadata file
    // instead would hide the children.
    expect(await findNodeOnDisk("/p", page, [page])).toBe("/p/Valera Jiang");
  });

  it("carries the collision suffix, so the second Valera isn't shown as the first", async () => {
    fsMock.exists.mockImplementation(async () => true);
    const first = node({ id: "1", name: "Valera Jiang", parentId: null, templateKey: "character" });
    const second = node({ id: "2", name: "Valera Jiang", parentId: null, templateKey: "character" });

    expect(await findNodeOnDisk("/p", second, [first, second])).toBe("/p/Valera Jiang (2)");
  });

  it("returns null when nothing is there yet rather than a path that would miss", async () => {
    fsMock.exists.mockImplementation(async () => false);
    const page = node({ id: "1", name: "Brand New", parentId: null, templateKey: "note" });

    expect(await findNodeOnDisk("/p", page, [page])).toBeNull();
  });
});

// The 2026-08-10 change: a leaf-template page grows a directory when it gains
// a child and gives it back when it loses the last one. This is the storage
// layer, and a conversion that plans nothing writes a page over open ground.
describe("storage conversion for pages that gain or lose children", () => {
  const flatNote = node({ id: "n", name: "Magic System", parentId: null, templateKey: "note" });
  const childOfNote = node({ id: "c", name: "Blood Magic", parentId: "n", templateKey: "note" });

  it("resolves a childless note to a flat file, exactly as before", () => {
    expect(resolveNodePath(flatNote, [flatNote])).toEqual({ dirSegments: [], fileName: "Magic System.json" });
  });

  it("resolves the same note to its own directory once something is inside it", () => {
    expect(resolveNodePath(flatNote, [flatNote, childOfNote])).toEqual({
      dirSegments: ["Magic System"],
      fileName: "_page.json",
    });
  });

  it("leaves every template that was already a directory exactly where it was", () => {
    // The reason no existing project has to migrate: a childless character is
    // still `Valera Jiang/_page.json`, not a flat file.
    const character = node({ id: "ch", name: "Valera Jiang", parentId: null, templateKey: "character" });
    expect(resolveNodePath(character, [character])).toEqual({
      dirSegments: ["Valera Jiang"],
      fileName: "_page.json",
    });
  });

  it("plans the move into a directory when the first child arrives", () => {
    const plan = planRelocations([flatNote], [flatNote, childOfNote]);
    expect(plan).toEqual([{ oldSegments: ["Magic System.json"], newSegments: ["Magic System", "_page.json"] }]);
  });

  it("plans the move back out, and prunes the directory it emptied", () => {
    const plan = planRelocations([flatNote, childOfNote], [flatNote]);
    expect(plan).toEqual([
      {
        oldSegments: ["Magic System", "_page.json"],
        newSegments: ["Magic System.json"],
        pruneDir: ["Magic System"],
      },
    ]);
  });

  it("does not prune on the way in — that directory is the destination", () => {
    expect(planRelocations([flatNote], [flatNote, childOfNote])[0].pruneDir).toBeUndefined();
  });

  it("plans a conversion and a rename together as one move", () => {
    const renamed = { ...flatNote, name: "Magic" };
    const plan = planRelocations([flatNote], [renamed, { ...childOfNote }]);
    expect(plan).toEqual([{ oldSegments: ["Magic System.json"], newSegments: ["Magic", "_page.json"] }]);
  });

  it("plans nothing when a note that already had children gains another", () => {
    const second = node({ id: "c2", name: "Rune Magic", parentId: "n", templateKey: "note" });
    expect(planRelocations([flatNote, childOfNote], [flatNote, childOfNote, second])).toEqual([]);
  });

  it("suffixes a converted note against a same-named directory sibling", () => {
    // It was a flat file, which never collided with a directory of the same
    // name. Becoming a directory puts it in the other collision group.
    const folder = node({ id: "f", name: "Magic System", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 1 });
    const note = node({ id: "n2", name: "Magic System", parentId: null, templateKey: "note", createdAt: 2 });
    const child = node({ id: "c3", name: "Inside", parentId: "n2", templateKey: "note" });

    expect(resolveNodePath(note, [folder, note])).toEqual({ dirSegments: [], fileName: "Magic System.json" });
    expect(resolveNodePath(note, [folder, note, child])).toEqual({
      dirSegments: ["Magic System (2)"],
      fileName: "_page.json",
    });
  });

  it("moves a child into the new directory in the same plan as the conversion", () => {
    // Dragging an existing page onto a note: the note converts and the dragged
    // page moves, and both have to be in one plan or they race on disk.
    const stray = node({ id: "s", name: "Blood Magic", parentId: null, templateKey: "note" });
    const adopted = { ...stray, parentId: "n" };
    const plan = planRelocations([flatNote, stray], [flatNote, adopted]);

    expect(plan).toContainEqual({ oldSegments: ["Magic System.json"], newSegments: ["Magic System", "_page.json"] });
    expect(plan).toContainEqual({ oldSegments: ["Blood Magic.json"], newSegments: ["Magic System", "Blood Magic.json"] });
  });
});

// The other way a node's storage shape changes: not by gaining a child, but by
// being told what kind of page it is. Every page is now created blank and given
// a template afterwards from the page itself, so this fires on ordinary use
// rather than as an edge case — see project-store's applyTemplate, which routes
// through relocateNode for exactly this reason.
describe("storage conversion when a blank page is given a template", () => {
  const blank = node({ id: "b", name: "Valera Jiang", parentId: null, templateKey: "blank" });

  it("resolves a blank page to a flat file", () => {
    expect(resolveNodePath(blank, [blank])).toEqual({ dirSegments: [], fileName: "Valera Jiang.json" });
  });

  it("plans the move into a directory when a directory template is applied", () => {
    const asCharacter = { ...blank, templateKey: "character" };
    expect(planRelocations([blank], [asCharacter])).toEqual([
      { oldSegments: ["Valera Jiang.json"], newSegments: ["Valera Jiang", "_page.json"] },
    ]);
  });

  it("plans nothing when the template applied is also a flat one", () => {
    // blank → note changes what the page *is* without changing where it lives,
    // and a plan here would be a rename of a file onto itself.
    expect(planRelocations([blank], [{ ...blank, templateKey: "note" }])).toEqual([]);
  });

  it("plans the move back out when a directory template is replaced by a flat one", () => {
    const asCharacter = { ...blank, templateKey: "character" };
    expect(planRelocations([asCharacter], [{ ...blank, templateKey: "note" }])).toEqual([
      {
        oldSegments: ["Valera Jiang", "_page.json"],
        newSegments: ["Valera Jiang.json"],
        pruneDir: ["Valera Jiang"],
      },
    ]);
  });

  it("plans nothing when the page already had children to hold it in a directory", () => {
    // It was already `Valera Jiang/_page.json` because something is inside it.
    // A flat template can't pull it back out while that's still true.
    const child = node({ id: "c", name: "Her Sword", parentId: "b", templateKey: "note" });
    expect(planRelocations([blank, child], [{ ...blank, templateKey: "note" }, child])).toEqual([]);
  });
});

// The add side of the same coin as the prune block below. Shipped missing on
// 2026-08-10 with the change that made storage shape depend on having children:
// delete and drag ran the relocation planner, creating a page did not, so a
// page's first child was written into a directory its parent's own file had
// never moved into.
describe("adding a node that converts its new parent", () => {
  beforeEach(() => {
    fsMock.rename.mockClear();
    fsMock.writeTextFile.mockClear();
    fsMock.remove.mockImplementation(async () => {});
  });

  const flatNote = node({ id: "n", name: "Magic System", parentId: null, templateKey: "note" });
  const child = node({ id: "c", name: "Blood Magic", parentId: "n", templateKey: "note" });

  it("moves the parent into its own directory", async () => {
    await addNodes("/root", [flatNote, child], [flatNote], [flatNote, child]);

    expect(fsMock.rename).toHaveBeenCalledWith("/root/Magic System.json", "/root/Magic System/_page.json");
  });

  it("writes the child inside that directory, not beside the old flat file", async () => {
    await addNodes("/root", [flatNote, child], [flatNote], [flatNote, child]);

    const written = fsMock.writeTextFile.mock.calls.map(([path]) => path);
    expect(written).toContain("/root/Magic System/Blood Magic.json");
    expect(written).not.toContain("/root/Blood Magic.json");
  });

  it("moves the parent before writing anything, so the child is never written into a directory that is about to be renamed onto", async () => {
    const order: string[] = [];
    fsMock.rename.mockImplementation(async () => void order.push("rename"));
    fsMock.writeTextFile.mockImplementation(async () => void order.push("write"));

    await addNodes("/root", [flatNote, child], [flatNote], [flatNote, child]);

    expect(order[0]).toBe("rename");
    fsMock.rename.mockImplementation(async () => {});
    fsMock.writeTextFile.mockImplementation(async () => {});
  });

  it("renames nothing when the parent was already a directory", async () => {
    // A character is `alwaysDirectory`, so its first child changes nothing
    // about where it lives. The commonest add, and it must stay one write.
    const character = node({ id: "ch", name: "Valera Jiang", parentId: null, templateKey: "character" });
    const sword = node({ id: "s", name: "Her Sword", parentId: "ch", templateKey: "item" });

    await addNodes("/root", [character, sword], [character], [character, sword]);

    expect(fsMock.rename).not.toHaveBeenCalled();
    expect(fsMock.writeTextFile.mock.calls.map(([path]) => path)).toContain("/root/Valera Jiang/Her Sword.json");
  });

  it("renames nothing when the parent already had children", async () => {
    const second = node({ id: "c2", name: "Rune Magic", parentId: "n", templateKey: "note" });

    await addNodes("/root", [flatNote, second], [flatNote, child], [flatNote, child, second]);

    expect(fsMock.rename).not.toHaveBeenCalled();
  });

  it("adds a top-level page without touching anything else", async () => {
    const loose = node({ id: "l", name: "Loose Page", parentId: null, templateKey: "note" });

    await addNodes("/root", [loose], [flatNote], [flatNote, loose]);

    expect(fsMock.rename).not.toHaveBeenCalled();
    expect(fsMock.writeTextFile.mock.calls.map(([path]) => path)).toEqual(["/root/Loose Page.json"]);
  });
});

describe("pruning the directory a converted page leaves behind", () => {
  beforeEach(() => {
    fsMock.remove.mockClear();
    fsMock.rename.mockClear();
    fsMock.remove.mockImplementation(async () => {});
  });

  const note = node({ id: "n", name: "Magic System", parentId: null, templateKey: "note" });
  const child = node({ id: "c", name: "Blood Magic", parentId: "n", templateKey: "note" });

  it("moves the page file back out and removes the emptied directory", async () => {
    await deleteNodes("/root", [child], [note, child], [note]);

    expect(fsMock.rename).toHaveBeenCalledWith("/root/Magic System/_page.json", "/root/Magic System.json");
    expect(fsMock.remove).toHaveBeenCalledWith("/root/Magic System");
  });

  it("removes it non-recursively, so a directory with anything left in it survives", async () => {
    await deleteNodes("/root", [child], [note, child], [note]);

    // The whole safety of the prune is this: `remove` without `recursive`
    // fails on a non-empty directory rather than taking its contents with it.
    const pruneCall = fsMock.remove.mock.calls.find(([path]) => path === "/root/Magic System");
    expect(pruneCall?.[1]).toBeUndefined();
  });

  it("swallows a refused removal rather than failing the delete", async () => {
    fsMock.remove.mockImplementation(async (path: string) => {
      if (path === "/root/Magic System") throw new Error("directory not empty");
    });

    await expect(deleteNodes("/root", [child], [note, child], [note])).resolves.toBeUndefined();
  });
});

describe("reserved root names", () => {
  // Each of these is a name the app has already taken at the project root, so
  // a page wanting it has to be pushed aside. Before this, the page won and
  // the consequences were silent: a root page called "assets" is written to
  // `assets/`, which the load walk skips by name — the page is on disk and
  // gone from the tree. "templates" lands on the template library, because
  // `Templates.json` and `templates.json` are one file on Windows and macOS.
  it("pushes a root page named after the assets directory to (2)", () => {
    const page = node({ id: "1", name: "assets", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    expect(resolveNodePath(page, [page])).toEqual({ dirSegments: ["assets (2)"], fileName: "_folder.json" });
  });

  it("pushes a root page named after project.json to (2)", () => {
    const page = node({ id: "1", name: "project", parentId: null, templateKey: "note" });
    expect(resolveNodePath(page, [page])).toEqual({ dirSegments: [], fileName: "project (2).json" });
  });

  it("pushes a root page named after the template library to (2)", () => {
    const page = node({ id: "1", name: ".templates", parentId: null, templateKey: "note" });
    expect(resolveNodePath(page, [page])).toEqual({ dirSegments: [], fileName: ".templates (2).json" });
  });

  // The collision test folds case, and it has to: the clash is with the
  // filesystem, which folds case too.
  it("catches a differently-cased spelling of a reserved name", () => {
    const page = node({ id: "1", name: "Assets", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    expect(resolveNodePath(page, [page])).toEqual({ dirSegments: ["Assets (2)"], fileName: "_folder.json" });
  });

  // Reserved at the root only. A folder deeper in the tree is free to be
  // called "assets" — nothing of the app's lives there.
  it("leaves a nested page of the same name alone", () => {
    const folder = node({ id: "1", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const page = node({ id: "2", name: "assets", parentId: "1", templateKey: FOLDER_TEMPLATE_KEY });
    expect(resolveNodePath(page, [folder, page])).toEqual({
      dirSegments: ["Canon", "assets"],
      fileName: "_folder.json",
    });
  });

  // A directory-stored page and a leaf page never collide with each other, and
  // that stays true against a reserved name: only `assets/` the directory is
  // taken, so a leaf page called "assets" writes `assets.json` unbothered.
  it("only reserves the storage kind the app actually uses", () => {
    const page = node({ id: "1", name: "assets", parentId: null, templateKey: "note" });
    expect(resolveNodePath(page, [page])).toEqual({ dirSegments: [], fileName: "assets.json" });
  });

  it("numbers real siblings after the reserved name, not from scratch", () => {
    const first = node({ id: "1", name: "assets", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 1 });
    const second = node({ id: "2", name: "assets", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 2 });
    const all = [first, second];
    expect(resolveNodePath(first, all).dirSegments).toEqual(["assets (2)"]);
    expect(resolveNodePath(second, all).dirSegments).toEqual(["assets (3)"]);
  });
});
