import { describe, expect, it } from "vitest";
import { resolveNodePath } from "./filesystem-service";
import { FOLDER_TEMPLATE_KEY, type Node } from "../constants/schema";

function node(overrides: Partial<Node> & Pick<Node, "id" | "name" | "parentId" | "templateKey">): Node {
  return {
    tabs: [],
    properties: {},
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("resolveNodePath", () => {
  it("resolves a root-level page to a bare .json file", () => {
    const page = node({ id: "1", name: "Valera Jiang", parentId: null, templateKey: "character" });
    expect(resolveNodePath(page, [page])).toEqual({ dirSegments: [], fileName: "Valera Jiang.json" });
  });

  it("resolves a root-level folder to its own directory + _folder.json", () => {
    const folder = node({ id: "1", name: "Canon", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    expect(resolveNodePath(folder, [folder])).toEqual({ dirSegments: ["Canon"], fileName: "_folder.json" });
  });

  it("nests a page inside ancestor folder directories", () => {
    const aus = node({ id: "aus", name: "AUs", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const demonic = node({ id: "demonic", name: "Demonic AU", parentId: "aus", templateKey: FOLDER_TEMPLATE_KEY });
    const page = node({ id: "page", name: "Valera Jiang", parentId: "demonic", templateKey: "character" });
    const all = [aus, demonic, page];
    expect(resolveNodePath(page, all)).toEqual({
      dirSegments: ["AUs", "Demonic AU"],
      fileName: "Valera Jiang.json",
    });
  });

  it("nests a folder inside ancestor folder directories", () => {
    const aus = node({ id: "aus", name: "AUs", parentId: null, templateKey: FOLDER_TEMPLATE_KEY });
    const demonic = node({ id: "demonic", name: "Demonic AU", parentId: "aus", templateKey: FOLDER_TEMPLATE_KEY });
    const all = [aus, demonic];
    expect(resolveNodePath(demonic, all)).toEqual({
      dirSegments: ["AUs", "Demonic AU"],
      fileName: "_folder.json",
    });
  });

  it("suffixes the second same-named sibling of the same type, ordered by creation time", () => {
    const first = node({ id: "1", name: "Sampo Koski", parentId: null, templateKey: "character", createdAt: 1 });
    const second = node({ id: "2", name: "Sampo Koski", parentId: null, templateKey: "character", createdAt: 2 });
    const all = [first, second];
    expect(resolveNodePath(first, all).fileName).toBe("Sampo Koski.json");
    expect(resolveNodePath(second, all).fileName).toBe("Sampo Koski (2).json");
  });

  it("does not collide a folder and a page sharing the same name", () => {
    const folder = node({ id: "f", name: "Foxians", parentId: null, templateKey: FOLDER_TEMPLATE_KEY, createdAt: 1 });
    const page = node({ id: "p", name: "Foxians", parentId: null, templateKey: "species", createdAt: 2 });
    const all = [folder, page];
    expect(resolveNodePath(folder, all)).toEqual({ dirSegments: ["Foxians"], fileName: "_folder.json" });
    expect(resolveNodePath(page, all)).toEqual({ dirSegments: [], fileName: "Foxians.json" });
  });

  it("sanitizes filesystem-illegal characters out of the segment name", () => {
    const page = node({ id: "1", name: 'Who Is "Them"? / A Mystery', parentId: null, templateKey: "note" });
    expect(resolveNodePath(page, [page]).fileName).toBe("Who Is _Them__ _ A Mystery.json");
  });
});
