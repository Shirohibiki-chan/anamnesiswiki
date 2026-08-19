import { describe, expect, it } from "vitest";
import { PROJECT_SORTS } from "./preferences-service";
import {
  buildWorldList,
  decideAmongNestedWorlds,
  filterWorlds,
  isInsideProjectsFolder,
  isReservedWorldName,
  locationOf,
  sortWorlds,
  WORLD_SCAN_DEPTH,
  type ListedWorld,
  type WorldFile,
} from "./world-scan";

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

describe("isInsideProjectsFolder", () => {
  const DIR = "C:/Users/shiro/Documents/Anamnesis";

  it("recognises a world sitting in the projects folder", () => {
    expect(isInsideProjectsFolder(`${DIR}/Valeraverse`, DIR)).toBe(true);
  });

  it("recognises one tidied a folder further down", () => {
    expect(isInsideProjectsFolder(`${DIR}/TEStval/Valeraverse`, DIR)).toBe(true);
  });

  it("marks a world living somewhere else", () => {
    expect(isInsideProjectsFolder("D:/Backups/Valeraverse", DIR)).toBe(false);
  });

  it("copes with the two separators and the two cases Windows hands back", () => {
    // The folder picker returns backslashes; the setting may hold either.
    expect(isInsideProjectsFolder("C:\\Users\\shiro\\Documents\\Anamnesis\\Val", DIR)).toBe(true);
    expect(isInsideProjectsFolder(`${DIR}/Val`, "c:/users/shiro/documents/anamnesis")).toBe(true);
  });

  it("ignores a trailing separator on either side", () => {
    expect(isInsideProjectsFolder(`${DIR}/Val/`, `${DIR}/`)).toBe(true);
  });

  it("does not count a folder that merely starts with the same letters", () => {
    // `Anamnesis Backups` is not inside `Anamnesis`.
    expect(isInsideProjectsFolder(`${DIR} Backups/Valeraverse`, DIR)).toBe(false);
  });
});

describe("buildWorldList", () => {
  const DIR = "/Documents/Anamnesis";
  const file = (path: string, extra: Partial<WorldFile> = {}): WorldFile => ({
    path,
    id: "id-" + path,
    name: path.split("/").pop() ?? path,
    modifiedAt: 0,
    ...extra,
  });

  it("lists a world found on disk that has never been opened", () => {
    // The whole point: the ninth world, which the recent list could not hold.
    const list = buildWorldList({
      onDisk: [file(`${DIR}/Ninth`)],
      remembered: [],
      projectsDir: DIR,
    });
    expect(list.map((w) => w.path)).toEqual([`${DIR}/Ninth`]);
    expect(list[0].lastOpenedAt).toBeNull();
  });

  it("lists a world opened from outside the projects folder, marked", () => {
    const list = buildWorldList({
      onDisk: [file(`${DIR}/Home`), file("D:/Elsewhere/Away")],
      remembered: [{ path: "D:/Elsewhere/Away", name: "Away", lastOpenedAt: 10 }],
      projectsDir: DIR,
    });
    expect(list.find((w) => w.name === "Away")?.isOutsideProjectsFolder).toBe(true);
    expect(list.find((w) => w.name === "Home")?.isOutsideProjectsFolder).toBe(false);
  });

  it("counts a scanned world and a remembered one at the same path as one world", () => {
    const list = buildWorldList({
      onDisk: [file(`${DIR}/Valeraverse`)],
      remembered: [{ path: `${DIR}/Valeraverse`, name: "Valeraverse", lastOpenedAt: 500 }],
      projectsDir: DIR,
    });
    expect(list).toHaveLength(1);
    expect(list[0].lastOpenedAt).toBe(500);
  });

  it("keeps two worlds wearing the same id apart", () => {
    // A folder copied in File Explorer. Collapsing these would hide one of her
    // worlds over a bookkeeping field; re-idding one is the fork detector's job.
    const list = buildWorldList({
      onDisk: [file(`${DIR}/Valeraverse`, { id: "same" }), file(`${DIR}/Valeraverse3`, { id: "same" })],
      remembered: [],
      projectsDir: DIR,
    });
    expect(list).toHaveLength(2);
  });

  it("keeps a remembered world whose folder would not read just now", () => {
    // An external drive that isn't plugged in. Dropping it would make her
    // worlds flicker in and out of the list.
    const list = buildWorldList({
      onDisk: [],
      remembered: [{ path: "E:/Stick/Valeraverse", name: "Valeraverse", lastOpenedAt: 90 }],
      projectsDir: DIR,
    });
    expect(list).toEqual([
      expect.objectContaining({ path: "E:/Stick/Valeraverse", name: "Valeraverse", id: null, activeAt: 90 }),
    ]);
  });

  it("prefers the name on disk to the remembered one, since a rename changes it", () => {
    const list = buildWorldList({
      onDisk: [file(`${DIR}/Valeraverse`, { name: "Valeraverse v6" })],
      remembered: [{ path: `${DIR}/Valeraverse`, name: "Valeraverse v5", lastOpenedAt: 1 }],
      projectsDir: DIR,
    });
    expect(list[0].name).toBe("Valeraverse v6");
  });

  it("sorts newest first, on whichever of opened and edited is later", () => {
    const list = buildWorldList({
      onDisk: [
        file(`${DIR}/Old`, { modifiedAt: 100 }),
        file(`${DIR}/Edited`, { modifiedAt: 900 }),
        file(`${DIR}/Opened`, { modifiedAt: 200 }),
      ],
      remembered: [{ path: `${DIR}/Opened`, name: "Opened", lastOpenedAt: 950 }],
      projectsDir: DIR,
    });
    expect(list.map((w) => w.name)).toEqual(["Opened", "Edited", "Old"]);
  });

  it("breaks ties by name, so two looks at one folder read the same", () => {
    const list = buildWorldList({
      onDisk: [file(`${DIR}/Beta`, { modifiedAt: 5 }), file(`${DIR}/Alpha`, { modifiedAt: 5 })],
      remembered: [],
      projectsDir: DIR,
    });
    expect(list.map((w) => w.name)).toEqual(["Alpha", "Beta"]);
  });

  it("does not cap the list", () => {
    // It used to stop at eight, which is the bug this replaces.
    const onDisk = Array.from({ length: 20 }, (_, i) => file(`${DIR}/World${i}`));
    expect(buildWorldList({ onDisk, remembered: [], projectsDir: DIR })).toHaveLength(20);
  });
});

