import { describe, expect, it } from "vitest";
import type { Project } from "../constants/schema";
import { SNAPSHOT_INTERVAL_MS, SNAPSHOT_MAX_AGE_MS } from "../constants/limits";
import {
  historyReadme,
  isSnapshotDue,
  nextSnapshotAt,
  readSnapshots,
  restorePatch,
  restoreProjectPatch,
  snapshotName,
  snapshotsToPrune,
  snapshotTime,
  type Snapshot,
} from "./snapshot-service";

const AT = Date.parse("2026-08-27T05:12:03.123Z");

describe("naming a copy", () => {
  it("writes a name a Windows filesystem will accept", () => {
    const name = snapshotName(AT);
    expect(name).not.toContain(":");
    expect(name.endsWith(".json")).toBe(true);
  });

  it("reads its own names back", () => {
    expect(snapshotTime(snapshotName(AT))).toBe(AT);
  });

  // The whole reason the timestamp is written this way: sorting the names is
  // sorting by time, so a directory listing is the index.
  it("sorts by name in the same order as by time", () => {
    const times = [AT, AT + 60_000, AT + 3 * 60_000].map(snapshotName);
    expect([...times].sort()).toEqual(times);
  });

  it("refuses anything that isn't one of ours", () => {
    expect(snapshotTime("notes.json")).toBeNull();
    expect(snapshotTime("2026-08-27T05-12-03-123Z.txt")).toBeNull();
    expect(snapshotTime(".DS_Store")).toBeNull();
  });
});

describe("reading a directory listing", () => {
  it("hands back the copies newest first", () => {
    const listing = [snapshotName(AT), snapshotName(AT + 60_000), snapshotName(AT - 60_000)];
    expect(readSnapshots(listing).map((snapshot) => snapshot.at)).toEqual([AT + 60_000, AT, AT - 60_000]);
  });

  // A file this app doesn't recognise is somebody else's, and this folder is
  // inside her project. Dropping it from the list is right; deleting it is not.
  it("ignores files it doesn't recognise rather than guessing at them", () => {
    expect(readSnapshots(["README.txt", "thumbs.db", snapshotName(AT)])).toHaveLength(1);
  });
});

describe("stamping the next copy", () => {
  it("uses now when there is no history", () => {
    expect(nextSnapshotAt(null, AT)).toBe(AT);
  });

  // A save and the delete that follows it happen in the same tick. Two copies
  // with one name are one copy, and the one lost is the older — which is the
  // one somebody wanted.
  it("never repeats the last stamp", () => {
    expect(nextSnapshotAt(AT, AT)).toBe(AT + 1);
    expect(nextSnapshotAt(AT + 5, AT)).toBe(AT + 6);
  });

  it("uses the clock once it has moved on", () => {
    expect(nextSnapshotAt(AT, AT + 60_000)).toBe(AT + 60_000);
  });
});

describe("deciding a copy is due", () => {
  it("is always due when there is no history at all", () => {
    expect(isSnapshotDue(null, AT)).toBe(true);
  });

  it("waits out the interval", () => {
    expect(isSnapshotDue(AT, AT + 1000)).toBe(false);
    expect(isSnapshotDue(AT, AT + SNAPSHOT_INTERVAL_MS)).toBe(true);
  });

  // A synced folder can carry a copy stamped later than this machine's clock.
  // Never copying again until the clock catches up would be the worst answer.
  it("treats a clock that has gone backwards as due", () => {
    expect(isSnapshotDue(AT, AT - 60_000)).toBe(true);
  });
});

function at(offsetMs: number): Snapshot {
  return { name: snapshotName(AT + offsetMs), at: AT + offsetMs };
}

describe("pruning", () => {
  const now = AT + SNAPSHOT_MAX_AGE_MS;

  it("keeps everything inside both limits", () => {
    expect(snapshotsToPrune([at(0), at(-60_000)], AT + 60_000)).toEqual([]);
  });

  it("drops what is older than the age limit", () => {
    const old = at(-SNAPSHOT_MAX_AGE_MS);
    const pruned = snapshotsToPrune([at(0), old], now - SNAPSHOT_MAX_AGE_MS + 1);
    expect(pruned).toEqual([old]);
  });

  it("drops the oldest once there are too many", () => {
    const many = Array.from({ length: 6 }, (_, index) => at(-index * 60_000));
    const pruned = snapshotsToPrune(many, AT + 60_000, { maxPerNode: 4 });
    expect(pruned.map((snapshot) => snapshot.at)).toEqual([AT - 4 * 60_000, AT - 5 * 60_000]);
  });

  // The rule that matters most and is easiest to get wrong: a page untouched
  // for a year is exactly the one somebody comes back to.
  it("never returns the newest copy, however old it is", () => {
    const ancient = at(-10 * SNAPSHOT_MAX_AGE_MS);
    expect(snapshotsToPrune([ancient], AT, { maxPerNode: 1 })).toEqual([]);
    expect(snapshotsToPrune([ancient], AT, { maxPerNode: 0 })).toEqual([]);
  });

  it("applies the count to what survived the age limit, not to the raw list", () => {
    const recent = [at(0), at(-60_000), at(-120_000)];
    const ancient = [at(-SNAPSHOT_MAX_AGE_MS), at(-SNAPSHOT_MAX_AGE_MS - 60_000)];
    const pruned = snapshotsToPrune([...recent, ...ancient], AT + 1000, { maxPerNode: 3 });
    expect(pruned.map((snapshot) => snapshot.at).sort()).toEqual(ancient.map((snapshot) => snapshot.at).sort());
  });
});

