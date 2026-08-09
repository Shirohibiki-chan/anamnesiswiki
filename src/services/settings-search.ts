// Search over the settings screen itself. Pure logic, no disk and no React.
//
// Lifted from Obsidian 1.13, which added one for the reason ours needs one:
// the panel got too big to scan. Appearance alone is themes, the theme editor,
// 98 typefaces, twenty colours, twelve gradients and two sliders, spread over
// four sections that each look reasonable on their own.
//
// **Most of this index builds itself, and that's the whole design.** The
// colour rows come from `COLOR_GROUPS`, the typefaces from `FONT_SLOTS`, the
// shortcuts from `SHORTCUT_LABELS` — the same data the panels render from, so
// a derived entry cannot describe a control that isn't there or miss one that
// is. A hand-written list of every setting would be correct on the day it was
// written and wrong by the second feature. `DECLARED_SETTINGS` is the
// remainder: controls with no data behind them, and the only part that has to
// be maintained by hand.
import Fuse from "fuse.js";
import { DECLARED_SETTINGS, SETTINGS_TABS } from "../constants/settings";
import { FONT_SLOTS } from "../constants/themes";
import { SHORTCUT_ACTIONS, SHORTCUT_LABELS } from "../constants/shortcuts";
import { COLOR_GROUPS, GRADIENT_SLOTS } from "../constants/theme-tokens";

export type SettingsEntry = {
  /** Unique, and doubles as the DOM anchor a panel tags its row with. */
  id: string;
  tabId: string;
  tabLabel: string;
  label: string;
  hint: string;
  /** Words that should find it but appear nowhere in the label or the hint. */
  keywords: string[];
};

const tabLabel = (tabId: string): string => SETTINGS_TABS.find((tab) => tab.id === tabId)?.label ?? tabId;

/**
 * Every setting the search can land on.
 *
 * Order matters only as a tie-break: Fuse scores first, and this is what a
 * dead heat falls back to. Declared entries lead because they're whole
 * features — "Projects folder" is a more likely target for a vague query than
 * any single colour swatch is.
 */
export function buildSettingsIndex(): SettingsEntry[] {
  const entries: SettingsEntry[] = DECLARED_SETTINGS.map((entry) => ({
    id: entry.id,
    tabId: entry.tabId,
    tabLabel: tabLabel(entry.tabId),
    label: entry.label,
    hint: entry.hint,
    keywords: entry.keywords,
  }));

  // A colour's group is a keyword, not part of its label: the rows say
  // "Window", "Panels", "Main", "Quieter" — words that only mean anything
  // under the heading they sit beneath. Searching "text" has to reach the
  // four rows in the Text group even though none of them contains the word.
  for (const group of COLOR_GROUPS) {
    for (const token of group.tokens) {
      entries.push({
        id: token.token,
        tabId: "colours",
        tabLabel: tabLabel("colours"),
        label: token.label,
        hint: token.hint,
        keywords: ["colour", "color", group.label, token.token.replace(/^--color-/, "").replace(/-/g, " ")],
      });
    }
  }

  for (const slot of GRADIENT_SLOTS) {
    entries.push({
      id: `gradient-${slot.key}`,
      tabId: "colours",
      tabLabel: tabLabel("colours"),
      label: slot.label,
      hint: slot.hint,
      keywords: ["gradient", "fade", "colour", "color"],
    });
  }

  for (const slot of FONT_SLOTS) {
    entries.push({
      id: slot.token,
      tabId: "fonts",
      tabLabel: tabLabel("fonts"),
      label: slot.label,
      hint: slot.hint,
      keywords: ["font", "typeface", "text", slot.key],
    });
  }

  for (const action of SHORTCUT_ACTIONS) {
    entries.push({
      id: `shortcut-${action}`,
      tabId: "keyboard",
      tabLabel: tabLabel("keyboard"),
      label: SHORTCUT_LABELS[action],
      hint: "keyboard shortcut",
      keywords: ["shortcut", "keybind", "keyboard", "hotkey", "key"],
    });
  }

  return entries;
}

// The index depends on nothing that changes at runtime — every source is a
// module constant — so it's built once rather than on each keystroke.
let cached: Fuse<SettingsEntry> | null = null;
let cachedEntries: SettingsEntry[] | null = null;

