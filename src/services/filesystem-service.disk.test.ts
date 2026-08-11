// filesystem-service.test.ts checks *what paths* get touched, against spies
// that accept anything. These check what happens when the disk pushes back:
// the fake below refuses a rename whose source isn't there, the way Windows
// does with "The system cannot find the file specified. (os error 2)". Both
// bugs this file covers were invisible to a mock that always says yes.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/path", () => ({ sep: () => "/" }));

const disk = vi.hoisted(() => ({ files: new Map<string, string>(), dirs: new Set<string>(["/root"]) }));

// Set by a test that wants a specific path to fail the way a locked file does:
// the OS refuses, but the file is still very much there.
const locked = vi.hoisted(() => ({ path: null as string | null }));

const fsMock = vi.hoisted(() => {
  const { files, dirs } = disk;
  const isDir = (p: string) => dirs.has(p);
  const isFile = (p: string) => files.has(p);
  return {
    mkdir: vi.fn(async (path: string) => {
      const parts = path.split("/");
      for (let i = 1; i <= parts.length; i++) dirs.add(parts.slice(0, i).join("/"));
    }),
    writeTextFile: vi.fn(async (path: string, contents: string) => {
      const parent = path.slice(0, path.lastIndexOf("/"));
      if (!dirs.has(parent)) throw new Error(`no parent directory for ${path}`);
      files.set(path, contents);
    }),
    exists: vi.fn(async (path: string) => isDir(path) || isFile(path)),
    readDir: vi.fn(async () => []),
    readTextFile: vi.fn(async (path: string) => files.get(path) ?? ""),
    remove: vi.fn(async (path: string) => {
      if (isFile(path)) {
        files.delete(path);
        return;
      }
      if (!isDir(path)) return;
      const occupied =
        [...files.keys()].some((f) => f.startsWith(`${path}/`)) || [...dirs].some((d) => d.startsWith(`${path}/`));
      if (occupied) throw new Error(`directory not empty: ${path}`);
      dirs.delete(path);
    }),
    rename: vi.fn(async (from: string, to: string) => {
      if (locked.path === from) throw new Error(`access denied: ${from}`);
      if (isFile(from)) {
        files.set(to, files.get(from)!);
        files.delete(from);
        return;
      }
      if (isDir(from)) {
        for (const d of [...dirs]) {
          if (d !== from && !d.startsWith(`${from}/`)) continue;
          dirs.delete(d);
          dirs.add(to + d.slice(from.length));
        }
        for (const f of [...files.keys()]) {
          if (!f.startsWith(`${from}/`)) continue;
          files.set(to + f.slice(from.length), files.get(f)!);
          files.delete(f);
        }
        return;
      }
      throw new Error(
        `failed to rename old path: ${from} to new path: ${to} with error: ` +
          `The system cannot find the file specified. (os error 2)`,
      );
    }),
    readFile: vi.fn(async () => new Uint8Array()),
    writeFile: vi.fn(async () => {}),
    watch: vi.fn(async () => () => {}),
  };
});
vi.mock("@tauri-apps/plugin-fs", () => fsMock);

import { addNodes, moveNodes, renameNode } from "./filesystem-service";
import { enqueueWrite, whenWritesSettle } from "./write-queue";
import { FOLDER_TEMPLATE_KEY, type Node } from "../constants/schema";

let seq = 0;
function node(overrides: Partial<Node> & Pick<Node, "id" | "name" | "parentId" | "templateKey">): Node {
  return { tabs: [], properties: {}, tags: [], createdAt: seq++, updatedAt: 0, ...overrides };
}

function layout(): string[] {
  return [...disk.files.keys()].map((path) => path.replace("/root/", "")).sort();
}

const folder = node({ id: "f", name: "F", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });

beforeEach(() => {
  disk.files.clear();
  disk.dirs.clear();
  disk.dirs.add("/root");
  locked.path = null;
  seq = 1;
});

