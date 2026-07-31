import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelSave, flushAllSaves, flushSave, hasPendingSaves, scheduleSave } from "./autosave";

afterEach(async () => {
  await flushAllSaves();
  vi.useRealTimers();
});

describe("autosave", () => {
  it("debounces repeated writes for the same key into one", async () => {
    vi.useFakeTimers();
    const save = vi.fn();
    scheduleSave("a", save);
    scheduleSave("a", save);
    scheduleSave("a", save);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("reports whether anything is outstanding", () => {
    vi.useFakeTimers();
    expect(hasPendingSaves()).toBe(false);
    scheduleSave("a", vi.fn());
    expect(hasPendingSaves()).toBe(true);
    cancelSave("a");
    expect(hasPendingSaves()).toBe(false);
  });

  it("flushSave runs the pending write immediately and clears it", async () => {
    vi.useFakeTimers();
    const save = vi.fn();
    scheduleSave("a", save);
    await flushSave("a");
    expect(save).toHaveBeenCalledTimes(1);
    expect(hasPendingSaves()).toBe(false);
    // the timer must not fire a second write afterwards
    await vi.advanceTimersByTimeAsync(400);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("cancelSave drops the write entirely", async () => {
    vi.useFakeTimers();
    const save = vi.fn();
    scheduleSave("a", save);
    cancelSave("a");
    await vi.advanceTimersByTimeAsync(400);
    expect(save).not.toHaveBeenCalled();
  });

  // The whole point of flushing on exit: the ~300ms debounce window is
  // straightforwardly lost work if the process ends inside it.
  it("flushAllSaves writes every outstanding key", async () => {
    vi.useFakeTimers();
    const a = vi.fn();
    const b = vi.fn();
    scheduleSave("a", a);
    scheduleSave("b", b);
    await flushAllSaves();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(hasPendingSaves()).toBe(false);
  });

  it("one failing write doesn't stop the others from flushing", async () => {
    vi.useFakeTimers();
    const good = vi.fn();
    scheduleSave("bad", () => Promise.reject(new Error("disk full")));
    scheduleSave("good", good);
    await expect(flushAllSaves()).resolves.toBeUndefined();
    expect(good).toHaveBeenCalledTimes(1);
    expect(hasPendingSaves()).toBe(false);
  });
});
