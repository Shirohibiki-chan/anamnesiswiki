import { describe, expect, it } from "vitest";
import type { MeterEntry, MeterStyle } from "../constants/schema";
import {
  arcFractionAt,
  boundaryIndexAt,
  dragSliceBoundary,
  isComposedPie,
  isSpectrum,
  newMeterFor,
  spectrumReadout,
  meterSegmented,
  pieSlices,
  pieTotal,
  seedEqualSlices,
  sliceIndexAt,
  sliceLabelPoint,
  slicePath,
  PIE_RADIUS,
  sliceValue,
  withMeters,
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
  piePath,
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
  const styles: MeterStyle[] = ["bar", "spectrum", "circle", "semicircle", "gauge", "rating", "pool"];

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

describe("piePath", () => {
  it("draws nothing when empty", () => {
    expect(piePath(0)).toBe("");
  });

  // A wedge runs centre, edge, round, back — so it starts at the middle and
  // closes, which is what makes it solid rather than a line.
  it("draws a wedge from the centre and closes it", () => {
    const path = piePath(0.25);
    expect(path.startsWith("M 50 50 L")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
  });

  it("starts at the top, like every other round shape here", () => {
    expect(piePath(0.25)).toContain("L 50 6 ");
  });

  it("flags the long way round past halfway", () => {
    expect(piePath(0.75)).toContain(" 1 1 ");
    expect(piePath(0.25)).toContain(" 0 1 ");
  });

  // A whole pie is a circle: one wedge from a point back to the same point
  // draws nothing, so it becomes two half arcs.
  it("draws a full pie as two arcs rather than a seam", () => {
    expect(piePath(1).match(/A /g)?.length).toBe(2);
    expect(piePath(1).includes("L")).toBe(false);
  });

  it("clamps an overfull fraction", () => {
    expect(piePath(3)).toBe(piePath(1));
  });
});

// ---------------------------------------------------------------------------
// A pie with several readings in it.
// ---------------------------------------------------------------------------

function slice(value: number | undefined, extra: Partial<MeterEntry> = {}): MeterEntry {
  return { id: `s${value ?? "x"}${extra.label ?? ""}`, value, ...extra };
}

describe("pieTotal and sliceValue", () => {
  // The whole reason a slice does not read through meterValue: that clamps
  // against a default maximum of 100, and a pie of populations would come back
  // as a set of equal halves all flattened to it.
  it("does not clamp a slice against the default maximum", () => {
    expect(sliceValue(slice(5000))).toBe(5000);
    expect(pieTotal([slice(5000), slice(3000)])).toBe(8000);
  });

  it("reads an unset, negative or broken value as nothing", () => {
    expect(sliceValue(slice(undefined))).toBe(0);
    expect(sliceValue(slice(-4))).toBe(0);
    expect(sliceValue(slice(Number.NaN))).toBe(0);
  });
});

describe("isComposedPie", () => {
  it("needs a pie and more than one reading", () => {
    expect(isComposedPie("pie", [slice(1), slice(1)])).toBe(true);
    // One reading still reads against its own maximum, exactly as before —
    // a lone slice redrawn as a full circle would say less than the wedge.
    expect(isComposedPie("pie", [slice(1)])).toBe(false);
    expect(isComposedPie("circle", [slice(1), slice(1)])).toBe(false);
  });
});

describe("pieSlices", () => {
  it("sizes each slice by its share of the total", () => {
    const slices = pieSlices([slice(30), slice(10)]);
    expect(slices[0].share).toBeCloseTo(0.75);
    expect(slices[1].share).toBeCloseTo(0.25);
    expect(slices[0].sweep).toBeCloseTo(270);
  });

  it("lays them out clockwise from twelve o'clock, end to end", () => {
    const slices = pieSlices([slice(1), slice(1), slice(2)]);
    expect(slices[0].start).toBe(0);
    expect(slices[1].start).toBeCloseTo(90);
    expect(slices[2].start).toBeCloseTo(180);
    expect(slices[2].start + slices[2].sweep).toBeCloseTo(360);
  });

  // A pie nobody has typed into is a chart you can start dragging, not a blank
  // circle — three empty readings are three thirds.
  it("draws equal slices when nothing has been typed", () => {
    const slices = pieSlices([slice(undefined), slice(undefined), slice(undefined)]);
    expect(slices.map((s) => Math.round(s.share * 100))).toEqual([33, 33, 33]);
    expect(slices.every((s) => s.path !== "")).toBe(true);
  });

  // The gap comes out of what is *drawn*; the angles a click is measured
  // against are untouched, or a segmented pie would have dead stripes in it.
  it("takes the segment gap out of the path but not the angles", () => {
    const [plain] = pieSlices([slice(1), slice(1)]);
    const [gapped] = pieSlices([slice(1), slice(1)], true);
    expect(gapped.sweep).toBe(plain.sweep);
    expect(gapped.path).not.toBe(plain.path);
  });

  it("leaves no gap in a pie holding one slice", () => {
    expect(pieSlices([slice(5)], true)[0].path).toBe(pieSlices([slice(5)])[0].path);
  });
});

describe("slicePath", () => {
  it("draws a wedge from the centre", () => {
    expect(slicePath(0, 90).startsWith("M 50 50 L")).toBe(true);
  });

  it("draws a whole circle as two arcs rather than a seam", () => {
    expect(slicePath(0, 360).match(/A /g)?.length).toBe(2);
  });

  it("draws nothing at all for a slice with no size", () => {
    expect(slicePath(0, 0)).toBe("");
  });

  it("sets the large-arc flag past a half turn", () => {
    expect(slicePath(0, 200).includes(" 1 1 ")).toBe(true);
    expect(slicePath(0, 100).includes(" 0 1 ")).toBe(true);
  });
});

describe("sliceIndexAt", () => {
  const slices = pieSlices([slice(1), slice(1), slice(1), slice(1)]);

  it("finds the slice a point is over", () => {
    // Twelve o'clock is the first slice; three o'clock the second.
    expect(sliceIndexAt(slices, 50, 20)).toBe(0);
    expect(sliceIndexAt(slices, 80, 50)).toBe(1);
    expect(sliceIndexAt(slices, 50, 80)).toBe(2);
    expect(sliceIndexAt(slices, 20, 50)).toBe(3);
  });

  it("ignores a point outside the circle", () => {
    expect(sliceIndexAt(slices, 2, 2)).toBeNull();
  });

  // The gaps in a segmented pie are drawn, not real: a click in one still
  // belongs to a slice.
  it("answers over the gaps of a segmented pie", () => {
    const gapped = pieSlices([slice(1), slice(1)], true);
    expect(sliceIndexAt(gapped, 50, 20)).not.toBeNull();
  });
});

describe("boundaryIndexAt", () => {
  const slices = pieSlices([slice(1), slice(1), slice(1), slice(1)]);

  it("finds the edge a point is aiming at", () => {
    // The first edge sits at three o'clock with four equal slices.
    expect(boundaryIndexAt(slices, 90, 50)).toBe(0);
    expect(boundaryIndexAt(slices, 50, 90)).toBe(1);
  });

  it("refuses a point in the middle of a slice", () => {
    expect(boundaryIndexAt(slices, 50, 20)).toBeNull();
  });

  // Twelve o'clock is where the chart starts, and a chart whose origin can be
  // dragged is one where touching a slice appears to move all of them.
  it("never offers the edge at twelve o'clock", () => {
    expect(boundaryIndexAt(slices, 50, 10)).toBeNull();
    expect(boundaryIndexAt(slices, 50.5, 8)).toBeNull();
  });

  // Every edge converges on the centre, so a pointer there is a coin toss.
  it("refuses a point too near the middle", () => {
    expect(boundaryIndexAt(slices, 52, 50)).toBeNull();
  });
});

describe("dragSliceBoundary", () => {
  const entries = [slice(25, { label: "a" }), slice(25, { label: "b" }), slice(50, { label: "c" })];

  it("moves the pair either side of the edge and nothing else", () => {
    // Pushing the first edge from a quarter round to a half gives the first
    // slice everything the second had.
    const patch = dragSliceBoundary(entries, 0, 0.5);
    expect(patch[entries[0].id].value).toBe(50);
    expect(patch[entries[1].id].value).toBeUndefined();
    expect(patch[entries[2].id]).toBeUndefined();
  });

  it("keeps the pair's total exactly, so the slices past the edge stay put", () => {
    const patch = dragSliceBoundary(entries, 0, 0.37);
    const total = (patch[entries[0].id].value ?? 0) + (patch[entries[1].id].value ?? 0);
    expect(total).toBe(50);
  });

  it("respects where the pair starts rather than measuring from the top", () => {
    // The second edge sits at half a turn; dragging it to 0.75 hands the
    // second slice a quarter of the circle on top of what it had.
    const patch = dragSliceBoundary(entries, 1, 0.75);
    expect(patch[entries[1].id].value).toBe(50);
    expect(patch[entries[2].id].value).toBe(25);
  });

  // Overshooting an edge collapses that slice rather than wrapping past it and
  // turning the pair inside out.
  it("clamps a drag past either end of the pair", () => {
    expect(dragSliceBoundary(entries, 0, 0.99)[entries[1].id].value).toBeUndefined();
    expect(dragSliceBoundary(entries, 0, 0)[entries[0].id].value).toBeUndefined();
  });

  it("seeds equal values when nothing has been typed yet", () => {
    const blank = [slice(undefined), slice(undefined, { label: "b" })];
    expect(dragSliceBoundary(blank, 0, 0.9)).toEqual({
      [blank[0].id]: { value: 50 },
      [blank[1].id]: { value: 50 },
    });
  });

  it("does nothing for an edge that isn't there", () => {
    expect(dragSliceBoundary(entries, 2, 0.5)).toEqual({});
  });
});

describe("seedEqualSlices", () => {
  it("hands every reading an equal share of a hundred", () => {
    const blank = [slice(undefined), slice(undefined, { label: "b" }), slice(undefined, { label: "c" })];
    expect(Object.values(seedEqualSlices(blank))).toEqual([{ value: 33 }, { value: 33 }, { value: 33 }]);
  });
});

describe("withMeters", () => {
  const entries = [slice(1, { label: "a" }), slice(2, { label: "b" })];

  it("patches several readings in one pass", () => {
    const next = withMeters(entries, { [entries[0].id]: { value: 9 }, [entries[1].id]: { value: 8 } });
    expect(next.map((entry) => entry.value)).toEqual([9, 8]);
  });

  it("drops an emptied field rather than storing undefined", () => {
    const next = withMeters(entries, { [entries[0].id]: { value: undefined } });
    expect("value" in next[0]).toBe(false);
  });

  it("leaves readings nobody patched alone", () => {
    expect(withMeters(entries, {})).toEqual(entries);
  });
});

describe("meterSegmented", () => {
  const entry = slice(5);

  it("follows the block when the reading has no answer", () => {
    expect(meterSegmented({ id: "b", kind: "meter", segmented: true }, entry)).toBe(true);
    expect(meterSegmented({ id: "b", kind: "meter" }, entry)).toBe(false);
  });

  // The other half of what colour does: four dials under one heading are four
  // different things, and one of them counted off in units is fair to want.
  it("lets a reading disagree with its block in either direction", () => {
    const on = { ...entry, segmented: true };
    const off = { ...entry, segmented: false };
    expect(meterSegmented({ id: "b", kind: "meter" }, on)).toBe(true);
    expect(meterSegmented({ id: "b", kind: "meter", segmented: true }, off)).toBe(false);
  });
});

describe("sliceLabelPoint", () => {
  it("puts a label on the slice's middle line", () => {
    const [top] = pieSlices([slice(1), slice(1)]);
    // The first of two slices runs from twelve to six, so its middle line
    // points at three o'clock — the label sits to the right of centre.
    const [x, y] = sliceLabelPoint(top);
    expect(x).toBeGreaterThan(50);
    expect(y).toBeCloseTo(50);
  });

  it("keeps the label inside the wedge, not out on the rim", () => {
    const [only] = pieSlices([slice(1), slice(1)]);
    const [x, y] = sliceLabelPoint(only);
    expect(Math.hypot(x - 50, y - 50)).toBeLessThan(PIE_RADIUS);
  });
});

// ---- The spectrum: a position between two words (2026-08-25) ----

describe("a spectrum", () => {
  it("is the only shape that is one", () => {
    expect(isSpectrum("spectrum")).toBe(true);
    for (const style of ["bar", "circle", "semicircle", "gauge", "pie", "rating", "pool"] as MeterStyle[]) {
      expect(isSpectrum(style), style).toBe(false);
    }
  });

  it("reads against the same hundred a bar does, so switching shape keeps the reading", () => {
    const reading = entry({ value: 40 });
    expect(meterFraction(reading, "spectrum")).toBeCloseTo(meterFraction(reading, "bar"));
  });

  // The midpoint is stored, not inferred — see newMeterFor. A rule that read
  // an absent value as the middle would snap the marker back to centre the
  // moment she dragged it to the left end, since zero is stored as absent.
  it("starts in the middle, as a real number", () => {
    expect(newMeterFor("spectrum").value).toBe(50);
  });

  it("leaves every other shape starting empty", () => {
    expect(newMeterFor("bar").value).toBeUndefined();
    expect(newMeterFor("rating").value).toBeUndefined();
  });

  it("still takes what it is given", () => {
    expect(newMeterFor("spectrum", { value: 10, startLabel: "shy" })).toMatchObject({ value: 10, startLabel: "shy" });
  });
});

describe("spectrumReadout", () => {
  it("names both ends and where the marker sits between them", () => {
    expect(spectrumReadout(entry({ value: 60, startLabel: "nonchalant", endLabel: "emotional" }))).toBe(
      "60% from nonchalant towards emotional",
    );
  });

  it("falls back to the bare percentage while neither end is named", () => {
    expect(spectrumReadout(entry({ value: 25 }))).toBe("25%");
  });

  it("fills in the end that hasn't been named yet", () => {
    expect(spectrumReadout(entry({ value: 0, endLabel: "bold" }))).toBe("0% from one end towards bold");
  });

  it("ignores an end that is only whitespace", () => {
    expect(spectrumReadout(entry({ value: 50, startLabel: "   ", endLabel: "   " }))).toBe("50%");
  });
});
