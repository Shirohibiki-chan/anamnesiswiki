// Project-wide search: names, tags, and the text inside every tab. Pure logic,
// no disk and no React. The tree's own filter lives in tree-service.ts and does
// a different job — it decides which rows stay visible, and only ever looks at
// names and tags. This one produces a ranked list of places to jump to.
import Fuse from "fuse.js";
import { MAX_SEARCH_RESULTS, SEARCH_SNIPPET_CHARS } from "../constants/limits";
import type { BlockNoteDocument, Node } from "../constants/schema";

export type SearchMatchKind = "name" | "tag" | "content";

export type SearchResult = {
  nodeId: string;
  kind: SearchMatchKind;
  /** Which tab the text was found in. Absent for name and tag matches. */
  tabId?: string;
  tabLabel?: string;
  /** Set when the matching tab is one this page hides, so the row can say so. */
  tabHidden?: boolean;
  /** Text to show under the page name: a window of prose, or the matched tag. */
  snippet: string;
  /** Where the query sits inside `snippet`, so the row can highlight it. */
  matchStart: number;
  matchEnd: number;
};

// ---- Pulling plain text out of a BlockNote document ----
// Blocks nest two ways: `content` holds the inline runs of this block, and
// `children` holds blocks underneath it (list items, toggles, callout bodies).
// Both have to be walked or an indented paragraph is unsearchable.

type InlineRun = { type?: string; text?: string; content?: unknown; props?: Record<string, unknown> };
type Block = { content?: unknown; children?: unknown };

function inlineText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const raw of content as InlineRun[]) {
    if (!raw || typeof raw !== "object") continue;
    // A mention renders as its label, so that's what she'd be looking for —
    // the node id it carries is meaningless as search text.
    if (raw.type === "mention") {
      if (typeof raw.props?.label === "string") parts.push(raw.props.label);
      continue;
    }
    if (typeof raw.text === "string") parts.push(raw.text);
    // A link's visible words are nested one level down inside it.
    if (Array.isArray(raw.content)) parts.push(inlineText(raw.content));
  }
  return parts.join("");
}

function blockText(block: Block): string {
  const own = inlineText(block.content);
  const nested = Array.isArray(block.children) ? (block.children as Block[]).map(blockText).join(" ") : "";
  return nested ? `${own} ${nested}` : own;
}

/**
 * A whole tab's prose as one line. Newlines and runs of spaces collapse, so a
 * snippet taken out of the middle can't drag block structure into a list row.
 */
export function documentText(doc: BlockNoteDocument): string {
  if (!Array.isArray(doc)) return "";
  return (doc as Block[])
    .map(blockText)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extracting text from every tab of every page is the expensive half of a
// search, and it depends only on the node record — which doesn't change while
// someone is typing a query. Cached the same way tree-service caches its Fuse
// index: keyed on the record's identity, so the store's next immutable update
// evicts it, and held weakly so a closed project isn't kept alive by a cache.
type TabText = { tabId: string; label: string; hidden: boolean; text: string; lowered: string };
const tabTextCache = new WeakMap<Record<string, Node>, Map<string, TabText[]>>();

function tabTextsFor(nodes: Record<string, Node>, node: Node): TabText[] {
  let byNode = tabTextCache.get(nodes);
  if (!byNode) {
    byNode = new Map();
    tabTextCache.set(nodes, byNode);
  }
  const cached = byNode.get(node.id);
  if (cached) return cached;

  const texts = node.tabs.map((tab) => {
    const text = documentText(tab.content);
    return { tabId: tab.id, label: tab.label, hidden: tab.hidden, text, lowered: text.toLowerCase() };
  });
  byNode.set(node.id, texts);
  return texts;
}

/**
 * What the palette is looking at. `all` is everything and is the default.
 *
 * `text` is the one the tree has no equivalent of, because the tree filter has
 * never read page content — it decides which rows stay visible, and a folder
 * doesn't become relevant because a sentence inside it mentions something.
 */
export const SEARCH_SCOPES = ["all", "name", "tag", "text"] as const;
export type SearchScopeMode = (typeof SEARCH_SCOPES)[number];

// Names and tags get fuzzy matching — she may half-remember a spelling, and
// they're short enough that a near miss is still obviously the right page.
// Prose deliberately does not: fuzzy matching across a few thousand characters
// finds a scattering of letters in unrelated paragraphs and calls it a hit.
type NameIndexes = { all?: Fuse<Node>; name?: Fuse<Node>; tag?: Fuse<Node> };
const nameIndexCache = new WeakMap<Record<string, Node>, NameIndexes>();

const NAME_KEYS = { all: ["name", "tags"], name: ["name"], tag: ["tags"] } as const;

function nameIndex(nodes: Record<string, Node>, mode: "all" | "name" | "tag"): Fuse<Node> {
  const cached = nameIndexCache.get(nodes) ?? {};
  const existing = cached[mode];
  if (existing) return existing;
  const fuse = new Fuse(Object.values(nodes), { keys: [...NAME_KEYS[mode]], threshold: 0.35 });
  nameIndexCache.set(nodes, { ...cached, [mode]: fuse });
  return fuse;
}

/**
 * A window of `text` around the match, clipped to whole words where it can be
 * and marked with ellipses where it was cut. Returned with the match's offsets
 * *within the snippet*, so the row highlights the right span after clipping.
 */
export function snippetAround(text: string, matchStart: number, matchLength: number): Pick<SearchResult, "snippet" | "matchStart" | "matchEnd"> {
  const lead = Math.floor((SEARCH_SNIPPET_CHARS - matchLength) / 2);
  let start = Math.max(0, matchStart - Math.max(lead, 0));
  let end = Math.min(text.length, start + SEARCH_SNIPPET_CHARS);
  // Landing mid-word looks like a typo rather than a cut, so walk to the
  // nearest space — but never past the match itself.
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space !== -1 && space < matchStart) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > matchStart + matchLength) end = space;
  }

  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return {
    snippet: `${prefix}${text.slice(start, end)}${suffix}`,
    matchStart: matchStart - start + prefix.length,
    matchEnd: matchStart + matchLength - start + prefix.length,
  };
}

