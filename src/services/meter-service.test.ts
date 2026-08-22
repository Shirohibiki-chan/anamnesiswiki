import { describe, expect, it } from "vitest";
import type { MeterEntry, MeterStyle } from "../constants/schema";
import {
  arcFractionAt,
  metersOf,
  arcPath,
  barFractionAt,
  meterFraction,
  meterMax,
  meterPoint,
  meterReadout,
  meterValue,
  nudgedValue,
  pipClickValue,
  showsMax,
  showsText,
  parseMeterInput,
  valueAtFraction,
  withMeter,
  withoutMeter,
} from "./meter-service";

function entry(patch: Partial<MeterEntry> = {}): MeterEntry {
  return { id: "m", ...patch };
}

describe("meterMax", () => {
  it("reads against 100 by default, so a bare 75 means 75%", () => {
    expect(meterMax(entry(), "bar")).toBe(100);
  });

  it("gives a rating five pips by default", () => {
    expect(meterMax(entry(), "rating")).toBe(5);
  });

  // The cap is a sanity bound, not a design one: her reference draws 76
  // tokens in a wrapped grid, so the only job here is stopping a typed 5000.
  it("bounds pips rather than trusting a typed number", () => {
    expect(meterMax(entry({ max: 76 }), "pool")).toBe(76);
    expect(meterMax(entry({ max: 5000 }), "rating")).toBe(200);
  });

  it("rounds a fractional pip count, since half a star is not drawable here", () => {
    expect(meterMax(entry({ max: 4.6 }), "pool")).toBe(5);
  });

  it("falls back rather than dividing by zero or going negative", () => {
    expect(meterMax(entry({ max: 0 }), "bar")).toBe(100);
    expect(meterMax(entry({ max: -20 }), "bar")).toBe(100);
  });
});

describe("meterValue", () => {
  it("keeps a value inside range", () => {
    expect(meterValue(entry({ value: 140 }), "bar")).toBe(100);
    expect(meterValue(entry({ value: -5 }), "bar")).toBe(0);
  });

  // The maximum can move under a stored value: dropping a rating from ten
  // pips to three leaves an 8 behind, and drawing eight of three is worse
  // than showing three.
  it("clamps against a maximum that has since shrunk", () => {
    expect(meterValue(entry({ max: 3, value: 8 }), "rating")).toBe(3);
  });

  it("leaves the stored number alone, so raising the maximum restores it", () => {
    const reading = entry({ max: 3, value: 8 });
    meterValue(reading, "rating");
    expect(reading.value).toBe(8);
  });

  it("is a whole number of pips", () => {
    expect(meterValue(entry({ max: 5, value: 2.4 }), "pool")).toBe(2);
  });

  it("treats a missing value as empty rather than as a gap", () => {
    expect(meterValue(entry(), "bar")).toBe(0);
  });
});

describe("meterFraction", () => {
  it("reads a proportion", () => {
    expect(meterFraction(entry({ value: 75 }), "bar")).toBeCloseTo(0.75);
  });

  it("reads pips as a proportion too, so every shape shares one model", () => {
    expect(meterFraction(entry({ max: 4, value: 1 }), "rating")).toBeCloseTo(0.25);
  });
});

// The one place the two pip shapes differ, and the reason Token Pool survived
// being questioned as a D&D-only idea.
describe("pipClickValue", () => {
  it("sets the level for a rating", () => {
    expect(pipClickValue("rating", 0, 2)).toBe(3);
  });

  it("clears a rating when its own level is clicked, or a mistake is permanent", () => {
    expect(pipClickValue("rating", 3, 2)).toBe(0);
  });

  it("spends down to a full token that was clicked", () => {
    expect(pipClickValue("pool", 5, 2)).toBe(2);
  });

  it("refills up to an empty token that was clicked", () => {
    expect(pipClickValue("pool", 1, 3)).toBe(4);
  });

  // The difference from a rating, in one case: a pool of one spends to empty
  // rather than toggling back to one.
  it("spends the last token to nothing", () => {
    expect(pipClickValue("pool", 1, 0)).toBe(0);
  });
});