describe("the note left in the folder", () => {
  it("says what the files are and that deleting them is safe", () => {
    const readme = historyReadme();
    expect(readme).toContain("Anamnesis");
    expect(readme.toLowerCase()).toContain("json");
    expect(readme.toLowerCase()).toContain("deleting this folder");
  });
});

describe("restoring a copy", () => {
  const current = {
    id: "p",
    parentId: "folder-2",
    templateKey: "character",
    name: "Valera Jiang",
    tabs: [],
    properties: { age: 41 },
    tags: ["new"],
    color: "teal",
    createdAt: 1,
    updatedAt: 9,
  } as unknown as import("../constants/schema").Node;

  const copy = {
    ...current,
    parentId: "folder-1",
    templateKey: "note",
    name: "Valera",
    properties: { age: 40 },
    tags: ["old"],
    createdAt: 1,
    updatedAt: 5,
  } as unknown as import("../constants/schema").Node;
  delete (copy as unknown as Record<string, unknown>).color;

  it("brings back what the page said", () => {
    const patch = restorePatch(current, copy) as Record<string, unknown>;
    expect(patch.properties).toEqual({ age: 40 });
    expect(patch.tags).toEqual(["old"]);
  });

  // A field the copy never had has to go, or restoring leaves every setting
  // added since sitting on top of the version that predates them.
  it("clears what the copy did not have", () => {
    const patch = restorePatch(current, copy) as Record<string, unknown>;
    expect("color" in patch).toBe(true);
    expect(patch.color).toBeUndefined();
  });

  // Where a page lives, what kind it is, and what it is called are not content.
  it("never moves the page or changes what kind it is", () => {
    const patch = restorePatch(current, copy) as Record<string, unknown>;
    expect("parentId" in patch).toBe(false);
    expect("templateKey" in patch).toBe(false);
    expect("id" in patch).toBe(false);
    expect("createdAt" in patch).toBe(false);
    expect("name" in patch).toBe(false);
  });
});


describe("restoring the tree's arrangement", () => {
  function project(extra: Partial<Project> = {}): Project {
    return {
      version: 1,
      name: "Valeraverse",
      rootOrder: [],
      expandedIds: [],
      selectedId: null,
      createdAt: 1,
      ...extra,
    };
  }

  const known = new Set(["a", "b"]);

  it("puts the order, the home page and the pins back", () => {
    const copy = project({ rootOrder: ["b", "a"], homeNodeId: "a", pinnedIds: ["b"], expandedIds: ["a"] });

    const patch = restoreProjectPatch(project(), copy, known);

    expect(patch.rootOrder).toEqual(["b", "a"]);
    expect(patch.homeNodeId).toBe("a");
    expect(patch.pinnedIds).toEqual(["b"]);
    expect(patch.expandedIds).toEqual(["a"]);
  });

  // The whole reason this isn't `{ ...copy }`: a copy from last week remembers
  // pages that have since been deleted, and putting its lists back verbatim
  // would leave a home button pointing at nothing.
  it("drops every id whose page no longer exists", () => {
    const copy = project({
      rootOrder: ["a", "gone"],
      homeNodeId: "gone",
      pinnedIds: ["gone", "b"],
      expandedIds: ["gone"],
      childOrder: { a: ["gone", "b"], gone: ["a"] },
    });

    const patch = restoreProjectPatch(project(), copy, known);

    expect(patch.rootOrder).toEqual(["a"]);
    expect(patch.homeNodeId).toBeNull();
    expect(patch.pinnedIds).toEqual(["b"]);
    expect(patch.expandedIds).toEqual([]);
    expect(patch.childOrder).toEqual({ a: ["b"] });
  });

  it("leaves the world's identity, name and age alone", () => {
    const current = project({ id: "world-1", name: "Valeraverse", createdAt: 10, coverImage: "cover.png" });
    const copy = project({ id: "world-2", name: "Old Name", createdAt: 5, coverImage: "old.png" });

    const patch = restoreProjectPatch(current, copy, known);

    expect(patch).not.toHaveProperty("id");
    expect(patch).not.toHaveProperty("name");
    expect(patch).not.toHaveProperty("createdAt");
    expect(patch).not.toHaveProperty("coverImage");
  });

  // Which page she had open an hour ago is a fact about that hour.
  it("does not move the selection", () => {
    const patch = restoreProjectPatch(project({ selectedId: "b" }), project({ selectedId: "a" }), known);

    expect(patch).not.toHaveProperty("selectedId");
  });

  // Same rule restorePatch follows: a field the copy did not have is cleared,
  // not left standing.
  it("clears a field the copy did not have", () => {
    const patch = restoreProjectPatch(project({ childOrder: { a: ["b"] } }), project(), known);

    expect("childOrder" in patch).toBe(true);
    expect(patch.childOrder).toBeUndefined();
  });
});
