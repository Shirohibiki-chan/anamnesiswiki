import { describe, expect, it } from "vitest";
import { createNode, type Node } from "../constants/schema";
import {
  CAPTURE_TITLE_MAX_CHARS,
  CAPTURE_UNTITLED,
  captureDestinations,
  captureDocument,
  captureStamp,
  filterDestinations,
  parseCapture,
} from "./capture-service";

function page(name: string, parentId: string | null = null, patch: Partial<Node> = {}): Node {
  return { ...createNode({ parentId, templateKey: "blank", name }), ...patch };
}

function graph(...list: Node[]): Record<string, Node> {
  return Object.fromEntries(list.map((node) => [node.id, node]));
}

describe("captureDestinations", () => {
  it("lists the root first, then its children by name", () => {
    const root = page("Quick capture");
    const story = page("Story", root.id);
    const magic = page("Magic", root.id);
    const grandchild = page("Deeper", magic.id);
    const elsewhere = page("Elsewhere");
    const list = captureDestinations(graph(root, story, magic, grandchild, elsewhere), root.id);
    expect(list.map((d) => d.name)).toEqual(["Quick capture", "Magic", "Story"]);
    expect(list[0].isRoot).toBe(true);
    expect(list[1].isRoot).toBe(false);
  });

  it("is empty for a root that no longer exists", () => {
    expect(captureDestinations({}, "gone")).toEqual([]);
  });

  it("names an unnamed page rather than leaving a blank row", () => {
    const root = page("");
    expect(captureDestinations(graph(root), root.id)[0].name).toBe("Untitled");
  });
});

describe("filterDestinations", () => {
  const list = [
    { id: "r", name: "Quick capture", isRoot: true },
    { id: "m", name: "Magic", isRoot: false },
    { id: "s", name: "Story", isRoot: false },
  ];

  it("returns everything for an empty query", () => {
    expect(filterDestinations(list, "  ")).toEqual(list);
  });

  it("narrows by a case-insensitive substring", () => {
    expect(filterDestinations(list, "MA").map((d) => d.id)).toEqual(["m"]);
    expect(filterDestinations(list, "c").map((d) => d.id)).toEqual(["r", "m"]);
  });
});

describe("parseCapture", () => {
  const destinations = [
    { id: "r", name: "Quick capture", isRoot: true },
    { id: "m", name: "Magic", isRoot: false },
    { id: "o", name: "Other", isRoot: false },
  ];

  it("takes the first line as the title and the rest as the body", () => {
    const parsed = parseCapture("i love witches!\n\nthey should have hats", destinations);
    expect(parsed.title).toBe("i love witches!");
    expect(parsed.body).toEqual(["", "they should have hats"]);
    expect(parsed.codeWordId).toBeUndefined();
  });

  it("reads a code word and drops it from the title", () => {
    const parsed = parseCapture("magic - i love witches!", destinations);
    expect(parsed.codeWordId).toBe("m");
    expect(parsed.title).toBe("i love witches!");
  });

  it("accepts an en dash or an em dash as the separator", () => {
    expect(parseCapture("Magic – one", destinations).codeWordId).toBe("m");
    expect(parseCapture("MAGIC — two", destinations).codeWordId).toBe("m");
  });

  it("leaves an unmatched word in the title rather than filing it anywhere", () => {
    const parsed = parseCapture("magick - i love witches!", destinations);
    expect(parsed.codeWordId).toBeUndefined();
    expect(parsed.title).toBe("magick - i love witches!");
  });

  it("does not read a hyphenated word as a code word", () => {
    const parsed = parseCapture("well-known - fact", destinations);
    expect(parsed.codeWordId).toBeUndefined();
    expect(parsed.title).toBe("well-known - fact");
  });

  it("matches the whole name only, never a prefix", () => {
    expect(parseCapture("mag - short", destinations).codeWordId).toBeUndefined();
  });

  it("takes the next line as the title when the code word stands alone", () => {
    const parsed = parseCapture("magic -\nwands are wood", destinations);
    expect(parsed.codeWordId).toBe("m");
    expect(parsed.title).toBe("wands are wood");
    expect(parsed.body).toEqual([]);
  });

  it("ignores leading and trailing blank lines", () => {
    const parsed = parseCapture("\n\n  a thought  \n\n", destinations);
    expect(parsed.title).toBe("a thought");
    expect(parsed.body).toEqual([]);
  });

  it("names an empty capture rather than making a page with no name", () => {
    expect(parseCapture("   ", destinations).title).toBe(CAPTURE_UNTITLED);
  });

  it("keeps a long first line in the body and cuts the title at a word", () => {
    const line = "the ".repeat(30).trim() + " end";
    const parsed = parseCapture(line, destinations);
    expect(parsed.title.length).toBeLessThanOrEqual(CAPTURE_TITLE_MAX_CHARS + 1);
    expect(parsed.title.endsWith("…")).toBe(true);
    expect(parsed.title).not.toMatch(/ …$/);
    expect(parsed.body[0]).toBe(line);
  });
});

describe("captureDocument", () => {
  it("makes one paragraph per non-empty line", () => {
    expect(captureDocument(["one", "  ", "two "])).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "one", styles: {} }] },
      { type: "paragraph", content: [{ type: "text", text: "two", styles: {} }] },
    ]);
  });

  it("is empty for an empty body", () => {
    expect(captureDocument([])).toEqual([]);
  });
});

describe("captureStamp", () => {
  it("writes a zero-padded local date and time that sorts as text", () => {
    expect(captureStamp(new Date(2026, 8, 3, 7, 5))).toBe("2026-09-03 07:05");
    expect(captureStamp(new Date(2026, 11, 31, 23, 59)) > captureStamp(new Date(2026, 8, 3, 7, 5))).toBe(true);
  });
});