describe("arcPath", () => {
  it("draws nothing at all when empty, rather than a dot", () => {
    expect(arcPath(0, 0, 360)).toBe("");
  });

  // Start and end land on the same point, and a single arc between them
  // renders as nothing — a full ring has to be two halves.
  it("draws a full circle as two arcs", () => {
    expect(arcPath(1, 0, 360).match(/A /g)?.length).toBe(2);
  });

  it("draws a partial sweep as one arc", () => {
    expect(arcPath(0.5, 0, 360).match(/A /g)?.length).toBe(1);
  });

  it("flags the long way round past halfway", () => {
    expect(arcPath(0.75, 0, 360)).toContain(" 1 1 ");
    expect(arcPath(0.25, 0, 360)).toContain(" 0 1 ");
  });

  it("starts a circle at the top", () => {
    expect(arcPath(0.5, 0, 360)).toMatch(/^M 50 10 /);
  });

  it("clamps an overfull fraction instead of winding past the end", () => {
    expect(arcPath(3, 0, 360)).toBe(arcPath(1, 0, 360));
  });
});

describe("every style", () => {
  const styles: MeterStyle[] = ["bar", "circle", "semicircle", "gauge", "rating", "pool"];

  it("produces a usable maximum and an in-range value", () => {
    for (const style of styles) {
      const reading = entry({ value: 3 });
      expect(meterMax(reading, style), style).toBeGreaterThan(0);
      expect(meterValue(reading, style), style).toBeLessThanOrEqual(meterMax(reading, style));
    }
  });
});

describe("meterReadout", () => {
  it("reads a default meter as a percentage, because that is what the number means", () => {
    expect(meterReadout(entry({ value: 75 }), "circle")).toBe("75%");
  });

  it("shows the pair when the maximum is anything else", () => {
    expect(meterReadout(entry({ max: 8, value: 3 }), "gauge")).toBe("3/8");
  });

  it("doesn't spill a long decimal into a small circle", () => {
    expect(meterReadout(entry({ max: 3, value: 1 / 3 }), "circle")).toBe("0.3/3");
  });
});

// Dragging, which is the inverse of the drawing above — so the tests that
// matter are the round trips: a fraction turned into a point and back.
describe("arcFractionAt", () => {
  const roundTrip = (style: "circle" | "semicircle" | "gauge", start: number, sweep: number) =>
    [0.25, 0.5, 0.75].map((fraction) => {
      const [x, y] = meterPoint(start + fraction * sweep);
      return Math.round(arcFractionAt(style, x, y) * 100) / 100;
    });

  it("reads back the fraction each shape was drawn at", () => {
    expect(roundTrip("circle", 0, 360)).toEqual([0.25, 0.5, 0.75]);
    expect(roundTrip("semicircle", 270, 180)).toEqual([0.25, 0.5, 0.75]);
    expect(roundTrip("gauge", 225, 270)).toEqual([0.25, 0.5, 0.75]);
  });

  it("reads the start of a sweep as empty", () => {
    const [x, y] = meterPoint(270);
    expect(arcFractionAt("semicircle", x, y)).toBeCloseTo(0);
  });

  // The gap at the bottom of a gauge is 90 degrees of nothing. Overshooting
  // the full end by a hair has to mean full, or the dial empties itself at the
  // exact moment you fill it.
  it("snaps just past the full end to full", () => {
    const [x, y] = meterPoint(225 + 270 + 10);
    expect(arcFractionAt("gauge", x, y)).toBe(1);
  });

  it("snaps just before the empty end to empty", () => {
    const [x, y] = meterPoint(225 - 10);
    expect(arcFractionAt("gauge", x, y)).toBe(0);
  });

  it("ignores how far from the centre the pointer drifted", () => {
    const near = arcFractionAt("circle", ...(meterPoint(90, 12) as [number, number]));
    const far = arcFractionAt("circle", ...(meterPoint(90, 300) as [number, number]));
    expect(near).toBeCloseTo(0.25);
    expect(far).toBeCloseTo(0.25);
  });
});

describe("barFractionAt", () => {
  it("reads a position along the track", () => {
    expect(barFractionAt(30, 120)).toBeCloseTo(0.25);
  });

  it("clamps a drag that left the track", () => {
    expect(barFractionAt(-40, 120)).toBe(0);
    expect(barFractionAt(400, 120)).toBe(1);
  });

  it("survives being measured before the track has a width", () => {
    expect(barFractionAt(10, 0)).toBe(0);
  });
});

describe("valueAtFraction", () => {
  it("gives whole units, because no maximum here wants a decimal", () => {
    expect(valueAtFraction(entry(), "bar", 0.618)).toBe(62);
    expect(valueAtFraction(entry({ max: 8 }), "gauge", 0.5)).toBe(4);
  });

  it("clamps a drag past either end", () => {
    expect(valueAtFraction(entry(), "bar", 1.4)).toBe(100);
    expect(valueAtFraction(entry(), "bar", -0.2)).toBe(0);
  });
});

