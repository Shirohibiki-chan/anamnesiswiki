import { describe, expect, it } from "vitest";
import { iconTriggerOpens } from "./icon-trigger";

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
