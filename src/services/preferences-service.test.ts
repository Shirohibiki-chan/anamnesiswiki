import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  HISTORY_INTERVAL_MINUTES,
  HISTORY_KEEP_DAYS,
  HISTORY_PER_PAGE,
  LIST_PAGE_SIZES,
  MAX_SAVED_COLORS,
  parsePreferences,
  withSavedColor,
  withRecentIcon,
  MAX_RECENT_ICONS,
} from "./preferences-service";

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

describe("withSavedColor", () => {
  it("puts a newly mixed colour at the front", () => {
    expect(withSavedColor(["#111111"], "#ff5577")).toEqual(["#ff5577", "#111111"]);
  });

  // Re-picking one already kept should move it back to the front, not fill the
  // row with the same colour twice.
  it("moves a colour already saved rather than repeating it", () => {
    expect(withSavedColor(["#111111", "#ff5577"], "#FF5577")).toEqual(["#ff5577", "#111111"]);
  });

  it("keeps the row a row", () => {
    const full = Array.from({ length: MAX_SAVED_COLORS }, (_, i) => `#0000${i}${i}`);
    const next = withSavedColor(full, "#ff5577");
    expect(next).toHaveLength(MAX_SAVED_COLORS);
    expect(next[0]).toBe("#ff5577");
    expect(next).not.toContain(full[MAX_SAVED_COLORS - 1]);
  });

  // These end up in a style attribute, so anything that isn't a hex is refused
  // rather than stored and handed on.
  it("refuses what isn't a hex", () => {
    expect(withSavedColor(["#111111"], "red")).toEqual(["#111111"]);
    expect(withSavedColor(["#111111"], "#abc")).toEqual(["#111111"]);
  });
});

describe("parsePreferences and saved colours", () => {
  it("keeps the hexes and drops anything else", () => {
    expect(parsePreferences({ savedColors: ["#ff5577", "red", 7, "#22AA88"] }).savedColors).toEqual([
      "#ff5577",
      "#22aa88",
    ]);
  });

  it("defaults to none when the field is nonsense", () => {
    expect(parsePreferences({ savedColors: "blue" }).savedColors).toEqual([]);
  });
});

describe("how long earlier versions are kept", () => {
  it("takes the three numbers when they are ones a control can show", () => {
    const parsed = parsePreferences({ historyIntervalMinutes: 15, historyKeepDays: 365, historyPerPage: 100 });

    expect(parsed.historyIntervalMinutes).toBe(15);
    expect(parsed.historyKeepDays).toBe(365);
    expect(parsed.historyPerPage).toBe(100);
  });

  // Same rule as listPageSize: a hand-edited number no control can show would
  // sit in the file being obeyed by a panel displaying something else.
  it("falls back on anything that isn't offered", () => {
    const parsed = parsePreferences({ historyIntervalMinutes: 3, historyKeepDays: 0, historyPerPage: -5 });

    expect(parsed.historyIntervalMinutes).toBe(DEFAULT_PREFERENCES.historyIntervalMinutes);
    expect(parsed.historyKeepDays).toBe(DEFAULT_PREFERENCES.historyKeepDays);
    expect(parsed.historyPerPage).toBe(DEFAULT_PREFERENCES.historyPerPage);
  });

  // The defaults are derived from limits.ts rather than written twice, and this
  // is what would catch them drifting apart.
  it("ships defaults that are themselves offered", () => {
    expect(HISTORY_INTERVAL_MINUTES).toContain(DEFAULT_PREFERENCES.historyIntervalMinutes);
    expect(HISTORY_KEEP_DAYS).toContain(DEFAULT_PREFERENCES.historyKeepDays);
    expect(HISTORY_PER_PAGE).toContain(DEFAULT_PREFERENCES.historyPerPage);
  });

  // Nothing may turn keeping copies off — see HistorySettings on why.
  it("offers no option that keeps nothing", () => {
    for (const minutes of HISTORY_INTERVAL_MINUTES) expect(minutes).toBeGreaterThan(0);
    for (const days of HISTORY_KEEP_DAYS) expect(days).toBeGreaterThan(0);
    for (const count of HISTORY_PER_PAGE) expect(count).toBeGreaterThan(0);
  });
});

// Phase 19.5: the picker's Recent row. Same rule the saved colours follow, and
// deliberately not the same cleaning — a glyph name is a key into a catalogue
// and an emoji is a character, and neither is ours to change the case of.
describe("withRecentIcon", () => {
  it("puts the icon just picked at the front", () => {
    expect(withRecentIcon(["sword"], "castle")).toEqual(["castle", "sword"]);
  });

  it("moves one already there rather than repeating it", () => {
    expect(withRecentIcon(["sword", "castle"], "castle")).toEqual(["castle", "sword"]);
  });

  it("keeps emoji and glyph names side by side, exactly as given", () => {
    expect(withRecentIcon(["sword"], "🗡️")).toEqual(["🗡️", "sword"]);
    expect(withRecentIcon([], "CastleGate")).toEqual(["CastleGate"]);
  });

  // The store leans on this to tell a real pick from picking the same icon
  // again — which is most picks, and each one would be a settings write.
  it("hands back the list it was given when nothing would change", () => {
    const recent = ["sword", "castle"];
    expect(withRecentIcon(recent, "sword")).toBe(recent);
    expect(withRecentIcon(recent, "  ")).toBe(recent);
  });

  it("keeps the row to one row", () => {
    const full = Array.from({ length: MAX_RECENT_ICONS }, (_, at) => `icon-${at}`);
    expect(withRecentIcon(full, "new")).toHaveLength(MAX_RECENT_ICONS);
    expect(withRecentIcon(full, "new")[0]).toBe("new");
  });
});

describe("parsePreferences: recent icons", () => {
  it("keeps a stored row", () => {
    expect(parsePreferences({ recentIcons: ["sword", "🗡️"] }).recentIcons).toEqual(["sword", "🗡️"]);
  });

  it("drops entries that are not icons, and caps the row", () => {
    const parsed = parsePreferences({ recentIcons: ["sword", 7, "", null, "castle"] });
    expect(parsed.recentIcons).toEqual(["sword", "castle"]);
    expect(parsePreferences({ recentIcons: Array(20).fill("x") }).recentIcons).toHaveLength(MAX_RECENT_ICONS);
  });
});
