import { describe, expect, it } from "vitest";
import { getCalloutIcon, getCalloutIconLabel } from "./callout-colors";
import { COLOR_PALETTE } from "./palette";

describe("what a coloured callout says", () => {
  it("gives the four conventions their icon", () => {
    expect(getCalloutIconLabel("emerald")).toBe("Confirmation");
    expect(getCalloutIconLabel("amber")).toBe("Caution");
    expect(getCalloutIconLabel("red")).toBe("Warning");
    expect(getCalloutIconLabel("blue")).toBe("Note");
  });

  it("reads a whole hue the same way, whichever weight of it she picked", () => {
    // She picks the green she likes the look of, not the one carrying the
    // meaning — so all four greens have to say the same thing.
    for (const green of ["emerald", "sage", "teal", "pine"]) {
      expect(getCalloutIconLabel(green)).toBe("Confirmation");
    }
  });

  it("leaves a colour with no convention wearing no icon", () => {
    expect(getCalloutIcon("purple")).toBeUndefined();
    expect(getCalloutIcon("gray")).toBeUndefined();
  });

  it("is nothing at all for an uncoloured callout", () => {
    expect(getCalloutIcon("")).toBeUndefined();
    expect(getCalloutIcon(undefined)).toBeUndefined();
  });

  it("never reads a meaning off a colour she mixed herself", () => {
    // A raw hex has no name, so there is nothing to read a meaning off —
    // guessing from how red the number is would put a stop sign on a page for a
    // colour picked because she liked it.
    expect(getCalloutIcon("#dc2626")).toBeUndefined();
    expect(getCalloutIcon("#16a34a")).toBeUndefined();
  });

  it("only names colours the palette actually offers", () => {
    // An icon keyed to a colour no swatch offers is an icon nobody can reach.
    // Spelled out rather than derived, so a palette rename fails here instead
    // of quietly agreeing with itself.
    const iconed = [
      "emerald", "sage", "teal", "pine",
      "amber", "orange", "bronze", "rust",
      "red", "rose", "coral", "wine",
      "sky", "cyan", "blue", "ocean", "navy", "indigo",
    ];
    const known = new Set(COLOR_PALETTE.map((color) => color.key));
    for (const key of iconed) {
      expect(known.has(key), `${key} is not in the palette`).toBe(true);
      expect(getCalloutIcon(key), `${key} has no icon`).toBeDefined();
    }
  });
});
