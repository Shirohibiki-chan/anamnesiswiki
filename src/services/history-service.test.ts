import { describe, expect, it } from "vitest";
import {
  collapseSince,
  countLabel,
  HISTORY_LIMIT,
  mergeRepeat,
  pushEntry,
  type HistoryEntry,
} from "./history-service";

function entry(label: string): HistoryEntry {
  return { label, undo: () => {}, redo: () => {} };
}

describe("pushEntry", () => {
  it("adds to the end, so the last thing done is the first thing undone", () => {
    const stack = pushEntry(pushEntry([], entry("a")), entry("b"));
    expect(stack.map((e) => e.label)).toEqual(["a", "b"]);
  });

  it("drops the oldest once it's full, never the newest", () => {
    let stack: HistoryEntry[] = [];
    for (let i = 0; i < 4; i++) stack = pushEntry(stack, entry(String(i)), 3);
    expect(stack.map((e) => e.label)).toEqual(["1", "2", "3"]);
  });

  it("leaves the original alone", () => {
    const before = [entry("a")];
    pushEntry(before, entry("b"));
    expect(before).toHaveLength(1);
  });

  it("ships with a limit that's a real number of operations", () => {
    expect(HISTORY_LIMIT).toBeGreaterThanOrEqual(10);
  });
});

describe("collapseSince", () => {
  // Every entry writes what it did into one list, so a test can assert the
  // order the halves ran in rather than just that they ran.
  function tracked(label: string, log: string[]): HistoryEntry {
    return {
      label,
      undo: () => {
        log.push(`undo:${label}`);
      },
      redo: () => {
        log.push(`redo:${label}`);
      },
    };
  }

  it("leaves one entry in place of the two", () => {
    const stack = collapseSince([entry("a"), entry("b"), entry("c")], 1, "one thing");
    expect(stack.map((e) => e.label)).toEqual(["a", "one thing"]);
  });

  // The half that matters. A page's sub-pages have to go before the page does,
  // so the last thing done is the first thing undone.
  it("undoes the folded entries backwards and redoes them forwards", async () => {
    const log: string[] = [];
    const stack = collapseSince([tracked("page", log), tracked("template", log)], 0, "one thing");
    await stack[0].undo();
    await stack[0].redo();
    expect(log).toEqual(["undo:template", "undo:page", "redo:page", "redo:template"]);
  });

  // One click that happened to record once still reads as that click. The
  // built-in path records once and hers twice; which one you took is not
  // something undo should be able to tell you.
  it("relabels a single entry too", async () => {
    const log: string[] = [];
    const stack = collapseSince([entry("a"), tracked("page", log)], 1, "one thing");
    expect(stack.map((e) => e.label)).toEqual(["a", "one thing"]);
    await stack[1].undo();
    expect(log).toEqual(["undo:page"]);
  });

  it("does nothing when nothing was recorded", () => {
    expect(collapseSince([entry("a")], 1, "one thing").map((e) => e.label)).toEqual(["a"]);
    expect(collapseSince([], 0, "one thing")).toEqual([]);
  });

  // What happens when the limit trimmed the stack while the work ran: `depth`
  // no longer points where it did, and two ordinary entries beat one wrong one.
  it("does nothing when the stack got shorter instead of longer", () => {
    expect(collapseSince([entry("a")], 3, "one thing").map((e) => e.label)).toEqual(["a"]);
  });

  it("leaves the original alone", () => {
    const before = [entry("a"), entry("b")];
    collapseSince(before, 0, "one thing");
    expect(before.map((e) => e.label)).toEqual(["a", "b"]);
  });
});

describe("countLabel", () => {
  it("gets the singular right, which is the whole reason it exists", () => {
    expect(countLabel(1, "page")).toBe("1 page");
    expect(countLabel(2, "page")).toBe("2 pages");
    expect(countLabel(0, "page")).toBe("0 pages");
  });
});

describe("mergeRepeat", () => {
  function keyed(label: string, mergeKey: string | undefined, at: number, log: string[]): HistoryEntry {
    return {
      label,
      mergeKey,
      at,
      undo: () => void log.push(`undo:${label}`),
      redo: () => void log.push(`redo:${label}`),
    };
  }

  it("folds a second edit to the same field into the first", () => {
    const log: string[] = [];
    const stack = [keyed("a", "property:1:age", 1000, log)];

    const folded = mergeRepeat(stack, keyed("b", "property:1:age", 1500, log), 1500);

    expect(folded).not.toBeNull();
    expect(folded).toHaveLength(1);
  });

  // The point of the fold: a run of keystrokes reverses to where the run
  // started, not to the state one keystroke ago.
  it("keeps the older undo and the newer redo", () => {
    const log: string[] = [];
    const stack = [keyed("a", "property:1:age", 1000, log)];

    const folded = mergeRepeat(stack, keyed("b", "property:1:age", 1500, log), 1500);
    folded?.[0].undo();
    folded?.[0].redo();

    expect(log).toEqual(["undo:a", "redo:b"]);
    expect(folded?.[0].label).toBe("b");
  });

  it("refuses a different field, a different page, and an unkeyed entry", () => {
    const log: string[] = [];
    const stack = [keyed("a", "property:1:age", 1000, log)];

    expect(mergeRepeat(stack, keyed("b", "property:1:height", 1500, log), 1500)).toBeNull();
    expect(mergeRepeat(stack, keyed("b", "property:2:age", 1500, log), 1500)).toBeNull();
    expect(mergeRepeat(stack, keyed("b", undefined, 1500, log), 1500)).toBeNull();
  });

  it("refuses anything past the window, so a pause starts a new edit", () => {
    const log: string[] = [];
    const stack = [keyed("a", "property:1:age", 1000, log)];

    expect(mergeRepeat(stack, keyed("b", "property:1:age", 9000, log), 9000)).toBeNull();
  });

  // Same reasoning as isSnapshotDue: a clock that has gone backwards must not
  // fold two edits together on the strength of a negative gap.
  it("refuses a clock that has gone backwards", () => {
    const log: string[] = [];
    const stack = [keyed("a", "property:1:age", 5000, log)];

    expect(mergeRepeat(stack, keyed("b", "property:1:age", 1000, log), 1000)).toBeNull();
  });

  it("only ever folds into the top of the stack", () => {
    const log: string[] = [];
    const stack = [keyed("a", "property:1:age", 1000, log), keyed("b", "block-text:1:x", 1200, log)];

    expect(mergeRepeat(stack, keyed("c", "property:1:age", 1300, log), 1300)).toBeNull();
  });

  it("leaves the original alone", () => {
    const log: string[] = [];
    const before = [keyed("a", "property:1:age", 1000, log)];

    mergeRepeat(before, keyed("b", "property:1:age", 1500, log), 1500);

    expect(before[0].label).toBe("a");
  });
});
