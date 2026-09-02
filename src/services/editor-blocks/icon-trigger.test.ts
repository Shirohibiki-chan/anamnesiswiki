import { describe, expect, it } from "vitest";
import { iconTriggerOpens, isIconPickerChord } from "./icon-trigger";

describe("when a typed colon is reaching for an icon", () => {
  it("opens in the middle of a sentence, which is the whole point of it", () => {
    // The thing `/` cannot do. An icon belongs inside a line already being
    // written, and this is the gesture that puts one there.
    expect(iconTriggerOpens("she drew her ")).toBe(true);
  });

  it("opens at the start of a line", () => {
    expect(iconTriggerOpens("")).toBe(true);
  });

  it("stays shut after a word, which is where a colon is punctuation", () => {
    expect(iconTriggerOpens("Note")).toBe(false);
    expect(iconTriggerOpens("Chapter 4")).toBe(false);
    expect(iconTriggerOpens("The bargain")).toBe(false);
  });

  it("stays shut inside a time", () => {
    expect(iconTriggerOpens("10")).toBe(false);
  });

  it("stays shut on a second colon straight after the first", () => {
    // `::` is somebody typing punctuation deliberately.
    expect(iconTriggerOpens(":")).toBe(false);
  });

  it("counts a tab and a non-breaking space as space", () => {
    expect(iconTriggerOpens("she drew her\t")).toBe(true);
    expect(iconTriggerOpens("she drew her ")).toBe(true);
  });
});

describe("the chord that opens the picker", () => {
  const chord = (over: Partial<{ key: string; code: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }>) =>
    isIconPickerChord({ key: ":", code: "Semicolon", ctrlKey: true, metaKey: false, altKey: false, ...over });

  it("takes control and the colon key with or without the shift", () => {
    // The one that was reported as doing nothing: "control colon" is most
    // naturally typed as Control and the colon key, which without Shift
    // arrives as a semicolon.
    expect(chord({ key: ":" })).toBe(true);
    expect(chord({ key: ";" })).toBe(true);
  });

  it("matches the physical key too, for a layout that moves the colon", () => {
    expect(chord({ key: "ö", code: "Semicolon" })).toBe(true);
  });

  it("takes command on a Mac", () => {
    expect(chord({ ctrlKey: false, metaKey: true })).toBe(true);
  });

  it("is not a bare colon, which is the type-ahead's", () => {
    expect(chord({ ctrlKey: false, metaKey: false })).toBe(false);
  });

  it("leaves alt combinations alone, which are somebody typing a character", () => {
    // AltGr arrives as Ctrl+Alt on Windows, and on several layouts that is how
    // a real character is typed — claiming it would stop her writing it.
    expect(chord({ altKey: true })).toBe(false);
  });

  it("is not some other control combination", () => {
    expect(chord({ key: "k", code: "KeyK" })).toBe(false);
  });
});
