import { describe, expect, it } from "vitest";
import { chooseWikilinkTarget } from "./wikilink-bracket-confirm";

function item(title: string) {
  return { title, onItemClick: () => {} };
}

// Confirming the top match on `]]` is the point of this feature, not an
// accident — see the file's header. These pin that down so the ambiguity rule
// below can't quietly grow into "always ask".
describe("chooseWikilinkTarget", () => {
  it("confirms the top match, which is what typing the brackets is asking for", () => {
    const items = [item("Valera Jiang"), item("Valeraverse")];
    expect(chooseWikilinkTarget(items, "val")).toBe(items[0]);
  });

  it("still confirms when several match fuzzily, since that is the ordinary case", () => {
    const items = [item("Sampo Koski"), item("Sampo's Boat")];
    expect(chooseWikilinkTarget(items, "sampo")).toBe(items[0]);
  });

  it("confirms an only match", () => {
    const items = [item("ragatha")];
    expect(chooseWikilinkTarget(items, "ragatha")).toBe(items[0]);
  });

  // Her call, 2026-08-21, from having two pages called ragatha: picking one
  // silently is a coin flip, and the link lands on whichever sorted first.
  it("refuses to pick between two pages with the same name", () => {
    expect(chooseWikilinkTarget([item("ragatha"), item("ragatha")], "ragatha")).toBe("ambiguous");
  });

  it("treats a name tie as a tie whatever case either side was typed in", () => {
    expect(chooseWikilinkTarget([item("Ragatha"), item("ragatha")], "RAGATHA")).toBe("ambiguous");
  });

  it("ignores surrounding space when deciding a name is a tie", () => {
    expect(chooseWikilinkTarget([item("ragatha"), item("ragatha")], "  ragatha ")).toBe("ambiguous");
  });

  // An exact hit is a decision, not a guess, so it beats a fuzzy match that
  // happened to sort above it.
  it("prefers an exact name over a fuzzy match listed first", () => {
    const items = [item("Valera"), item("Val")];
    expect(chooseWikilinkTarget(items, "Val")).toBe(items[1]);
  });

  it("does nothing when nothing matches, leaving the brackets to type normally", () => {
    expect(chooseWikilinkTarget([], "nobody")).toBe("none");
  });
});
