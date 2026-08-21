import { describe, expect, it } from "vitest";
import type { Block, MeterStyle } from "../constants/schema";
import {
  arcFractionAt,
  arcPath,
  barFractionAt,
  meterFraction,
  meterMax,
  meterPoint,
  meterReadout,
  meterValue,
  nudgedValue,
  pipClickValue,
  valueAtFraction,
} from "./meter-service";

function meter(patch: Partial<Block> = {}): Block {
  return { id: "m", kind: "meter", ...patch };
}

describe("meterMax", () => {
  it("reads against 100 by default, so a bare 75 means 75%", () => {
    expect(meterMax(meter({ meter: "bar" }))).toBe(100);
  });

  it("gives a rating five pips by default", () => {
    expect(meterMax(meter({ meter: "rating" }))).toBe(5);
  });

  it("caps pips at something countable", () => {
    expect(meterMax(meter({ meter: "rating", max: 500 }))).toBe(20);
  });

  it("rounds a fractional pip count, since half a star is not drawable here", () => {
    expect(meterMax(meter({ meter: "pool", max: 4.6 }))).toBe(5);
  });

  it("falls back rather than dividing by zero or going negative", () => {
    expect(meterMax(meter({ meter: "bar", max: 0 }))).toBe(100);
    expect(meterMax(meter({ meter: "bar", max: -20 }))).toBe(100);
  });
});

describe("meterValue", () => {
  it("keeps a value inside range", () => {
    expect(meterValue(meter({ meter: "bar", value: 140 }))).toBe(100);
    expect(meterValue(meter({ meter: "bar", value: -5 }))).toBe(0);
  });

  // The maximum can move under a stored value: dropping a rating from ten
  // pips to three leaves an 8 behind, and drawing eight of three is worse
  // than showing three.
  it("clamps against a maximum that has since shrunk", () => {
    expect(meterValue(meter({ meter: "rating", max: 3, value: 8 }))).toBe(3);
  });

  it("leaves the stored number alone, so raising the maximum restores it", () => {
    const block = meter({ meter: "rating", max: 3, value: 8 });
    meterValue(block);
    expect(block.value).toBe(8);
  });

  it("is a whole number of pips", () => {
    expect(meterValue(meter({ meter: "pool", max: 5, value: 2.4 }))).toBe(2);
  });

  it("treats a missing value as empty rather than as a gap", () => {
    expect(meterValue(meter({ meter: "bar" }))).toBe(0);
  });
});

describe("meterFraction", () => {
  it("reads a proportion", () => {
    expect(meterFraction(meter({ meter: "bar", value: 75 }))).toBeCloseTo(0.75);
  });

  it("reads pips as a proportion too, so every shape shares one model", () => {
    expect(meterFraction(meter({ meter: "rating", max: 4, value: 1 }))).toBeCloseTo(0.25);
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
      const block = meter({ meter: style, value: 3 });
      expect(meterMax(block), style).toBeGreaterThan(0);
      expect(meterValue(block), style).toBeLessThanOrEqual(meterMax(block));
    }
  });
});

describe("meterReadout", () => {
  it("reads a default meter as a percentage, because that is what the number means", () => {
    expect(meterReadout(meter({ meter: "circle", value: 75 }))).toBe("75%");
  });

  it("shows the pair when the maximum is anything else", () => {
    expect(meterReadout(meter({ meter: "gauge", max: 8, value: 3 }))).toBe("3/8");
  });

  it("doesn't spill a long decimal into a small circle", () => {
    expect(meterReadout(meter({ meter: "circle", max: 3, value: 1 / 3 }))).toBe("0.3/3");
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
    expect(valueAtFraction(meter({ meter: "bar" }), 0.618)).toBe(62);
    expect(valueAtFraction(meter({ meter: "gauge", max: 8 }), 0.5)).toBe(4);
  });

  it("clamps a drag past either end", () => {
    expect(valueAtFraction(meter({ meter: "bar" }), 1.4)).toBe(100);
    expect(valueAtFraction(meter({ meter: "bar" }), -0.2)).toBe(0);
  });
});

describe("nudgedValue", () => {
  it("steps by whole units and stops at the ends", () => {
    expect(nudgedValue(meter({ meter: "bar", value: 40 }), 10)).toBe(50);
    expect(nudgedValue(meter({ meter: "bar", value: 96 }), 10)).toBe(100);
    expect(nudgedValue(meter({ meter: "rating", value: 0 }), -1)).toBe(0);
  });

  // Starts from what is on screen, not from what is stored: a rating whose pip
  // count shrank draws 3 and must not jump to 9 on one arrow press.
  it("starts from the drawn value, not the remembered one", () => {
    expect(nudgedValue(meter({ meter: "rating", max: 3, value: 8 }), 1)).toBe(3);
  });
});
