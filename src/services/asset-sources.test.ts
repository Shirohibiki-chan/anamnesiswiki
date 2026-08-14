import { describe, expect, it } from "vitest";
import { createAssetSources, parseAssetSources, pruneAssetSources, recordAssetSource, sourceUrlFor } from "./asset-sources";

describe("parseAssetSources", () => {
  it("reads a plain filename-to-address map", () => {
    expect(parseAssetSources({ "a.png": "https://assets.legendkeeper.com/a.png" })).toEqual({
      "a.png": "https://assets.legendkeeper.com/a.png",
    });
  });

  it("treats anything that isn't an object as no sources at all", () => {
    expect(parseAssetSources(null)).toEqual({});
    expect(parseAssetSources(["a.png"])).toEqual({});
    expect(parseAssetSources("nonsense")).toEqual({});
  });

  it("drops anything that isn't plainly a web address", () => {
    // The file is hand-editable and its values are written back out into an
    // export as addresses, so a value that isn't one is dropped rather than
    // carried somewhere it could be followed.
    const parsed = parseAssetSources({
      "keep.png": "https://assets.legendkeeper.com/keep.png",
      "http.png": "http://example.com/ok.png",
      "file.png": "file:///C:/Users/shiro/secret.png",
      "script.png": "javascript:alert(1)",
      "relative.png": "/assets/x.png",
      "number.png": 42,
    });
    expect(parsed).toEqual({
      "keep.png": "https://assets.legendkeeper.com/keep.png",
      "http.png": "http://example.com/ok.png",
    });
  });
});

describe("recordAssetSource", () => {
  it("remembers where a picture came from", () => {
    const next = recordAssetSource(createAssetSources(), "a.png", "https://assets.legendkeeper.com/a.png");
    expect(next).toEqual({ "a.png": "https://assets.legendkeeper.com/a.png" });
  });

  it("returns the same object when nothing changed, so the store can skip a write", () => {
    const sources = { "a.png": "https://assets.legendkeeper.com/a.png" };
    expect(recordAssetSource(sources, "a.png", "https://assets.legendkeeper.com/a.png")).toBe(sources);
  });

  it("refuses a value that isn't a web address, the same as parsing does", () => {
    const sources = createAssetSources();
    expect(recordAssetSource(sources, "a.png", "blob:whatever")).toBe(sources);
  });
});

describe("pruneAssetSources", () => {
  it("drops entries for pictures that are gone", () => {
    const sources = { "a.png": "https://x/a.png", "b.png": "https://x/b.png" };
    expect(pruneAssetSources(sources, new Set(["a.png"]))).toEqual({ "a.png": "https://x/a.png" });
  });

  it("returns the same object when everything is still there", () => {
    const sources = { "a.png": "https://x/a.png" };
    expect(pruneAssetSources(sources, new Set(["a.png", "b.png"]))).toBe(sources);
  });
});

describe("sourceUrlFor", () => {
  const sources = { "a.png": "https://assets.legendkeeper.com/a.png" };

  it("looks up an asset reference", () => {
    expect(sourceUrlFor(sources, "anamnesis-asset:a.png")).toBe("https://assets.legendkeeper.com/a.png");
  });

  it("hands back a web address unchanged — it's already somewhere LK can fetch", () => {
    expect(sourceUrlFor(sources, "https://example.com/cat.png")).toBe("https://example.com/cat.png");
  });

  it("finds nothing for a picture uploaded here", () => {
    expect(sourceUrlFor(sources, "anamnesis-asset:mine.png")).toBeUndefined();
  });

  it("finds nothing for an empty or missing url", () => {
    expect(sourceUrlFor(sources, "")).toBeUndefined();
    expect(sourceUrlFor(sources, undefined)).toBeUndefined();
    expect(sourceUrlFor(sources, 42)).toBeUndefined();
  });
});
