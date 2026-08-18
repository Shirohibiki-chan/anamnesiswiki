import { describe, expect, it } from "vitest";
import { collapseSince, countLabel, HISTORY_LIMIT, pushEntry, type HistoryEntry } from "./history-service";

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
