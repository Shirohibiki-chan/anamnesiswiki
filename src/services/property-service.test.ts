import { describe, expect, it } from "vitest";
import { orderProperties } from "./property-service";

const specs = [
  { key: "summary" },
  { key: "when" },
  { key: "where" },
  { key: "custom-a" },
  { key: "custom-b" },
];

const keys = (list: { key: string }[]) => list.map((spec) => spec.key);

describe("orderProperties", () => {
  it("leaves a page nobody has reordered exactly as the caller grouped it", () => {
    expect(keys(orderProperties(specs, undefined))).toEqual(["summary", "when", "where", "custom-a", "custom-b"]);
    expect(keys(orderProperties(specs, []))).toEqual(["summary", "when", "where", "custom-a", "custom-b"]);
  });

  it("applies a stored order", () => {
    const order = ["custom-b", "where", "summary", "custom-a", "when"];
    expect(keys(orderProperties(specs, order))).toEqual(order);
  });

  // The case that arises the moment a property is added to a page that was
  // reordered earlier: the new key isn't in the stored order at all, and
  // dropping it would take the field off the panel.
  it("keeps unlisted keys, in default order, after the ones it knows", () => {
    expect(keys(orderProperties(specs, ["custom-b", "when"]))).toEqual([
      "custom-b",
      "when",
      "summary",
      "where",
      "custom-a",
    ]);
  });

  // A stored order outlives the properties it named — deleting a custom
  // property leaves its key behind in older saves, and a template's fixed
  // fields change with the template.
  it("ignores keys in the order that no longer exist", () => {
    expect(keys(orderProperties(specs, ["gone", "where", "also-gone", "summary"]))).toEqual([
      "where",
      "summary",
      "when",
      "custom-a",
      "custom-b",
    ]);
  });

  it("does not mutate the input", () => {
    const input = [...specs];
    orderProperties(input, ["custom-b", "summary"]);
    expect(keys(input)).toEqual(["summary", "when", "where", "custom-a", "custom-b"]);
  });
});