function index(): { fuse: Fuse<SettingsEntry>; entries: SettingsEntry[] } {
  if (!cached || !cachedEntries) {
    cachedEntries = buildSettingsIndex();
    cached = new Fuse(cachedEntries, {
      // Label first by a wide margin. A query almost always *is* a label, and
      // without the weighting a keyword list — which is longer, and shared
      // between rows — drags unrelated siblings up alongside the right answer:
      // searching "window" put all four Backgrounds rows in a row because they
      // share the group keyword.
      keys: [
        { name: "label", weight: 0.6 },
        { name: "hint", weight: 0.25 },
        { name: "keywords", weight: 0.15 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }
  return { fuse: cached, entries: cachedEntries };
}

// Words that carry no signal about which setting is wanted. Deliberately
// short: this is a settings box, not a sentence parser, and every word removed
// is a word that can no longer rank anything. "where", "what" and "new" are
// *kept* on purpose — "where are my files" is a query about location, and
// "where" is the only word in it that says so.
const STOPWORDS = new Set(["a", "an", "and", "are", "be", "can", "do", "for", "how", "i", "in", "is", "it", "me", "my", "of", "on", "the", "to"]);

/**
 * Ranked settings matching `query`. An empty query returns nothing rather than
 * everything — the rail is already the list of everything, and a search box
 * that answers a blank query with 60 rows has replaced it with a worse one.
 *
 * **Searched word by word, not as one string.** Fuse matches a query as a
 * single run of characters, which is right for "projects folder" and useless
 * for "where are my files saved" — the query this box exists to answer, since
 * somebody who knew it was called *Projects folder* would not be searching.
 * As one string that phrase matched nothing at all. Each word is scored
 * separately and an entry ranks on **how many of them it accounts for** first,
 * strength second, so the row that answers three words of a question beats the
 * row that answers one of them very well.
 *
 * The whole phrase is still searched, and counts double — it's what makes an
 * exact label win outright rather than tying with everything that happens to
 * share one of its words.
 */
export function searchSettings(query: string, limit = 20): SettingsEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { fuse } = index();
  const scored = new Map<string, { entry: SettingsEntry; hits: number; strength: number }>();

  // Fuse scores 0 for perfect and 1 for hopeless, so `1 - score` is strength.
  const record = (term: string, weight: number) => {
    for (const result of fuse.search(term)) {
      const existing = scored.get(result.item.id) ?? { entry: result.item, hits: 0, strength: 0 };
      existing.hits += weight;
      existing.strength += (1 - (result.score ?? 1)) * weight;
      scored.set(result.item.id, existing);
    }
  };

  record(trimmed, 2);
  const words = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
  // A one-word query is the phrase; searching it twice would just double every
  // score identically and change no ordering.
  if (words.length > 1) for (const word of words) record(word, 1);

  const matches = [...scored.values()].sort((a, b) => b.hits - a.hits || b.strength - a.strength);
  if (matches.length === 0) return [];

  // Everything that accounts for roughly as much of the query as the best row
  // does, and nothing that accounts for far less.
  //
  // Without this, "where are my files saved" returned twenty rows — the right
  // one plus eighteen colour swatches that had fuzzily matched a single word
  // of it. A long query is the case this box exists for and was the case it
  // handled worst, because every extra word is another chance for an unrelated
  // row to catch one. Scoring by *coverage* already knew which rows were
  // serious; it just wasn't allowed to throw the rest away.
  //
  // The tolerance is one word, not zero: a row that answers three words of a
  // four-word question is a real answer, and often a better one than the row
  // that happens to hit all four. A single-word query prunes nothing, since
  // every match has the same coverage.
  const best = matches[0].hits;
  return matches
    .filter((match) => match.hits >= best - 1)
    .slice(0, limit)
    .map((match) => match.entry);
}

/**
 * Results in rail order, grouped by the section they live in.
 *
 * **Not what the result list uses**, and the reason is worth keeping: grouping
 * re-sorts by section, which throws the ranking away. Searching "where are my
 * files saved" put *Projects folder* — the answer, and the top-scoring row —
 * nineteenth, because Projects is the fifth section in the rail. Worse, the
 * highlight indexed the ranked list while the rows rendered in grouped order,
 * so Enter opened a different setting than the one lit up.
 *
 * Kept because "which section is this in" is still a real question; it's just
 * one a per-row label answers without costing the ordering. Anything using
 * this must index into *this* shape, never into the flat results.
 */
export function groupByTab(results: readonly SettingsEntry[]): { tabId: string; tabLabel: string; entries: SettingsEntry[] }[] {
  const byTab = new Map<string, SettingsEntry[]>();
  for (const entry of results) {
    const existing = byTab.get(entry.tabId);
    if (existing) existing.push(entry);
    else byTab.set(entry.tabId, [entry]);
  }

  return SETTINGS_TABS.filter((tab) => byTab.has(tab.id)).map((tab) => ({
    tabId: tab.id,
    tabLabel: tab.label,
    entries: byTab.get(tab.id) ?? [],
  }));
}
