import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the Tauri fs plugin. Paths are "/"-joined, so the
// fixtures below read the same way the real on-disk layout does (see
// CLAUDE.md §Data on disk).
const files = new Map<string, string>();

// Counts the round trips a load makes into the fs plugin. Each one is real IPC
// into Rust in the running app, so "how many" is the thing worth asserting on.
const calls = { readDir: 0, exists: 0, readTextFile: 0 };
const renames: [string, string][] = [];

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
    // A name is a directory when some other path continues through it, not
    // when it merely lacks an extension — plenty of real entries have no
    // suffix (a move's temp file, an image), and guessing by extension made
    // this mock disagree with the disk about exactly those.
    return [...names].map((name) => {
      const isDirectory = [...files.keys()].some((path) => path.startsWith(`${dirPath}/${name}/`));
      return { name, isDirectory, isFile: !isDirectory, isSymlink: false };
    });
  },
  mkdir: async () => {},
  remove: async () => {},
  rename: async (from: string, to: string) => {
    renames.push([from, to]);
  },
  readFile: async () => new Uint8Array(),
  writeFile: async () => {},
  writeTextFile: async () => {},
}));

const { loadProject } = await import("./filesystem-service");
const { MOVE_TEMP_PREFIX } = await import("../constants/paths");

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
  renames.length = 0;
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

  // Every test in this block is a way the user actually lost pages on
  // 2026-07-31. None of these were failures of writing — the files were on
  // disk the whole time, and the loader walked straight past them.
  describe("recovering pages the loader used to walk past", () => {
    // A marker-less directory with nothing claiming it is still walked, and
    // its contents come up a level rather than vanishing. Returning early on
    // such a directory is what took an entire subtree with it.
    it("keeps the contents of an unclaimed marker-less directory, reparented up a level", async () => {
      put("Leftover/Xuehua/_page.json", nodeJson("xh", "Xuehua", "character"));

      const result = await loadProject(ROOT);
      expect(result!.nodes.map((n) => n.id)).toEqual(["xh"]);
      expect(result!.nodes[0].parentId).toBeNull();
      expect(result!.skipped).toEqual([]);
      expect(renames).toEqual([]);
    });

    // The state a page gaining its first child used to leave behind: the child
    // written into `Name/`, the page's own file still flat beside it. Hoisting
    // the child up a level loads everything but shows the user a tree they
    // didn't build, so the two halves are put back together instead.
    describe("a page whose own file was left outside the directory holding its children", () => {
      beforeEach(() => {
        put("Valera Jiang.json", nodeJson("vj", "Valera Jiang", "note"));
        put("Valera Jiang/Xuehua/_page.json", nodeJson("xh", "Xuehua", "character"));
      });

      it("nests the children under it rather than hoisting them out", async () => {
        const result = await loadProject(ROOT);
        expect(result!.nodes.map((n) => n.id).sort()).toEqual(["vj", "xh"]);
        expect(result!.nodes.find((n) => n.id === "xh")!.parentId).toBe("vj");
        expect(result!.skipped).toEqual([]);
      });

      it("moves the flat file into the directory, so the repair holds", async () => {
        const result = await loadProject(ROOT);
        expect(renames).toEqual([[`${ROOT}/Valera Jiang.json`, `${ROOT}/Valera Jiang/_page.json`]]);
        expect(result!.reunited).toEqual(["Valera Jiang"]);
      });

      // Reading it twice would put the same id in the graph twice.
      it("reads the flat file once, not once per branch that could claim it", async () => {
        await loadProject(ROOT);
        // project.json, the flat file, the page inside it.
        expect(calls.readTextFile).toBe(3);
      });
    });

    // Only the directory can say the flat file belongs inside it, and an empty
    // one says nothing. Someone can make a folder by hand in Explorer next to
    // a page of the same name, and moving their page into it on that evidence
    // would be the app inventing structure.
    it("leaves a page alone when the directory beside it holds nothing", async () => {
      put("Valera Jiang.json", nodeJson("vj", "Valera Jiang", "note"));
      put("Valera Jiang/notes.txt", "hand-written");

      const result = await loadProject(ROOT);
      expect(result!.nodes.map((n) => n.id)).toEqual(["vj"]);
      expect(renames).toEqual([]);
      expect(result!.reunited).toEqual([]);
    });

    // Legal, and not the broken state: a directory-storage node and a leaf
    // page never collide on disk, so neither gets a numbered suffix and two
    // unrelated nodes can share a name.
    it("keeps a marker-carrying directory and a same-named file as two nodes", async () => {
      put("Valera.json", nodeJson("leaf", "Valera", "note"));
      put("Valera/_page.json", nodeJson("dir", "Valera", "character"));
      put("Valera/Sword.json", nodeJson("sword", "Her Sword", "item"));

      const result = await loadProject(ROOT);
      expect(result!.nodes.map((n) => n.id).sort()).toEqual(["dir", "leaf", "sword"]);
      expect(result!.nodes.find((n) => n.id === "leaf")!.parentId).toBeNull();
      expect(result!.nodes.find((n) => n.id === "sword")!.parentId).toBe("dir");
      expect(renames).toEqual([]);
    });

    // An interrupted move leaves nodes parked under a temp name. A file parked
    // that way has no .json suffix, so the extension check skipped it and the
    // page was simply gone.
    it("loads a page stranded under a move's temp name, and puts it back", async () => {
      put(`Canon/_folder.json`, nodeJson("canon", "Canon", "folder"));
      put(`Canon/${MOVE_TEMP_PREFIX}abc123`, nodeJson("lost", "New Blank", "blank"));

      const result = await loadProject(ROOT);
      expect(result!.nodes.map((n) => n.id).sort()).toEqual(["canon", "lost"]);
      expect(result!.recoveredCount).toBe(1);
      expect(renames).toEqual([[`${ROOT}/Canon/${MOVE_TEMP_PREFIX}abc123`, `${ROOT}/Canon/New Blank.json`]]);
    });

    it("puts a stranded directory back by renaming it, so its children come too", async () => {
      put(`${MOVE_TEMP_PREFIX}def456/_folder.json`, nodeJson("aus", "AUs", "folder"));
      put(`${MOVE_TEMP_PREFIX}def456/Inside.json`, nodeJson("inside", "Inside", "note"));

      const result = await loadProject(ROOT);
      expect(result!.nodes.map((n) => n.id).sort()).toEqual(["aus", "inside"]);
      expect(result!.recoveredCount).toBe(1);
      // A rename, never a save-then-delete: the children are inside it.
      expect(renames).toEqual([[`${ROOT}/${MOVE_TEMP_PREFIX}def456`, `${ROOT}/AUs`]]);
    });

    it("reports nothing to repair for an ordinary project", async () => {
      put("Letter.json", nodeJson("letter", "Letter", "note"));
      const result = await loadProject(ROOT);
      expect(result!.recoveredCount).toBe(0);
      expect(result!.reunited).toEqual([]);
    });
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
    // root, Canon/, AUs/, AUs/Valera/ — four reads. assets/ is skipped by
    // name without being listed at all, since it never holds nodes.
    expect(calls.readDir).toBe(4);
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
