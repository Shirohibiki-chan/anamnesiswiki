// Tab-array transforms, pure. Every one takes the tabs it's given and returns
// the tabs that should replace them — no store, no disk, no ids invented here.
//
// Extracted in Phase 17 because tabs stopped belonging only to pages. A
// template is a copied page (constants/schema.ts's TemplateLibrary) and editing
// one edits its tabs, so without this the same six transforms would exist twice
// — once against `nodes` and once against `templates.nodes` — and the second
// copy is the one that quietly drifts.
//
// The store keeps what it can't hand over: reading the record, writing it back,
// undo, and the disk write.
import { createTab, type BlockNoteDocument, type Tab } from "../constants/schema";

/** A tab's content replaced. Unknown ids are left alone rather than throwing —
 *  a debounced editor write can land after its tab was deleted. */
export function withTabContent(tabs: Tab[], tabId: string, content: BlockNoteDocument): Tab[] {
  return tabs.map((tab) => (tab.id === tabId ? { ...tab, content } : tab));
}

export function withTabHiddenToggled(tabs: Tab[], tabId: string): Tab[] {
  return tabs.map((tab) => (tab.id === tabId ? { ...tab, hidden: !tab.hidden } : tab));
}

export function withTabRenamed(tabs: Tab[], tabId: string, label: string): Tab[] {
  return tabs.map((tab) => (tab.id === tabId ? { ...tab, label } : tab));
}

export function withTabDeleted(tabs: Tab[], tabId: string): Tab[] {
  return tabs.filter((tab) => tab.id !== tabId);
}

/**
 * A new tab appended, returned alongside the new list.
 *
 * The id is passed in rather than generated here so this file stays pure and
 * the callers keep using `crypto.randomUUID()` the way the rest of the store
 * does.
 */
export function withTabAdded(
  tabs: Tab[],
  id: string,
  label: string,
  content?: BlockNoteDocument,
): { tabs: Tab[]; tab: Tab } {
  const tab = createTab({ id, label, content });
  return { tabs: [...tabs, tab], tab };
}

/**
 * Whether a tab's writing is still the nothing an editor starts with.
 *
 * **"Nothing" is one empty paragraph, not an empty list.** BlockNote will not
 * hold an empty document — hand it `[]` and it puts a blank paragraph there,
 * and that is what comes back from the first `onChange`. So a page that has
 * been opened and not typed in reports one paragraph with nothing in it, and
 * that has to count as untouched or the template grid would leave the moment
 * the page opened. Anything else — a second block, a word, a picture, a block
 * with children — is writing, whether or not it has any text in it.
 */
export function contentIsUntouched(content: BlockNoteDocument): boolean {
  if (!Array.isArray(content) || content.length === 0) return true;
  if (content.length > 1) return false;
  const only = content[0] as { type?: unknown; content?: unknown; children?: unknown } | null;
  if (!only || typeof only !== "object" || only.type !== "paragraph") return false;
  if (Array.isArray(only.children) && only.children.length > 0) return false;
  return !Array.isArray(only.content) || only.content.length === 0;
}

/**
 * Tabs put in the given order, or `null` if that order doesn't describe exactly
 * these tabs.
 *
 * Takes the full post-drag id order (dnd-kit's `arrayMove` has already computed
 * it in PageTabs.tsx) rather than a from/to pair — simpler and unambiguous
 * versus re-deriving insert-before-or-after from two ids.
 *
 * **Null is refusal, not emptiness**, and the caller must not write it. An
 * order naming a tab that isn't here, or missing one that is, would silently
 * drop a tab and everything written in it; the drag is abandoned instead.
 *
 * **The test is that the order is a permutation of these exact tabs, not that
 * it's the same length** — which is what the store checked before this was
 * extracted, and it isn't enough. `["a", "a", "b"]` against tabs a/b/c filters
 * to three entries and passes a length check, having duplicated one tab and
 * dropped another, with everything written in it. Not reachable through
 * `arrayMove`, which permutes; reachable by anything else that ever computes
 * an order, which is what the guard is for.
 */
export function withTabsReordered(tabs: Tab[], orderedTabIds: string[]): Tab[] | null {
  if (orderedTabIds.length !== tabs.length) return null;
  if (new Set(orderedTabIds).size !== orderedTabIds.length) return null;

  const byId = new Map(tabs.map((tab) => [tab.id, tab]));
  const reordered: Tab[] = [];
  for (const id of orderedTabIds) {
    const tab = byId.get(id);
    if (!tab) return null;
    reordered.push(tab);
  }
  return reordered;
}
