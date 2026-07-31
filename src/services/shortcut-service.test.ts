import { describe, expect, it } from "vitest";
import {
  bindingFromEvent,
  bindingsEqual,
  checkBinding,
  formatBinding,
  formatKey,
  isTextEntryTarget,
  matchesBinding,
  mergeBindings,
  normalizeKey,
  parseOverrides,
} from "./shortcut-service";
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

describe("bindingsEqual", () => {
  it("treats an absent modifier and an explicit false as the same", () => {
    expect(bindingsEqual({ key: "k", mod: true }, { key: "k", mod: true, shift: false, alt: false })).toBe(true);
  });

  it("separates bindings that differ only by a modifier", () => {
    expect(bindingsEqual({ key: "k", mod: true }, { key: "k", mod: true, shift: true })).toBe(false);
  });
});

describe("bindingFromEvent", () => {
  it("ignores the frames where only modifiers are down", () => {
    expect(bindingFromEvent(keyEvent("Control", { ctrlKey: true }))).toBeNull();
    expect(bindingFromEvent(keyEvent("Shift", { shiftKey: true }))).toBeNull();
  });

  it("reads the modifiers that were held", () => {
    expect(bindingFromEvent(keyEvent("P", { ctrlKey: true, shiftKey: true }))).toEqual({
      key: "p",
      mod: true,
      shift: true,
    });
  });

  it("leaves function keys unlowercased", () => {
    expect(bindingFromEvent(keyEvent("F4"))).toEqual({ key: "F4" });
  });
});

describe("checkBinding", () => {
  const current = DEFAULT_BINDINGS;

  it("accepts an unclaimed modifier combination", () => {
    expect(checkBinding({ key: "j", mod: true }, "search", current)).toBeNull();
  });

  // The accessibility decision: a bare letter can't work in a text editor, but
  // requiring a chord is the exact barrier this screen exists to remove.
  it("refuses a bare letter", () => {
    expect(checkBinding({ key: "j" }, "search", current)?.reason).toBe("needsModifier");
  });

  it("accepts a function key with no modifier at all", () => {
    expect(checkBinding({ key: "F4" }, "search", current)).toBeNull();
    expect(checkBinding({ key: "F12" }, "search", current)).toBeNull();
  });

  it("refuses Shift-plus-letter, which still fires while typing", () => {
    expect(checkBinding({ key: "j", shift: true }, "search", current)?.reason).toBe("needsModifier");
  });

  it("refuses every Ctrl+Alt combination, since headings claim the space", () => {
    expect(checkBinding({ key: "j", mod: true, alt: true }, "search", current)?.reason).toBe("reservedByEditor");
  });

  it("refuses the editor's own history keys", () => {
    expect(checkBinding({ key: "z", mod: true }, "search", current)?.reason).toBe("reservedByEditor");
    expect(checkBinding({ key: "y", mod: true }, "search", current)?.reason).toBe("reservedByEditor");
    expect(checkBinding({ key: "z", mod: true, shift: true }, "search", current)?.reason).toBe("reservedByEditor");
  });

  it("refuses copy and paste", () => {
    expect(checkBinding({ key: "c", mod: true }, "search", current)?.reason).toBe("reservedBySystem");
    expect(checkBinding({ key: "v", mod: true }, "search", current)?.reason).toBe("reservedBySystem");
  });

  it("names the action already holding the key", () => {
    const problem = checkBinding({ key: "n", mod: true }, "search", current);
    expect(problem?.reason).toBe("alreadyTaken");
    expect(problem?.message).toContain("New page");
  });

  it("lets an action keep the binding it already has", () => {
    expect(checkBinding(DEFAULT_BINDINGS.search, "search", current)).toBeNull();
  });

  // Undo and redo stand down whenever the caret is in text, so they and the
  // editor can hold the same combination without either losing it. That
  // exemption is the only reason app undo can live on Ctrl+Z, and it must not
  // leak to actions that don't yield.
  it("lets the editor-scoped actions sit on the editor's own keys", () => {
    expect(checkBinding({ key: "z", mod: true }, "undo", current)).toBeNull();
    expect(checkBinding({ key: "y", mod: true }, "redo", current)).toBeNull();
    expect(checkBinding({ key: "q", mod: true, alt: true }, "undo", current)).toBeNull();
  });

  it("still refuses system keys for them", () => {
    expect(checkBinding({ key: "c", mod: true }, "undo", current)?.reason).toBe("reservedBySystem");
    expect(checkBinding({ key: "j" }, "undo", current)?.reason).toBe("needsModifier");
  });

  it("keeps the exemption away from actions that don't yield to the editor", () => {
    expect(checkBinding({ key: "z", mod: true }, "newPage", current)?.reason).toBe("reservedByEditor");
  });

  it("names undo when something else reaches for its key", () => {
    const problem = checkBinding({ key: "z", mod: true }, "undo", { ...current, save: { key: "z", mod: true } });
    expect(problem?.reason).toBe("alreadyTaken");
    expect(problem?.message).toContain("Save now");
  });
});