describe("filterWorlds", () => {
  const DIR = "/Documents/Anamnesis";
  const listed = (path: string, name: string): ListedWorld => ({
    path,
    id: null,
    name,
    lastOpenedAt: null,
    modifiedAt: null,
    activeAt: 0,
    isOutsideProjectsFolder: false,
  });

  const worlds = [
    listed(`${DIR}/Valeraverse`, "Valeraverse"),
    listed(`${DIR}/Valeraverse3`, "Valeraverse3"),
    listed(`${DIR}/Drafts/girl`, "this is the story of a girl"),
    listed("D:/Backups/Ashfall", "Ashfall"),
  ];

  it("returns everything for an empty or blank query", () => {
    expect(filterWorlds(worlds, "")).toHaveLength(4);
    expect(filterWorlds(worlds, "   ")).toHaveLength(4);
  });

  it("ignores case, since nobody types capitals into a filter box", () => {
    expect(filterWorlds(worlds, "ASHFALL").map((w) => w.name)).toEqual(["Ashfall"]);
  });

  it("matches on any word, in any order", () => {
    // "val 3" and "3 val" are the same intent typed two ways.
    expect(filterWorlds(worlds, "val 3").map((w) => w.name)).toEqual(["Valeraverse3"]);
    expect(filterWorlds(worlds, "3 val").map((w) => w.name)).toEqual(["Valeraverse3"]);
  });

  it("matches the middle of a name, not only the start", () => {
    expect(filterWorlds(worlds, "story").map((w) => w.name)).toEqual(["this is the story of a girl"]);
  });

  it("falls back to the folder, for the projects that share a name", () => {
    expect(filterWorlds(worlds, "backups").map((w) => w.name)).toEqual(["Ashfall"]);
  });

  it("returns nothing rather than everything when nothing matches", () => {
    expect(filterWorlds(worlds, "zzz")).toEqual([]);
  });

  it("does not mutate the list it was handed", () => {
    const before = [...worlds];
    filterWorlds(worlds, "val");
    expect(worlds).toEqual(before);
  });
});

