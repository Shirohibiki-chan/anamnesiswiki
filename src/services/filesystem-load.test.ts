import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the Tauri fs plugin. Paths are "/"-joined, so the
// fixtures below read the same way the real on-disk layout does (see
// CLAUDE.md §Data on disk).
const files = new Map<string, string>();

// Counts the round trips a load makes into the fs plugin. Each one is real IPC
// into Rust in the running app, so "how many" is the thing worth asserting on.
const calls = { readDir: 0, exists: 0, readTextFile: 0 };

// The real `sep()` reads a value the Tauri runtime injects into the webview,
// which doesn't exist here. "/" keeps the in-memory paths below readable.
vi.mock("@tauri-apps/api/path", () => ({
  sep: () => "/",
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: async (path: string) => {
    calls.exists += 1;
    return files.has(path);
  },
  readTextFile: async (path: string) => {
    calls.readTextFile += 1;
    const content = files.get(path);
    if (content === undefined) throw new Error(`ENOENT: ${path}`);
    return content;
  },
  readDir: async (dirPath: string) => {
    calls.readDir += 1;
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
  calls.readDir = 0;
  calls.exists = 0;
  calls.readTextFile = 0;
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

// Every one of these is real IPC into Rust in the running app, and they're what
// the user waits through when opening a project. The counts are asserted
// exactly, not as an upper bound, so a change that quietly reintroduces a probe
// per folder fails here rather than just making startup slower.
describe("loadProject disk round trips", () => {
  beforeEach(() => {
    put("Canon/_folder.json", nodeJson("canon", "Canon", "folder"));
    put("Canon/Story.json", nodeJson("story", "Story", "note"));
    put("AUs/_folder.json", nodeJson("aus", "AUs", "folder"));
    put("AUs/Valera/_page.json", nodeJson("valera", "Valera", "character"));
    put("assets/portrait.png", "binary-ish");
  });

  it("lists each directory exactly once", async () => {
    await loadProject(ROOT);
    // root, Canon/, AUs/, AUs/Valera/, assets/ — five directories, five reads.
    expect(calls.readDir).toBe(5);
  });

  it("never probes for a marker file separately from listing its directory", async () => {
    await loadProject(ROOT);
    // The one permitted `exists` is loadProject's own check for project.json,
    // which has to happen before there's a directory listing to consult.
    expect(calls.exists).toBe(1);
  });

  it("reads each node's JSON exactly once", async () => {
    await loadProject(ROOT);
    // project.json + four node files. The image is never opened.
    expect(calls.readTextFile).toBe(5);
  });

  it("still finds every node while making those reads", async () => {
    const result = await loadProject(ROOT);
    expect(result!.nodes.map((n) => n.id).sort()).toEqual(["aus", "canon", "story", "valera"]);
  });
});
