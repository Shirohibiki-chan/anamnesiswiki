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
  buildPathIndex,
  deleteNodes,
  fileNameFromPath,
  moveNodes,
  PathTooLongError,
  planRelocations,
  resolveNodePath,
  saveNode,
  watchCssDirs,
} from "./filesystem-service";
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

// Regression: Windows' default MAX_PATH is 260 characters. A write over that
// limit fails at the OS, and before the save-error channel existed it failed
// silently — so the check is here, in front of the write, with a message that
// says which page and what to do about it.
describe("path length guard", () => {
  it("refuses to save a node whose resolved path exceeds the limit", async () => {
    const deep = node({ id: "d", name: "x".repeat(150), parentId: null, templateKey: "note" });
    await expect(saveNode("C:/Users/shiro/Documents/Anamnesis/Valeraverse", deep, [deep])).rejects.toThrow(
      PathTooLongError,
    );
  });

  it("names the page in the error, since the path itself is unreadable at that length", async () => {
    const deep = node({ id: "d", name: `A Very Long Page ${"y".repeat(200)}`, parentId: null, templateKey: "note" });
    await expect(saveNode("C:/Projects/World", deep, [deep])).rejects.toThrow(/A Very Long Page/);
  });

  it("allows an ordinary path through untouched", async () => {
    const ordinary = node({ id: "o", name: "Valera Jiang", parentId: null, templateKey: "character" });
    await expect(saveNode("C:/Projects/World", ordinary, [ordinary])).resolves.toBeUndefined();
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