/**
 * Ranked places the query appears, at most one row per page: a page whose name
 * matches doesn't also get listed for each tab that mentions it. Name and tag
 * hits come first because they're the strongest signal, then prose hits.
 *
 * A leading `#` forces tag scope whatever `mode` says — the convention predates
 * the scope menu, and it's what a pasted query will contain. It may only ever
 * narrow, never widen a scope the menu has set.
 *
 * An empty query returns nothing rather than everything — this is a jump-to
 * list, and a list of the entire project isn't one.
 */
export function searchProject(nodes: Record<string, Node>, query: string, mode: SearchScopeMode = "all"): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const hashed = trimmed.startsWith("#");
  const scope: SearchScopeMode = hashed ? "tag" : mode;
  const term = hashed ? trimmed.slice(1).trim() : trimmed;
  if (!term) return [];

  const lowered = term.toLowerCase();
  const results: SearchResult[] = [];
  const claimed = new Set<string>();

  if (scope !== "text") {
    for (const { item } of nameIndex(nodes, scope).search(term)) {
      const tagHit = item.tags.find((tag) => tag.toLowerCase().includes(lowered));
      // In tag scope a page only qualifies through its tags, so a fuzzy hit
      // that was really about the name doesn't belong in the list.
      if (scope === "tag" && !tagHit) continue;

      // In name scope the row says "name" even where a tag also matched:
      // showing the tag would be the row explaining itself with the one field
      // that was deliberately excluded.
      const nameHit = scope === "name" || item.name.toLowerCase().includes(lowered);
      claimed.add(item.id);
      if (tagHit && !nameHit) {
        const at = tagHit.toLowerCase().indexOf(lowered);
        results.push({ nodeId: item.id, kind: "tag", snippet: tagHit, matchStart: at, matchEnd: at + lowered.length });
      } else {
        results.push({ nodeId: item.id, kind: "name", snippet: "", matchStart: 0, matchEnd: 0 });
      }
      if (results.length >= MAX_SEARCH_RESULTS) return results;
    }
  }

  if (scope === "tag" || scope === "name") return results;

  // Prose, in the page's own tab order — so a match in Overview wins over the
  // same word buried in Relations, which is the order she reads them in.
  for (const node of Object.values(nodes)) {
    if (claimed.has(node.id)) continue;
    for (const tab of tabTextsFor(nodes, node)) {
      const at = tab.lowered.indexOf(lowered);
      if (at === -1) continue;
      results.push({
        nodeId: node.id,
        kind: "content",
        tabId: tab.tabId,
        tabLabel: tab.label,
        tabHidden: tab.hidden,
        ...snippetAround(tab.text, at, term.length),
      });
      break;
    }
    if (results.length >= MAX_SEARCH_RESULTS) break;
  }

  return results;
}