describe("overlapping writes", () => {
  // Both of these are what the user hit on 2026-08-11. Tauri's fs calls are
  // IPC round-trips, so a page created and then immediately renamed is two
  // writes in flight at once — and the second one plans a rename from a path
  // the first one hasn't written yet.
  it("loses nothing when a child is created before its parent's own file lands", async () => {
    await addNodes("/root", [folder], [], [folder]);
    const page = node({ id: "p", name: "New Note", parentId: "f", templateKey: "note" });
    const child = node({ id: "c", name: "Untitled", parentId: "p", templateKey: "blank" });

    await Promise.all([
      enqueueWrite(() => addNodes("/root", [folder, page], [folder], [folder, page])),
      enqueueWrite(() => addNodes("/root", [page, child], [folder, page], [folder, page, child])),
    ]);

    expect(layout()).toEqual(["F/New Note/Untitled.json", "F/New Note/_page.json", "F/_folder.json"]);
  });

  it("renames a page that was created a moment earlier", async () => {
    await addNodes("/root", [folder], [], [folder]);
    const page = node({ id: "p", name: "Untitled", parentId: "f", templateKey: "blank" });
    const renamed = { ...page, name: "cookies" };

    await Promise.all([
      enqueueWrite(() => addNodes("/root", [folder, page], [folder], [folder, page])),
      enqueueWrite(() => renameNode("/root", [folder, page], [folder, renamed], "p")),
    ]);

    expect(layout()).toEqual(["F/_folder.json", "F/cookies.json"]);
  });

  it("keeps running after a queued write fails", async () => {
    const failed = enqueueWrite(() => Promise.reject(new Error("disk full")));
    await expect(failed).rejects.toThrow("disk full");
    await expect(enqueueWrite(() => "next")).resolves.toBe("next");
    await whenWritesSettle();
  });
});

describe("a node whose own file went missing", () => {
  // The state the user's project was actually left in once an overlapping
  // write had already gone wrong: the page is in the tree with no file behind
  // it. Every later rename or move re-planned the same impossible rename, so
  // that folder could never save again — and restarting didn't help, because
  // paths are recomputed from the graph every time rather than remembered.
  const page = node({ id: "p", name: "New Note", parentId: "f", templateKey: "note" });

  beforeEach(() => {
    disk.dirs.add("/root/F");
    disk.files.set("/root/F/_folder.json", "{}");
  });

  it("writes the page back on the next rename instead of failing forever", async () => {
    const renamed = { ...page, name: "cookies" };
    await renameNode("/root", [folder, page], [folder, renamed], "p");

    expect(layout()).toEqual(["F/_folder.json", "F/cookies.json"]);
  });

  it("writes it back on the next move", async () => {
    const other = node({ id: "o", name: "Elsewhere", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    disk.dirs.add("/root/Elsewhere");
    disk.files.set("/root/Elsewhere/_folder.json", "{}");
    const moved = { ...page, parentId: "o" };

    await moveNodes("/root", [folder, other, page], [folder, other, moved], ["p"]);

    expect(layout()).toEqual(["Elsewhere/New Note.json", "Elsewhere/_folder.json", "F/_folder.json"]);
  });

  // The worse half of the same failure: the conversion threw before the new
  // page was written at all, so making a page inside a broken one lost it.
  it("does not lose a page created inside it", async () => {
    const child = node({ id: "c", name: "Untitled", parentId: "p", templateKey: "blank" });
    await addNodes("/root", [page, child], [folder, page], [folder, page, child]);

    expect(layout()).toEqual(["F/New Note/Untitled.json", "F/New Note/_page.json", "F/_folder.json"]);
  });

  it("still reports a rename the OS actually refused", async () => {
    disk.files.set("/root/F/New Note.json", "{}");
    locked.path = "/root/F/New Note.json";
    const renamed = { ...page, name: "cookies" };

    await expect(renameNode("/root", [folder, page], [folder, renamed], "p")).rejects.toThrow("access denied");
  });
});

describe("relocations that do have something to move", () => {
  it("converts a page to its own directory when it gains a first child", async () => {
    await addNodes("/root", [folder], [], [folder]);
    const page = node({ id: "p", name: "New Note", parentId: "f", templateKey: "note" });
    await addNodes("/root", [folder, page], [folder], [folder, page]);
    const child = node({ id: "c", name: "Untitled", parentId: "p", templateKey: "blank" });
    await addNodes("/root", [page, child], [folder, page], [folder, page, child]);

    expect(layout()).toEqual(["F/New Note/Untitled.json", "F/New Note/_page.json", "F/_folder.json"]);
  });

  it("drops a same-name sibling's suffix when it moves inside the other one", async () => {
    const first = node({ id: "a", name: "Untitled", parentId: "f", templateKey: "blank" });
    const second = node({ id: "b", name: "Untitled", parentId: "f", templateKey: "blank" });
    await addNodes("/root", [folder], [], [folder]);
    await addNodes("/root", [folder, first], [folder], [folder, first]);
    await addNodes("/root", [folder, first, second], [folder, first], [folder, first, second]);
    expect(layout()).toEqual(["F/Untitled (2).json", "F/Untitled.json", "F/_folder.json"]);

    const nested = { ...second, parentId: "a" };
    await moveNodes("/root", [folder, first, second], [folder, first, nested], ["b"]);

    expect(layout()).toEqual(["F/Untitled/Untitled.json", "F/Untitled/_page.json", "F/_folder.json"]);
  });
});
