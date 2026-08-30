// `fontChoicesFor` is exported from a hooks file but is a plain function with
// no React in it — it decides what the four typeface menus contain, which is
// the sort of thing that rots quietly when a category is added.
import { describe, expect, it } from "vitest";
import { FONT_LIBRARY } from "../constants/font-library";
import { FONT_SLOTS } from "../constants/themes";
import { fontChoicesFor } from "./use-theme";

describe("fontChoicesFor", () => {
  /**
   * **Every slot offers every family, as of 2026-08-30.** It used to offer only
   * the categories in `slot.cats`, so Monospace was reachable from Code and
   * nowhere else. That was the app deciding what she was allowed to want on the
   * one screen that exists for her to decide what she wants; a bad pick here
   * costs one more pick. If this fails because a slot was given a shorter list
   * again, the filter has come back.
   */
  it.each(FONT_SLOTS.map((slot) => slot.key))("%s offers the whole library", (key) => {
    const slot = FONT_SLOTS.find((entry) => entry.key === key)!;
    const offered = fontChoicesFor(slot).flatMap((group) => group.fonts.map((font) => font.family));

    expect(offered).toHaveLength(FONT_LIBRARY.length);
    expect(new Set(offered).size).toBe(FONT_LIBRARY.length);
  });

  /**
   * What `slot.cats` still does. Interface opening on Sans-serif and Code on
   * Monospace is the useful half of the old filter, and the only reason the
   * field survives at all.
   */
  it.each(FONT_SLOTS.map((slot) => [slot.key, slot.cats[0]] as const))("%s opens on %s", (key, first) => {
    const slot = FONT_SLOTS.find((entry) => entry.key === key)!;
    expect(fontChoicesFor(slot)[0]?.cat).toBe(first);
  });

  it("names every group and says what it is for", () => {
    for (const group of fontChoicesFor(FONT_SLOTS[0])) {
      expect(group.label.length).toBeGreaterThan(0);
      expect(group.hint.length).toBeGreaterThan(0);
      // The families inside are alphabetical — the list is browsed by looking,
      // and library order is the order they were typed into the build script.
      const names = group.fonts.map((font) => font.family);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    }
  });
});