describe("nudgedValue", () => {
  it("steps by whole units and stops at the ends", () => {
    expect(nudgedValue(entry({ value: 40 }), "bar", 10)).toBe(50);
    expect(nudgedValue(entry({ value: 96 }), "bar", 10)).toBe(100);
    expect(nudgedValue(entry({ value: 0 }), "rating", -1)).toBe(0);
  });

  // Starts from what is on screen, not from what is stored: a rating whose pip
  // count shrank draws 3 and must not jump to 9 on one arrow press.
  it("starts from the drawn value, not the remembered one", () => {
    expect(nudgedValue(entry({ max: 3, value: 8 }), "rating", 1)).toBe(3);
  });
});

describe("meterReadout without the maximum", () => {
  it("drops the pair when Show Max is off", () => {
    expect(meterReadout(entry({ max: 10, value: 6 }), "bar", false)).toBe("6");
  });

  // The percent sign goes with it: "50%" is the value read against 100, and a
  // block told not to show its maximum shouldn't keep showing it in disguise.
  it("drops the percent too, since that is the maximum showing", () => {
    expect(meterReadout(entry({ value: 50 }), "bar", false)).toBe("50");
  });
});

describe("the block's display toggles", () => {
  it("treats absent as on, so a normal block stores nothing", () => {
    expect(showsText({ id: "b", kind: "meter" })).toBe(true);
    expect(showsMax({ id: "b", kind: "meter" })).toBe(true);
  });

  it("reads false as off", () => {
    expect(showsText({ id: "b", kind: "meter", showText: false })).toBe(false);
    expect(showsMax({ id: "b", kind: "meter", showMax: false })).toBe(false);
  });
});

describe("editing the list of readings", () => {
  const list = [entry({ id: "a", label: "Health" }), entry({ id: "b", label: "Mana" })];

  it("changes one reading and leaves the rest alone", () => {
    const next = withMeter(list, "b", { value: 4 });
    expect(next[1].value).toBe(4);
    expect(next[0]).toBe(list[0]);
  });

  // These end up in JSON on disk, so a cleared field has to be absent rather
  // than present-and-undefined — the same rule block-service's withField keeps.
  it("removes a field that was cleared rather than storing undefined", () => {
    const next = withMeter(list, "a", { label: undefined });
    expect("label" in next[0]).toBe(false);
  });

  it("leaves the list alone when the id matches nothing", () => {
    expect(withMeter(list, "gone", { value: 1 })).toEqual(list);
  });

  it("takes one out", () => {
    expect(withoutMeter(list, "a").map((reading) => reading.id)).toEqual(["b"]);
  });

  // An empty meter block is one she can see and delete. One that grows a fresh
  // reading whenever she removes the last is a block that will not go away.
  it("lets the last one be removed rather than refilling itself", () => {
    expect(withoutMeter([entry({ id: "only" })], "only")).toEqual([]);
  });
});

describe("metersOf", () => {
  it("hands back the same array every time for a block with none", () => {
    expect(metersOf({ id: "b", kind: "meter" })).toBe(metersOf({ id: "c", kind: "meter" }));
  });
});

describe("parseMeterInput", () => {
  it("takes a bare number as the value", () => {
    expect(parseMeterInput("62")).toEqual({ value: 62 });
  });

  // Typing back what the meter was showing must not be an error.
  it("ignores a trailing percent", () => {
    expect(parseMeterInput("62%")).toEqual({ value: 62 });
    expect(parseMeterInput("62 %")).toEqual({ value: 62 });
  });

  it("takes x/y as both numbers at once", () => {
    expect(parseMeterInput("4/10")).toEqual({ value: 4, max: 10 });
    expect(parseMeterInput(" 4 / 10 ")).toEqual({ value: 4, max: 10 });
  });

  it("stores a zero as absent, like every other default", () => {
    expect(parseMeterInput("0")).toEqual({ value: undefined });
    expect(parseMeterInput("0/8")).toEqual({ value: undefined, max: 8 });
  });

  it("empties the value when the box is cleared", () => {
    expect(parseMeterInput("   ")).toEqual({ value: undefined });
  });

  // Refusing rather than guessing: a half-typed "4/" should leave the meter
  // where it was, not blank its maximum on the way through.
  it("refuses what isn't a number, and half-typed states", () => {
    expect(parseMeterInput("lots")).toBeNull();
    expect(parseMeterInput("4/")).toBeNull();
    expect(parseMeterInput("4/0")).toBeNull();
    expect(parseMeterInput("1/2/3")).toBeNull();
  });

  it("takes a decimal, since typing is the precise path", () => {
    expect(parseMeterInput("62.5")).toEqual({ value: 62.5 });
  });
});
