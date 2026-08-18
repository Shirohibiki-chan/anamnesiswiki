import { describe, expect, it } from "vitest";
import {
  createRemovedAssets,
  isAssetRemoved,
  parseRemovedAssets,
  pruneRemovedAssets,
  removeAsset,
  restoreAsset,
} from "./asset-removed";

describe("parseRemovedAssets", () => {
  it("reads a plain list of filenames", () => {
    expect(parseRemovedAssets(["a.png", "b.png"])).toEqual(["a.png", "b.png"]);
  });

  it("treats anything that isn't a list of strings as nothing removed", () => {
    // The safe failure: a picture visible in the library she'd hidden, never a
    // picture missing from a page.
    expect(parseRemovedAssets(null)).toEqual([]);
    expect(parseRemovedAssets({ "a.png": true })).toEqual([]);
    expect(parseRemovedAssets("a.png")).toEqual([]);
    expect(parseRemovedAssets([1, null, "", "a.png"])).toEqual(["a.png"]);
  });

  it("drops duplicates, since membership is the whole meaning", () => {
    expect(parseRemovedAssets(["a.png", "a.png"])).toEqual(["a.png"]);
  });
});

describe("removeAsset / restoreAsset", () => {
  it("adds and takes away", () => {
    const once = removeAsset(createRemovedAssets(), "a.png");
    expect(isAssetRemoved(once, "a.png")).toBe(true);
    expect(isAssetRemoved(restoreAsset(once, "a.png"), "a.png")).toBe(false);
  });

  it("returns the same array when nothing changed, so the store skips a write", () => {
    const removed = removeAsset(createRemovedAssets(), "a.png");
    expect(removeAsset(removed, "a.png")).toBe(removed);
    expect(restoreAsset(removed, "never-was.png")).toBe(removed);
  });
});

describe("pruneRemovedAssets", () => {
  it("keeps an entry whose file is still on disk", () => {
    // The normal case, and the one that matters: the file is kept *because* a
    // page is using it, so it's present and must stay hidden.
    const removed = ["kept.png"];
    expect(pruneRemovedAssets(removed, new Set(["kept.png", "other.png"]))).toBe(removed);
  });

  it("drops an entry once its file is gone", () => {
    // How a removal ends its life: the last page lets go, releaseAsset deletes
    // the file, and the name here has nothing left to hide.
    expect(pruneRemovedAssets(["gone.png", "kept.png"], new Set(["kept.png"]))).toEqual(["kept.png"]);
  });

  it("returns the same array when nothing is dropped", () => {
    const removed = ["a.png"];
    expect(pruneRemovedAssets(removed, new Set(["a.png"]))).toBe(removed);
  });
});
