import { describe, expect, it } from "vitest";
import { countLabel, HISTORY_LIMIT, pushEntry, type HistoryEntry } from "./history-service";

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

describe("countLabel", () => {
  it("gets the singular right, which is the whole reason it exists", () => {
    expect(countLabel(1, "page")).toBe("1 page");
    expect(countLabel(2, "page")).toBe("2 pages");
    expect(countLabel(0, "page")).toBe("0 pages");
  });
});
