import { describe, expect, it } from "vitest";
import { isScopeAvailable, SCOPE_ALL, SCOPE_ARCHIVED, scopeProjects } from "./library-scope";
import type { ProjectGroup } from "./project-groups";
import type { ProjectRef } from "./project-refs";
import type { ListedWorld } from "./world-scan";

const world = (name: string, extra: Partial<ListedWorld> = {}): ListedWorld => ({
  path: `/D/${name}`,
  id: `id-${name}`,
  name,
  lastOpenedAt: null,
  modifiedAt: null,
  coverImage: null,
  selectedName: null,
  activeAt: 0,
  isOutsideProjectsFolder: false,
  ...extra,
});

const ref = (project: ListedWorld): ProjectRef => ({ id: project.id, path: project.path, name: project.name });

const groupOf = (name: string, members: ListedWorld[]): ProjectGroup => ({
  id: `group-${name}`,
  name,
  members: members.map(ref),
});

const val = world("Valeraverse");
const val3 = world("Valeraverse3");
const old = world("Old Draft");
const names = (projects: ListedWorld[]) => projects.map((project) => project.name);

describe("scopeProjects", () => {
  it("keeps the archive out of All", () => {
    const shown = scopeProjects([val, old], SCOPE_ALL, { groups: [], archived: [ref(old)] });
    expect(names(shown)).toEqual(["Valeraverse"]);
  });

  it("shows only the archive under its own chip", () => {
    const shown = scopeProjects([val, old], SCOPE_ARCHIVED, { groups: [], archived: [ref(old)] });
    expect(names(shown)).toEqual(["Old Draft"]);
  });

  it("keeps an archived project out of the group it is still filed under", () => {
    // Archive and groups compose rather than compete: the fold wins while it
    // is on, and nothing is unfiled, so bringing it back needs no repair.
    const groups = [groupOf("Valera", [val, old])];
    const shown = scopeProjects([val, val3, old], "group-Valera", { groups, archived: [ref(old)] });
    expect(names(shown)).toEqual(["Valeraverse"]);
  });

  it("shows everything live when the scope names a group that has gone", () => {
    // One render after a group is deleted from its own chip. An empty grid
    // there reads as "your projects are gone".
    const shown = scopeProjects([val, val3], "group-deleted", { groups: [], archived: [] });
    expect(names(shown)).toEqual(["Valeraverse", "Valeraverse3"]);
  });

  it("leaves the listing's own order alone", () => {
    const groups = [groupOf("Valera", [val3, val])];
    const shown = scopeProjects([val, val3], "group-Valera", { groups, archived: [] });
    expect(names(shown)).toEqual(["Valeraverse", "Valeraverse3"]);
  });
});

describe("isScopeAvailable", () => {
  it("holds the archive chip back until something is in it", () => {
    expect(isScopeAvailable(SCOPE_ARCHIVED, { groups: [], archived: [] })).toBe(false);
    expect(isScopeAvailable(SCOPE_ARCHIVED, { groups: [], archived: [ref(old)] })).toBe(true);
  });

  it("says a deleted group is gone, and that All never is", () => {
    expect(isScopeAvailable("group-gone", { groups: [], archived: [] })).toBe(false);
    expect(isScopeAvailable(SCOPE_ALL, { groups: [], archived: [] })).toBe(true);
  });
});
