import { describe, expect, it } from "vitest";
import { decideAmongNestedWorlds, isReservedWorldName, WORLD_SCAN_DEPTH } from "./world-scan";

describe("isReservedWorldName", () => {
  it("refuses the app's own folders", () => {
    expect(isReservedWorldName("themes")).toBe(true);
    expect(isReservedWorldName("snippets")).toBe(true);
  });

  it("ignores case and surrounding space, since a folder name carries both", () => {
    expect(isReservedWorldName("Themes")).toBe(true);
    expect(isReservedWorldName("  SNIPPETS ")).toBe(true);
  });

  it("leaves ordinary world names alone", () => {
    expect(isReservedWorldName("Valeraverse")).toBe(false);
    // Near misses are still worlds — only the two exact names are app data.
    expect(isReservedWorldName("themes of the north")).toBe(false);
    expect(isReservedWorldName("Snippet")).toBe(false);
  });
});

describe("decideAmongNestedWorlds", () => {
  it("opens the only world inside directly", () => {
    // The Valeraverse/Valeraverse/ case an unzip produces.
    expect(decideAmongNestedWorlds(["/picked/Valeraverse"])).toEqual({
      kind: "world",
      path: "/picked/Valeraverse",
    });
  });

  it("asks when there are several, rather than guessing one", () => {
    const outcome = decideAmongNestedWorlds(["/picked/B", "/picked/A"]);
    expect(outcome).toEqual({ kind: "choose", paths: ["/picked/A", "/picked/B"] });
  });

  it("sorts the choices, so two looks at one folder ask the same question", () => {
    // readDir promises no order; an unsorted list reshuffles between looks.
    const first = decideAmongNestedWorlds(["/p/C", "/p/A", "/p/B"]);
    const second = decideAmongNestedWorlds(["/p/B", "/p/C", "/p/A"]);
    expect(first).toEqual(second);
  });

  it("does not mutate what it was handed", () => {
    const inside = ["/p/B", "/p/A"];
    decideAmongNestedWorlds(inside);
    expect(inside).toEqual(["/p/B", "/p/A"]);
  });

  it("reports nothing found when the folder holds no worlds", () => {
    expect(decideAmongNestedWorlds([])).toEqual({ kind: "none" });
  });
});

describe("WORLD_SCAN_DEPTH", () => {
  it("reaches a world tidied one folder down, and stops there", () => {
    // Her worlds sit at mixed depths (TEStval/Valeraverse beside a plain one),
    // so one level would miss them. Unbounded would walk every page of every
    // world to find one project.json each.
    expect(WORLD_SCAN_DEPTH).toBe(2);
  });
});
