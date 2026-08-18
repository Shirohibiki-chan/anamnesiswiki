import { describe, expect, it } from "vitest";
import { coverFor, coverGradient } from "./project-covers";

/** The hue out of an `hsl(H S% L%)` string. */
function hueOf(color: string): number {
  const match = /^hsl\((\d+(?:\.\d+)?) /.exec(color);
  if (!match) throw new Error(`not an hsl string: ${color}`);
  return Number(match[1]);
}

/** How far apart two hues are on the wheel, the short way round. */
function hueGap(a: string, b: string): number {
  const raw = Math.abs(hueOf(a) - hueOf(b));
  return Math.min(raw, 360 - raw);
}

describe("coverFor", () => {
  it("gives the same project the same cover every time", () => {
    const project = { id: "abc-123", path: "/Documents/Anamnesis/Valeraverse" };
    expect(coverFor(project)).toEqual(coverFor(project));
  });

  it("keys on the id, so a rename or a move keeps the colours", () => {
    const before = coverFor({ id: "abc-123", path: "/Documents/Anamnesis/Valeraverse" });
    const after = coverFor({ id: "abc-123", path: "D:/Backups/Val v6" });
    expect(after).toEqual(before);
  });

  it("falls back to the path for a project that has never been opened", () => {
    const cover = coverFor({ id: null, path: "/Documents/Anamnesis/Ninth" });
    expect(cover).toEqual(coverFor({ id: null, path: "/Documents/Anamnesis/Ninth" }));
    expect(cover.from).not.toBe(cover.to);
  });

  it("uses two genuinely different hues, never one colour twice", () => {
    // One hue with a lighter version of itself over it was tried and rejected
    // outright. This is the rule that stops it creeping back.
    for (let i = 0; i < 200; i++) {
      const cover = coverFor({ id: `project-${i}`, path: `/p/${i}` });
      expect(hueGap(cover.from, cover.to)).toBeGreaterThanOrEqual(40);
    }
  });

  it("travels diagonally, never straight across or down", () => {
    for (let i = 0; i < 200; i++) {
      const { angle } = coverFor({ id: `project-${i}`, path: `/p/${i}` });
      expect(angle).toBeGreaterThan(90);
      expect(angle).toBeLessThan(180);
    }
  });

  it("tells two forks apart, since their names and ids look almost identical", () => {
    // She keeps Valeraverse and Valeraverse3. Two near-identical seeds landing
    // on the same colour would read as one project listed twice.
    const a = coverFor({ id: null, path: "/p/Valeraverse" });
    const b = coverFor({ id: null, path: "/p/Valeraverse3" });
    expect(hueGap(a.from, b.from)).toBeGreaterThan(15);
  });

  it("spreads a folder of projects across the wheel rather than clumping", () => {
    const hues = Array.from({ length: 60 }, (_, i) => hueOf(coverFor({ id: `id-${i}`, path: `/p/${i}` }).from));
    // Six 60° arcs; a generator worth having puts something in each of them.
    const arcs = new Set(hues.map((hue) => Math.floor(hue / 60)));
    expect(arcs.size).toBe(6);
  });

  it("stays inside the hue wheel", () => {
    for (let i = 0; i < 200; i++) {
      const cover = coverFor({ id: `project-${i}`, path: `/p/${i}` });
      expect(hueOf(cover.from)).toBeGreaterThanOrEqual(0);
      expect(hueOf(cover.from)).toBeLessThan(360);
      expect(hueOf(cover.to)).toBeGreaterThanOrEqual(0);
      expect(hueOf(cover.to)).toBeLessThan(360);
    }
  });
});

describe("coverGradient", () => {
  it("writes a two-stop diagonal gradient", () => {
    const cover = coverFor({ id: "abc", path: "/p/abc" });
    expect(coverGradient(cover)).toBe(`linear-gradient(${cover.angle}deg, ${cover.from}, ${cover.to})`);
  });
});
