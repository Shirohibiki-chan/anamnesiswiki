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

function blockText(block: unknown): string {
  const content = (block as { content?: { text?: string }[] } | undefined)?.content ?? [];
  return content.map((run) => run.text ?? "").join("").trim();
}

const headingText = blockText;

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

// The shape, not just the words. Until 2026-08-28 the copy was ours but the
// layout underneath it was still LegendKeeper's, one tab signature and one
// block scaffold at a time — which is the version of this problem that
// survives a rewording pass, so it gets its own guards.
describe("template layout is ours", () => {
  // LK's own tab-name signatures. `lk-import.ts` matches on these to recognise
  // *their* files; a template of ours reproducing one means we're shipping
  // their page structure under our copy.
  const LK_TAB_SIGNATURES = [
    ["Overview", "Backstory"],
    ["Overview", "Map", "History"],
    ["Overview", "Biology", "Lifestyle", "Beliefs", "Relations"],
  ];

  it.each(TEMPLATE_KEYS)("gives %s no tab called Overview", (key) => {
    const labels = getDefaultTabs(key).map((tab) => tab.label);
    expect(labels).not.toContain("Overview");
  });

  it.each(LK_TAB_SIGNATURES)("reproduces no LegendKeeper tab signature: %s", (...signature) => {
    for (const key of TEMPLATE_KEYS) {
      const labels = new Set(getDefaultTabs(key).map((tab) => tab.label));
      const matches = signature.every((label) => labels.has(label));
      expect(matches, `${key} carries LK's ${signature.join(", ")} signature`).toBe(false);
    }
  });

  it("opens no tab with LK's fixed info-then-quote scaffold", () => {
    for (const key of TEMPLATE_KEYS) {
      for (const tab of getDefaultTabs(key)) {
        const opener = tab.content.slice(0, 2).map((block) => (block as { type: string }).type);
        expect(opener, `${key}/${tab.id}`).not.toEqual(["calloutInfo", "calloutQuote"]);
      }
    }
  });

  // These two are the ones that matter. The first pass of the redesign shipped
  // sentence-length headings with nothing under half of them, which rendered as
  // giant headings floating over empty space — a template that looks
  // half-written rather than one that shows you a structure. Every other guard
  // in this file passed while that was true.
  it("keeps every section heading short enough to read as a label", () => {
    for (const key of TEMPLATE_KEYS) {
      for (const tab of getDefaultTabs(key)) {
        for (const block of tab.content) {
          if ((block as { type: string }).type !== "heading") continue;
          const words = headingText(block).split(/\s+/).filter(Boolean);
          expect(words.length, `${key}/${tab.id}: "${headingText(block)}"`).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it("follows every section heading with a line saying what goes under it", () => {
    for (const key of TEMPLATE_KEYS) {
      for (const tab of getDefaultTabs(key)) {
        tab.content.forEach((block, index) => {
          if ((block as { type: string }).type !== "heading") return;
          const next = tab.content[index + 1] as { type?: string } | undefined;
          const where = `${key}/${tab.id}: "${headingText(block)}"`;
          expect(next?.type, `${where} is the last block in its tab`).toBe("paragraph");
          expect(blockText(next), `${where} is followed by an empty paragraph`).not.toBe("");
        });
      }
    }
  });

  it("varies the scaffold between templates rather than repeating one", () => {
    // Every template that has tabs at all should have a distinct silhouette:
    // how many tabs, and how many blocks in each. A shared silhouette is how
    // the old registry read as one template stamped out eight times.
    const silhouettes = TEMPLATE_KEYS.map((key) => getDefaultTabs(key).map((tab) => tab.content.length).join("-")).filter(
      (silhouette) => silhouette !== "",
    );
    expect(new Set(silhouettes).size).toBe(silhouettes.length);
  });
});
