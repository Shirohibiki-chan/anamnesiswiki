// Guards on the template seed data. The copy itself is a designed asset and
// isn't pinned string-by-string here — that would make every future wording
// tweak a test edit. What is pinned is the thing Phase 11 fixed and the thing
// most likely to come back: the placeholder prose used to be transcribed
// word-for-word from LegendKeeper's own templates, and there is now exactly one
// copy of it (this registry). `docs/prototype/anamnesis.jsx` was gutted to
// filler in the same pass, so a future session "restoring" a prompt from the
// prototype reintroduces someone else's writing. See docs/handoff.md §Editor &
// templates.
import { describe, expect, it } from "vitest";
import { TEMPLATE_KEYS } from "../constants/schema";
import { getDefaultTabs, TEMPLATE_REGISTRY } from "./template-registry";

// Verbatim fragments of the LK-transcribed copy this phase removed. Substrings,
// not whole strings, so a partial paste is caught too.
const LK_TRANSCRIBED = [
  "information that only admins can see",
  "By the way, this is an example template",
  "Modify it to fit your needs",
  "This is an interesting place",
  "Insightful Person",
  "eye color, hair color, hair style",
];

// A note-to-self from the original prototype that shipped in the Location
// template by accident, describing a feature that has never existed.
const PROTOTYPE_LEAKS = ["in the real build", "Leaflet", "placeholder —"];

function seedText(key: string): string {
  return getDefaultTabs(key)
    .flatMap((tab) => tab.content)
    .map((block) => JSON.stringify(block))
    .join("\n");
}

const allSeedText = TEMPLATE_KEYS.map(seedText).join("\n");

describe("template placeholder copy", () => {
  it.each(LK_TRANSCRIBED)("contains no LegendKeeper-transcribed copy: %s", (fragment) => {
    expect(allSeedText.toLowerCase()).not.toContain(fragment.toLowerCase());
  });

  it.each(PROTOTYPE_LEAKS)("leaks no prototype note-to-self: %s", (fragment) => {
    expect(allSeedText.toLowerCase()).not.toContain(fragment.toLowerCase());
  });

  it("promises nothing the Secret block doesn't do", () => {
    // The Secret callout is a visual marker with no gating behaviour, so its
    // copy must not imply it withholds anything by itself.
    const secretBlocks = TEMPLATE_KEYS.flatMap((key) =>
      getDefaultTabs(key)
        .flatMap((tab) => tab.content)
        .filter((block) => (block as { type?: string }).type === "calloutSecret"),
    );
    expect(secretBlocks.length).toBeGreaterThan(0);
    for (const block of secretBlocks) {
      expect(JSON.stringify(block)).not.toMatch(/only .{0,20}can see|hidden from|won't be visible/i);
    }
  });
});

describe("template seed structure", () => {
  it("gives every template key a definition whose key matches its slot", () => {
    for (const key of TEMPLATE_KEYS) {
      expect(TEMPLATE_REGISTRY[key].key).toBe(key);
    }
  });

  it("gives every tab a non-empty label and at least one block", () => {
    for (const key of TEMPLATE_KEYS) {
      for (const tab of getDefaultTabs(key)) {
        expect(tab.label.trim(), `${key}/${tab.id} label`).not.toBe("");
        expect(tab.content.length, `${key}/${tab.id} content`).toBeGreaterThan(0);
      }
    }
  });

  it("uses only block types the editor schema knows", () => {
    const known = new Set(["paragraph", "heading", "calloutInfo", "calloutQuote", "calloutSecret"]);
    for (const key of TEMPLATE_KEYS) {
      for (const tab of getDefaultTabs(key)) {
        for (const block of tab.content) {
          expect(known, `${key}/${tab.id}`).toContain((block as { type: string }).type);
        }
      }
    }
  });

  it("hands out a fresh copy of the blocks each call, so one page can't edit another's seed", () => {
    const first = getDefaultTabs("character");
    const second = getDefaultTabs("character");
    expect(first[0].content[0]).not.toBe(second[0].content[0]);
  });
});
