import { describe, expect, it } from "vitest";
import { createNode, type Node } from "../constants/schema";
import {
  asTemplateSubtree,
  composeChildName,
  describeAddedChildren,
  namedForParent,
  planAddedChildren,
  renamesFor,
} from "./child-naming";

function page(patch: Partial<Node> & { id: string; name: string; parentId: string | null }): Node {
  return { ...createNode({ parentId: patch.parentId, templateKey: "blank", name: patch.name }), ...patch };
}

describe("composeChildName", () => {
  it("joins the two with the separator, which may be nothing", () => {
    expect(composeChildName("Damien", "Pics", "_")).toBe("Damien_Pics");
    expect(composeChildName("Damien", "Pics", " — ")).toBe("Damien — Pics");
    expect(composeChildName("Damien", "Pics", "")).toBe("DamienPics");
  });
});

describe("namedForParent", () => {
  const pics = page({ id: "pics", name: "Pics", parentId: "target" });
  const sheets = page({ id: "sheets", name: "Sheets", parentId: "target" });
  const old = page({ id: "old", name: "Old", parentId: "pics" });

  it("names the direct children after the page, and remembers what they were made of", () => {
    const out = namedForParent([pics, sheets, old], "target", "Damien", { separator: "_" });
    expect(out.map((n) => n.name)).toEqual(["Damien_Pics", "Damien_Sheets", "Old"]);
    expect(out[0].nameFromParent).toEqual({ base: "Pics", separator: "_" });
    expect(out[2].nameFromParent).toBeUndefined();
  });

  it("leaves everything alone without a rule", () => {
    const out = namedForParent([pics, sheets], "target", "Damien", undefined);
    expect(out[0]).toBe(pics);
    expect(out[1].nameFromParent).toBeUndefined();
  });

  it("composes a rule nested inside a rule from the parent's finished name", () => {
    const withRule = { ...pics, namesChildren: { separator: "-" } };
    // Order deliberately child-first, since the subtree comes in no promised order.
    const out = namedForParent([old, withRule], "target", "Damien", { separator: "_" });
    expect(out.map((n) => n.name)).toEqual(["Damien_Pics-Old", "Damien_Pics"]);
    expect(out[0].nameFromParent).toEqual({ base: "Old", separator: "-" });
  });
});

describe("renamesFor", () => {
  const nodes: Record<string, Node> = {
    damien: page({ id: "damien", name: "Damien", parentId: null }),
    pics: page({ id: "pics", name: "Damien_Pics", parentId: "damien", nameFromParent: { base: "Pics", separator: "_" } }),
    // Renamed by hand since — no marker, so not touched.
    sheets: page({ id: "sheets", name: "Sheet Stuff", parentId: "damien" }),
    other: page({ id: "other", name: "Damien_Pics", parentId: null, nameFromParent: { base: "Pics", separator: "_" } }),
  };

  it("remakes the names of the children that still follow the rule", () => {
    expect(renamesFor(nodes, "damien", "Damian")).toEqual([{ id: "pics", name: "Damian_Pics" }]);
  });

  it("says nothing when the names already match", () => {
    expect(renamesFor(nodes, "damien", "Damien")).toEqual([]);
  });
});

describe("planAddedChildren", () => {
  const pics = page({ id: "pics", name: "Damien_Pics", parentId: "target" });
  const sheets = page({ id: "sheets", name: "Damien_Sheets", parentId: "target" });
  const old = page({ id: "old", name: "Old", parentId: "pics" });

  it("skips a child whose name is already there, whatever the case, and its own pages with it", () => {
    const { make, skipped } = planAddedChildren([pics, sheets, old], "target", ["damien_pics", "Notes"]);
    expect(make.map((n) => n.id)).toEqual(["sheets"]);
    expect(skipped.map((n) => n.id)).toEqual(["pics"]);
  });

  it("makes everything when nothing is there", () => {
    const { make, skipped } = planAddedChildren([pics, sheets, old], "target", []);
    expect(make).toHaveLength(3);
    expect(skipped).toEqual([]);
  });
});

describe("asTemplateSubtree", () => {
  it("reads the rule back off the children and stores them under their base names", () => {
    const root = page({ id: "r", name: "Damien", parentId: null });
    const pics = page({ id: "p", name: "Damien_Pics", parentId: "r", nameFromParent: { base: "Pics", separator: "_" } });
    const own = page({ id: "o", name: "Diary", parentId: "r" });
    const out = asTemplateSubtree([root, pics, own]);
    expect(out[0].namesChildren).toEqual({ separator: "_" });
    expect(out[1].name).toBe("Pics");
    expect(out[1].nameFromParent).toBeUndefined();
    expect(out[2].name).toBe("Diary");
  });

  it("makes a template with no rule from a page whose children have none", () => {
    const root = page({ id: "r", name: "Damien", parentId: null, namesChildren: { separator: "_" } });
    const own = page({ id: "o", name: "Diary", parentId: "r" });
    const out = asTemplateSubtree([root, own]);
    expect(out[0].namesChildren).toBeUndefined();
  });

  it("keeps a composed name on a page whose parent is not coming along", () => {
    const pics = page({ id: "p", name: "Damien_Pics", parentId: "r", nameFromParent: { base: "Pics", separator: "_" } });
    const out = asTemplateSubtree([pics]);
    expect(out[0].name).toBe("Damien_Pics");
    expect(out[0].nameFromParent).toBeUndefined();
  });
});

describe("describeAddedChildren", () => {
  it("counts in plain words", () => {
    expect(describeAddedChildren("Damien", 3, 0)).toBe('3 pages added inside "Damien".');
    expect(describeAddedChildren("Damien", 1, 2)).toBe('1 page added inside "Damien"; 2 already there and left alone.');
    expect(describeAddedChildren("Damien", 0, 3)).toBe('Nothing added inside "Damien" — all 3 were already there.');
    expect(describeAddedChildren("Damien", 0, 1)).toBe('Nothing added inside "Damien" — its page was already there.');
    expect(describeAddedChildren("Damien", 0, 0)).toBe("The template has no pages inside it to add.");
  });
});
