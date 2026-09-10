import { describe, expect, it } from "vitest";
import { ASSET_REF_PREFIX } from "../constants/paths";
import { createNode, type Node } from "../constants/schema";
import { bumpLossy, collectSubtree, createLossyTally, createPictureResolver, lossyCount, plural, walkPages, PICTURE_MISS } from "./export-walk";

function node(id: string, parentId: string | null): Node {
  return { ...createNode({ name: id, parentId, templateKey: "note" }), id };
}

/**
 * The tree's own ordering, as `walkPages` asks for it. Written as a map of
 * parent to children so a test reads as the shape it is describing.
 */
function ordering(shape: Record<string, string[]>): (parentId: string | null) => string[] {
  return (parentId) => shape[parentId ?? "root"] ?? [];
}

describe("collectSubtree", () => {
  it("takes descendants along, however deep — no export format offers a choice about it", () => {
    const nodes = [node("a", null), node("b", "a"), node("c", "b"), node("d", null)];
    expect([...collectSubtree(["a"], nodes)].sort()).toEqual(["a", "b", "c"]);
  });

  it("takes several roots at once without counting a shared descendant twice", () => {
    const nodes = [node("a", null), node("b", "a"), node("c", null)];
    expect([...collectSubtree(["a", "b", "c"], nodes)].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("walkPages", () => {
  it("comes out depth-first in the order the tree shows, not the order the nodes were given", () => {
    const nodes = [node("second", null), node("first", null), node("child", "first")];
    const walked = walkPages({
      nodes,
      rootIds: ["first", "second"],
      orderedIdsFor: ordering({ root: ["first", "second"], first: ["child"] }),
    });
    expect(walked.map((page) => page.node.id)).toEqual(["first", "child", "second"]);
  });

  it("numbers siblings from zero without gaps, per parent", () => {
    const nodes = [node("a", null), node("a1", "a"), node("a2", "a"), node("b", null)];
    const walked = walkPages({
      nodes,
      rootIds: ["a", "b"],
      orderedIdsFor: ordering({ root: ["a", "b"], a: ["a1", "a2"] }),
    });
    expect(walked.map((page) => [page.node.id, page.index])).toEqual([
      ["a", 0],
      ["a1", 0],
      ["a2", 1],
      ["b", 1],
    ]);
  });

  // The rule the whole walk exists for: exporting one deep page must not
  // produce a hole where its ancestors were.
  it("hangs a page off the nearest ancestor that travelled, not off its own parent", () => {
    const nodes = [node("top", null), node("middle", "top"), node("deep", "middle")];
    const walked = walkPages({
      nodes,
      rootIds: ["deep"],
      orderedIdsFor: ordering({ root: ["top"], top: ["middle"], middle: ["deep"] }),
    });
    expect(walked).toHaveLength(1);
    expect(walked[0].node.id).toBe("deep");
    expect(walked[0].parent).toBeNull();
    expect(walked[0].depth).toBe(0);
  });

  // An ancestor can only be left behind by not being asked for, since asking
  // for one takes everything under it. So the shape to check is a deep page
  // exported beside an unrelated one: the two stayed-behind levels above it
  // must not push it down, and it must still sort where the tree puts it.
  it("does not let a left-behind ancestor become a level of depth", () => {
    const nodes = [node("a", null), node("mid", "a"), node("deep", "mid"), node("b", null)];
    const walked = walkPages({
      nodes,
      rootIds: ["deep", "b"],
      orderedIdsFor: ordering({ root: ["a", "b"], a: ["mid"], mid: ["deep"] }),
    });
    expect(walked.map((page) => [page.node.id, page.parent?.id ?? null, page.depth, page.index])).toEqual([
      ["deep", null, 0, 0],
      ["b", null, 0, 1],
    ]);
  });

  it("counts a page whose older siblings stayed behind as the first child of what it lands under", () => {
    const nodes = [node("home", null), node("one", "home"), node("two", "home"), node("three", "home")];
    const walked = walkPages({
      nodes,
      rootIds: ["three"],
      orderedIdsFor: ordering({ root: ["home"], home: ["one", "two", "three"] }),
    });
    expect(walked.map((page) => [page.node.id, page.index])).toEqual([["three", 0]]);
  });

  it("drops a node the tree order never mentions, because the tree is what exists", () => {
    const nodes = [node("a", null), node("orphan", "a")];
    const walked = walkPages({ nodes, rootIds: ["a"], orderedIdsFor: ordering({ root: ["a"] }) });
    expect(walked.map((page) => page.node.id)).toEqual(["a"]);
  });

  it("gives the same answer twice, so an untouched world exports identically", () => {
    const nodes = [node("a", null), node("a1", "a"), node("b", null)];
    const input = { nodes, rootIds: ["a", "b"], orderedIdsFor: ordering({ root: ["a", "b"], a: ["a1"] }) };
    const first = walkPages(input).map((page) => [page.node.id, page.index, page.depth]);
    expect(walkPages(input).map((page) => [page.node.id, page.index, page.depth])).toEqual(first);
  });
});

describe("the tally", () => {
  it("counts by kind and says nothing about kinds nothing happened to", () => {
    const tally = createLossyTally();
    bumpLossy(tally, "graphs");
    bumpLossy(tally, "graphs");
    expect(lossyCount(tally, "graphs")).toBe(2);
    expect(lossyCount(tally, "meters")).toBe(0);
  });

  it("pluralises on the count, since every note is a count", () => {
    expect(plural(1, "picture")).toBe("1 picture");
    expect(plural(0, "picture")).toBe("0 pictures");
    expect(plural(2, "picture")).toBe("2 pictures");
  });
});

describe("createPictureResolver", () => {
  const ref = `${ASSET_REF_PREFIX}portrait.png`;

  it("prefers the address a picture was imported from over carrying its bytes", () => {
    const tally = createLossyTally();
    const resolver = createPictureResolver({
      sources: { "portrait.png": "https://example.com/portrait.png" },
      embedded: { "portrait.png": "data:image/png;base64,AAAA" },
      tally,
    });
    expect(resolver.addressFor(ref)).toBe("https://example.com/portrait.png");
    expect(lossyCount(tally, PICTURE_MISS)).toBe(0);
  });

  it("falls back to the bytes when there is no address", () => {
    const tally = createLossyTally();
    const resolver = createPictureResolver({ embedded: { "portrait.png": "data:image/png;base64,AAAA" }, tally });
    expect(resolver.addressFor(ref)).toBe("data:image/png;base64,AAAA");
    expect(resolver.missingFiles()).toEqual([]);
  });

  it("counts a picture it cannot place, and lists the file so the caller can offer to carry it", () => {
    const tally = createLossyTally();
    const resolver = createPictureResolver({ tally });
    expect(resolver.addressFor(ref)).toBeUndefined();
    expect(lossyCount(tally, PICTURE_MISS)).toBe(1);
    expect(resolver.missingFiles()).toEqual(["portrait.png"]);
  });

  // One picture on six pages is one file to size, six things to report.
  it("lists a repeated picture once but counts it every time", () => {
    const tally = createLossyTally();
    const resolver = createPictureResolver({ tally });
    resolver.addressFor(ref);
    resolver.addressFor(ref);
    expect(resolver.missingFiles()).toEqual(["portrait.png"]);
    expect(lossyCount(tally, PICTURE_MISS)).toBe(2);
  });

  it("answers the same question for a portrait or banner, which hold a bare filename", () => {
    const tally = createLossyTally();
    const resolver = createPictureResolver({ embedded: { "banner.jpg": "data:image/jpeg;base64,AAAA" }, tally });
    expect(resolver.addressForFile("banner.jpg", undefined)).toBe("data:image/jpeg;base64,AAAA");
    expect(resolver.addressForFile("banner.jpg", "https://example.com/b.jpg")).toBe("https://example.com/b.jpg");
    expect(resolver.addressForFile("missing.jpg", undefined)).toBeUndefined();
    expect(resolver.missingFiles()).toEqual(["missing.jpg"]);
  });

  it("counts a picture with no filename we recognise without offering a file to carry", () => {
    const tally = createLossyTally();
    const resolver = createPictureResolver({ tally });
    expect(resolver.addressFor(undefined)).toBeUndefined();
    expect(lossyCount(tally, PICTURE_MISS)).toBe(1);
    expect(resolver.missingFiles()).toEqual([]);
  });
});
