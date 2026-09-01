import { describe, expect, it } from "vitest";
import { EMOJI_GROUPS, searchEmoji } from "./emoji";

describe("the emoji the picker offers", () => {
  it("is the whole set, not a hand-picked corner of it", () => {
    // The guard against this quietly becoming a curated list again. It was one
    // — 129 entries — and the complaint that killed it was that you cannot
    // scroll to an emoji whose name you do not know if it was never in the
    // list.
    const total = EMOJI_GROUPS.reduce((count, group) => count + group.emoji.length, 0);
    expect(total).toBeGreaterThan(1500);
  });

  it("keeps the groups an emoji keyboard uses, in that order", () => {
    expect(EMOJI_GROUPS[0].name).toBe("Smileys & People");
    expect(EMOJI_GROUPS.map((group) => group.name)).toContain("Flags");
  });

  it("finds one by its name, its keywords, or the word people type between colons", () => {
    const matches = (query: string) => searchEmoji(query).flatMap((group) => group.emoji.map((e) => e.char));
    expect(matches("joy")).toContain("😂");
    expect(matches("crossed swords")).toContain("⚔️");
    // A keyword rather than a name: nobody calls it "grinning squinting face".
    expect(matches("laugh").length).toBeGreaterThan(0);
  });

  it("finds one written the way a chat app writes it", () => {
    // The picker is opened *by* a colon, so the closing one gets typed out of
    // habit. `joy:` matching nothing reads as a broken search.
    const matches = (query: string) => searchEmoji(query).flatMap((group) => group.emoji.map((e) => e.char));
    expect(matches("joy:")).toContain("😂");
    expect(matches(":joy:")).toContain("😂");
  });

  it("gives every entry a character to draw", () => {
    for (const group of EMOJI_GROUPS) {
      for (const entry of group.emoji) {
        expect(entry.char, `${entry.keywords} has no character`).toBeTruthy();
      }
    }
  });
});
