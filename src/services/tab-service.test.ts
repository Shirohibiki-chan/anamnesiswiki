import { describe, expect, it } from "vitest";
import {
  contentIsUntouched,
  withTabAdded,
  withTabContent,
  withTabDeleted,
  withTabHiddenToggled,
  withTabRenamed,
  withTabsReordered,
} from "./tab-service";
import { createTab, type Tab } from "../constants/schema";

function tabs(): Tab[] {
  return [
    createTab({ id: "a", label: "Overview", content: [{ type: "paragraph" }] }),
    createTab({ id: "b", label: "History" }),
    createTab({ id: "c", label: "Secrets", hidden: true }),
  ];
}

describe("withTabContent", () => {
  it("replaces one tab's content and leaves the others alone", () => {
    const after = withTabContent(tabs(), "b", [{ type: "heading" }]);
    expect(after[1].content).toEqual([{ type: "heading" }]);
    expect(after[0].content).toEqual([{ type: "paragraph" }]);
  });

  // A debounced editor write can land after its tab was deleted.
  it("ignores a tab that isn't there", () => {
    expect(withTabContent(tabs(), "gone", [{ type: "heading" }])).toEqual(tabs());
  });

  it("does not mutate what it was given", () => {
    const original = tabs();
    withTabContent(original, "a", [{ type: "heading" }]);
    expect(original[0].content).toEqual([{ type: "paragraph" }]);
  });
});

describe("withTabHiddenToggled", () => {
  it("hides a visible tab and shows a hidden one", () => {
    expect(withTabHiddenToggled(tabs(), "a")[0].hidden).toBe(true);
    expect(withTabHiddenToggled(tabs(), "c")[2].hidden).toBe(false);
  });
});

describe("withTabRenamed", () => {
  it("renames just that tab", () => {
    const after = withTabRenamed(tabs(), "b", "Backstory");
    expect(after.map((t) => t.label)).toEqual(["Overview", "Backstory", "Secrets"]);
  });
});

describe("withTabDeleted", () => {
  it("takes the tab out", () => {
    expect(withTabDeleted(tabs(), "b").map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("leaves the list alone when the id is unknown", () => {
    expect(withTabDeleted(tabs(), "gone").map((t) => t.id)).toEqual(["a", "b", "c"]);
  });
});

describe("withTabAdded", () => {
  it("appends, and hands back the tab it made", () => {
    const { tabs: after, tab } = withTabAdded(tabs(), "new", "Notes");
    expect(after.map((t) => t.id)).toEqual(["a", "b", "c", "new"]);
    expect(tab).toMatchObject({ id: "new", label: "Notes", hidden: false, content: [] });
  });

  it("takes the writing it should start with", () => {
    const content = [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }];
    const { tab } = withTabAdded([], "first", "Overview", content);
    expect(tab.content).toBe(content);
  });
});

describe("contentIsUntouched", () => {
  const empty = { type: "paragraph", props: {}, content: [], children: [] };

  it("treats nothing, and the one blank paragraph an editor starts with, as untouched", () => {
    expect(contentIsUntouched([])).toBe(true);
    expect(contentIsUntouched([empty])).toBe(true);
  });

  it("counts a word as writing", () => {
    expect(contentIsUntouched([{ ...empty, content: [{ type: "text", text: "a" }] }])).toBe(false);
  });

  it("counts a block with no text in it as writing", () => {
    expect(contentIsUntouched([{ type: "image", props: { url: "x" }, children: [] }])).toBe(false);
    expect(contentIsUntouched([{ ...empty, type: "heading" }])).toBe(false);
  });

  it("counts a second block, or a nested one, as writing", () => {
    expect(contentIsUntouched([empty, empty])).toBe(false);
    expect(contentIsUntouched([{ ...empty, children: [empty] }])).toBe(false);
  });
});

describe("withTabsReordered", () => {
  it("puts the tabs in the order given", () => {
    expect(withTabsReordered(tabs(), ["c", "a", "b"])?.map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  // The whole reason this returns null rather than the tabs it could match.
  // Writing a short list would drop a tab and everything written in it.
  it("refuses an order that has lost a tab", () => {
    expect(withTabsReordered(tabs(), ["a", "b"])).toBeNull();
  });

  it("refuses an order naming a tab that isn't here", () => {
    expect(withTabsReordered(tabs(), ["a", "b", "c", "ghost"])).toBeNull();
  });

  it("refuses an order that repeats one instead of naming another", () => {
    expect(withTabsReordered(tabs(), ["a", "a", "b"])).toBeNull();
  });
});
