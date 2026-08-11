import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, parsePreferences } from "./preferences-service";

describe("parsePreferences", () => {
  it("defaults an empty or absent settings file", () => {
    expect(parsePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences({})).toEqual(DEFAULT_PREFERENCES);
  });

  it("keeps a value it recognises", () => {
    expect(parsePreferences({ treeDoubleClick: "rename" }).treeDoubleClick).toBe("rename");
    expect(parsePreferences({ treeDoubleClick: "expand" }).treeDoubleClick).toBe("expand");
  });

  // The file is plain JSON that outlives the version that wrote it, and a
  // hand-edited one is a supported way to work in a local-first app.
  it("falls back on anything it doesn't recognise", () => {
    expect(parsePreferences({ treeDoubleClick: "explode" })).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences({ treeDoubleClick: 3 })).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("preferences")).toEqual(DEFAULT_PREFERENCES);
  });

  // Double-click renaming came first, so "no preference recorded" has to mean
  // the new default rather than the old behaviour — otherwise the swap never
  // reaches anyone who had the app before it.
  it("defaults to expanding, not to the behaviour it replaced", () => {
    expect(DEFAULT_PREFERENCES.treeDoubleClick).toBe("expand");
  });
});
