import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the Tauri fs plugin. Paths are "/"-joined, so the
// fixtures below read the same way the real on-disk layout does (see
// CLAUDE.md §Data on disk).
const files = new Map<string, string>();

vi.mock("@tauri-apps/api/path", () => ({
  join: async (...parts: string[]) => parts.filter(Boolean).join("/"),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: async (path: string) => files.has(path),
  readTextFile: async (path: string) => {
    const content = files.get(path);
    if (content === undefined) throw new Error(`ENOENT: ${path}`);
    return content;
  },
  readDir: async (dirPath: string) => {
    const names = new Set<string>();
    for (const path of files.keys()) {
      if (!path.startsWith(`${dirPath}/`)) continue;
      const rest = path.slice(dirPath.length + 1);
      const [head] = rest.split("/");
      names.add(head);
    }
    return [...names].map((name) => ({
      name,
      isDirectory: !name.endsWith(".json"),
      isFile: name.endsWith(".json"),
      isSymlink: false,
    }));
  },
  mkdir: async () => {},
  remove: async () => {},
  rename: async () => {},
  readFile: async () => new Uint8Array(),
  writeFile: async () => {},
  writeTextFile: async () => {},
}));

const { loadProject } = await import("./filesystem-service");

const ROOT = "/World";

function put(path: string, value: unknown) {
  files.set(`${ROOT}/${path}`, typeof value === "string" ? value : JSON.stringify(value));
}

function nodeJson(id: string, name: string, templateKey: string) {
  return { id, name, templateKey, parentId: null, tabs: [], properties: {}, tags: [], createdAt: 1, updatedAt: 1 };
}

beforeEach(() => {
  files.clear();
  put("project.json", { version: 1, name: "World", rootOrder: [], expandedIds: [], selectedId: null, createdAt: 1 });
});

describe("loadProject", () => {
  it("returns null when there's no project.json", async () => {
    files.clear();
    expect(await loadProject(ROOT)).toBeNull();
  });

  it("returns null when project.json itself is corrupt, rather than throwing", async () => {
    put("project.json", "{ not json");
    expect(await loadProject(ROOT)).toBeNull();
  });

  it("loads leaf pages, nestable pages, and folders", async () => {
    put("Letter.json", nodeJson("letter", "Letter", "note"));
    put("Canon/_folder.json", nodeJson("canon", "Canon", "folder"));
    put("Canon/Valera/_page.json", nodeJson("valera", "Valera", "character"));

    const result = await loadProject(ROOT);
    expect(result!.nodes.map((n) => n.id).sort()).toEqual(["canon", "letter", "valera"]);
    expect(result!.nodes.find((n) => n.id === "valera")!.parentId).toBe("canon");
    expect(result!.skipped).toEqual([]);
  });

  // The point of the change: one bad file must not cost the user everything
  // else in the project.
  it("skips a corrupt leaf page and keeps the rest", async () => {
    put("Good.json", nodeJson("good", "Good", "note"));
    put("Broken.json", "{ truncated mid-wri");

    const result = await loadProject(ROOT);
    expect(result!.nodes.map((n) => n.id)).toEqual(["good"]);
    expect(result!.skipped).toEqual([`${ROOT}/Broken.json`]);
  });

  it("skips a file that parses but isn't shaped like a node", async () => {
    put("Weird.json", { hello: "world" });
    const result = await loadProject(ROOT);
    expect(result!.nodes).toEqual([]);
    expect(result!.skipped).toEqual([`${ROOT}/Weird.json`]);
  });

  // A damaged _folder.json costs that one node, but the pages underneath it
  // are intact files and shouldn't be thrown away with it.
  it("keeps the children of a folder whose own marker file is corrupt", async () => {
    put("Canon/_folder.json", "{ broken");
    put("Canon/Page.json", nodeJson("page", "Page", "note"));

    const result = await loadProject(ROOT);
    expect(result!.nodes.map((n) => n.id)).toEqual(["page"]);
    expect(result!.nodes[0].parentId).toBeNull(); // reparented up a level
    expect(result!.skipped).toEqual([`${ROOT}/Canon/_folder.json`]);
  });

  it("ignores directories with no marker file, like assets/", async () => {
    put("assets/abc.png", "binary-ish");
    put("Letter.json", nodeJson("letter", "Letter", "note"));

    const result = await loadProject(ROOT);
    expect(result!.nodes.map((n) => n.id)).toEqual(["letter"]);
    expect(result!.skipped).toEqual([]);
  });
});
