import { describe, expect, it } from "vitest";
import { acknowledge, parseAcknowledgements, unacknowledged } from "./acknowledgements";

const marks = { "/w/Broken.json": "120:1000", "/w/Odd.json": "44:2000" };

describe("deciding what to still show", () => {
  it("shows anything nobody has acknowledged", () => {
    expect(unacknowledged(["/w/Broken.json"], marks, {})).toEqual(["/w/Broken.json"]);
  });

  it("stays quiet about a file that hasn't changed since", () => {
    expect(unacknowledged(["/w/Broken.json"], marks, { "/w/Broken.json": "120:1000" })).toEqual([]);
  });

  // The point of the mark: acknowledging one problem must not silence the next
  // one in the same file.
  it("speaks up again once the file has changed", () => {
    expect(unacknowledged(["/w/Broken.json"], marks, { "/w/Broken.json": "119:900" })).toEqual(["/w/Broken.json"]);
  });

  // An unreadable mark means the disk did not answer. Quiet is the wrong
  // direction to fail in.
  it("shows a file whose state can't be read", () => {
    expect(unacknowledged(["/w/Gone.json"], marks, { "/w/Gone.json": "1:1" })).toEqual(["/w/Gone.json"]);
  });

  it("leaves the others alone", () => {
    const shown = unacknowledged(["/w/Broken.json", "/w/Odd.json"], marks, { "/w/Broken.json": "120:1000" });
    expect(shown).toEqual(["/w/Odd.json"]);
  });
});

describe("acknowledging", () => {
  it("records the state the file was in", () => {
    expect(acknowledge({}, ["/w/Broken.json"], marks)).toEqual({ "/w/Broken.json": "120:1000" });
  });

  it("keeps what was already there", () => {
    const before = { "/other/Thing.json": "9:9" };
    expect(acknowledge(before, ["/w/Odd.json"], marks)).toEqual({
      "/other/Thing.json": "9:9",
      "/w/Odd.json": "44:2000",
    });
  });

  // Recording an empty mark would match nothing ever again, which is a
  // permanent mute — the one thing this must not do by accident.
  it("refuses to record a file it has no mark for", () => {
    expect(acknowledge({}, ["/w/Gone.json"], marks)).toEqual({});
  });
});

describe("reading the settings file back", () => {
  it("takes a plain record of strings", () => {
    expect(parseAcknowledgements({ "/w/a.json": "1:2" })).toEqual({ "/w/a.json": "1:2" });
  });

  it("drops anything that isn't one", () => {
    expect(parseAcknowledgements({ a: 1, b: "", c: null, d: "ok" })).toEqual({ d: "ok" });
    expect(parseAcknowledgements(null)).toEqual({});
    expect(parseAcknowledgements(["a"])).toEqual({});
    expect(parseAcknowledgements("nope")).toEqual({});
  });
});
