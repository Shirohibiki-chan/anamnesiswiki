import { beforeEach, describe, expect, it, vi } from "vitest";

// The same in-memory stand-in for the Tauri fs plugin that filesystem-load's
// tests use — a map of path to contents, with directories inferred from the
// paths that continue through them.
const files = new Map<string, string>();
const readDirs: string[] = [];

vi.mock("@tauri-apps/api/path", () => ({ sep: () => "/" }));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: async (path: string) => files.has(path),
  readTextFile: async (path: string) => {
    const content = files.get(path);
    if (content === undefined) throw new Error(`ENOENT: ${path}`);
    return content;
  },
  readDir: async (dirPath: string) => {
    readDirs.push(dirPath);
    if (unreadable.has(dirPath)) throw new Error(`EACCES: ${dirPath}`);
    const names = new Set<string>();
    for (const path of files.keys()) {
      if (!path.startsWith(`${dirPath}/`)) continue;
      const [head] = path.slice(dirPath.length + 1).split("/");
      names.add(head);
    }
    return [...names].map((name) => {
      const isDirectory = [...files.keys()].some((path) => path.startsWith(`${dirPath}/${name}/`));
      return { name, isDirectory, isFile: !isDirectory, isSymlink: false };
    });
  },
  stat: async (path: string) => {
    if (!files.has(path)) throw new Error(`ENOENT: ${path}`);
    return { mtime: new Date(mtimes.get(path) ?? 0) };
  },
  mkdir: async () => {},
  remove: async () => {},
  rename: async () => {},
  readFile: async () => new Uint8Array(),
  writeFile: async () => {},
  writeTextFile: async () => {},
}));

// Folders `readDir` refuses — a drive that isn't plugged in, a permission wall.
const unreadable = new Set<string>();

// When each file was last written, for the timestamps a world listing sorts on.
const mtimes = new Map<string, number>();

const { scanForWorlds, resolveChosenFolder, isWorldDir, readWorldSummary, collectWorldFiles } = await import(
  "./filesystem-service"
);

const ROOT = "/Documents/Anamnesis";

/** Marks `path` as a world by giving it the file that makes one. */
function world(path: string) {
  files.set(`${path}/project.json`, JSON.stringify({ version: 1, name: "W", rootOrder: [] }));
}

beforeEach(() => {
  files.clear();
  readDirs.length = 0;
  unreadable.clear();
  mtimes.clear();
});

describe("scanForWorlds", () => {
  it("finds a world sitting directly in the projects folder", async () => {
    world(`${ROOT}/Valeraverse`);
    expect(await scanForWorlds(ROOT)).toEqual([`${ROOT}/Valeraverse`]);
  });

  it("finds one tidied a folder further down", async () => {
    // Her worlds sit at mixed depths — this is the ninth-world case.
    world(`${ROOT}/TEStval/Valeraverse`);
    expect(await scanForWorlds(ROOT)).toEqual([`${ROOT}/TEStval/Valeraverse`]);
  });

  it("finds worlds at mixed depths together", async () => {
    world(`${ROOT}/Valeraverse`);
    world(`${ROOT}/TEStval/Valeraverse3`);
    expect(await scanForWorlds(ROOT)).toEqual([`${ROOT}/TEStval/Valeraverse3`, `${ROOT}/Valeraverse`]);
  });

  it("stops at two levels rather than crawling", async () => {
    world(`${ROOT}/a/b/TooDeep`);
    expect(await scanForWorlds(ROOT)).toEqual([]);
  });

  it("never descends into a world it has already found", async () => {
    // A world's folder is full of directories, none of them worlds — and one
    // could hold a project.json if a world is ever imported inside another.
    world(`${ROOT}/Valeraverse`);
    world(`${ROOT}/Valeraverse/Inner`);
    files.set(`${ROOT}/Valeraverse/assets/pic.png`, "");

    expect(await scanForWorlds(ROOT)).toEqual([`${ROOT}/Valeraverse`]);
    expect(readDirs).not.toContain(`${ROOT}/Valeraverse`);
  });

  it("skips the app's own themes and snippets folders", async () => {
    world(`${ROOT}/Valeraverse`);
    files.set(`${ROOT}/themes/midnight.css`, "");
    files.set(`${ROOT}/snippets/tables.css`, "");

    expect(await scanForWorlds(ROOT)).toEqual([`${ROOT}/Valeraverse`]);
    expect(readDirs).not.toContain(`${ROOT}/themes`);
  });

  it("loses only the folder it cannot read", async () => {
    world(`${ROOT}/Valeraverse`);
    files.set(`${ROOT}/OffDrive/anything`, "");
    unreadable.add(`${ROOT}/OffDrive`);

    expect(await scanForWorlds(ROOT)).toEqual([`${ROOT}/Valeraverse`]);
  });

  it("returns nothing rather than throwing when the projects folder itself is unreadable", async () => {
    unreadable.add(ROOT);
    expect(await scanForWorlds(ROOT)).toEqual([]);
  });

  it("returns a stable order, since directories are read in parallel", async () => {
    world(`${ROOT}/Zeta`);
    world(`${ROOT}/Alpha`);
    world(`${ROOT}/Mid/Beta`);

    expect(await scanForWorlds(ROOT)).toEqual([`${ROOT}/Alpha`, `${ROOT}/Mid/Beta`, `${ROOT}/Zeta`]);
  });
});

