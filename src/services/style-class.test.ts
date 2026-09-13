import { describe, expect, it } from "vitest";
import { createNode, createTemplateLibrary, type Node, type TemplateLibrary } from "../constants/schema";
import { addOverride, buildOverrideNode } from "./template-library";
import { effectiveStyleClass, normaliseStyleClass, STYLE_CLASS_MAX_CHARS, styleClassesInUse } from "./style-class";

function page(patch: Partial<Node> = {}): Node {
  return { ...createNode({ parentId: null, templateKey: "character", name: "Valera" }), ...patch };
}

function libraryWithOverride(templateKey: string, styleClass?: string): TemplateLibrary {
  const override = { ...buildOverrideNode(templateKey, "override-1", "Character", []), ...(styleClass ? { styleClass } : {}) };
  return addOverride(createTemplateLibrary(), templateKey, override);
}

describe("normaliseStyleClass", () => {
  it("lowercases and hyphenates spaces and underscores", () => {
    expect(normaliseStyleClass("Character Sheet")).toBe("character-sheet");
    expect(normaliseStyleClass("my_dashboard")).toBe("my-dashboard");
  });

  it("drops anything a selector would need escaping for", () => {
    expect(normaliseStyleClass("zen: home!")).toBe("zen-home");
    expect(normaliseStyleClass("a.b")).toBe("ab");
  });

  it("collapses runs of hyphens and trims the ends", () => {
    expect(normaliseStyleClass("--a---b--")).toBe("a-b");
  });

  it("is nothing for an empty or all-punctuation name", () => {
    expect(normaliseStyleClass("")).toBeUndefined();
    expect(normaliseStyleClass("   ")).toBeUndefined();
    expect(normaliseStyleClass("!!!")).toBeUndefined();
    expect(normaliseStyleClass(undefined)).toBeUndefined();
  });

  it("caps the length", () => {
    expect(normaliseStyleClass("x".repeat(100))).toHaveLength(STYLE_CLASS_MAX_CHARS);
  });
});

describe("effectiveStyleClass", () => {
  it("is the page's own when it has one", () => {
    expect(effectiveStyleClass(page({ styleClass: "mine" }), libraryWithOverride("character", "sheet"))).toBe("mine");
  });

  it("falls back to this world's copy of the template", () => {
    expect(effectiveStyleClass(page(), libraryWithOverride("character", "sheet"))).toBe("sheet");
  });

  it("is nothing when neither names one", () => {
    expect(effectiveStyleClass(page(), libraryWithOverride("character"))).toBeUndefined();
    expect(effectiveStyleClass(page(), createTemplateLibrary())).toBeUndefined();
  });

  it("ignores an override for a different template", () => {
    expect(effectiveStyleClass(page(), libraryWithOverride("location", "map"))).toBeUndefined();
  });
});

describe("styleClassesInUse", () => {
  it("gathers page and template names once each, sorted", () => {
    const nodes = Object.fromEntries(
      [page({ styleClass: "zen" }), page({ styleClass: "atlas" }), page({ styleClass: "zen" }), page()].map((n) => [n.id, n]),
    );
    expect(styleClassesInUse(nodes, libraryWithOverride("character", "sheet"))).toEqual(["atlas", "sheet", "zen"]);
  });
});