describe("sortWorlds", () => {
  const world = (name: string, activeAt: number, path = `/D/${name}`): ListedWorld => ({
    path,
    id: null,
    name,
    lastOpenedAt: null,
    modifiedAt: null,
    activeAt,
    isOutsideProjectsFolder: false,
  });

  const worlds = [world("Beta", 300), world("Alpha", 100), world("Gamma", 200)];

  it("puts the most recently touched world first by default", () => {
    expect(sortWorlds(worlds, "active").map((w) => w.name)).toEqual(["Beta", "Gamma", "Alpha"]);
  });

  it("reverses that for the one she has not touched in months", () => {
    expect(sortWorlds(worlds, "oldest").map((w) => w.name)).toEqual(["Alpha", "Gamma", "Beta"]);
  });

  it("sorts by name in both directions", () => {
    expect(sortWorlds(worlds, "name").map((w) => w.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(sortWorlds(worlds, "name-desc").map((w) => w.name)).toEqual(["Gamma", "Beta", "Alpha"]);
  });

  it("settles a tie the same way every time, whichever order is on", () => {
    // Two worlds touched in the same millisecond. Without the tie-break the
    // order here is whatever the directory read happened to produce, which is
    // a list that reshuffles between two looks at the same screen.
    const tied = [world("Same", 5, "/D/second"), world("Same", 5, "/D/first")];
    for (const sort of PROJECT_SORTS) {
      expect(sortWorlds(tied, sort).map((w) => w.path)).toEqual(["/D/first", "/D/second"]);
    }
  });

  it("leaves the list it was given alone", () => {
    const before = [...worlds];
    sortWorlds(worlds, "name");
    expect(worlds).toEqual(before);
  });

  it("keeps a world with nothing to sort on in the list rather than dropping it", () => {
    // Never opened, and its project.json would not read. It has no timestamp,
    // so it lands at whichever end 0 belongs at — but it is still listed.
    const withUnknown = [world("Known", 900), world("Unknown", 0)];
    expect(sortWorlds(withUnknown, "active").map((w) => w.name)).toEqual(["Known", "Unknown"]);
    expect(sortWorlds(withUnknown, "oldest").map((w) => w.name)).toEqual(["Unknown", "Known"]);
  });
});

describe("locationOf", () => {
  it("reports the folder the project sits in, not the project's own folder", () => {
    // The row is already showing the name; ending its path with it again
    // would be the same word twice.
    expect(locationOf("C:\\Users\\shiro\\Documents\\Anamnesis\\Valeraverse")).toEqual({
      head: "C:\\Users\\shiro\\Documents",
      tail: "\\Anamnesis",
    });
  });

  it("keeps the last folder whole so a clipped path still says where it is", () => {
    // Two projects side by side in different folders under one parent. Clip
    // the end of either and they read as the same place.
    const a = locationOf("D:\\Writing\\Archive 2024\\Valeraverse");
    const b = locationOf("D:\\Writing\\Archive 2025\\Valeraverse");
    expect(a.tail).toBe("\\Archive 2024");
    expect(b.tail).toBe("\\Archive 2025");
    expect(a.head).toBe(b.head);
  });

  it("leaves the separators as they were given", () => {
    // She matches this against what her file manager shows her, and Windows
    // and macOS disagree about which way the slash leans.
    expect(locationOf("/Users/shiro/Documents/Anamnesis/Valeraverse")).toEqual({
      head: "/Users/shiro/Documents",
      tail: "/Anamnesis",
    });
  });

  it("keeps all of a drive root, which has no middle to drop", () => {
    expect(locationOf("D:\\Valeraverse")).toEqual({ head: "", tail: "D:" });
    expect(locationOf("/Valeraverse")).toEqual({ head: "", tail: "" });
  });

  it("ignores a trailing separator rather than reading it as a folder", () => {
    expect(locationOf("C:\\Users\\shiro\\Documents\\Anamnesis\\Valeraverse\\")).toEqual({
      head: "C:\\Users\\shiro\\Documents",
      tail: "\\Anamnesis",
    });
  });

  it("answers nothing for a bare name rather than inventing a parent", () => {
    expect(locationOf("Valeraverse")).toEqual({ head: "", tail: "" });
    expect(locationOf("")).toEqual({ head: "", tail: "" });
  });

  it("puts the two halves back together as the path it was given", () => {
    const path = "C:\\Users\\shiro\\Documents\\Anamnesis\\Valeraverse";
    const { head, tail } = locationOf(path);
    expect(path.startsWith(head + tail)).toBe(true);
  });
});