describe("resolveChosenFolder", () => {
  it("opens the folder she picked when it is itself a world", async () => {
    world("/elsewhere/Valeraverse");
    expect(await resolveChosenFolder("/elsewhere/Valeraverse")).toEqual({
      kind: "world",
      path: "/elsewhere/Valeraverse",
    });
  });

  it("looks one level in when it isn't — the unzipped Valeraverse/Valeraverse case", async () => {
    world("/downloads/Valeraverse/Valeraverse");
    expect(await resolveChosenFolder("/downloads/Valeraverse")).toEqual({
      kind: "world",
      path: "/downloads/Valeraverse/Valeraverse",
    });
  });

  it("asks which one when the folder holds several", async () => {
    world("/downloads/pack/One");
    world("/downloads/pack/Two");
    expect(await resolveChosenFolder("/downloads/pack")).toEqual({
      kind: "choose",
      paths: ["/downloads/pack/One", "/downloads/pack/Two"],
    });
  });

  it("does not reach two levels in", async () => {
    // One level is forgiveness; two would start opening worlds she didn't
    // point at.
    world("/downloads/pack/deeper/Hidden");
    expect(await resolveChosenFolder("/downloads/pack")).toEqual({ kind: "none" });
  });

  it("reports nothing found for a folder with no project in or under it", async () => {
    files.set("/downloads/photos/cat.png", "");
    expect(await resolveChosenFolder("/downloads/photos")).toEqual({ kind: "none" });
  });

  it("reports nothing found rather than throwing when the folder can't be read", async () => {
    unreadable.add("/downloads/locked");
    expect(await resolveChosenFolder("/downloads/locked")).toEqual({ kind: "none" });
  });
});

describe("isWorldDir", () => {
  it("is exactly the check loadProject makes", async () => {
    world("/a/World");
    files.set("/a/NotAWorld/readme.txt", "");

    expect(await isWorldDir("/a/World")).toBe(true);
    expect(await isWorldDir("/a/NotAWorld")).toBe(false);
  });
});

describe("readWorldSummary", () => {
  /** A world with a full project file, rather than the bare marker `world` writes. */
  function namedWorld(path: string, project: Record<string, unknown>, modifiedAt = 0) {
    const file = `${path}/project.json`;
    files.set(file, JSON.stringify({ version: 1, rootOrder: [], ...project }));
    mtimes.set(file, modifiedAt);
  }

  it("reads the name, the id and when the project file last changed", async () => {
    namedWorld(`${ROOT}/Val`, { name: "Valeraverse", id: "abc" }, 1234);
    expect(await readWorldSummary(`${ROOT}/Val`)).toEqual({
      path: `${ROOT}/Val`,
      id: "abc",
      name: "Valeraverse",
      modifiedAt: 1234,
    });
  });

  it("reports no id for a world saved before ids existed, rather than minting one", async () => {
    // Minting is a write, and a listing that writes touches every world on
    // disk every time the start screen opens. `loadProject` does it when she
    // actually opens the world.
    namedWorld(`${ROOT}/Old`, { name: "Old" });
    const before = files.get(`${ROOT}/Old/project.json`);
    const summary = await readWorldSummary(`${ROOT}/Old`);
    expect(summary?.id).toBeNull();
    expect(files.get(`${ROOT}/Old/project.json`)).toBe(before);
  });

  it("falls back to the folder's name when the project file has none", async () => {
    namedWorld(`${ROOT}/Untitled`, {});
    expect((await readWorldSummary(`${ROOT}/Untitled`))?.name).toBe("Untitled");
  });

  it("reports nothing for a folder that isn't a world", async () => {
    expect(await readWorldSummary(`${ROOT}/NotAWorld`)).toBeNull();
  });

  it("reports nothing for a project file that won't parse", async () => {
    files.set(`${ROOT}/Broken/project.json`, "{ this is not json");
    expect(await readWorldSummary(`${ROOT}/Broken`)).toBeNull();
  });
});

describe("collectWorldFiles", () => {
  it("returns the scanned worlds and the remembered ones together", async () => {
    world(`${ROOT}/Home`);
    world("D:/Elsewhere/Away");
    const found = await collectWorldFiles(ROOT, ["D:/Elsewhere/Away"]);
    expect(found.map((w) => w.path).sort()).toEqual([`${ROOT}/Home`, "D:/Elsewhere/Away"]);
  });

  it("reads a world found both ways only once", async () => {
    world(`${ROOT}/Val`);
    const found = await collectWorldFiles(ROOT, [`${ROOT}/Val`]);
    expect(found).toHaveLength(1);
  });

  it("drops a remembered path that won't read, and keeps the rest", async () => {
    // The unplugged-drive case. What to *show* for it is decided in
    // buildWorldList, off the remembered list — not here.
    world(`${ROOT}/Home`);
    const found = await collectWorldFiles(ROOT, ["E:/Stick/Gone"]);
    expect(found.map((w) => w.path)).toEqual([`${ROOT}/Home`]);
  });
});
