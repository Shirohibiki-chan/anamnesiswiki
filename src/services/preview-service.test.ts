import { describe, expect, it } from "vitest";
import { buildNodePreview, truncateAtWord } from "./preview-service";
import { createNode, createTab } from "../constants/schema";
import type { BlockNoteDocument } from "../constants/schema";

function doc(...paragraphs: string[]): BlockNoteDocument {
  return paragraphs.map((text) => ({
    type: "paragraph",
    content: [{ type: "text", text, styles: {} }],
  })) as BlockNoteDocument;
}

function page(tabs: { label: string; text?: string; hidden?: boolean }[]) {
  return createNode({
    name: "Valera Jiang",
    templateKey: "character",
    parentId: null,
    tabs: tabs.map((tab, index) =>
      createTab({
        id: `t${index}`,
        label: tab.label,
        hidden: tab.hidden,
        content: tab.text ? doc(tab.text) : [],
      }),
    ),
  });
}

describe("truncateAtWord", () => {
  it("leaves anything already short enough alone", () => {
    expect(truncateAtWord("a short line", 40)).toBe("a short line");
  });

  it("cuts at a word boundary and marks the cut", () => {
    expect(truncateAtWord("one two three four five", 12)).toBe("one two…");
  });

  // "Cut at the last space" returns nothing at all for a single long word, so
  // there's a floor on how far back the boundary search will go.
  it("cuts mid-word rather than returning nothing for one very long word", () => {
    expect(truncateAtWord("supercalifragilistic", 10)).toBe("supercalif…");
  });

  it("doesn't add an ellipsis when it didn't cut", () => {
    expect(truncateAtWord("exactly ten", 11)).toBe("exactly ten");
  });
});

describe("buildNodePreview", () => {
  it("carries the page's own identity", () => {
    const preview = buildNodePreview(page([{ label: "Overview", text: "A swordswoman." }]));
    expect(preview.name).toBe("Valera Jiang");
    expect(preview.templateLabel).toBe("Character");
    expect(preview.excerpt).toBe("A swordswoman.");
    expect(preview.tabLabel).toBe("Overview");
  });

  // A template seeds several tabs and only some get filled, so "the first tab"
  // is regularly an empty one with the writing two along.
  it("skips empty tabs to find the one with writing in it", () => {
    const preview = buildNodePreview(page([{ label: "Appearance" }, { label: "History", text: "Born in Xiling." }]));
    expect(preview.excerpt).toBe("Born in Xiling.");
    expect(preview.tabLabel).toBe("History");
  });

  // A tab held back from readers shouldn't leak out through a preview of the
  // page it's sitting on.
  it("never reads a hidden tab", () => {
    const preview = buildNodePreview(page([{ label: "Secrets", text: "She is the heir.", hidden: true }]));
    expect(preview.excerpt).toBe("");
    expect(preview.tabLabel).toBeNull();
  });

  it("reports an empty page as empty rather than guessing", () => {
    const preview = buildNodePreview(page([{ label: "Overview" }]));
    expect(preview.excerpt).toBe("");
    expect(preview.tabLabel).toBeNull();
  });

  it("truncates a long tab to the limit it's given", () => {
    const preview = buildNodePreview(page([{ label: "Overview", text: "word ".repeat(200) }]), 20);
    expect(preview.excerpt.length).toBeLessThanOrEqual(21);
    expect(preview.excerpt.endsWith("…")).toBe(true);
  });
});
