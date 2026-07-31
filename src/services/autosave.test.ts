import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelSave,
  flushAllSaves,
  flushSave,
  hasPendingSaves,
  scheduleSave,
  setSaveErrorHandler,
} from "./autosave";

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
    // Resolves rather than rejecting, and reports the one failure so a manual
    // save knows not to claim "Saved" — see project-store's saveNow.
    await expect(flushAllSaves()).resolves.toBe(1);
    expect(good).toHaveBeenCalledTimes(1);
    expect(hasPendingSaves()).toBe(false);
  });

  it("reports no failures when everything writes", async () => {
    vi.useFakeTimers();
    scheduleSave("a", vi.fn());
    await expect(flushAllSaves()).resolves.toBe(0);
  });

  it("reports no failures when there was nothing to flush", async () => {
    await expect(flushAllSaves()).resolves.toBe(0);
  });
});

// Regression: a debounced save runs with no caller left to catch anything, so
// a rejected write used to disappear as an unhandled rejection while the app
// went on showing the last successful save's "Saved". These cover the reporting
// channel that replaced that silence.
describe("save failure reporting", () => {
  afterEach(() => setSaveErrorHandler(null));

  it("reports a debounced save that throws", async () => {
    const reported: unknown[] = [];
    setSaveErrorHandler((_key, error) => reported.push(error));

    const boom = new Error("disk full");
    scheduleSave("node-1", () => Promise.reject(boom));
    await flushAllSaves();

    expect(reported).toEqual([boom]);
  });

  it("passes the failing key through, so the store can name what didn't save", async () => {
    const keys: string[] = [];
    setSaveErrorHandler((key) => keys.push(key));

    scheduleSave("node-7", () => Promise.reject(new Error("nope")));
    await flushAllSaves();

    expect(keys).toEqual(["node-7"]);
  });

  it("reports a synchronous throw as well as a rejected promise", async () => {
    const reported: unknown[] = [];
    setSaveErrorHandler((_key, error) => reported.push(error));

    scheduleSave("node-2", () => {
      throw new Error("sync boom");
    });
    await flushAllSaves();

    expect(reported).toHaveLength(1);
  });

  it("lets the remaining keys flush even when one of them fails", async () => {
    setSaveErrorHandler(() => {});
    const good = vi.fn();

    scheduleSave("bad", () => Promise.reject(new Error("nope")));
    scheduleSave("good", good);
    await flushAllSaves();

    expect(good).toHaveBeenCalledTimes(1);
    expect(hasPendingSaves()).toBe(false);
  });

  it("does not report a save that succeeds", async () => {
    const reported: unknown[] = [];
    setSaveErrorHandler((_key, error) => reported.push(error));

    scheduleSave("fine", () => Promise.resolve());
    await flushAllSaves();

    expect(reported).toEqual([]);
  });
});
