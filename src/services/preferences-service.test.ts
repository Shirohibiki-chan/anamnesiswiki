import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, LIST_PAGE_SIZES, parsePreferences } from "./preferences-service";

describe("parsePreferences", () => {
  it("defaults an empty or absent settings file", () => {
    expect(parsePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences({})).toEqual(DEFAULT_PREFERENCES);
  });

  it("keeps a value it recognises", () => {
    expect(parsePreferences({ treeDoubleClick: "rename" }).treeDoubleClick).toBe("rename");
    expect(parsePreferences({ treeDoubleClick: "expand" }).treeDoubleClick).toBe("expand");
    expect(parsePreferences({ listPaging: "scroll" }).listPaging).toBe("scroll");
    expect(parsePreferences({ listPaging: "pages" }).listPaging).toBe("pages");
    expect(parsePreferences({ projectSort: "name-desc" }).projectSort).toBe("name-desc");
    expect(parsePreferences({ listPageSize: 100 }).listPageSize).toBe(100);
  });

  it("reads each preference on its own, so one bad value doesn't cost the others", () => {
    const parsed = parsePreferences({ treeDoubleClick: "rename", listPaging: "carousel", projectSort: "size" });
    expect(parsed.treeDoubleClick).toBe("rename");
    expect(parsed.listPaging).toBe(DEFAULT_PREFERENCES.listPaging);
    expect(parsed.projectSort).toBe(DEFAULT_PREFERENCES.projectSort);
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

  it("defaults to pages rather than to endless scrolling", () => {
    // Her call, 2026-08-18. The switch exists because scrolling is a real
    // way to work, not because it is the safe default.
    expect(DEFAULT_PREFERENCES.listPaging).toBe("pages");
    expect(DEFAULT_PREFERENCES.projectSort).toBe("active");
  });

  // A page used to be however much fit the window, which came to eight on her
  // machine. 20 is the floor the offered sizes start at, so a settings file
  // written before this existed lands on 20 rather than on the old behaviour —
  // there is no longer any value that means "however many fit".
  it("defaults to twenty to a page", () => {
    expect(DEFAULT_PREFERENCES.listPageSize).toBe(20);
    expect(parsePreferences({}).listPageSize).toBe(20);
    expect(Math.min(...LIST_PAGE_SIZES)).toBe(20);
  });

  // Membership, not a range: a size with no button to show it would be obeyed
  // by a grid while the settings panel showed something else selected.
  it("refuses a page size that isn't one of the offered ones", () => {
    expect(parsePreferences({ listPageSize: 37 }).listPageSize).toBe(DEFAULT_PREFERENCES.listPageSize);
    expect(parsePreferences({ listPageSize: 0 }).listPageSize).toBe(DEFAULT_PREFERENCES.listPageSize);
    expect(parsePreferences({ listPageSize: "40" }).listPageSize).toBe(DEFAULT_PREFERENCES.listPageSize);
    expect(parsePreferences({ listPageSize: 1e9 }).listPageSize).toBe(DEFAULT_PREFERENCES.listPageSize);
  });
});
