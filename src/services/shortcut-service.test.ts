import { describe, expect, it } from "vitest";
import { formatBinding, formatKey, matchesBinding, normalizeKey } from "./shortcut-service";
import { DEFAULT_BINDINGS } from "../constants/shortcuts";

// The tests run in Vitest's node environment (see vitest.config.ts), so there
// is no real KeyboardEvent to construct. `matchesBinding` reads four fields
// and nothing else, which is exactly what this supplies.
function keyEvent(key: string, modifiers: Partial<Record<"ctrlKey" | "metaKey" | "shiftKey" | "altKey", boolean>> = {}) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...modifiers,
  } as KeyboardEvent;
}

describe("normalizeKey", () => {
  it("lowercases single characters so Shift doesn't change the key", () => {
    expect(normalizeKey("K")).toBe("k");
  });

  it("leaves named keys alone", () => {
    expect(normalizeKey("F2")).toBe("F2");
    expect(normalizeKey("ArrowDown")).toBe("ArrowDown");
  });
});

describe("matchesBinding", () => {
  it("matches Ctrl and Cmd interchangeably for mod", () => {
    expect(matchesBinding(keyEvent("k", { ctrlKey: true }), DEFAULT_BINDINGS.search)).toBe(true);
    expect(matchesBinding(keyEvent("k", { metaKey: true }), DEFAULT_BINDINGS.search)).toBe(true);
  });

  it("does not match the bare key when the binding wants mod", () => {
    expect(matchesBinding(keyEvent("k"), DEFAULT_BINDINGS.search)).toBe(false);
  });

  it("does not match when the binding wants no mod and one is held", () => {
    expect(matchesBinding(keyEvent("F2", { ctrlKey: true }), { key: "F2" })).toBe(false);
    expect(matchesBinding(keyEvent("F2"), { key: "F2" })).toBe(true);
  });

  // The whole reason matching is exact: a subset match would let Ctrl+Shift+K
  // open search on its way to whatever it was really aimed at.
  it("does not match a Shift-bearing press against a Shift-free binding", () => {
    expect(matchesBinding(keyEvent("K", { ctrlKey: true, shiftKey: true }), DEFAULT_BINDINGS.search)).toBe(false);
  });

  it("matches a Shift binding against the uppercase key the browser reports", () => {
    expect(matchesBinding(keyEvent("K", { ctrlKey: true, shiftKey: true }), { key: "k", mod: true, shift: true })).toBe(true);
  });

  // BlockNote's own shortcuts are Mod-Alt combinations; letting Alt slide would
  // mean the app swallowed them before the editor saw them.
  it("does not match when Alt is held and the binding doesn't ask for it", () => {
    expect(matchesBinding(keyEvent("k", { ctrlKey: true, altKey: true }), DEFAULT_BINDINGS.search)).toBe(false);
  });

  it("keeps the three shipped defaults distinct from each other", () => {
    const press = keyEvent("n", { ctrlKey: true });
    expect(matchesBinding(press, DEFAULT_BINDINGS.newPage)).toBe(true);
    expect(matchesBinding(press, DEFAULT_BINDINGS.search)).toBe(false);
    expect(matchesBinding(press, DEFAULT_BINDINGS.save)).toBe(false);
  });
});

describe("formatKey", () => {
  it("uppercases letters", () => {
    expect(formatKey("k")).toBe("K");
  });

  it("names keys that would otherwise render as nothing", () => {
    expect(formatKey(" ")).toBe("Space");
    expect(formatKey("ArrowUp")).toBe("↑");
  });
});

describe("formatBinding", () => {
  it("writes the platform's own modifier names", () => {
    expect(formatBinding(DEFAULT_BINDINGS.search, false)).toBe("Ctrl+K");
    expect(formatBinding(DEFAULT_BINDINGS.search, true)).toBe("⌘K");
  });

  it("orders modifiers the same way every time", () => {
    const binding = { key: "n", mod: true, shift: true, alt: true };
    expect(formatBinding(binding, false)).toBe("Ctrl+Alt+Shift+N");
    expect(formatBinding(binding, true)).toBe("⌘⌥⇧N");
  });

  it("renders a bare function key with no modifier text", () => {
    expect(formatBinding({ key: "F2" }, false)).toBe("F2");
  });
});
