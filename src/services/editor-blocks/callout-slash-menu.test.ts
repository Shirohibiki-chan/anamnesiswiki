import { describe, expect, it } from "vitest";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { withoutBuiltInQuote } from "./callout-slash-menu";

const item = (title: string): DefaultReactSuggestionItem => ({ title, onItemClick: () => {} });

describe("withoutBuiltInQuote", () => {
  it("takes BlockNote's Quote out and leaves everything else", () => {
    const kept = withoutBuiltInQuote([item("Heading 1"), item("Quote"), item("Bullet List")]);
    expect(kept.map((entry) => entry.title)).toEqual(["Heading 1", "Bullet List"]);
  });

  it("removes nothing when the entry isn't there", () => {
    // What a BlockNote rename looks like: the duplicate comes back in the menu,
    // which is visible rather than dangerous.
    const items = [item("Heading 1"), item("Quote block")];
    expect(withoutBuiltInQuote(items)).toHaveLength(2);
  });
});
