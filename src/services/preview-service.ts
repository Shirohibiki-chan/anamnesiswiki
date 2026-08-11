// What a hover preview of a page says. Kept out of the component so the rules
// about *which* tab gets read, and where the excerpt stops, are testable
// without a mouse.
import { PREVIEW_EXCERPT_CHARS } from "../constants/limits";
import type { Node } from "../constants/schema";
import { documentText } from "./search-service";
import { getTemplate } from "./template-registry";

export type NodePreview = {
  name: string;
  templateKey: string;
  /** The template's own display name — "Character", not "character". */
  templateLabel: string;
  tags: string[];
  /** Empty when the page has nothing written in it yet. */
  excerpt: string;
  /** Which tab the excerpt came from, so the card can say. */
  tabLabel: string | null;
};

/**
 * Cuts at the last word boundary before the limit rather than mid-word, and
 * adds an ellipsis only when something was actually cut. A preview is read at a
 * glance, and a word sliced in half is the thing the eye stops on.
 *
 * The boundary search has a floor: a single word longer than the limit has no
 * space to cut at, and cutting at "the last space" would return nothing at all.
 */
export function truncateAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${lastSpace > limit / 2 ? clipped.slice(0, lastSpace) : clipped.trimEnd()}…`;
}

/**
 * The first tab with something in it — not simply the first tab.
 *
 * A template seeds several tabs and only some get filled, so "the first one"
 * is regularly an empty Appearance section while the writing is two tabs
 * along. Hidden tabs are skipped: a tab held back from readers shouldn't leak
 * through a preview of the page it's on.
 */
export function buildNodePreview(node: Node, limit: number = PREVIEW_EXCERPT_CHARS): NodePreview {
  const base = {
    name: node.name,
    templateKey: node.templateKey,
    templateLabel: getTemplate(node.templateKey)?.label ?? "Page",
    tags: node.tags ?? [],
  };

  for (const tab of node.tabs) {
    if (tab.hidden) continue;
    const text = documentText(tab.content);
    if (!text) continue;
    return { ...base, excerpt: truncateAtWord(text, limit), tabLabel: tab.label };
  }
  return { ...base, excerpt: "", tabLabel: null };
}
