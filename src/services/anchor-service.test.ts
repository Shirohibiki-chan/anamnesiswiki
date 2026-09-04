// What a block link is allowed to be. It arrives off the clipboard, so every
// test here is a way something that is not a link could be read as one.
import { describe, expect, it } from "vitest";
import type { Tab } from "../constants/schema";
import { anchorLink, parseAnchorLink, tabHoldingBlock } from "./anchor-service";

const tab = (id: string, content: unknown[]): Tab => ({ id, label: id, hidden: false, content });

describe("anchorLink", () => {
  it("writes a page and a block into one line of text", () => {
    expect(anchorLink({ nodeId: "abc", blockId: "xyz" })).toBe("anamnesis://page/abc#xyz");
  });

  it("reads back what it wrote", () => {
    const anchor = { nodeId: "9f2b-1", blockId: "block_7" };
    expect(parseAnchorLink(anchorLink(anchor))).toEqual(anchor);
  });
});

describe("parseAnchorLink", () => {
  it("allows the newline that comes with selecting a line", () => {
    expect(parseAnchorLink("  anamnesis://page/abc#xyz\n")).toEqual({ nodeId: "abc", blockId: "xyz" });
  });

  it("refuses a link with a sentence around it", () => {
    // Pasting a paragraph that mentions a link is pasting a paragraph.
    expect(parseAnchorLink("see anamnesis://page/abc#xyz for the rest")).toBeNull();
  });

  it("refuses anything else on the clipboard", () => {
    expect(parseAnchorLink("https://example.com/page/abc#xyz")).toBeNull();
    expect(parseAnchorLink("anamnesis://page/abc")).toBeNull();
    expect(parseAnchorLink("")).toBeNull();
  });

  it("refuses ids with anything but id characters in them", () => {
    expect(parseAnchorLink("anamnesis://page/../..#xyz")).toBeNull();
    expect(parseAnchorLink("anamnesis://page/abc#a b")).toBeNull();
  });
});

describe("tabHoldingBlock", () => {
  it("finds the tab a block is written in", () => {
    const tabs = [tab("one", [{ id: "a" }]), tab("two", [{ id: "b" }])];
    expect(tabHoldingBlock(tabs, "b")).toBe("two");
  });

  it("looks inside blocks that hold blocks", () => {
    // A heading that collapses, a lane of columns: the block is a child, and a
    // link to it is not a link to whatever it is sitting in.
    const tabs = [tab("one", [{ id: "row", children: [{ id: "lane", children: [{ id: "deep" }] }] }])];
    expect(tabHoldingBlock(tabs, "deep")).toBe("one");
  });

  it("counts a hidden tab", () => {
    const tabs = [{ ...tab("secret", [{ id: "a" }]), hidden: true }];
    expect(tabHoldingBlock(tabs, "a")).toBe("secret");
  });

  it("says nothing for a block that has been deleted", () => {
    expect(tabHoldingBlock([tab("one", [{ id: "a" }])], "gone")).toBeNull();
  });

  it("holds up against a document that is not the shape it should be", () => {
    const tabs = [tab("one", [null, "text", { id: 4 }, { children: "no" }] as unknown[])];
    expect(tabHoldingBlock(tabs, "a")).toBeNull();
  });
});
