import { describe, expect, it } from "vitest";
import {
  assetDisplayName,
  createAssetNames,
  fileNameOfRef,
  MAX_ASSET_NAME,
  nameAsset,
  parseAssetNames,
  pruneAssetNames,
  sortKey,
  suggestedAssetName,
} from "./asset-names";

describe("parseAssetNames", () => {
  it("keeps string names and drops everything else", () => {
    expect(parseAssetNames({ "a.png": "Sword", "b.png": 4, "c.png": null, "d.png": ["x"] })).toEqual({
      "a.png": "Sword",
    });
  });

  it("treats a blank or whitespace-only name as no name at all", () => {
    expect(parseAssetNames({ "a.png": "   ", "b.png": "" })).toEqual({});
  });

  it("trims what it keeps", () => {
    expect(parseAssetNames({ "a.png": "  Sword  " })).toEqual({ "a.png": "Sword" });
  });

  it("survives the file being something other than an object", () => {
    for (const raw of [null, undefined, 7, "names", ["a"]]) {
      expect(parseAssetNames(raw)).toEqual({});
    }
  });

  // Hand-editable file in her project folder, so the cap has to hold on the way
  // in as well as on the way through nameAsset.
  it("caps a name pasted straight into the file", () => {
    const parsed = parseAssetNames({ "a.png": "x".repeat(MAX_ASSET_NAME + 50) });
    expect(parsed["a.png"]).toHaveLength(MAX_ASSET_NAME);
  });
});

describe("nameAsset", () => {
  it("names a picture", () => {
    expect(nameAsset(createAssetNames(), "a.png", "Sword")).toEqual({ "a.png": "Sword" });
  });

  it("takes the name away when given an empty one", () => {
    expect(nameAsset({ "a.png": "Sword" }, "a.png", "  ")).toEqual({});
  });

  // The store writes only when this changes, and committing a name box without
  // touching it is the common case — it must not cost a disk write.
  it("returns the same object when the name is unchanged", () => {
    const names = { "a.png": "Sword" };
    expect(nameAsset(names, "a.png", "Sword")).toBe(names);
    expect(nameAsset(names, "a.png", "  Sword  ")).toBe(names);
  });

  it("returns the same object when clearing a name that was never there", () => {
    const names = { "a.png": "Sword" };
    expect(nameAsset(names, "b.png", "")).toBe(names);
  });

  it("leaves the others alone", () => {
    expect(nameAsset({ "a.png": "Sword", "b.png": "Map" }, "a.png", "Blade")).toEqual({
      "a.png": "Blade",
      "b.png": "Map",
    });
  });
});

describe("pruneAssetNames", () => {
  it("drops names for pictures that are gone", () => {
    expect(pruneAssetNames({ "a.png": "Sword", "b.png": "Map" }, new Set(["a.png"]))).toEqual({ "a.png": "Sword" });
  });

  // Same contract as the folders' prune: a fresh object every load would write
  // the file on every project open.
  it("returns the same object when nothing needs dropping", () => {
    const names = { "a.png": "Sword" };
    expect(pruneAssetNames(names, new Set(["a.png", "b.png"]))).toBe(names);
  });
});

describe("assetDisplayName", () => {
  it("gives the name when there is one", () => {
    expect(assetDisplayName({ "a.png": "Sword" }, "a.png")).toBe("Sword");
  });

  // Printing the UUID would look like an answer. Nothing is honest.
  it("gives nothing rather than the filename", () => {
    expect(assetDisplayName({}, "6f1c8d2e-77aa-4f10-9a3b-0f21c4de5b09.png")).toBe("");
  });
});

describe("suggestedAssetName", () => {
  it("drops the extension", () => {
    expect(suggestedAssetName("Valera sword.png")).toBe("Valera sword");
  });

  it("keeps dots that are part of the name", () => {
    expect(suggestedAssetName("TA-2026-08-04.v2.jpeg")).toBe("TA-2026-08-04.v2");
  });

  it("copes with no extension at all", () => {
    expect(suggestedAssetName("screenshot")).toBe("screenshot");
  });

  it("caps a very long one", () => {
    expect(suggestedAssetName(`${"x".repeat(400)}.png`)).toHaveLength(MAX_ASSET_NAME);
  });
});

describe("sortKey", () => {
  it("sorts case-insensitively", () => {
    expect(sortKey({ "a.png": "Sword" }, "a.png")).toBe("sword");
  });

  // So the unnamed ones group together instead of scattering under their UUIDs.
  it("gives every unnamed picture the same key", () => {
    expect(sortKey({}, "a.png")).toBe("");
    expect(sortKey({}, "b.png")).toBe("");
  });
});

describe("fileNameOfRef", () => {
  it("reads the filename out of a library reference", () => {
    expect(fileNameOfRef("anamnesis-asset:a.png")).toBe("a.png");
  });

  it("refuses a web address", () => {
    expect(fileNameOfRef("https://example.com/a.png")).toBeNull();
  });
});
