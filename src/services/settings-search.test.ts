import { describe, expect, it } from "vitest";
// @ts-expect-error node:fs is untyped here — same suppression as themes.test.ts
import { readFileSync } from "node:fs";
import { buildSettingsIndex, groupByTab, searchSettings } from "./settings-search";
import { SETTINGS_TABS } from "../constants/settings";
import { SHORTCUT_ACTIONS } from "../constants/shortcuts";

const find = (query: string) => searchSettings(query).map((entry) => entry.id);

describe("buildSettingsIndex", () => {
  it("gives every entry a unique id", () => {
    const ids = buildSettingsIndex().map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // An entry pointing at a section that doesn't exist is a result you can
  // click and land nowhere. Cheap to check, and the failure mode of the one
  // hand-maintained part of the index.
  it("points every entry at a real section", () => {
    const tabIds = new Set(SETTINGS_TABS.map((tab) => tab.id));
    for (const entry of buildSettingsIndex()) expect(tabIds.has(entry.tabId)).toBe(true);
  });

  it("covers every section that has settings in it", () => {
    const covered = new Set(buildSettingsIndex().map((entry) => entry.tabId));
    for (const tab of SETTINGS_TABS) expect(covered.has(tab.id)).toBe(true);
  });

  it("builds the derived entries from the registries rather than by hand", () => {
    const entries = buildSettingsIndex();
    // One per colour token, one per gradient, one per typeface, one per
    // shortcut — if a registry grows, this grows with it.
    expect(entries.filter((entry) => entry.id.startsWith("--color-")).length).toBeGreaterThan(15);
    expect(entries.filter((entry) => entry.id.startsWith("gradient-")).length).toBe(12);
    expect(entries.filter((entry) => entry.id.startsWith("--font-")).length).toBeGreaterThanOrEqual(3);
    // Counted off the registry rather than written down, which is the point
    // this test is making — a hardcoded 5 here fails the day a shortcut is
    // added, without anything actually being wrong.
    expect(entries.filter((entry) => entry.id.startsWith("shortcut-")).length).toBe(SHORTCUT_ACTIONS.length);
  });
});

describe("searchSettings", () => {
  it("returns nothing for an empty query rather than everything", () => {
    expect(searchSettings("")).toEqual([]);
    expect(searchSettings("   ")).toEqual([]);
  });

  it("finds a setting by its own name", () => {
    expect(find("projects folder")).toContain("projects-folder");
  });

  // The queries that made the feature worth building: the words somebody types
  // when they don't know what the setting is called. None of these appear in
  // the label they have to reach.
  it.each([
    ["where are my files saved", "projects-folder"],
    ["changelog", "patch-notes"],
    ["new version", "update-check"],
    ["make the text bigger", "text-size-writing"],
    ["hotkey", "shortcut-search"],
  ])("finds the right setting for %j", (query, expected) => {
    expect(find(query)).toContain(expected);
  });

  // Found by running it: the answer was in the list, nineteenth, behind
  // eighteen colour swatches that had each fuzzily caught one word of the
  // question. A result you have to hunt through is the thing the search box
  // was supposed to replace.
  it("puts the answer to a long question first, not merely somewhere", () => {
    expect(find("where are my files saved")[0]).toBe("projects-folder");
  });

  it("drops the rows that only caught a stray word of a long query", () => {
    const results = find("where are my files saved");
    expect(results.length).toBeLessThanOrEqual(4);
    expect(results).not.toContain("--color-border-subtle");
  });

  // The pruning above may not fire on a one-word query: every match covers the
  // same amount of it, so there is no "answers less of the question" to cut on.
  it("keeps a single-word query broad", () => {
    expect(find("colour").length).toBeGreaterThan(5);
  });

  it("reaches a colour row through the group heading it sits under", () => {
    // The four Text rows are labelled "Main", "Quieter", "Quietest" and
    // "Placeholder" — the word "text" is on the heading above them, not on
    // any row, so without the group as a keyword none of them is reachable.
    expect(find("text colour")).toContain("--color-text-primary");
  });

  it("ranks the labelled match above the ones that only share a keyword", () => {
    expect(find("window")[0]).toBe("--color-bg");
  });

  it("caps how many it returns", () => {
    expect(searchSettings("e", 5).length).toBeLessThanOrEqual(5);
  });

  it("finds nothing for a query that matches nothing", () => {
    expect(searchSettings("xyzzyqwerty")).toEqual([]);
  });
});

// A settings section is defined in two places that can't import each other —
// the data in `constants/settings.ts`, the panel component in
// `SettingsModal.tsx`. Nothing in the type system connects them, so a section
// added to one and not the other is a rail entry that opens a blank pane, or a
// panel nothing can reach. Read the source rather than the module, the same
// way palette-import.test.ts reads index.css.
describe("the rail and the panels agree", () => {
  const MODAL = String(readFileSync("src/components/shell/SettingsModal.tsx", "utf8"));

  it("gives every section in the rail a panel to render", () => {
    const block = /const PANELS[^{]*\{([\s\S]*?)\n\};/.exec(MODAL);
    expect(block).not.toBeNull();

    const mapped = new Set([...(block?.[1] ?? "").matchAll(/^\s*"?([\w-]+)"?:/gm)].map((match) => match[1]));
    for (const tab of SETTINGS_TABS) expect(mapped.has(tab.id)).toBe(true);
    expect(mapped.size).toBe(SETTINGS_TABS.length);
  });
});

// A result that scrolls to nothing is a result that lied about knowing where
// the setting was. The derived ids are interpolated into `data-setting` at
// render time, so what's checkable from here is that each family has an anchor
// at all — enough to catch a whole group of results going dead, which is what
// happens when a panel gets rewritten.
describe("the panels anchor what the index points at", () => {
  const sources = [
    "src/components/shell/ThemeEditor.tsx",
    "src/components/shell/FontSettings.tsx",
    "src/components/shell/ShortcutSettings.tsx",
    "src/components/shell/ThemeSettings.tsx",
  ]
    .map((path) => String(readFileSync(path, "utf8")))
    .join("\n");

  it.each([
    ["colour rows", "data-setting={token.token}"],
    ["gradients", "data-setting={`gradient-${slot.key}`}"],
    ["typefaces", "data-setting={slot.token}"],
    ["text sliders", "data-setting={settingId}"],
    ["shortcuts", "data-setting={`shortcut-${row.action}`}"],
  ])("anchors the %s", (_family, anchor) => {
    expect(sources).toContain(anchor);
  });

  // The Theme panel is the one that holds four different declared settings, so
  // it's the one where landing on the section isn't the same as landing on the
  // setting. Every other declared entry has a panel to itself, where the panel
  // *is* the answer and an anchor would flash the whole screen.
  it.each(["theme-pick", "theme-new", "theme-import", "theme-folder"])("anchors %s", (id) => {
    expect(sources).toContain(`data-setting="${id}"`);
  });
});

describe("groupByTab", () => {
  it("groups results into sections in rail order, not result order", () => {
    const order = SETTINGS_TABS.map((tab) => tab.id);
    const grouped = groupByTab([
      { id: "a", tabId: "updates", tabLabel: "Updates", label: "A", hint: "", keywords: [] },
      { id: "b", tabId: "theme", tabLabel: "Theme", label: "B", hint: "", keywords: [] },
      { id: "c", tabId: "updates", tabLabel: "Updates", label: "C", hint: "", keywords: [] },
    ]);

    expect(grouped.map((group) => group.tabId)).toEqual(["theme", "updates"]);
    expect(order.indexOf(grouped[0].tabId)).toBeLessThan(order.indexOf(grouped[1].tabId));
    expect(grouped[1].entries.map((entry) => entry.id)).toEqual(["a", "c"]);
  });

  it("returns nothing for no results", () => {
    expect(groupByTab([])).toEqual([]);
  });
});
