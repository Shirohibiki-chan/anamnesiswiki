import { describe, expect, it } from "vitest";
import { listStepForKey, stepIndex } from "./list-keys";

function press(key: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) {
  return { key, ctrlKey: false, metaKey: false, altKey: false, ...mods };
}

describe("listStepForKey", () => {
  it("moves on the arrow keys", () => {
    expect(listStepForKey(press("ArrowDown"))).toBe("next");
    expect(listStepForKey(press("ArrowUp"))).toBe("previous");
  });

  it("moves on Ctrl-N and Ctrl-P", () => {
    expect(listStepForKey(press("n", { ctrlKey: true }))).toBe("next");
    expect(listStepForKey(press("p", { ctrlKey: true }))).toBe("previous");
  });

  // Caps lock, or a shifted N — the same key either way.
  it("doesn't care about the letter's case", () => {
    expect(listStepForKey(press("N", { ctrlKey: true }))).toBe("next");
    expect(listStepForKey(press("P", { ctrlKey: true }))).toBe("previous");
  });

  it("leaves the bare letters alone, so typing still types", () => {
    expect(listStepForKey(press("n"))).toBeNull();
    expect(listStepForKey(press("p"))).toBeNull();
  });

  // Cmd-N is a new page in this app and a new window on macOS. The Emacs
  // bindings this borrows have always been Control, so there's nothing to gain
  // by taking Command as well.
  it("never answers to Command", () => {
    expect(listStepForKey(press("n", { metaKey: true }))).toBeNull();
    expect(listStepForKey(press("p", { metaKey: true }))).toBeNull();
    expect(listStepForKey(press("n", { metaKey: true, ctrlKey: true }))).toBeNull();
  });

  // Alt+arrow is back/forward, and has to keep meaning that.
  it("never answers with Alt held", () => {
    expect(listStepForKey(press("ArrowDown", { altKey: true }))).toBeNull();
    expect(listStepForKey(press("n", { ctrlKey: true, altKey: true }))).toBeNull();
  });

  it("ignores everything else", () => {
    expect(listStepForKey(press("Enter"))).toBeNull();
    expect(listStepForKey(press("j", { ctrlKey: true }))).toBeNull();
    expect(listStepForKey(press("ArrowLeft"))).toBeNull();
  });
});

describe("stepIndex", () => {
  it("walks the list", () => {
    expect(stepIndex(0, "next", 3)).toBe(1);
    expect(stepIndex(1, "previous", 3)).toBe(0);
  });

  it("wraps at both ends", () => {
    expect(stepIndex(2, "next", 3)).toBe(0);
    expect(stepIndex(0, "previous", 3)).toBe(2);
  });

  // A list can empty out between the keypress and the render that follows it.
  it("stays at zero on an empty list rather than returning NaN", () => {
    expect(stepIndex(0, "next", 0)).toBe(0);
    expect(stepIndex(4, "previous", 0)).toBe(0);
  });
});
