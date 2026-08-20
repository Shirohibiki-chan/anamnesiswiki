import { describe, expect, it } from "vitest";
import {
  addPin,
  healPins,
  matchesPin,
  movePin,
  removePin,
  resolvePins,
  unpinned,
  type Pin,
} from "./pins";
import type { ListedWorld } from "./world-scan";

const world = (name: string, extra: Partial<ListedWorld> = {}): ListedWorld => ({
  path: `/D/${name}`,
  id: `id-${name}`,
  forkedFromId: null,
  name,
  lastOpenedAt: null,
  modifiedAt: null,
  coverImage: null,
  selectedName: null,
  activeAt: 0,
  isOutsideProjectsFolder: false,
  ...extra,
});

const pin = (name: string, extra: Partial<Pin> = {}): Pin => ({
  id: `id-${name}`,
  path: `/D/${name}`,
  name,
  ...extra,
});

describe("matchesPin", () => {
  it("matches on the id, through a move and a rename", () => {
    // The whole reason ids exist: neither of these facts is the same anymore.
    const moved = world("Renamed", { id: "id-Valeraverse", path: "E:/Somewhere/Else" });
    expect(matchesPin(pin("Valeraverse"), moved)).toBe(true);
  });

  it("falls back to the path when either side has no id", () => {
    const neverOpened = world("Ninth", { id: null });
    expect(matchesPin(pin("Ninth", { id: null }), neverOpened)).toBe(true);
    // A pin made before the project was opened still matches it afterwards,
    // which is what stops the pin falling off the first time she opens it.
    expect(matchesPin(pin("Ninth", { id: null }), world("Ninth"))).toBe(true);
  });

  it("folds case in the path, the way the rest of the library does", () => {
    expect(matchesPin(pin("Ninth", { id: null, path: "/d/NINTH" }), world("Ninth", { id: null }))).toBe(true);
  });

  it("keeps two projects apart when their ids differ, whatever their paths say", () => {
    // A folder copied in Explorer, then re-idded by the fork detector.
    expect(matchesPin(pin("Valeraverse"), world("Valeraverse", { id: "id-fork" }))).toBe(false);
  });
});

describe("addPin and removePin", () => {
  it("appends, because a new pin belongs where she put it", () => {
    const pins = addPin(addPin([], world("One")), world("Two"));
    expect(pins.map((p) => p.name)).toEqual(["One", "Two"]);
  });

  it("refuses to pin the same project twice", () => {
    const pins = addPin([pin("One")], world("One"));
    expect(pins).toHaveLength(1);
  });

  it("removes by identity rather than by position", () => {
    const pins = removePin([pin("One"), pin("Two")], world("One"));
    expect(pins.map((p) => p.name)).toEqual(["Two"]);
  });

  it("leaves the list it was given alone", () => {
    const pins = [pin("One")];
    addPin(pins, world("Two"));
    removePin(pins, world("One"));
    expect(pins.map((p) => p.name)).toEqual(["One"]);
  });
});

describe("movePin", () => {
  const pins = [pin("A"), pin("B"), pin("C")];

  it("moves one pin and closes the gap behind it", () => {
    expect(movePin(pins, 0, 2).map((p) => p.name)).toEqual(["B", "C", "A"]);
    expect(movePin(pins, 2, 0).map((p) => p.name)).toEqual(["C", "A", "B"]);
  });

  it("does nothing for a move that goes nowhere or off the end", () => {
    expect(movePin(pins, 1, 1).map((p) => p.name)).toEqual(["A", "B", "C"]);
    expect(movePin(pins, 0, 9).map((p) => p.name)).toEqual(["A", "B", "C"]);
    expect(movePin(pins, -1, 0).map((p) => p.name)).toEqual(["A", "B", "C"]);
  });
});

describe("resolvePins", () => {
  it("returns the projects in pin order, not in list order", () => {
    const worlds = [world("A"), world("B"), world("C")];
    expect(resolvePins([pin("C"), pin("A")], worlds).map((w) => w.name)).toEqual(["C", "A"]);
  });

  it("skips a pin whose project isn't there, and keeps the rest in order", () => {
    // The drive isn't plugged in. The pin is not forgotten — only the card is
    // missing, and it comes back with the drive.
    const worlds = [world("A"), world("C")];
    expect(resolvePins([pin("A"), pin("Gone"), pin("C")], worlds).map((w) => w.name)).toEqual(["A", "C"]);
  });

  it("draws the name from the listing, so a renamed project shows its new name", () => {
    const renamed = world("Brand New Name", { id: "id-Old" });
    expect(resolvePins([pin("Old")], [renamed])[0].name).toBe("Brand New Name");
  });
});

describe("unpinned", () => {
  it("is everything else, in the order it was given", () => {
    const worlds = [world("A"), world("B"), world("C")];
    expect(unpinned([pin("B")], worlds).map((w) => w.name)).toEqual(["A", "C"]);
  });
});

describe("healPins", () => {
  it("writes back the id a project gained the first time it was opened", () => {
    const pins = [pin("Ninth", { id: null })];
    const healed = healPins(pins, [world("Ninth")]);
    expect(healed?.[0].id).toBe("id-Ninth");
  });

  it("writes back a path and name that have since changed", () => {
    const moved = world("Renamed", { id: "id-Old", path: "E:/Elsewhere" });
    const healed = healPins([pin("Old")], [moved]);
    expect(healed?.[0]).toEqual({ id: "id-Old", path: "E:/Elsewhere", name: "Renamed" });
  });

  it("reports nothing to do rather than an equal copy, so the settings file isn't rewritten", () => {
    // This runs on every scan. A file rewritten every few seconds for no
    // change is a file that will eventually be rewritten during a crash.
    expect(healPins([pin("A")], [world("A")])).toBeNull();
  });

  it("leaves a pin whose project isn't listed exactly as it was", () => {
    const healed = healPins([pin("Gone"), pin("Ninth", { id: null })], [world("Ninth")]);
    expect(healed?.[0]).toEqual(pin("Gone"));
  });
});
