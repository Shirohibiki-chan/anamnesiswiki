import { describe, expect, it } from "vitest";
import { readableTextOn } from "./palette";
describe("readableTextOn", () => {
  it("puts dark text on the pale half of the palette", () => {
    expect(readableTextOn("#fcd34d")).toBe("#11111a");
    expect(readableTextOn("#5eead4")).toBe("#11111a");
  });

  it("puts light text on the dark half", () => {
    expect(readableTextOn("#3730a3")).toBe("#ffffff");
    expect(readableTextOn("#0f766e")).toBe("#ffffff");
  });

  it("falls back to light text for anything that isn't a colour", () => {
    expect(readableTextOn("teal")).toBe("#ffffff");
  });
});
