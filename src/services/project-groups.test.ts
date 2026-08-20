import { describe, expect, it } from "vitest";
import {
  cleanGroupName,
  createGroup,
  deleteGroup,
  groupsOf,
  healGroups,
  isInGroup,
  isProjectGroup,
  renameGroup,
  toggleGroupMember,
  type ProjectGroup,
} from "./project-groups";
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

const groupOf = (name: string, members: ListedWorld[] = []): ProjectGroup => ({
  id: `group-${name}`,
  name,
  members: members.map((member) => ({ id: member.id, path: member.path, name: member.name })),
});

describe("cleanGroupName", () => {
  it("trims, and refuses a name that was only space", () => {
    expect(cleanGroupName("  Valera  ")).toBe("Valera");
    expect(cleanGroupName("   ")).toBeNull();
  });

  it("caps a very long name rather than refusing it", () => {
    // A paste that runs long is trimmed, not rejected — she loses the tail of
    // a name she can still edit, rather than the whole action.
    const cleaned = cleanGroupName("x".repeat(200));
    expect(cleaned).toHaveLength(40);
  });
});

describe("createGroup", () => {
  it("appends, so a new group lands where she made it", () => {
    const groups = createGroup(createGroup([], "First"), "Second");
    expect(groups.map((group) => group.name)).toEqual(["First", "Second"]);
  });

  it("makes nothing from a blank name", () => {
    expect(createGroup([], "   ")).toEqual([]);
  });

  it("files the project the menu was opened on, in one step", () => {
    const val = world("Valeraverse");
    const [group] = createGroup([], "Drafts", val);
    expect(isInGroup(group, val)).toBe(true);
  });
});

describe("renameGroup", () => {
  it("renames one group and leaves its membership alone", () => {
    const val = world("Valeraverse");
    const renamed = renameGroup([groupOf("Old", [val]), groupOf("Other")], "group-Old", "New");
    expect(renamed.map((group) => group.name)).toEqual(["New", "Other"]);
    expect(isInGroup(renamed[0], val)).toBe(true);
  });

  it("ignores a blank name rather than clearing the old one", () => {
    const groups = [groupOf("Keep")];
    expect(renameGroup(groups, "group-Keep", "  ")[0].name).toBe("Keep");
  });
});

describe("deleteGroup", () => {
  it("removes the label and nothing else", () => {
    const groups = [groupOf("Gone"), groupOf("Stays")];
    expect(deleteGroup(groups, "group-Gone").map((group) => group.name)).toEqual(["Stays"]);
  });
});

describe("toggleGroupMember", () => {
  it("files and unfiles, leaving every other group untouched", () => {
    const val = world("Valeraverse");
    const groups = [groupOf("A"), groupOf("B", [val])];

    const filed = toggleGroupMember(groups, "group-A", val);
    expect(isInGroup(filed[0], val)).toBe(true);
    expect(isInGroup(filed[1], val)).toBe(true);

    const unfiled = toggleGroupMember(filed, "group-A", val);
    expect(isInGroup(unfiled[0], val)).toBe(false);
    expect(isInGroup(unfiled[1], val)).toBe(true);
  });

  it("keeps a project filed through a move and a rename", () => {
    // The whole reason membership is a record rather than a path: neither of
    // these two facts is the same anymore.
    const groups = toggleGroupMember([groupOf("A")], "group-A", world("Valeraverse"));
    const moved = world("Renamed", { id: "id-Valeraverse", path: "E:/Somewhere/Else" });
    expect(isInGroup(groups[0], moved)).toBe(true);
  });
});

describe("groupsOf", () => {
  it("answers in the order the groups are in, not the order she filed them", () => {
    const val = world("Valeraverse");
    const groups = [groupOf("A", [val]), groupOf("B"), groupOf("C", [val])];
    expect(groupsOf(groups, val).map((group) => group.name)).toEqual(["A", "C"]);
  });
});

describe("healGroups", () => {
  it("picks up the id a project gained the first time it was opened", () => {
    const unopened = world("New", { id: null });
    const groups = toggleGroupMember([groupOf("A")], "group-A", unopened);
    expect(groups[0].members[0].id).toBeNull();

    const healed = healGroups(groups, [world("New", { id: "minted" })]);
    expect(healed?.[0].members[0].id).toBe("minted");
  });

  it("returns null when nothing drifted, so the caller can skip the write", () => {
    const val = world("Valeraverse");
    expect(healGroups([groupOf("A", [val])], [val])).toBeNull();
  });
});

describe("isProjectGroup", () => {
  it("keeps a good group and drops one the settings file mangled", () => {
    expect(isProjectGroup(groupOf("Fine"))).toBe(true);
    expect(isProjectGroup({ id: "x", name: "No members" })).toBe(false);
    expect(isProjectGroup({ id: "x", name: "Bad member", members: [{ path: 3 }] })).toBe(false);
    expect(isProjectGroup(null)).toBe(false);
  });
});