describe("isTextEntryTarget", () => {
  // The real one is a DOM Element; all this reads off it is `closest`.
  function fakeTarget(matches: string[]) {
    return { closest: (selector: string) => (matches.includes(selector) ? {} : null) };
  }

  it("is false when nothing text-like is in the ancestry", () => {
    expect(isTextEntryTarget(fakeTarget([]) as unknown as EventTarget)).toBe(false);
  });

  it("is true inside the editor", () => {
    expect(isTextEntryTarget(fakeTarget([".editor-shell-wrapper"]) as unknown as EventTarget)).toBe(true);
  });

  it("is true inside an input or a contenteditable", () => {
    expect(isTextEntryTarget(fakeTarget(["input, textarea"]) as unknown as EventTarget)).toBe(true);
    expect(isTextEntryTarget(fakeTarget(['[contenteditable="true"], [contenteditable=""]']) as unknown as EventTarget)).toBe(
      true,
    );
  });

  // A keypress with nothing focused arrives on document.body, so "can't answer
  // closest" has to mean "not a text field" rather than throwing.
  it("survives a target that isn't an element", () => {
    expect(isTextEntryTarget(null)).toBe(false);
    expect(isTextEntryTarget({} as EventTarget)).toBe(false);
  });
});

describe("parseOverrides", () => {
  it("survives junk", () => {
    expect(parseOverrides(null)).toEqual({});
    expect(parseOverrides("nope")).toEqual({});
    expect(parseOverrides({ search: "Ctrl+K" })).toEqual({});
    expect(parseOverrides({ search: { key: 7 } })).toEqual({});
    expect(parseOverrides({ search: { key: "j", mod: "yes" } })).toEqual({});
  });

  it("ignores keys that aren't actions", () => {
    expect(parseOverrides({ somethingElse: { key: "j", mod: true } })).toEqual({});
  });

  // The file outlives any given version: a binding that was legal when written
  // may have been claimed since, and falling back to the default beats keeping
  // a shortcut that can no longer fire.
  it("drops a stored binding that today's rules refuse", () => {
    expect(parseOverrides({ search: { key: "z", mod: true } })).toEqual({});
    expect(parseOverrides({ search: { key: "j" } })).toEqual({});
  });

  it("keeps a usable one", () => {
    expect(parseOverrides({ search: { key: "j", mod: true } })).toEqual({ search: { key: "j", mod: true } });
  });

  // Checked for shape but not for collisions, so swapping two actions' keys
  // round-trips instead of being thrown away as a clash with the defaults.
  it("keeps a swap of two actions' keys", () => {
    const swapped = { search: { key: "n", mod: true }, newPage: { key: "k", mod: true } };
    expect(parseOverrides(swapped)).toEqual(swapped);
  });
});

describe("mergeBindings", () => {
  it("leaves untouched actions on their defaults", () => {
    const merged = mergeBindings({ search: { key: "j", mod: true } });
    expect(merged.search).toEqual({ key: "j", mod: true });
    expect(merged.newPage).toEqual(DEFAULT_BINDINGS.newPage);
  });

  it("returns every action even with no overrides at all", () => {
    expect(mergeBindings({})).toEqual(DEFAULT_BINDINGS);
  });
});
