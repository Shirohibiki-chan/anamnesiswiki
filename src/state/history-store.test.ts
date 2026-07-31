// The stack semantics, tested directly against the store. It's plain TypeScript
// with no React in it and no filesystem underneath — the entries are closures,
// so a test can hand it closures that just write to an array. This is where the
// expensive mistakes live: an undo that gets recorded as a new action, or an
// entry that's dropped after a write failed and can never be retried.
import { beforeEach, describe, expect, it } from "vitest";
import { useHistoryStore } from "./history-store";

function reset() {
  useHistoryStore.getState().clear();
}

function trackingEntry(label: string, log: string[]) {
  return {
    label,
    undo: () => void log.push(`undo:${label}`),
    redo: () => void log.push(`redo:${label}`),
  };
}

describe("history-store", () => {
  beforeEach(reset);

  it("undoes the most recent thing first", async () => {
    const log: string[] = [];
    const { record } = useHistoryStore.getState();
    record(trackingEntry("a", log));
    record(trackingEntry("b", log));

    await useHistoryStore.getState().undo();
    await useHistoryStore.getState().undo();

    expect(log).toEqual(["undo:b", "undo:a"]);
  });

  it("moves an entry across to the redo stack and back", async () => {
    const log: string[] = [];
    useHistoryStore.getState().record(trackingEntry("a", log));

    await useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useHistoryStore.getState().future).toHaveLength(1);

    await useHistoryStore.getState().redo();
    expect(log).toEqual(["undo:a", "redo:a"]);
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().future).toHaveLength(0);
  });

  // Everything a store action does while being undone would otherwise land on
  // the stack as a new operation, and undo would toggle forever.
  it("ignores anything recorded while it's replaying", async () => {
    const log: string[] = [];
    useHistoryStore.getState().record({
      label: "a",
      undo: () => {
        log.push("undo:a");
        useHistoryStore.getState().record(trackingEntry("reversal", log));
      },
      redo: () => void log.push("redo:a"),
    });

    await useHistoryStore.getState().undo();

    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useHistoryStore.getState().future.map((e) => e.label)).toEqual(["a"]);
  });

  // A failed write must not consume the entry — the user's next press is their
  // retry, and dropping it would leave them with no way back at all.
  it("keeps the entry when undoing throws, and says so", async () => {
    useHistoryStore.getState().record({
      label: "a",
      undo: () => Promise.reject(new Error("disk is busy")),
      redo: () => {},
    });

    await useHistoryStore.getState().undo();

    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().future).toHaveLength(0);
    expect(useHistoryStore.getState().lastAction?.message).toBe("Couldn't undo that");
  });

  it("says so rather than doing nothing when there's nothing left", async () => {
    await useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().lastAction?.message).toBe("Nothing to undo");

    await useHistoryStore.getState().redo();
    expect(useHistoryStore.getState().lastAction?.message).toBe("Nothing to redo");
  });

  it("names what it did", async () => {
    useHistoryStore.getState().record(trackingEntry("deleting 2 pages", []));
    await useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().lastAction?.message).toBe("Undid deleting 2 pages");
    await useHistoryStore.getState().redo();
    expect(useHistoryStore.getState().lastAction?.message).toBe("Redid deleting 2 pages");
  });

  // Redoing something recorded against a tree that has since changed is worse
  // than not offering it.
  it("throws the redo branch away as soon as something new happens", async () => {
    const log: string[] = [];
    useHistoryStore.getState().record(trackingEntry("a", log));
    await useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().future).toHaveLength(1);

    useHistoryStore.getState().record(trackingEntry("b", log));
    expect(useHistoryStore.getState().future).toHaveLength(0);
  });

  it("clears both stacks, for opening and closing a project", async () => {
    useHistoryStore.getState().record(trackingEntry("a", []));
    await useHistoryStore.getState().undo();
    useHistoryStore.getState().clear();

    expect(useHistoryStore.getState().past).toEqual([]);
    expect(useHistoryStore.getState().future).toEqual([]);
    expect(useHistoryStore.getState().lastAction).toBeNull();
  });
});
