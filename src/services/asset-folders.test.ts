import { describe, expect, it } from "vitest";
import {
  addAssetFolder,
  assignAsset,
  countByFilter,
  createAssetFolders,
  folderOf,
  matchesFilter,
  parseAssetFolders,
  pruneAssignments,
  removeAssetFolder,
  renameAssetFolder,
  type AssetFolders,
} from "./asset-folders";
import type { AssetFile } from "./asset-usage";

const file = (fileName: string): AssetFile => ({ fileName, size: 1 });

function withFolders(...names: string[]): AssetFolders {
  return names.reduce((state, name, i) => addAssetFolder(state, `f${i}`, name), createAssetFolders());
}

describe("adding and naming", () => {
  it("keeps folders in the order they were made", () => {
    expect(withFolders("Maps", "People").folders.map((f) => f.name)).toEqual(["Maps", "People"]);
  });

  it("numbers a duplicate name rather than making two folders called the same thing", () => {
    expect(withFolders("Maps", "Maps", "Maps").folders.map((f) => f.name)).toEqual(["Maps", "Maps (2)", "Maps (3)"]);
  });

  it("treats a name that differs only in case as taken", () => {
    expect(withFolders("Maps", "maps").folders[1].name).toBe("maps (2)");
  });

  it("falls back to a name rather than making an unnamed folder", () => {
    expect(addAssetFolder(createAssetFolders(), "a", "   ").folders[0].name).toBe("Folder");
  });

  it("ignores an empty rename instead of clearing the name", () => {
    const state = withFolders("Maps");
    expect(renameAssetFolder(state, "f0", "  ").folders[0].name).toBe("Maps");
  });

  it("doesn't renumber a folder against its own name", () => {
    const state = withFolders("Maps");
    expect(renameAssetFolder(state, "f0", "Maps").folders[0].name).toBe("Maps");
  });
});

describe("filing pictures", () => {
  it("files one and reads it back", () => {
    const state = assignAsset(withFolders("Maps"), "a.png", "f0");
    expect(folderOf(state, "a.png")).toBe("f0");
  });

  it("puts one back to unsorted", () => {
    const state = assignAsset(assignAsset(withFolders("Maps"), "a.png", "f0"), "a.png", null);
    expect(folderOf(state, "a.png")).toBeNull();
  });

  it("refuses a folder that doesn't exist rather than storing a dangling label", () => {
    const state = withFolders("Maps");
    expect(assignAsset(state, "a.png", "nope")).toBe(state);
  });
});

// The one rule this file exists to keep: organising pictures must never be a
// way of losing one.
describe("deleting a folder", () => {
  it("leaves its pictures in the library, unsorted", () => {
    let state = withFolders("Maps", "People");
    state = assignAsset(state, "a.png", "f0");
    state = assignAsset(state, "b.png", "f1");
    state = removeAssetFolder(state, "f0");

    expect(state.folders.map((f) => f.name)).toEqual(["People"]);
    expect(folderOf(state, "a.png")).toBeNull();
    expect(folderOf(state, "b.png")).toBe("f1");
    expect(matchesFilter(state, "a.png", { kind: "unsorted" })).toBe(true);
    expect(matchesFilter(state, "a.png", { kind: "all" })).toBe(true);
  });
});

describe("reading the file back", () => {
  it("survives anything that isn't a folder record", () => {
    expect(parseAssetFolders(null)).toEqual(createAssetFolders());
    expect(parseAssetFolders("{}")).toEqual(createAssetFolders());
    expect(parseAssetFolders({ folders: "nope", assign: 7 })).toEqual(createAssetFolders());
  });

  it("drops entries that aren't shaped like a folder and keeps the rest", () => {
    const parsed = parseAssetFolders({
      folders: [{ id: "a", name: "Maps" }, { id: "b" }, { name: "no id" }, null, { id: "c", name: "People" }],
      assign: {},
    });
    expect(parsed.folders.map((f) => f.id)).toEqual(["a", "c"]);
  });

  it("drops a label pointing at a folder that isn't there", () => {
    const parsed = parseAssetFolders({
      folders: [{ id: "a", name: "Maps" }],
      assign: { "keep.png": "a", "drop.png": "gone" },
    });
    expect(parsed.assign).toEqual({ "keep.png": "a" });
  });

  it("drops a second folder claiming an id the first one has", () => {
    const parsed = parseAssetFolders({
      folders: [
        { id: "a", name: "Maps" },
        { id: "a", name: "Other" },
      ],
    });
    expect(parsed.folders).toEqual([{ id: "a", name: "Maps" }]);
  });
});

describe("pruning labels for files that have gone", () => {
  it("drops them", () => {
    const state = assignAsset(assignAsset(withFolders("Maps"), "a.png", "f0"), "b.png", "f0");
    const pruned = pruneAssignments(state, [file("a.png")]);
    expect(Object.keys(pruned.assign)).toEqual(["a.png"]);
  });

  // Identity is what the store checks to decide whether to write the file, so
  // this is the difference between opening the tab and touching the disk.
  it("returns the same object when there is nothing to drop", () => {
    const state = assignAsset(withFolders("Maps"), "a.png", "f0");
    expect(pruneAssignments(state, [file("a.png"), file("b.png")])).toBe(state);
  });
});

describe("counts", () => {
  it("counts each view once", () => {
    let state = withFolders("Maps", "People");
    state = assignAsset(state, "a.png", "f0");
    state = assignAsset(state, "b.png", "f0");
    state = assignAsset(state, "c.png", "f1");

    const counts = countByFilter(state, [file("a.png"), file("b.png"), file("c.png"), file("d.png")]);
    expect(counts).toEqual({ all: 4, unsorted: 1, byFolder: { f0: 2, f1: 1 } });
  });

  it("shows an empty folder as empty rather than leaving it out", () => {
    expect(countByFilter(withFolders("Maps"), []).byFolder).toEqual({ f0: 0 });
  });
});
