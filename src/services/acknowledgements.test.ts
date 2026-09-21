import { describe, expect, it } from "vitest";
import { acknowledge, contentMark, keyWithin, parseAcknowledgements, pruned, unacknowledged } from "./acknowledgements";

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

describe("keying a file inside a world", () => {
  it("is the world's name and the path inside it, whatever the slashes", () => {
    expect(keyWithin("C:\\Users\\shiro\\Documents\\Anamnesis\\Valeraverse", "C:\\Users\\shiro\\Documents\\Anamnesis\\Valeraverse\\Canon\\Main Story.json")).toBe(
      "Valeraverse/Canon/Main Story.json",
    );
    expect(keyWithin("/home/x/Anamnesis/Valeraverse/", "/home/x/Anamnesis/Valeraverse/Canon/a.json")).toBe("Valeraverse/Canon/a.json");
  });

  it("survives the world moving", () => {
    expect(keyWithin("D:\\Worlds\\Valeraverse", "D:\\Worlds\\Valeraverse\\Canon\\a.json")).toBe(
      keyWithin("C:\\Old\\Valeraverse", "C:\\Old\\Valeraverse\\Canon\\a.json"),
    );
  });

  it("leaves a path outside the world as it is", () => {
    expect(keyWithin("C:\\World", "D:\\elsewhere.json")).toBe("D:\\elsewhere.json");
  });
});

describe("marking text", () => {
  it("changes when the text does and not otherwise", () => {
    expect(contentMark("a { color: red }")).toBe(contentMark("a { color: red }"));
    expect(contentMark("a { color: red }")).not.toBe(contentMark("a { color: blue }"));
  });
});

describe("pruning", () => {
  it("drops what is known to be gone and keeps what cannot be checked", () => {
    const record = { "a/one.json": "1:1", "a/two.json": "2:2", "b/three.json": "3:3" };
    const out = pruned(record, (key) => (key === "a/one.json" ? true : key === "a/two.json" ? false : undefined));
    expect(out).toEqual({ "a/one.json": "1:1", "b/three.json": "3:3" });
  });
});
